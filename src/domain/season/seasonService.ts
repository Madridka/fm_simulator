import { gameConfig } from '@/config/gameConfig'
import { matchSimulationConfig } from '@/config/matchSimulationConfig'
import { championships, getChampionshipClubs } from '@/data/clubs'
import { advanceCupIfPossible, initializeCup } from '@/domain/competition/cupService'
import { getClubCompetitionId } from '@/domain/competition/competitionIdentity'
import { calculateLeagueTables } from '@/domain/competition/leagueTableService'
import { simulateFastMatch, simulateMatch } from '@/domain/match/matchSimulator'
import { generateLeagueSchedule } from '@/domain/season/scheduleGenerator'
import {
  autoSelectLineup,
  getFormationSlots,
  getStarterIds,
} from '@/domain/season/squadSelectionService'
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
export const recoverInjuredPlayersBeforeOrder = (
  clubs: readonly Club[],
  order: number,
): Club[] =>
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
const recoverStateBeforeOrder = (state: GameState, order: number): GameState =>
  order > state.lastCompletedOrder
    ? { ...state, clubs: recoverInjuredPlayersBeforeOrder(state.clubs, order) }
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
const createLeagueMatches = (clubs: readonly Club[], season: number, championshipId: ChampionshipId): Match[] =>
  generateLeagueSchedule(clubs, season).map((match) => prefixLeagueMatch(championshipId, match))

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
): Record<ChampionshipId, Match[]> => {
  return championshipIds.reduce<Record<ChampionshipId, Match[]>>(
    (result, championshipId) => {
      result[championshipId] = createLeagueMatches(worldClubs[championshipId], season, championshipId)
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
const createEmptyPlayerStats = (): PlayerStats => ({
  appearances: 0,
  goals: 0,
  yellowCards: 0,
  averageRating: 0,
  matchesRated: 0,
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
): GameState => {
  const worldClubs = createWorldClubs()
  const clubs = worldClubs[championshipId].map(cloneClub)
  if (!clubs.some((club) => club.id === selectedClubId)) {
    throw new Error(`Club ${selectedClubId} does not belong to ${championshipId}`)
  }
  const worldMatches = createWorldMatches(worldClubs, 1)
  const leagueMatches = worldMatches[championshipId].map(cloneMatch)
  const cup = initializeCup(clubs, 1)
  const matches = [...leagueMatches, ...cup.matches].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  )
  const syncedWorldMatches = {
    ...worldMatches,
    [championshipId]: leagueMatches.map(cloneMatch),
  }
  const worldLeagueTables = createWorldLeagueTables(worldClubs, syncedWorldMatches)

  return {
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
    lineups: createDefaultLineups(clubs),
    playerStats: createInitialPlayerStats(clubs),
    lastCompletedOrder: 0,
  }
}

// ДОПОЛНЯЕТ НЕПОЛНОЕ СОХРАНЕНИЕ ДАННЫМИ МИРОВЫХ ЛИГ
export const ensureWorldCompetitions = (state: GameState): GameState => {
  const clubs = recoverInjuredPlayersBeforeOrder(state.clubs, state.lastCompletedOrder + 1)
  const existingWorldClubs = state.worldClubs ?? {}
  const worldClubs = championshipIds.reduce<Record<ChampionshipId, Club[]>>(
    (result, championshipId) => {
      const existingClubs = existingWorldClubs[championshipId]
      result[championshipId] =
        championshipId === state.championshipId
          ? clubs.map(cloneClub)
          : existingClubs?.map(cloneClub) ??
            getChampionshipClubs(championshipId).map(cloneClub)
      return result
    },
    {} as Record<ChampionshipId, Club[]>,
  )

  const generatedWorldMatches = createWorldMatches(worldClubs, state.season)
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
          : existingWorldMatches[championshipId]?.map(cloneMatch) ??
            generatedWorldMatches[championshipId]
      return result
    },
    {} as Record<ChampionshipId, Match[]>,
  )
  const worldLeagueTables = createWorldLeagueTables(worldClubs, worldMatches)

  return {
    ...state,
    clubs,
    leagueTables: calculateLeagueTables(clubs, state.matches),
    worldClubs,
    worldMatches,
    worldLeagueTables,
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

  if (starters.length !== 11) {
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
  yellowCards: number,
  rating: number,
): void => {
  const current = stats[playerId] ?? createEmptyPlayerStats()
  const ratedMatches = current.matchesRated + 1
  stats[playerId] = {
    appearances: current.appearances + 1,
    goals: current.goals + goals,
    yellowCards: current.yellowCards + yellowCards,
    matchesRated: ratedMatches,
    averageRating: Number(
      ((current.averageRating * current.matchesRated + rating) / ratedMatches).toFixed(2),
    ),
  }
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
  const allStarterIds = [...lineups.home.starters, ...lineups.away.starters]
  const goalCounts = result.goals.reduce<Record<string, number>>((counts, goal) => {
    counts[goal.playerId] = (counts[goal.playerId] ?? 0) + 1
    return counts
  }, {})
  const bookingCounts: Record<string, number> = {}
  const recordedYellowCards = result.cards?.filter((card) => card.card === 'yellow') ?? []

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

  for (const playerId of allStarterIds) {
    const isHomePlayer = lineups.home.starters.includes(playerId)
    const teamWon = isHomePlayer ? homeWon : awayWon
    const teamLost = isHomePlayer
      ? awayWon && result.homeGoals !== result.awayGoals
      : homeWon && result.homeGoals !== result.awayGoals
    const goals = goalCounts[playerId] ?? 0
    const yellowCards = bookingCounts[playerId] ?? 0
    const matchRating = clamp(
      6 +
        goals * 0.8 +
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

    updatePlayerStats(playerStats, playerId, goals, yellowCards, matchRating)
  }

  return {
    ...state,
    clubs,
    playerStats,
  }
}

// СОХРАНЯЕТ РЕЗУЛЬТАТ МАТЧА И ЕГО ПОСЛЕДСТВИЯ В СОСТОЯНИЕ
const completeMatch = (
  state: GameState,
  match: Match,
  result: MatchResult,
  lineups: MatchLineups,
): GameState => {
  const updatedMatches = state.matches.map((candidate) => {
    if (candidate.id !== match.id) {
      return candidate
    }

    return {
      ...candidate,
      status: 'played' as const,
      result,
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
    result,
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
        allowPenaltyShootout: match.type === 'cup',
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
const simulateFastScheduledMatch = (state: GameState, match: Match): MatchResult =>
  simulateFastMatch({
    matchId: match.id,
    homeClub: getClub(state.clubs, match.homeClubId),
    awayClub: getClub(state.clubs, match.awayClubId),
    neutralVenue: match.neutralVenue,
    allowPenaltyShootout: false,
    seed: hashString(match.id) + state.season * 10_000,
  })

// РАССЧИТЫВАЕТ ИГРОВОЙ ДЕНЬ ВО ВСЕХ ФОНОВЫХ ЛИГАХ
const simulateWorldLeagueOrder = (state: GameState, order: number): GameState => {
  const hydrated = ensureWorldCompetitions(state)
  const worldClubs = { ...hydrated.worldClubs } as Record<ChampionshipId, Club[]>
  const worldMatches = { ...hydrated.worldMatches } as Record<ChampionshipId, Match[]>

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
      const result = simulateFastMatch({
        matchId: match.id,
        homeClub,
        awayClub,
        neutralVenue: match.neutralVenue,
        allowPenaltyShootout: false,
        seed: hashString(match.id) + hydrated.season * 10_000,
      })
      worldClubs[championshipId] = applyInjuriesToClubs(
        worldClubs[championshipId],
        result.injuries,
        match.order,
      )

      return {
        ...match,
        status: 'played' as const,
        result,
      }
    })
  }

  return {
    ...hydrated,
    worldClubs,
    worldMatches,
    worldLeagueTables: createWorldLeagueTables(worldClubs, worldMatches),
  }
}

// НАЧИСЛЯЕТ ПРИЗОВЫЕ ЗА ПРОХОЖДЕНИЕ СТАДИИ КУБКА
const applyCupRoundRewards = (state: GameState, completedRoundId: string): GameState => {
  const reward = gameConfig.cupRoundRewards[completedRoundId] ?? 0
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

  const extraWinnerReward = completedRoundId === 'final' ? gameConfig.cupWinnerReward : 0

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
  const matches = [...state.matches, ...advanced.newMatches].sort(
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

  return {
    ...nextState,
    leagueTables: calculateLeagueTables(nextState.clubs, nextState.matches),
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

  while (safety < 32) {
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
  return settleAiOnlyDaysUntilNextUserMatch(
    completePreparedUserMatchDay(prepared, matchId, result),
  )
}

// СОХРАНЯЕТ БЫСТРЫЙ РЕЗУЛЬТАТ БЕЗ СТАТИСТИКИ ИГРОКОВ
const completeFastMatch = (state: GameState, match: Match, result: MatchResult): GameState => {
  return {
    ...state,
    clubs: applyInjuriesToClubs(state.clubs, result.injuries, match.order),
    matches: state.matches.map((candidate) =>
      candidate.id === match.id
        ? { ...candidate, status: 'played' as const, result, lineups: undefined }
        : candidate,
    ),
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
  return leagueFinished && cupFinished
}

// СОСТАРИВАЕТ ИГРОКОВ И ОБНОВЛЯЕТ ИХ РЕЙТИНГ, ФОРМУ И ГОТОВНОСТЬ
const progressPlayersForNewSeason = (club: Club, season: number): Club => {
  const random = createSeededRandom(hashString(club.id) + season * 501)

  return {
    ...club,
    squad: club.squad.map((player) => {
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
        fitness: clamp(player.fitness + 24, 1, 100),
        form: clamp(player.form + random.int(-6, 8), 1, 100),
        isInjured: false,
        injuryUntilOrder: undefined,
      }
    }),
  }
}

// ОПРЕДЕЛЯЕТ ДИВИЗИОН ПО ИТОГАМ ПОВЫШЕНИЯ ИЛИ ВЫЛЕТА
export const getNextDivisionId = (
  divisionId: number,
  position: number,
  clubsInDivision = gameConfig.clubsPerDivision,
  divisionsCount = gameConfig.divisionsCount,
): number => {
  if (position <= gameConfig.promotedClubsCount && divisionId > 1) {
    return divisionId - 1
  }

  if (
    position > clubsInDivision - gameConfig.relegatedClubsCount &&
    divisionId < divisionsCount
  ) {
    return divisionId + 1
  }

  return divisionId
}

// ОПРЕДЕЛЯЕТ, ИСПОЛЬЗУЕТ ЛИ КЛУБ РОССИЙСКУЮ СТРУКТУРУ ЛИГ
const isRussianClub = (club: Club): boolean => Boolean(club.leagueId || club.groupId)

// СОПОСТАВЛЯЕТ ДИВИЗИОН РОССИЙСКОГО КЛУБА С ИДЕНТИФИКАТОРОМ ЛИГИ
const getRussianLeagueIdForDivision = (club: Club, divisionId: number): string | undefined => {
  if (!isRussianClub(club)) {
    return undefined
  }

  if (divisionId === 1) return 'rpl'
  if (divisionId === 2) return 'first-league'
  if (divisionId === 3) return 'second-league-a'
  if (divisionId === 4) return 'second-league-b'
  return undefined
}

// ВЫБИРАЕТ ГРУППУ ПРИ ПЕРЕХОДЕ МЕЖДУ НИЗШИМИ ЛИГАМИ
const getRussianGroupIdForDivision = (
  club: Club,
  nextDivisionId: number,
): string | undefined => {
  if (!isRussianClub(club)) {
    return undefined
  }

  if (nextDivisionId === 3) {
    if (club.divisionId < nextDivisionId) {
      return 'gold'
    }

    if (club.divisionId > nextDivisionId) {
      return 'silver'
    }

    return club.groupId === 'gold' || club.groupId === 'silver' ? club.groupId : 'silver'
  }

  if (nextDivisionId === 4) {
    return club.groupId?.startsWith('group-') ? club.groupId : 'group-1'
  }

  return undefined
}

// НАЧИСЛЯЕТ ПРИЗОВЫЕ И ПЕРЕМЕЩАЕТ КЛУБЫ МЕЖДУ ДИВИЗИОНАМИ
const applySeasonRewardsAndMovement = (state: GameState): Club[] => {
  const tableRows = Object.values(state.leagueTables).flat()
  const rowByClubId = new Map(tableRows.map((row) => [row.clubId, row]))
  const competitionSizes = Object.fromEntries(
    Object.entries(state.leagueTables).map(([competitionId, rows]) => [competitionId, rows.length]),
  )
  const divisionSizes = state.clubs.reduce<Record<number, number>>((sizes, club) => {
    sizes[club.divisionId] = (sizes[club.divisionId] ?? 0) + 1
    return sizes
  }, {})
  const divisionsCount = Math.max(...Object.keys(divisionSizes).map(Number))

  return state.clubs.map((club) => {
    const row = rowByClubId.get(club.id)
    if (!row) {
      return cloneClub(club)
    }

    const reward = gameConfig.seasonRewards[club.divisionId]?.[row.position - 1] ?? 0
    const divisionId = getNextDivisionId(
      club.divisionId,
      row.position,
      competitionSizes[row.competitionId] ?? divisionSizes[club.divisionId],
      divisionsCount,
    )
    const promoted = divisionId < club.divisionId

    return {
      ...cloneClub(club),
      divisionId,
      leagueId: getRussianLeagueIdForDivision(club, divisionId) ?? club.leagueId,
      groupId: getRussianGroupIdForDivision(club, divisionId),
      budget: club.budget + reward + (promoted ? gameConfig.promotionReward : 0),
    }
  })
}

// ЗАВЕРШАЕТ СЕЗОН И СОЗДАЁТ СОСТОЯНИЕ СЛЕДУЮЩЕГО СЕЗОНА
export const finishSeason = (state: GameState): GameState => {
  if (state.season >= gameConfig.maximumSeasons) {
    return state
  }

  const rewardedAndMoved = applySeasonRewardsAndMovement({
    ...state,
    leagueTables: calculateLeagueTables(state.clubs, state.matches),
  })
  const nextSeason = state.season + 1
  const progressedClubs = rewardedAndMoved.map((club) =>
    progressPlayersForNewSeason(club, nextSeason),
  )
  const worldClubs = createWorldClubs()
  worldClubs[state.championshipId] = progressedClubs.map(cloneClub)
  const worldMatches = createWorldMatches(worldClubs, nextSeason)
  const leagueMatches = worldMatches[state.championshipId].map(cloneMatch)
  const cup = initializeCup(progressedClubs, nextSeason)
  const matches = [...leagueMatches, ...cup.matches].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  )
  const syncedWorldMatches = {
    ...worldMatches,
    [state.championshipId]: leagueMatches.map(cloneMatch),
  }
  const worldLeagueTables = createWorldLeagueTables(worldClubs, syncedWorldMatches)

  return {
    championshipId: state.championshipId,
    selectedClubId: state.selectedClubId,
    season: nextSeason,
    clubs: progressedClubs,
    matches,
    cup: cup.cup,
    lineups: createDefaultLineups(progressedClubs, state.lineups),
    leagueTables: calculateLeagueTables(progressedClubs, matches),
    worldClubs,
    worldMatches: syncedWorldMatches,
    worldLeagueTables,
    playerStats: createInitialPlayerStats(progressedClubs),
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
