import { careerConfig, playerRetirementAge } from '@/data/gameConfig/career'
import {
  createAcademies,
  ensureAcademies,
  normalizeGeneratedAcademyPlayers,
  progressAcademiesForNewSeason,
} from '@/domain/academy/academyService'
import { getCountryCompetitionConfig } from '@/data/gameConfig'
import { matchSimulationConfig } from '@/config/matchSimulationConfig'
import { championships, getChampionshipClubs } from '@/data/clubs'
import { advanceCupIfPossible, initializeCup } from '@/domain/competition/cupService'
import { getClubCompetitionId } from '@/domain/competition/competitionIdentity'
import { calculateLeagueTables } from '@/domain/competition/leagueTableService'
import { resolveCompetitionMovements } from '@/domain/competitions/movementResolver'
import {
  advanceCompetitionPlayoffs,
  getPlayoffRules,
  initializeCompetitionPlayoffs,
} from '@/domain/competitions/playoffResolver'
import { simulateFastMatch, simulateMatch } from '@/domain/match/matchSimulator'
import { normalizeMatchResultDiscipline } from '@/domain/match/disciplineService'
import { generateLeagueSchedule } from '@/domain/season/scheduleGenerator'
import { resolveScheduleConflicts } from '@/domain/schedule/calendarSlotResolver'
import {
  autoSelectLineup,
  getFormationSlots,
  getStarterIds,
} from '@/domain/season/squadSelectionService'
import { applySuspensionsAfterMatch, isPlayerUnavailable } from '@/domain/season/playerAvailability'
import type {
  ChampionshipId,
  Club,
  ClubLineup,
  GameState,
  LeagueTableRow,
  Match,
  MatchLineups,
  MatchResult,
  PlayedLineup,
  Player,
  PlayerStats,
} from '@/types/football'
import { clamp, createSeededRandom } from '@/utils/random'

// КЛОНИРУЕТ ИГРОКА ПЕРЕД ИЗМЕНЕНИЕМ СОСТОЯНИЯ СЕЗОНА
const clonePlayer = (player: Player): Player => ({ ...player })

// ГЛУБОКО КЛОНИРУЕТ КЛУБ ВМЕСТЕ С ЕГО СОСТАВОМ
const cloneClub = (club: Club): Club => ({
  ...club,
  squad: club.squad.map(clonePlayer),
})

// НОРМАЛИЗУЕТ ДЛИТЕЛЬНОСТЬ ТРАВМЫ ПО НАСТРОЙКАМ СИМУЛЯЦИИ
const getInjuryDuration = (durationMatchdays: number | undefined): number =>
  durationMatchdays ?? matchSimulationConfig.injury.minDurationMatchdays

// ПРИМЕНЯЕТ ТРАВМЫ К ИГРОКАМ И ЗАПОМИНАЕТ СРОК ВОССТАНОВЛЕНИЯ
const applyInjuriesToClubs = (
  clubs: Club[],
  injuries: MatchResult['injuries'],
  matchOrder: number,
): Club[] => {
  if (!injuries?.length) {
    return clubs
  }

  const injuryUntilOrderByPlayer = new Map(
    injuries.map((injury) => [
      injury.playerId,
      matchOrder + getInjuryDuration(injury.durationMatchdays),
    ]),
  )

  return clubs.map((club) => ({
    ...club,
    squad: club.squad.map((player) => {
      const newInjuryUntilOrder = injuryUntilOrderByPlayer.get(player.id)
      if (newInjuryUntilOrder === undefined) {
        return { ...player }
      }

      return {
        ...player,
        isInjured: true,
        injuryUntilOrder: Math.max(player.injuryUntilOrder ?? 0, newInjuryUntilOrder),
      }
    }),
  }))
}

// ВОССТАНАВЛИВАЕТ ИГРОКОВ ПЕРЕД ПЕРВЫМ МАТЧЕМ ПОСЛЕ СРОКА ТРАВМЫ
export const recoverInjuredPlayersBeforeOrder = (clubs: readonly Club[], order: number): Club[] =>
  clubs.map((club) => ({
    ...club,
    squad: club.squad.map((player) => {
      if (!player.isInjured) {
        return { ...player, injuryUntilOrder: undefined }
      }

      // Старые сохранения не содержат срок травмы: такой игрок вернется в ближайшем туре.
      if (player.injuryUntilOrder === undefined || player.injuryUntilOrder < order) {
        return { ...player, isInjured: false, injuryUntilOrder: undefined }
      }

      return { ...player }
    }),
  }))

// ВОССТАНАВЛИВАЕТ ИГРОКОВ ПЕРЕД НАЧАЛОМ ИГРОВОГО ДНЯ
const millisecondsPerDay = 24 * 60 * 60 * 1_000

const restDaysBetween = (previousDate: string, currentDate: string): number => {
  const previousTime = Date.parse(previousDate)
  const currentTime = Date.parse(currentDate)
  if (!Number.isFinite(previousTime) || !Number.isFinite(currentTime)) return 0
  return Math.max(0, Math.round((currentTime - previousTime) / millisecondsPerDay) - 1)
}

// ВОССТАНАВЛИВАЕТ ФИЗИЧЕСКУЮ ФОРМУ ЗА КАЖДЫЙ КАЛЕНДАРНЫЙ ДЕНЬ БЕЗ МАТЧА
export const recoverFitnessBeforeOrder = (
  clubs: readonly Club[],
  matches: readonly Match[],
  order: number,
): Club[] => {
  const currentMatchByClub = new Map<string, Match>()
  for (const match of matches.filter(
    (candidate) => candidate.order === order && candidate.status === 'scheduled',
  )) {
    currentMatchByClub.set(match.homeClubId, match)
    currentMatchByClub.set(match.awayClubId, match)
  }
  const previousMatchByClub = new Map<string, Match>()
  for (const match of matches) {
    if (match.order >= order || match.status !== 'played') continue
    for (const clubId of [match.homeClubId, match.awayClubId]) {
      const previous = previousMatchByClub.get(clubId)
      if (
        !previous ||
        Date.parse(match.date) > Date.parse(previous.date) ||
        (match.date === previous.date && match.order > previous.order)
      ) {
        previousMatchByClub.set(clubId, match)
      }
    }
  }

  return clubs.map((club) => {
    const currentMatch = currentMatchByClub.get(club.id)
    if (!currentMatch) return cloneClub(club)

    const previousMatch = previousMatchByClub.get(club.id)
    const restDays = previousMatch ? restDaysBetween(previousMatch.date, currentMatch.date) : 0
    if (restDays === 0) return cloneClub(club)

    return {
      ...club,
      squad: club.squad.map((player) => {
        const random = createSeededRandom(
          hashString(`${currentMatch.id}:${player.id}:fitness-recovery`),
        )
        let recoveredFitness = player.fitness
        for (let day = 0; day < restDays; day += 1) {
          recoveredFitness += random.int(
            matchSimulationConfig.fitnessRecovery.minPerRestDay,
            matchSimulationConfig.fitnessRecovery.maxPerRestDay,
          )
        }
        return { ...player, fitness: clamp(recoveredFitness, 1, 100) }
      }),
    }
  })
}

const recoverStateBeforeOrder = (state: GameState, order: number): GameState =>
  order > state.lastCompletedOrder
    ? {
        ...state,
        clubs: recoverFitnessBeforeOrder(
          recoverInjuredPlayersBeforeOrder(state.clubs, order),
          state.matches,
          order,
        ),
      }
    : state

// СИНХРОНИЗИРУЕТ ВОССТАНОВЛЕНИЕ ПОСЛЕ ЗАВЕРШЁННОГО ИГРОВОГО ДНЯ
const recoverStateAfterCompletedOrder = (state: GameState, order: number): GameState => {
  const clubs = recoverInjuredPlayersBeforeOrder(state.clubs, order + 1)
  const worldClubs = state.worldClubs
    ? Object.fromEntries(
        Object.entries(state.worldClubs).map(([championshipId, championshipClubs]) => [
          championshipId,
          championshipId === state.championshipId
            ? clubs.map(cloneClub)
            : championshipClubs
              ? recoverInjuredPlayersBeforeOrder(championshipClubs, order + 1)
              : championshipClubs,
        ]),
      )
    : undefined

  return { ...state, clubs, worldClubs }
}

const championshipIds = Object.keys(championships) as ChampionshipId[]
let careerSeedCounter = 0

// СОЗДАЁТ УНИКАЛЬНЫЙ SEED ДЛЯ КАЖДОЙ НОВОЙ КАРЬЕРЫ, ВКЛЮЧАЯ БЫСТРЫЕ ПЕРЕЗАПУСКИ
export const createCareerSeed = (): number => {
  careerSeedCounter = (careerSeedCounter + 1) % 10_000
  const timePart = Date.now() % 2_147_000_000
  const randomPart = Math.floor(Math.random() * 1_000_000)
  return ((timePart + randomPart + careerSeedCounter * 104_729) % 2_147_483_646) + 1
}

// ГЛУБОКО КЛОНИРУЕТ МАТЧ, РЕЗУЛЬТАТ, СОБЫТИЯ И СОСТАВЫ
const cloneMatch = (match: Match): Match => ({
  ...match,
  result: match.result
    ? {
        ...match.result,
        goals: [...match.result.goals],
        stats: {
          home: { ...match.result.stats.home },
          away: { ...match.result.stats.away },
        },
        cards: match.result.cards?.map((card) => ({ ...card })),
        injuries: match.result.injuries?.map((injury) => ({ ...injury })),
        substitutions: match.result.substitutions?.map((substitution) => ({ ...substitution })),
        commentary: match.result.commentary?.map((event) => ({ ...event })),
      }
    : undefined,
  lineups: match.lineups
    ? {
        home: {
          formation: match.lineups.home.formation,
          tacticalStyle: match.lineups.home.tacticalStyle,
          starters: [...match.lineups.home.starters],
        },
        away: {
          formation: match.lineups.away.formation,
          tacticalStyle: match.lineups.away.tacticalStyle,
          starters: [...match.lineups.away.starters],
        },
      }
    : undefined,
})

// ДОБАВЛЯЕТ ЧЕМПИОНАТ К ИДЕНТИФИКАТОРУ МАТЧА МИРОВОЙ ЛИГИ
const prefixLeagueMatch = (championshipId: ChampionshipId, match: Match): Match => ({
  ...match,
  id: `${championshipId}-${match.id}`,
  championshipId,
})

// СОЗДАЁТ КАЛЕНДАРЬ ЛИГИ ОДНОГО ЧЕМПИОНАТА
const createLeagueMatches = (
  clubs: readonly Club[],
  season: number,
  championshipId: ChampionshipId,
  careerSeed: number,
): Match[] =>
  generateLeagueSchedule(clubs, season, championshipId, careerSeed).map((match) =>
    prefixLeagueMatch(championshipId, match),
  )

// СОЗДАЁТ НЕЗАВИСИМЫЕ СОСТАВЫ КЛУБОВ ДЛЯ ВСЕХ ЧЕМПИОНАТОВ
const createWorldClubs = (): Record<ChampionshipId, Club[]> => {
  return championshipIds.reduce<Record<ChampionshipId, Club[]>>(
    (result, championshipId) => {
      result[championshipId] = getChampionshipClubs(championshipId).map(cloneClub)
      return result
    },
    {} as Record<ChampionshipId, Club[]>,
  )
}

// ФОРМИРУЕТ КАЛЕНДАРИ ЛИГ ДЛЯ ВСЕГО ИГРОВОГО МИРА
const createWorldMatches = (
  worldClubs: Record<ChampionshipId, Club[]>,
  season: number,
  careerSeed: number,
): Record<ChampionshipId, Match[]> => {
  return championshipIds.reduce<Record<ChampionshipId, Match[]>>(
    (result, championshipId) => {
      result[championshipId] = createLeagueMatches(
        worldClubs[championshipId],
        season,
        championshipId,
        careerSeed,
      )
      return result
    },
    {} as Record<ChampionshipId, Match[]>,
  )
}

// РАССЧИТЫВАЕТ ТАБЛИЦЫ ЛИГ ДЛЯ ВСЕХ ЧЕМПИОНАТОВ
const createWorldLeagueTables = (
  worldClubs: Record<ChampionshipId, Club[]>,
  worldMatches: Record<ChampionshipId, Match[]>,
): Record<ChampionshipId, Record<string, LeagueTableRow[]>> => {
  return championshipIds.reduce<Record<ChampionshipId, Record<string, LeagueTableRow[]>>>(
    (result, championshipId) => {
      result[championshipId] = calculateLeagueTables(
        worldClubs[championshipId],
        worldMatches[championshipId],
      )
      return result
    },
    {} as Record<ChampionshipId, Record<string, LeagueTableRow[]>>,
  )
}

// ПРЕОБРАЗУЕТ СТРОКУ В SEED ДЛЯ ДЕТЕРМИНИРОВАННЫХ РАСЧЁТОВ
const hashString = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) % 2_147_483_647
  }
  return hash || 1
}

// СОЗДАЁТ НУЛЕВУЮ СЕЗОННУЮ СТАТИСТИКУ ИГРОКА
export const createEmptyPlayerStats = (): PlayerStats => ({
  appearances: 0,
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
  cleanSheets: 0,
  averageRating: 0,
  matchesRated: 0,
})

const compactBackgroundResult = (result: MatchResult): MatchResult => ({
  detail: 'fast',
  homeGoals: result.homeGoals,
  awayGoals: result.awayGoals,
  winnerClubId: result.winnerClubId,
  penaltyWinnerClubId: result.penaltyWinnerClubId,
  goals: [],
  stats: {
    home: { ...result.stats.home },
    away: { ...result.stats.away },
  },
  bestPlayerId: '',
})

// ИНИЦИАЛИЗИРУЕТ СТАТИСТИКУ ДЛЯ ВСЕХ ИГРОКОВ
export const createInitialPlayerStats = (clubs: readonly Club[]): Record<string, PlayerStats> => {
  return clubs.reduce<Record<string, PlayerStats>>((result, club) => {
    for (const player of club.squad) {
      result[player.id] = createEmptyPlayerStats()
    }
    return result
  }, {})
}

const createInitialWorldPlayerStats = (
  worldClubs: Record<ChampionshipId, Club[]>,
): Record<ChampionshipId, Record<string, PlayerStats>> =>
  championshipIds.reduce<Record<ChampionshipId, Record<string, PlayerStats>>>(
    (result, id) => {
      result[id] = createInitialPlayerStats(worldClubs[id])
      return result
    },
    {} as Record<ChampionshipId, Record<string, PlayerStats>>,
  )

const normalizePlayerStats = (stats: PlayerStats | undefined): PlayerStats => ({
  ...createEmptyPlayerStats(),
  ...stats,
  assists: stats?.assists ?? 0,
  redCards: stats?.redCards ?? 0,
  cleanSheets: stats?.cleanSheets ?? 0,
})

// СОЗДАЁТ АВТОСОСТАВЫ И ПО ВОЗМОЖНОСТИ СОХРАНЯЕТ ТАКТИКУ
export const createDefaultLineups = (
  clubs: readonly Club[],
  existingLineups: Record<string, ClubLineup> = {},
): Record<string, ClubLineup> => {
  return clubs.reduce<Record<string, ClubLineup>>((result, club) => {
    const existing = existingLineups[club.id]
    result[club.id] = autoSelectLineup(
      club,
      existing?.formation ?? '4-4-2',
      existing?.tacticalStyle ?? 'balanced',
    )
    return result
  }, {})
}

// СОБИРАЕТ ПОЛНОЕ НАЧАЛЬНОЕ СОСТОЯНИЕ НОВОЙ КАРЬЕРЫ
export const createInitialGameState = (
  championshipId: ChampionshipId,
  selectedClubId: string,
  careerSeed: number = createCareerSeed(),
): GameState => {
  const worldClubs = createWorldClubs()
  const clubs = worldClubs[championshipId].map(cloneClub)
  if (!clubs.some((club) => club.id === selectedClubId)) {
    throw new Error(`Club ${selectedClubId} does not belong to ${championshipId}`)
  }
  const worldMatches = createWorldMatches(worldClubs, 1, careerSeed)
  const leagueMatches = worldMatches[championshipId].map(cloneMatch)
  const cup = initializeCup(clubs, 1, championshipId, careerSeed)
  const scheduled = resolveScheduleConflicts(
    [...leagueMatches, ...cup.matches],
    1,
    getCountryCompetitionConfig(championshipId).calendar,
  )
  const matches = scheduled.matches.sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  )
  const scheduledLeagueMatches = matches.filter((match) => match.type === 'league')
  const syncedWorldMatches = {
    ...worldMatches,
    [championshipId]: scheduledLeagueMatches.map(cloneMatch),
  }
  const worldLeagueTables = createWorldLeagueTables(worldClubs, syncedWorldMatches)

  return {
    configVersion: 3,
    careerSeed,
    championshipId,
    selectedClubId,
    season: 1,
    clubs,
    matches,
    leagueTables: calculateLeagueTables(clubs, matches),
    worldClubs,
    worldMatches: syncedWorldMatches,
    worldLeagueTables,
    cup: cup.cup,
    playoffs: [],
    scheduleConflictResolutions: scheduled.resolutions,
    lineups: createDefaultLineups(clubs),
    playerStats: createInitialPlayerStats(clubs),
    worldPlayerStats: createInitialWorldPlayerStats(worldClubs),
    academies: createAcademies(clubs, 1, selectedClubId),
    externalClubOverrides: {},
    lastCompletedOrder: 0,
  }
}

// ДОПОЛНЯЕТ НЕПОЛНОЕ СОХРАНЕНИЕ ДАННЫМИ МИРОВЫХ ЛИГ
export const ensureWorldCompetitions = (state: GameState): GameState => {
  const careerSeed =
    state.careerSeed ?? hashString(`${state.championshipId}:${state.selectedClubId}`)
  const clubs = normalizeGeneratedAcademyPlayers(
    recoverInjuredPlayersBeforeOrder(state.clubs, state.lastCompletedOrder + 1),
  )
  const academies = ensureAcademies(clubs, state.academies, state.season, state.selectedClubId)
  const existingWorldClubs = state.worldClubs ?? {}
  const worldClubs = championshipIds.reduce<Record<ChampionshipId, Club[]>>(
    (result, championshipId) => {
      const existingClubs = existingWorldClubs[championshipId]
      const baseClubs =
        championshipId === state.championshipId
          ? clubs.map(cloneClub)
          : (existingClubs?.map(cloneClub) ?? getChampionshipClubs(championshipId).map(cloneClub))
      const overrides = state.externalClubOverrides?.[championshipId] ?? {}
      result[championshipId] = baseClubs.map((club) =>
        overrides[club.id] ? cloneClub(overrides[club.id]!) : club,
      )
      return result
    },
    {} as Record<ChampionshipId, Club[]>,
  )

  const generatedWorldMatches = createWorldMatches(worldClubs, state.season, careerSeed)
  const existingWorldMatches = state.worldMatches ?? {}
  const selectedLeagueMatches = state.matches
    .filter((match) => match.type === 'league')
    .map((match) => ({
      ...cloneMatch(match),
      championshipId: state.championshipId,
    }))
  const worldMatches = championshipIds.reduce<Record<ChampionshipId, Match[]>>(
    (result, championshipId) => {
      result[championshipId] =
        championshipId === state.championshipId
          ? selectedLeagueMatches
          : (existingWorldMatches[championshipId]?.map(cloneMatch) ??
            generatedWorldMatches[championshipId])
      return result
    },
    {} as Record<ChampionshipId, Match[]>,
  )
  const worldLeagueTables = createWorldLeagueTables(worldClubs, worldMatches)
  const existingWorldPlayerStats = state.worldPlayerStats ?? {}
  const worldPlayerStats = championshipIds.reduce<
    Record<ChampionshipId, Record<string, PlayerStats>>
  >(
    (result, championshipId) => {
      const stored = existingWorldPlayerStats[championshipId]
      const fallback = championshipId === state.championshipId ? state.playerStats : undefined
      result[championshipId] = Object.fromEntries(
        worldClubs[championshipId].flatMap((club) =>
          club.squad.map((player) => [
            player.id,
            normalizePlayerStats(stored?.[player.id] ?? fallback?.[player.id]),
          ]),
        ),
      )
      return result
    },
    {} as Record<ChampionshipId, Record<string, PlayerStats>>,
  )

  return {
    ...state,
    configVersion: 3,
    careerSeed,
    clubs,
    academies,
    leagueTables: calculateLeagueTables(clubs, state.matches),
    worldClubs,
    worldMatches,
    worldLeagueTables,
    playerStats: Object.fromEntries(
      Object.entries(state.playerStats).map(([playerId, stats]) => [
        playerId,
        normalizePlayerStats(stats),
      ]),
    ),
    worldPlayerStats,
  }
}

// НАХОДИТ КЛУБ И ПРЕРЫВАЕТ РАСЧЁТ ПРИ НАРУШЕНИИ ДАННЫХ
const getClub = (clubs: readonly Club[], clubId: string): Club => {
  const club = clubs.find((candidate) => candidate.id === clubId)
  if (!club) {
    throw new Error(`Club not found: ${clubId}`)
  }
  return club
}

// ПРЕОБРАЗУЕТ РЕДАКТИРУЕМЫЙ СОСТАВ В ФОРМАТ СИМУЛЯТОРА
const getPlayedLineup = (club: Club, stateLineup: ClubLineup | undefined): PlayedLineup => {
  const lineup = stateLineup ?? autoSelectLineup(club)
  const starters = getFormationSlots(lineup.formation)
    .map((slot) => lineup.starters[slot.id])
    .filter((playerId): playerId is string => typeof playerId === 'string')

  const playersById = new Map(club.squad.map((player) => [player.id, player]))
  const hasUnavailableStarter = starters.some((playerId) => {
    const player = playersById.get(playerId)
    return !player || isPlayerUnavailable(player)
  })

  if (starters.length !== 11 || hasUnavailableStarter) {
    const auto = autoSelectLineup(club, lineup.formation, lineup.tacticalStyle)
    return getPlayedLineup(club, auto)
  }

  return {
    formation: lineup.formation,
    tacticalStyle: lineup.tacticalStyle,
    starters,
  }
}

// ПОДГОТАВЛИВАЕТ СОСТАВЫ ОБЕИХ КОМАНД К МАТЧУ
const getLineupsForMatch = (state: GameState, match: Match): MatchLineups => {
  const homeClub = getClub(state.clubs, match.homeClubId)
  const awayClub = getClub(state.clubs, match.awayClubId)
  const homeLineup =
    match.homeClubId === state.selectedClubId
      ? state.lineups[match.homeClubId]
      : autoSelectLineup(
          homeClub,
          state.lineups[match.homeClubId]?.formation ?? '4-4-2',
          state.lineups[match.homeClubId]?.tacticalStyle ?? 'balanced',
        )
  const awayLineup =
    match.awayClubId === state.selectedClubId
      ? state.lineups[match.awayClubId]
      : autoSelectLineup(
          awayClub,
          state.lineups[match.awayClubId]?.formation ?? '4-4-2',
          state.lineups[match.awayClubId]?.tacticalStyle ?? 'balanced',
        )

  return {
    home: getPlayedLineup(homeClub, homeLineup),
    away: getPlayedLineup(awayClub, awayLineup),
  }
}

// НАХОДИТ ИГРОКА В КЛУБАХ И ПРИМЕНЯЕТ К НЕМУ ОБНОВЛЕНИЕ
const updatePlayerById = (
  clubs: Club[],
  playerId: string,
  update: (player: Player) => Player,
): void => {
  for (const club of clubs) {
    const playerIndex = club.squad.findIndex((player) => player.id === playerId)
    if (playerIndex !== -1) {
      const player = club.squad[playerIndex]
      if (player) {
        club.squad[playerIndex] = update(player)
      }
      return
    }
  }
}

// НАКАПЛИВАЕТ СЕЗОННУЮ СТАТИСТИКУ И СРЕДНЮЮ ОЦЕНКУ
const updatePlayerStats = (
  stats: Record<string, PlayerStats>,
  playerId: string,
  goals: number,
  assists: number,
  yellowCards: number,
  redCards: number,
  cleanSheet: boolean,
  rating: number,
): void => {
  const current = stats[playerId] ?? createEmptyPlayerStats()
  const ratedMatches = current.matchesRated + 1
  stats[playerId] = {
    appearances: current.appearances + 1,
    goals: current.goals + goals,
    assists: (current.assists ?? 0) + assists,
    yellowCards: current.yellowCards + yellowCards,
    redCards: (current.redCards ?? 0) + redCards,
    cleanSheets: (current.cleanSheets ?? 0) + (cleanSheet ? 1 : 0),
    matchesRated: ratedMatches,
    averageRating: Number(
      ((current.averageRating * current.matchesRated + rating) / ratedMatches).toFixed(2),
    ),
  }
}

const accumulateMatchPlayerStats = (
  source: Record<string, PlayerStats>,
  clubs: readonly Club[],
  match: Match,
  result: MatchResult,
  lineups: MatchLineups,
): Record<string, PlayerStats> => {
  const stats = { ...source }
  const homeIds = new Set([
    ...lineups.home.starters,
    ...(result.substitutions
      ?.filter((event) => event.clubId === match.homeClubId)
      .map((event) => event.playerInId) ?? []),
  ])
  const awayIds = new Set([
    ...lineups.away.starters,
    ...(result.substitutions
      ?.filter((event) => event.clubId === match.awayClubId)
      .map((event) => event.playerInId) ?? []),
  ])
  const goals = new Map<string, number>()
  const assists = new Map<string, number>()
  for (const goal of result.goals) {
    goals.set(goal.playerId, (goals.get(goal.playerId) ?? 0) + 1)
    if (goal.assistPlayerId)
      assists.set(goal.assistPlayerId, (assists.get(goal.assistPlayerId) ?? 0) + 1)
  }
  const yellows = new Map<string, number>()
  const reds = new Map<string, number>()
  for (const card of result.cards ?? []) {
    if (card.card === 'yellow' || card.dismissalReason === 'second-yellow') {
      yellows.set(card.playerId, (yellows.get(card.playerId) ?? 0) + 1)
    }
    if (card.card === 'red') reds.set(card.playerId, (reds.get(card.playerId) ?? 0) + 1)
  }
  const players = new Map(
    clubs.flatMap((club) => club.squad.map((player) => [player.id, player] as const)),
  )
  for (const playerId of new Set([...homeIds, ...awayIds])) {
    const isHome = homeIds.has(playerId)
    const player = players.get(playerId)
    const playerGoals = goals.get(playerId) ?? 0
    const playerAssists = assists.get(playerId) ?? 0
    const playerYellows = yellows.get(playerId) ?? 0
    const won = isHome ? result.homeGoals > result.awayGoals : result.awayGoals > result.homeGoals
    const lost = isHome ? result.homeGoals < result.awayGoals : result.awayGoals < result.homeGoals
    const rating = clamp(
      6 +
        playerGoals * 0.8 +
        playerAssists * 0.35 +
        (won ? 0.5 : 0) -
        (lost ? 0.35 : 0) -
        playerYellows * 0.25,
      3,
      10,
    )
    updatePlayerStats(
      stats,
      playerId,
      playerGoals,
      playerAssists,
      playerYellows,
      reds.get(playerId) ?? 0,
      player?.position === 'GK' && (isHome ? result.awayGoals === 0 : result.homeGoals === 0),
      rating,
    )
  }
  return stats
}

// ПРИМЕНЯЕТ К ИГРОКАМ ВСЕ ПОСЛЕДСТВИЯ ЗАВЕРШЁННОГО МАТЧА
const applyMatchEffects = (
  state: GameState,
  match: Match,
  result: MatchResult,
  lineups: MatchLineups,
): GameState => {
  const clubs = state.clubs.map(cloneClub)
  const playerStats = { ...state.playerStats }
  const random = createSeededRandom(hashString(match.id) + state.season * 1_000)
  const homePlayedIds = [
    ...lineups.home.starters,
    ...(result.substitutions
      ?.filter((substitution) => substitution.clubId === match.homeClubId)
      .map((substitution) => substitution.playerInId) ?? []),
  ]
  const awayPlayedIds = [
    ...lineups.away.starters,
    ...(result.substitutions
      ?.filter((substitution) => substitution.clubId === match.awayClubId)
      .map((substitution) => substitution.playerInId) ?? []),
  ]
  const allPlayedIds = [...new Set([...homePlayedIds, ...awayPlayedIds])]
  const goalCounts = result.goals.reduce<Record<string, number>>((counts, goal) => {
    counts[goal.playerId] = (counts[goal.playerId] ?? 0) + 1
    return counts
  }, {})
  const assistCounts = result.goals.reduce<Record<string, number>>((counts, goal) => {
    if (goal.assistPlayerId) counts[goal.assistPlayerId] = (counts[goal.assistPlayerId] ?? 0) + 1
    return counts
  }, {})
  const redCardCounts = (result.cards ?? []).reduce<Record<string, number>>((counts, card) => {
    if (card.card === 'red') counts[card.playerId] = (counts[card.playerId] ?? 0) + 1
    return counts
  }, {})
  const bookingCounts: Record<string, number> = {}
  const recordedYellowCards =
    result.cards?.filter(
      (card) => card.card === 'yellow' || card.dismissalReason === 'second-yellow',
    ) ?? []

  if (recordedYellowCards.length) {
    for (const card of recordedYellowCards) {
      bookingCounts[card.playerId] = (bookingCounts[card.playerId] ?? 0) + 1
    }
  } else {
    for (let index = 0; index < result.stats.home.yellowCards; index += 1) {
      const bookedPlayerId = lineups.home.starters[random.int(0, lineups.home.starters.length - 1)]
      if (bookedPlayerId) {
        bookingCounts[bookedPlayerId] = (bookingCounts[bookedPlayerId] ?? 0) + 1
      }
    }

    for (let index = 0; index < result.stats.away.yellowCards; index += 1) {
      const bookedPlayerId = lineups.away.starters[random.int(0, lineups.away.starters.length - 1)]
      if (bookedPlayerId) {
        bookingCounts[bookedPlayerId] = (bookingCounts[bookedPlayerId] ?? 0) + 1
      }
    }
  }

  const injuryByPlayerId = new Map(
    result.injuries?.map((injury) => [injury.playerId, injury]) ?? [],
  )

  const homeWon = result.homeGoals > result.awayGoals || result.winnerClubId === match.homeClubId
  const awayWon = result.awayGoals > result.homeGoals || result.winnerClubId === match.awayClubId

  for (const playerId of allPlayedIds) {
    const isHomePlayer = homePlayedIds.includes(playerId)
    const teamWon = isHomePlayer ? homeWon : awayWon
    const teamLost = isHomePlayer
      ? awayWon && result.homeGoals !== result.awayGoals
      : homeWon && result.homeGoals !== result.awayGoals
    const goals = goalCounts[playerId] ?? 0
    const assists = assistCounts[playerId] ?? 0
    const yellowCards = bookingCounts[playerId] ?? 0
    const redCards = redCardCounts[playerId] ?? 0
    const player = clubs
      .flatMap((club) => club.squad)
      .find((candidate) => candidate.id === playerId)
    const cleanSheet =
      player?.position === 'GK' && (isHomePlayer ? result.awayGoals === 0 : result.homeGoals === 0)
    const matchRating = clamp(
      6 +
        goals * 0.8 +
        assists * 0.35 +
        (teamWon ? 0.5 : 0) -
        (teamLost ? 0.35 : 0) -
        yellowCards * 0.25 +
        random.int(-4, 5) / 10,
      3,
      10,
    )

    updatePlayerById(clubs, playerId, (player) => {
      const injury = injuryByPlayerId.get(player.id)
      const injuryUntilOrder = injury
        ? Math.max(
            player.injuryUntilOrder ?? 0,
            match.order + getInjuryDuration(injury.durationMatchdays),
          )
        : player.injuryUntilOrder

      return {
        ...player,
        isInjured: player.isInjured || Boolean(injury),
        injuryUntilOrder,
        fitness: clamp(player.fitness - random.int(6, 14), 1, 100),
        form: clamp(
          player.form +
            goals * 3 -
            yellowCards +
            (teamWon ? random.int(1, 4) : teamLost ? random.int(-4, 0) : random.int(-1, 2)),
          1,
          100,
        ),
      }
    })

    updatePlayerStats(
      playerStats,
      playerId,
      goals,
      assists,
      yellowCards,
      redCards,
      cleanSheet,
      matchRating,
    )
  }

  const playedPlayerIds = new Set(allPlayedIds)
  const matchClubIds = new Set([match.homeClubId, match.awayClubId])

  for (const club of clubs) {
    if (!matchClubIds.has(club.id)) {
      continue
    }

    club.squad = club.squad.map((player) =>
      playedPlayerIds.has(player.id)
        ? player
        : {
            ...player,
            fitness: clamp(player.fitness + random.int(35, 55), 1, 100),
          },
    )
  }

  return {
    ...state,
    clubs: applySuspensionsAfterMatch(clubs, match, result.cards),
    playerStats,
    worldPlayerStats:
      match.type === 'league'
        ? {
            ...state.worldPlayerStats,
            [state.championshipId]: accumulateMatchPlayerStats(
              state.worldPlayerStats?.[state.championshipId] ??
                createInitialPlayerStats(state.clubs),
              state.clubs,
              match,
              result,
              lineups,
            ),
          }
        : state.worldPlayerStats,
  }
}

// СОХРАНЯЕТ РЕЗУЛЬТАТ МАТЧА И ЕГО ПОСЛЕДСТВИЯ В СОСТОЯНИЕ
const completeMatch = (
  state: GameState,
  match: Match,
  result: MatchResult,
  lineups: MatchLineups,
): GameState => {
  const normalizedResult = normalizeMatchResultDiscipline(
    result,
    match.homeClubId,
    match.awayClubId,
  )
  const updatedMatches = state.matches.map((candidate) => {
    if (candidate.id !== match.id) {
      return candidate
    }

    return {
      ...candidate,
      status: 'played' as const,
      result: normalizedResult,
      lineups,
    }
  })

  return applyMatchEffects(
    {
      ...state,
      matches: updatedMatches,
      lastCompletedOrder: Math.max(state.lastCompletedOrder, match.order),
    },
    match,
    normalizedResult,
    lineups,
  )
}

// СИМУЛИРУЕТ ЗАПЛАНИРОВАННЫЙ МАТЧ С ПОДГОТОВЛЕННЫМИ СОСТАВАМИ
const simulateScheduledMatch = (
  state: GameState,
  match: Match,
): { result: MatchResult; lineups: MatchLineups } => {
  const homeClub = getClub(state.clubs, match.homeClubId)
  const awayClub = getClub(state.clubs, match.awayClubId)
  const lineups = getLineupsForMatch(state, match)

  const playoffTie = match.playoffId
    ? state.playoffs
        ?.find((playoff) => playoff.id === match.playoffId)
        ?.stages.flatMap((stage) => stage.ties)
        .find((tie) => tie.id === match.playoffTieId)
    : undefined
  const isDecisiveKnockoutMatch =
    match.type === 'cup' || (match.type === 'playoff' && playoffTie?.matchIds.at(-1) === match.id)

  return {
    lineups,
    result: simulateMatch(
      {
        matchId: match.id,
        homeClub,
        awayClub,
        homeLineup: lineups.home,
        awayLineup: lineups.away,
        neutralVenue: match.neutralVenue,
        allowPenaltyShootout: isDecisiveKnockoutMatch,
        seed: hashString(match.id) + state.season * 10_000,
      },
      'medium',
    ),
  }
}

// ПРОВЕРЯЕТ НУЖЕН ЛИ МАТЧУ БЫСТРЫЙ РЕЖИМ
const isFastLocalMatch = (state: GameState, match: Match): boolean => {
  if (match.type !== 'league') {
    return false
  }
  const selectedClub = getClub(state.clubs, state.selectedClubId)
  return match.competitionId !== getClubCompetitionId(selectedClub)
}

// БЫСТРО РАССЧИТЫВАЕТ МАТЧ ДРУГОГО ДИВИЗИОНА
const simulateFastScheduledMatch = (state: GameState, match: Match): MatchResult => {
  const lineups = getLineupsForMatch(state, match)
  return simulateFastMatch({
    matchId: match.id,
    homeClub: getClub(state.clubs, match.homeClubId),
    awayClub: getClub(state.clubs, match.awayClubId),
    homeLineup: lineups.home,
    awayLineup: lineups.away,
    neutralVenue: match.neutralVenue,
    allowPenaltyShootout: false,
    seed: hashString(match.id) + state.season * 10_000,
  })
}

// РАССЧИТЫВАЕТ ИГРОВОЙ ДЕНЬ ВО ВСЕХ ФОНОВЫХ ЛИГАХ
const simulateWorldLeagueOrder = (state: GameState, order: number): GameState => {
  const hydrated = ensureWorldCompetitions(state)
  const worldClubs = { ...hydrated.worldClubs } as Record<ChampionshipId, Club[]>
  const worldMatches = { ...hydrated.worldMatches } as Record<ChampionshipId, Match[]>
  const worldPlayerStats = { ...hydrated.worldPlayerStats } as Record<
    ChampionshipId,
    Record<string, PlayerStats>
  >

  for (const championshipId of championshipIds) {
    if (championshipId === hydrated.championshipId) {
      worldClubs[championshipId] = hydrated.clubs.map(cloneClub)
      worldMatches[championshipId] = hydrated.matches
        .filter((match) => match.type === 'league')
        .map((match) => ({
          ...cloneMatch(match),
          championshipId,
        }))
      continue
    }

    const clubs = recoverInjuredPlayersBeforeOrder(worldClubs[championshipId], order)
    worldClubs[championshipId] = clubs
    worldMatches[championshipId] = worldMatches[championshipId].map((match) => {
      if (match.order !== order || match.status !== 'scheduled') {
        return match
      }

      const homeClub = getClub(clubs, match.homeClubId)
      const awayClub = getClub(clubs, match.awayClubId)
      const lineups: MatchLineups = {
        home: getPlayedLineup(homeClub, autoSelectLineup(homeClub)),
        away: getPlayedLineup(awayClub, autoSelectLineup(awayClub)),
      }
      const result = simulateFastMatch({
        matchId: match.id,
        homeClub,
        awayClub,
        homeLineup: lineups.home,
        awayLineup: lineups.away,
        neutralVenue: match.neutralVenue,
        allowPenaltyShootout: false,
        seed: hashString(match.id) + hydrated.season * 10_000,
      })
      worldClubs[championshipId] = applySuspensionsAfterMatch(
        applyInjuriesToClubs(worldClubs[championshipId], result.injuries, match.order),
        match,
        result.cards,
      )
      worldPlayerStats[championshipId] = accumulateMatchPlayerStats(
        worldPlayerStats[championshipId],
        clubs,
        match,
        result,
        lineups,
      )

      return {
        ...match,
        status: 'played' as const,
        result: compactBackgroundResult(result),
      }
    })
  }

  return {
    ...hydrated,
    worldClubs,
    worldMatches,
    worldPlayerStats,
    worldLeagueTables: createWorldLeagueTables(worldClubs, worldMatches),
  }
}

// НАЧИСЛЯЕТ ПРИЗОВЫЕ ЗА ПРОХОЖДЕНИЕ СТАДИИ КУБКА
const applyCupRoundRewards = (state: GameState, completedRoundId: string): GameState => {
  const cupConfig = Object.values(getCountryCompetitionConfig(state.championshipId).cups)[0]
  const reward = cupConfig?.rewards.roundRewards[completedRoundId] ?? 0
  if (reward <= 0) {
    return state
  }

  const completedRound = state.cup.rounds.find((round) => round.id === completedRoundId)
  if (!completedRound) {
    return state
  }

  const winnerIds = new Set(
    completedRound.ties
      .map((tie) => tie.winnerClubId)
      .filter((clubId): clubId is string => typeof clubId === 'string'),
  )

  const extraWinnerReward =
    completedRoundId === 'final' ? (cupConfig?.rewards.winnerReward ?? 0) : 0

  return {
    ...state,
    clubs: state.clubs.map((club) => {
      const cloned = cloneClub(club)
      return winnerIds.has(club.id)
        ? { ...cloned, budget: cloned.budget + reward + extraWinnerReward }
        : cloned
    }),
  }
}

// ПРОДВИГАЕТ КУБКОВУЮ СЕТКУ И ПЕРЕСЧИТЫВАЕТ ТАБЛИЦЫ
const advanceCupAndRefreshTables = (state: GameState): GameState => {
  const advanced = advanceCupIfPossible(state.cup, state.matches)
  let matches = [...state.matches, ...advanced.newMatches].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  )
  let nextState: GameState = {
    ...state,
    cup: advanced.cup,
    matches,
    leagueTables: calculateLeagueTables(state.clubs, matches),
  }

  if (advanced.completedRoundId) {
    nextState = applyCupRoundRewards(nextState, advanced.completedRoundId)
  }

  const config = getCountryCompetitionConfig(state.championshipId)
  const leagueFinished = matches.every(
    (match) => match.type !== 'league' || match.status === 'played',
  )
  if (leagueFinished) {
    const tables = calculateLeagueTables(nextState.clubs, matches)
    if ((nextState.playoffs?.length ?? 0) === 0) {
      const initialized = initializeCompetitionPlayoffs(config, tables, state.season)
      nextState = { ...nextState, playoffs: initialized.playoffs }
      matches = [...matches, ...initialized.matches]
    } else {
      const advancedPlayoffs = advanceCompetitionPlayoffs(
        nextState.playoffs ?? [],
        matches,
        tables,
        config,
        state.season,
      )
      nextState = { ...nextState, playoffs: advancedPlayoffs.playoffs }
      matches = [...matches, ...advancedPlayoffs.newMatches]
    }
  }

  const resolved = resolveScheduleConflicts(matches, state.season, config.calendar)
  matches = resolved.matches.sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  )

  return {
    ...nextState,
    matches,
    scheduleConflictResolutions: [
      ...(nextState.scheduleConflictResolutions ?? []),
      ...resolved.resolutions,
    ],
    leagueTables: calculateLeagueTables(nextState.clubs, matches),
  }
}

// ПОЛНОСТЬЮ РАЗЫГРЫВАЕТ ОДИН ИГРОВОЙ ДЕНЬ
const simulateOrder = (
  state: GameState,
  order: number,
  userResult?: { matchId: string; result: MatchResult },
): GameState => {
  let nextState = recoverStateBeforeOrder(state, order)
  const matchesForOrder = nextState.matches.filter(
    (match) => match.order === order && match.status === 'scheduled',
  )

  for (const match of matchesForOrder) {
    if (userResult && match.id === userResult.matchId) {
      const lineups = getLineupsForMatch(nextState, match)
      nextState = completeMatch(nextState, match, userResult.result, lineups)
    } else if (isFastLocalMatch(nextState, match)) {
      nextState = completeFastMatch(nextState, match, simulateFastScheduledMatch(nextState, match))
    } else {
      const simulated = simulateScheduledMatch(nextState, match)
      nextState = completeMatch(nextState, match, simulated.result, simulated.lineups)
    }
  }

  return recoverStateAfterCompletedOrder(
    simulateWorldLeagueOrder(advanceCupAndRefreshTables(nextState), order),
    order,
  )
}

// ЗАРАНЕЕ РАССЧИТЫВАЕТ ФОНОВЫЕ МАТЧИ ИГРОВОГО ДНЯ
export const prepareUserMatchDay = (state: GameState, matchId: string): GameState => {
  const userMatch = state.matches.find((match) => match.id === matchId)
  if (!userMatch) {
    throw new Error(`Match not found: ${matchId}`)
  }

  const orders = [
    ...new Set(
      state.matches
        .filter(
          (match) =>
            match.status === 'scheduled' && match.id !== matchId && match.order <= userMatch.order,
        )
        .map((match) => match.order),
    ),
    userMatch.order,
  ].sort((left, right) => left - right)

  let nextState = state
  for (const order of [...new Set(orders)]) {
    nextState = recoverStateBeforeOrder(nextState, order)
    const matchesForOrder = nextState.matches.filter(
      (match) => match.order === order && match.status === 'scheduled' && match.id !== matchId,
    )

    for (const match of matchesForOrder) {
      if (isFastLocalMatch(nextState, match)) {
        nextState = completeFastMatch(
          nextState,
          match,
          simulateFastScheduledMatch(nextState, match),
        )
      } else {
        const simulated = simulateScheduledMatch(nextState, match)
        nextState = completeMatch(nextState, match, simulated.result, simulated.lineups)
      }
    }

    if (order < userMatch.order) {
      nextState = advanceCupAndRefreshTables(nextState)
    }
    nextState = simulateWorldLeagueOrder(nextState, order)
    if (order < userMatch.order) {
      nextState = recoverStateAfterCompletedOrder(nextState, order)
    }
  }

  return nextState
}

// ДОБАВЛЯЕТ РЕЗУЛЬТАТ ПОЛЬЗОВАТЕЛЯ В ГОТОВЫЙ ИГРОВОЙ ДЕНЬ
export const completePreparedUserMatchDay = (
  state: GameState,
  matchId: string,
  result: MatchResult,
): GameState => {
  const match = state.matches.find((candidate) => candidate.id === matchId)
  if (!match) {
    throw new Error(`Match not found: ${matchId}`)
  }

  const lineups = getLineupsForMatch(state, match)
  const completed = completeMatch(state, match, result, lineups)
  return recoverStateAfterCompletedOrder(
    simulateWorldLeagueOrder(advanceCupAndRefreshTables(completed), match.order),
    match.order,
  )
}

// ДОИГРЫВАЕТ ДНИ БЕЗ ПОЛЬЗОВАТЕЛЯ ДО ЕГО СЛЕДУЮЩЕГО МАТЧА
export const settleAiOnlyDaysUntilNextUserMatch = (state: GameState): GameState => {
  let nextState = state
  let safety = 0

  while (safety < 512) {
    safety += 1
    const nextUserMatch = getNextUserMatch(nextState)
    const nextUserOrder = nextUserMatch?.order ?? Number.POSITIVE_INFINITY
    const aiOnlyOrder = nextState.matches
      .filter((match) => match.status === 'scheduled' && match.order < nextUserOrder)
      .filter(
        (match) =>
          match.homeClubId !== nextState.selectedClubId &&
          match.awayClubId !== nextState.selectedClubId,
      )
      .map((match) => match.order)
      .sort((left, right) => left - right)[0]

    if (aiOnlyOrder === undefined) {
      return nextState
    }

    nextState = simulateOrder(nextState, aiOnlyOrder)
  }

  return nextState
}

// ЗАВЕРШАЕТ МАТЧ ПОЛЬЗОВАТЕЛЯ И ДОИГРЫВАЕТ ФОНОВЫЕ ДНИ
export const completeUserMatchDay = (
  state: GameState,
  matchId: string,
  result: MatchResult,
): GameState => {
  const prepared = prepareUserMatchDay(state, matchId)
  return settleAiOnlyDaysUntilNextUserMatch(completePreparedUserMatchDay(prepared, matchId, result))
}

// СОХРАНЯЕТ БЫСТРЫЙ РЕЗУЛЬТАТ БЕЗ СТАТИСТИКИ ИГРОКОВ
const completeFastMatch = (state: GameState, match: Match, result: MatchResult): GameState => {
  const normalizedResult = normalizeMatchResultDiscipline(
    result,
    match.homeClubId,
    match.awayClubId,
  )
  const lineups = getLineupsForMatch(state, match)
  const leagueStats = accumulateMatchPlayerStats(
    state.worldPlayerStats?.[state.championshipId] ?? createInitialPlayerStats(state.clubs),
    state.clubs,
    match,
    normalizedResult,
    lineups,
  )
  return {
    ...state,
    clubs: applySuspensionsAfterMatch(
      applyInjuriesToClubs(state.clubs, normalizedResult.injuries, match.order),
      match,
      normalizedResult.cards,
    ),
    matches: state.matches.map((candidate) =>
      candidate.id === match.id
        ? {
            ...candidate,
            status: 'played' as const,
            result: compactBackgroundResult(normalizedResult),
            lineups: undefined,
          }
        : candidate,
    ),
    playerStats: accumulateMatchPlayerStats(
      state.playerStats,
      state.clubs,
      match,
      normalizedResult,
      lineups,
    ),
    worldPlayerStats: {
      ...state.worldPlayerStats,
      [state.championshipId]: leagueStats,
    },
    lastCompletedOrder: Math.max(state.lastCompletedOrder, match.order),
  }
}

// НАХОДИТ БЛИЖАЙШИЙ НЕСЫГРАННЫЙ МАТЧ КЛУБА ПОЛЬЗОВАТЕЛЯ
export const getNextUserMatch = (state: GameState): Match | undefined => {
  return state.matches
    .filter(
      (match) =>
        match.status === 'scheduled' &&
        (match.homeClubId === state.selectedClubId || match.awayClubId === state.selectedClubId),
    )
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))[0]
}

// ПРОВЕРЯЕТ ЗАВЕРШЕНИЕ ЛИГ И НАЛИЧИЕ ПОБЕДИТЕЛЯ КУБКА
export const isSeasonReadyToFinish = (state: GameState): boolean => {
  const leagueFinished = state.matches.every(
    (match) => match.type !== 'league' || match.status === 'played',
  )
  const cupFinished = Boolean(state.cup.championClubId)
  const playoffRules = getPlayoffRules(getCountryCompetitionConfig(state.championshipId))
  const playoffsFinished =
    playoffRules.length === 0 ||
    (state.playoffs?.length === playoffRules.length &&
      state.playoffs.every((playoff) => playoff.status === 'completed'))
  return leagueFinished && cupFinished && playoffsFinished
}

// СОСТАРИВАЕТ ИГРОКОВ И ОБНОВЛЯЕТ ИХ РЕЙТИНГ, ФОРМУ И ГОТОВНОСТЬ
const progressPlayersForNewSeason = (club: Club, season: number): Club => {
  const random = createSeededRandom(hashString(club.id) + season * 501)

  return {
    ...club,
    squad: club.squad
      .map((player) => {
        let rating = player.rating
        if (player.age < 24) {
          rating = clamp(rating + random.int(0, 2), 1, player.potential)
        } else if (player.age > 31) {
          rating = clamp(rating - random.int(0, 2), 1, player.potential)
        }

        return {
          ...player,
          age: player.age + 1,
          rating,
          fitness: clamp(player.fitness + 55, 1, 100),
          form: clamp(player.form + random.int(-6, 8), 1, 100),
          isInjured: false,
          injuryUntilOrder: undefined,
          suspensionMatchesRemaining: undefined,
          suspensionReason: undefined,
        }
      })
      .filter((player) => player.age <= playerRetirementAge),
  }
}

// ОПРЕДЕЛЯЕТ ДИВИЗИОН ПО ИТОГАМ ПОВЫШЕНИЯ ИЛИ ВЫЛЕТА
// ОПРЕДЕЛЯЕТ, ИСПОЛЬЗУЕТ ЛИ КЛУБ РОССИЙСКУЮ СТРУКТУРУ ЛИГ
// СОПОСТАВЛЯЕТ ДИВИЗИОН РОССИЙСКОГО КЛУБА С ИДЕНТИФИКАТОРОМ ЛИГИ
// ВЫБИРАЕТ ГРУППУ ПРИ ПЕРЕХОДЕ МЕЖДУ НИЗШИМИ ЛИГАМИ
// НАЧИСЛЯЕТ ПРИЗОВЫЕ И ПЕРЕМЕЩАЕТ КЛУБЫ МЕЖДУ ДИВИЗИОНАМИ
const applySeasonRewardsAndMovement = (state: GameState): Club[] => {
  return resolveCompetitionMovements(
    state.clubs,
    state.leagueTables,
    getCountryCompetitionConfig(state.championshipId),
    state.playoffs ?? [],
  )
}

// ЗАВЕРШАЕТ СЕЗОН И СОЗДАЁТ СОСТОЯНИЕ СЛЕДУЮЩЕГО СЕЗОНА
export const finishSeason = (state: GameState): GameState => {
  if (careerConfig.maximumSeasons !== null && state.season >= careerConfig.maximumSeasons) {
    return state
  }

  if (!isSeasonReadyToFinish(state)) {
    throw new Error('Season cannot finish before all league, cup and playoff matches are completed')
  }

  const rewardedAndMoved = applySeasonRewardsAndMovement({
    ...state,
    leagueTables: calculateLeagueTables(state.clubs, state.matches),
  })
  const nextSeason = state.season + 1
  const seasonProgressedClubs = rewardedAndMoved.map((club) =>
    progressPlayersForNewSeason(club, nextSeason),
  )
  const academyProgress = progressAcademiesForNewSeason(
    seasonProgressedClubs,
    state.academies,
    nextSeason,
    state.selectedClubId,
  )
  const progressedClubs = academyProgress.clubs
  const externalClubOverrides: NonNullable<GameState['externalClubOverrides']> = {}
  for (const [championshipId, overrides] of Object.entries(state.externalClubOverrides ?? {})) {
    if (!overrides) continue
    externalClubOverrides[championshipId as ChampionshipId] = Object.fromEntries(
      Object.entries(overrides).map(([clubId, club]) => [
        clubId,
        progressPlayersForNewSeason(club, nextSeason),
      ]),
    )
  }
  const worldClubs = createWorldClubs()
  for (const [championshipId, overrides] of Object.entries(externalClubOverrides)) {
    if (!overrides) continue
    const id = championshipId as ChampionshipId
    worldClubs[id] = worldClubs[id].map((club) =>
      overrides[club.id] ? cloneClub(overrides[club.id]!) : club,
    )
  }
  worldClubs[state.championshipId] = progressedClubs.map(cloneClub)
  const worldMatches = createWorldMatches(worldClubs, nextSeason, state.careerSeed)
  const leagueMatches = worldMatches[state.championshipId].map(cloneMatch)
  const config = getCountryCompetitionConfig(state.championshipId)
  const cup = initializeCup(progressedClubs, nextSeason, state.championshipId, state.careerSeed)
  const scheduled = resolveScheduleConflicts(
    [...leagueMatches, ...cup.matches],
    nextSeason,
    config.calendar,
  )
  const matches = scheduled.matches.sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  )
  const scheduledLeagueMatches = matches.filter((match) => match.type === 'league')
  const syncedWorldMatches = {
    ...worldMatches,
    [state.championshipId]: scheduledLeagueMatches.map(cloneMatch),
  }
  const worldLeagueTables = createWorldLeagueTables(worldClubs, syncedWorldMatches)

  return {
    configVersion: 3,
    careerSeed: state.careerSeed,
    championshipId: state.championshipId,
    selectedClubId: state.selectedClubId,
    season: nextSeason,
    clubs: progressedClubs,
    matches,
    cup: cup.cup,
    playoffs: [],
    scheduleConflictResolutions: scheduled.resolutions,
    lineups: createDefaultLineups(progressedClubs, state.lineups),
    leagueTables: calculateLeagueTables(progressedClubs, matches),
    worldClubs,
    worldMatches: syncedWorldMatches,
    worldLeagueTables,
    playerStats: createInitialPlayerStats(progressedClubs),
    worldPlayerStats: createInitialWorldPlayerStats(worldClubs),
    academies: academyProgress.academies,
    externalClubOverrides,
    lastCompletedOrder: 0,
  }
}

// УДАЛЯЕТ УШЕДШИХ ИГРОКОВ ИЗ СОСТАВОВ ПОСЛЕ ТРАНСФЕРОВ
export const refreshLineupsAfterSquadChange = (state: GameState): Record<string, ClubLineup> => {
  return state.clubs.reduce<Record<string, ClubLineup>>((result, club) => {
    const existing = state.lineups[club.id]
    if (!existing) {
      result[club.id] = autoSelectLineup(club)
      return result
    }

    const availableIds = new Set(club.squad.map((player) => player.id))
    const starters = Object.fromEntries(
      Object.entries(existing.starters).map(([slotId, playerId]) => [
        slotId,
        playerId && availableIds.has(playerId) ? playerId : null,
      ]),
    ) as Record<string, string | null>
    const selectedIds = new Set(
      Object.values(starters).filter(
        (playerId): playerId is string => typeof playerId === 'string',
      ),
    )
    const substitutes = existing.substitutes
      .filter((playerId) => availableIds.has(playerId) && !selectedIds.has(playerId))
      .slice(0, 7)

    result[club.id] = {
      formation: existing.formation,
      tacticalStyle: existing.tacticalStyle,
      starters,
      substitutes,
    }
    return result
  }, {})
}

// ВОЗВРАЩАЕТ СТАРТОВЫХ ИГРОКОВ УПРАВЛЯЕМОГО КЛУБА
export const getUserStarterIds = (state: GameState): string[] => {
  const lineup = state.lineups[state.selectedClubId]
  return lineup ? getStarterIds(lineup) : []
}
