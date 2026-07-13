import { matchEngineConfig } from '@/data/gameConfig/matchEngine'
import { matchSimulationConfig } from '@/config/matchSimulationConfig'
import { getSimulationSettings } from '@/domain/admin/simulationSettings'
import { t } from '@/plugins/i18n/i18n'
import type {
  CardEvent,
  Club,
  CommentaryEvent,
  GoalEvent,
  InjuryEvent,
  MatchResult,
  MatchSimulationDetail,
  MatchTeamStats,
  PlayedLineup,
  Player,
  PlayerPosition,
  SubstitutionEvent,
  TacticalStyle,
} from '@/types/football'
import { clamp, createSeededRandom, type RandomGenerator } from '@/utils/random'
import { formatPlayerName } from '@/utils/format'
import {
  defaultRoleForPosition,
  getFormationSlots,
  getPositionFit,
} from '@/domain/season/squadSelectionService'
import { isPlayerUnavailable } from '@/domain/season/playerAvailability'
import { normalizeCardEvents } from '@/domain/match/disciplineService'
import { calculateClubRating } from '@/domain/club/teamRating'
import { getPlayerRole } from '@/domain/tactics/playerRoles'

export interface MatchSimulationInput {
  matchId: string
  homeClub: Club
  awayClub: Club
  homeLineup: PlayedLineup
  awayLineup: PlayedLineup
  neutralVenue: boolean
  allowPenaltyShootout: boolean
  seed?: number
}

export type FastMatchSimulationInput = Omit<MatchSimulationInput, 'homeLineup' | 'awayLineup'> & {
  homeLineup?: PlayedLineup
  awayLineup?: PlayedLineup
}

export interface MinuteSnapshot {
  minute: number
  homeGoals: number
  awayGoals: number
  goals: GoalEvent[]
  stats: {
    home: MatchTeamStats
    away: MatchTeamStats
  }
}

export interface MatchTimeline {
  finalResult: MatchResult
  minutes: MinuteSnapshot[]
}

interface TeamMetrics {
  attack: number
  midfield: number
  defense: number
  overall: number
  players: Player[]
  lineup: PlayedLineup
}

interface RunningState {
  homeGoals: number
  awayGoals: number
  goals: GoalEvent[]
  homeStats: MatchTeamStats
  awayStats: MatchTeamStats
  playerScores: Map<string, number>
}

const positionLine: Record<PlayerPosition, 'attack' | 'midfield' | 'defense'> = {
  GK: 'defense',
  LB: 'defense',
  CB: 'defense',
  RB: 'defense',
  CDM: 'midfield',
  CM: 'midfield',
  CAM: 'midfield',
  LW: 'attack',
  RW: 'attack',
  ST: 'attack',
}

const tacticalModifiers: Record<
  TacticalStyle,
  { attack: number; midfield: number; defense: number }
> = {
  defensive: { attack: -5, midfield: 1, defense: 6 },
  balanced: { attack: 0, midfield: 0, defense: 0 },
  attacking: { attack: 6, midfield: 1, defense: -5 },
}

// ПРЕОБРАЗУЕТ ИДЕНТИФИКАТОР МАТЧА В СТАБИЛЬНОЕ ЧИСЛО ДЛЯ ГЕНЕРАТОРА
const hashString = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2_147_483_647
  }
  return hash || 1
}

// КЛОНИРУЕТ СТАТИСТИКУ КОМАНДЫ ДЛЯ НЕИЗМЕНЯЕМОГО СНИМКА МИНУТЫ
const cloneStats = (stats: MatchTeamStats): MatchTeamStats => ({ ...stats })

// РАССЧИТЫВАЕТ СИЛУ ИГРОКА С УЧЁТОМ ФОРМЫ И ФИЗИЧЕСКОГО СОСТОЯНИЯ
const playerEffectiveRating = (player: Player): number => {
  return player.rating * 0.76 + player.form * 0.14 + player.fitness * 0.1
}

// ВЫЧИСЛЯЕТ СРЕДНЕЕ ЗНАЧЕНИЕ ИЛИ ВОЗВРАЩАЕТ РЕЗЕРВНОЕ
const average = (values: readonly number[], fallback: number): number => {
  if (values.length === 0) {
    return fallback
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

// ОЦЕНИВАЕТ СРЕДНЮЮ СИЛУ ЗАДАННОЙ ЛИНИИ КОМАНДЫ
const getLineAverage = (
  players: readonly Player[],
  line: 'attack' | 'midfield' | 'defense',
  fallback: number,
): number => {
  const ratings = players
    .filter((player) => positionLine[player.position] === line)
    .map(playerEffectiveRating)

  return average(ratings, fallback)
}

// ПОЛУЧАЕТ ИГРОКОВ СТАРТОВОГО СОСТАВА ИЗ СОСТАВА КЛУБА
const getLineupPlayers = (club: Club, lineup: PlayedLineup): Player[] => {
  const playersById = new Map(club.squad.map((player) => [player.id, player]))
  const players = lineup.starters
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is Player => Boolean(player))

  if (players.length !== 11) {
    throw new Error(`Lineup for ${club.name} must contain 11 existing players`)
  }

  return players
}

const roleLineBonus = (
  lineup: PlayedLineup,
  players: readonly Player[],
  line: 'attack' | 'midfield' | 'defense',
): number => {
  const slots = getFormationSlots(lineup.formation)
  const values = slots.map((slot, index) => {
    const player = players[index]
    if (!player || positionLine[player.position] !== line) return 0
    const roleId = lineup.roles?.[slot.id] ?? defaultRoleForPosition(slot.position)
    const effects = getPlayerRole(roleId).effects
    if (line === 'attack') return effects.attack * 0.32 + effects.control * 0.08
    if (line === 'midfield') return effects.control * 0.28 + effects.pressing * 0.12
    return effects.defense * 0.32 - Math.max(0, effects.risk) * 0.08
  })
  return average(values.filter((value) => value !== 0), 0)
}

// СОБИРАЕТ АТАКУ, ПОЛУЗАЩИТУ И ЗАЩИТУ КОМАНДЫ ДЛЯ СИМУЛЯЦИИ
const createTeamMetrics = (
  club: Club,
  lineup: PlayedLineup,
  isHome: boolean,
  neutralVenue: boolean,
): TeamMetrics => {
  const players = getLineupPlayers(club, lineup)
  const modifiers = tacticalModifiers[lineup.tacticalStyle]
  const homeBonus = isHome && !neutralVenue ? matchEngineConfig.homeAdvantage : 0
  const lineupFallback = average(
    players.map(playerEffectiveRating),
    calculateClubRating(club, lineup),
  )
  const attack =
    getLineAverage(players, 'attack', lineupFallback) +
    modifiers.attack +
    roleLineBonus(lineup, players, 'attack') +
    homeBonus * 0.45
  const midfield =
    getLineAverage(players, 'midfield', lineupFallback) +
    modifiers.midfield +
    roleLineBonus(lineup, players, 'midfield') +
    homeBonus * 0.25
  const defense =
    getLineAverage(players, 'defense', lineupFallback) +
    modifiers.defense +
    roleLineBonus(lineup, players, 'defense') +
    homeBonus * 0.3

  return {
    attack: clamp(attack, 1, 110),
    midfield: clamp(midfield, 1, 110),
    defense: clamp(defense, 1, 110),
    overall: clamp((attack + midfield + defense) / 3, 1, 110),
    players,
    lineup,
  }
}

// СОЗДАЁТ НАЧАЛЬНОЕ СОСТОЯНИЕ ПОМИНУТНОЙ СИМУЛЯЦИИ
const initializeRunningState = (
  home: TeamMetrics,
  away: TeamMetrics,
  random: RandomGenerator,
): RunningState => {
  const midfieldDifference = home.midfield - away.midfield
  const homePossession = Math.round(
    clamp(50 + midfieldDifference * 0.42 + random.int(-4, 4), 35, 65),
  )

  const playerScores = new Map<string, number>()
  for (const player of [...home.players, ...away.players]) {
    playerScores.set(player.id, playerEffectiveRating(player) + random.int(-5, 5))
  }

  return {
    homeGoals: 0,
    awayGoals: 0,
    goals: [],
    homeStats: {
      possession: homePossession,
      shots: 0,
      shotsOnTarget: 0,
      yellowCards: 0,
      redCards: 0,
      xG: 0,
    },
    awayStats: {
      possession: 100 - homePossession,
      shots: 0,
      shotsOnTarget: 0,
      yellowCards: 0,
      redCards: 0,
      xG: 0,
    },
    playerScores,
  }
}

// ЗАДАЁТ ВЕС ВЕРОЯТНОСТИ ГОЛА В ЗАВИСИМОСТИ ОТ ПОЗИЦИИ
const goalScorerWeight = (position: PlayerPosition): number => {
  if (position === 'ST') {
    return 5
  }
  if (position === 'LW' || position === 'RW') {
    return 3.5
  }
  if (position === 'CAM') {
    return 3
  }
  if (position === 'CM') {
    return 1.8
  }
  if (position === 'CDM') {
    return 0.9
  }
  if (position === 'GK') {
    return 0.005
  }
  return 0.45
}

// ВЫБИРАЕТ АВТОРА ГОЛА ПО ВЗВЕШЕННОЙ ВЕРОЯТНОСТИ
const pickGoalScorer = (players: readonly Player[], random: RandomGenerator): Player => {
  const goalkeeper = players.find((player) => player.position === 'GK')
  const goalkeeperChance = getSimulationSettings().goalkeeperGoalChancePercent / 100
  if (goalkeeper && random.chance(goalkeeperChance)) return goalkeeper
  const outfieldPlayers = players.filter((player) => player.position !== 'GK')
  const scorerCandidates = outfieldPlayers.length ? outfieldPlayers : players
  const weighted = scorerCandidates.map((player) => ({
    player,
    weight: goalScorerWeight(player.position) + player.rating / 35,
  }))
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
  let roll = random.next() * totalWeight

  for (const item of weighted) {
    roll -= item.weight
    if (roll <= 0) {
      return item.player
    }
  }

  const fallback = players[0]
  if (!fallback) {
    throw new Error('Cannot pick a scorer without players')
  }
  return fallback
}

const pickGoalAssister = (
  players: readonly Player[],
  scorerId: string,
  random: RandomGenerator,
): Player | undefined => {
  if (!random.chance(0.78)) return undefined
  const candidates = players.filter((player) => player.id !== scorerId)
  if (!candidates.length) return undefined
  const weight = (player: Player): number => {
    if (player.position === 'CAM') return 5
    if (player.position === 'LW' || player.position === 'RW') return 4
    if (player.position === 'CM') return 3.2
    if (player.position === 'ST') return 2.4
    if (player.position === 'CDM') return 1.6
    return 0.8
  }
  const total = candidates.reduce((sum, player) => sum + weight(player), 0)
  let roll = random.next() * total
  for (const player of candidates) {
    roll -= weight(player)
    if (roll <= 0) return player
  }
  return candidates[0]
}

// ИЗМЕНЯЕТ ВНУТРЕННЮЮ ОЦЕНКУ ИГРОКА ДЛЯ ВЫБОРА ЛУЧШЕГО
const addPlayerScore = (scores: Map<string, number>, playerId: string, delta: number): void => {
  scores.set(playerId, (scores.get(playerId) ?? 0) + delta)
}

// РАЗЫГРЫВАЕТ ОДНУ АТАКУ И ПРИ УСПЕХЕ ДОБАВЛЯЕТ УДАР И ГОЛ
const processAttack = (
  minute: number,
  attackingClub: Club,
  attacking: TeamMetrics,
  defending: TeamMetrics,
  attackingStats: MatchTeamStats,
  addGoal: (goal: GoalEvent) => void,
  state: RunningState,
  random: RandomGenerator,
): void => {
  const attackConfig = matchSimulationConfig.attack
  const edge = attacking.attack - defending.defense
  const randomness = (random.next() - 0.5) * matchEngineConfig.randomnessFactor
  const shotChance = clamp(
    attackConfig.shotChance.base +
      attacking.attack * attackConfig.shotChance.attackRatingFactor +
      edge * attackConfig.shotChance.defenseEdgeFactor +
      randomness * attackConfig.shotChance.randomnessFactor,
    attackConfig.shotChance.min,
    attackConfig.shotChance.max,
  )

  if (!random.chance(shotChance)) {
    return
  }

  attackingStats.shots += 1

  const onTargetChance = clamp(
    attackConfig.shotOnTargetChance.base +
      edge * attackConfig.shotOnTargetChance.defenseEdgeFactor +
      attacking.midfield * attackConfig.shotOnTargetChance.midfieldRatingFactor,
    attackConfig.shotOnTargetChance.min,
    attackConfig.shotOnTargetChance.max,
  )
  const chanceQuality = clamp(
    attackConfig.xGPerShot.base +
      edge * attackConfig.xGPerShot.defenseEdgeFactor +
      attacking.attack * attackConfig.xGPerShot.attackRatingFactor,
    attackConfig.xGPerShot.min,
    attackConfig.xGPerShot.max,
  )
  attackingStats.xG = Number(((attackingStats.xG ?? 0) + chanceQuality).toFixed(2))
  if (!random.chance(onTargetChance)) {
    return
  }

  attackingStats.shotsOnTarget += 1

  const goalChance = clamp(
    attackConfig.goalChance.base +
      edge * attackConfig.goalChance.defenseEdgeFactor +
      attacking.attack * attackConfig.goalChance.attackRatingFactor,
    attackConfig.goalChance.min,
    attackConfig.goalChance.max,
  )
  if (!random.chance(goalChance)) {
    return
  }

  const scorer = pickGoalScorer(attacking.players, random)
  const assister = pickGoalAssister(attacking.players, scorer.id, random)
  addPlayerScore(state.playerScores, scorer.id, 24)
  if (assister) addPlayerScore(state.playerScores, assister.id, 10)
  addGoal({
    minute,
    clubId: attackingClub.id,
    playerId: scorer.id,
    playerName: formatPlayerName(scorer.firstName, scorer.lastName),
    assistPlayerId: assister?.id,
    assistPlayerName: assister
      ? formatPlayerName(assister.firstName, assister.lastName)
      : undefined,
  })
}

// РАССЧИТЫВАЕТ ВЕРОЯТНОСТЬ НАРУШЕНИЯ И КАРТОЧКИ НА МИНУТЕ
const processDiscipline = (
  minute: number,
  clubId: string,
  team: TeamMetrics,
  stats: MatchTeamStats,
  state: RunningState,
  cards: CardEvent[],
  random: RandomGenerator,
): void => {
  const config = matchSimulationConfig.yellowCard
  const defensiveStylePenalty =
    team.lineup.tacticalStyle === 'defensive' ? config.defensiveStylePenalty : 0
  const chance = clamp(
    config.baseChancePerMinute +
      defensiveStylePenalty +
      (100 - team.defense) * config.defenseRatingFactor,
    config.minChancePerMinute,
    config.maxChancePerMinute,
  )
  if (!team.players.length || !random.chance(chance)) {
    return
  }

  stats.yellowCards += 1
  const bookedPlayer = random.pick(team.players)
  cards.push({ minute, clubId, playerId: bookedPlayer.id, card: 'yellow' })
  addPlayerScore(state.playerScores, bookedPlayer.id, -6)
  const previousYellow = cards.some(
    (card, index) =>
      index < cards.length - 1 &&
      card.clubId === clubId &&
      card.playerId === bookedPlayer.id &&
      card.card === 'yellow',
  )
  if (previousYellow) {
    stats.redCards = (stats.redCards ?? 0) + 1
    team.players.splice(
      team.players.findIndex((player) => player.id === bookedPlayer.id),
      1,
    )
  }
}

export const removeGoalsAfterPlayerExit = (
  goals: readonly GoalEvent[],
  cards: readonly CardEvent[],
  injuries: readonly InjuryEvent[],
): GoalEvent[] => {
  const exitMinuteByPlayer = new Map<string, number>()
  const playerKey = (clubId: string, playerId: string): string => `${clubId}:${playerId}`
  const registerExit = (clubId: string, playerId: string, minute: number | undefined): void => {
    if (minute === undefined) return
    const key = playerKey(clubId, playerId)
    exitMinuteByPlayer.set(key, Math.min(exitMinuteByPlayer.get(key) ?? 91, minute))
  }
  cards
    .filter((card) => card.card === 'red')
    .forEach((card) => registerExit(card.clubId, card.playerId, card.minute))
  injuries.forEach((injury) => registerExit(injury.clubId, injury.playerId, injury.minute))

  return goals.flatMap((goal) => {
    const scorerExit = exitMinuteByPlayer.get(playerKey(goal.clubId, goal.playerId))
    if (scorerExit !== undefined && goal.minute >= scorerExit) return []
    const assisterExit = goal.assistPlayerId
      ? exitMinuteByPlayer.get(playerKey(goal.clubId, goal.assistPlayerId))
      : undefined
    return [
      assisterExit !== undefined && goal.minute >= assisterExit
        ? { ...goal, assistPlayerId: undefined, assistPlayerName: undefined }
        : { ...goal },
    ]
  })
}

// ВЫБИРАЕТ ЛУЧШЕГО ИГРОКА ПО НАКОПЛЕННЫМ БАЛЛАМ СОБЫТИЙ
const pickBestPlayer = (scores: Map<string, number>): string => {
  let bestPlayerId = ''
  let bestScore = Number.NEGATIVE_INFINITY

  for (const [playerId, score] of scores) {
    if (score > bestScore) {
      bestScore = score
      bestPlayerId = playerId
    }
  }

  return bestPlayerId
}

// ГЕНЕРИРУЕТ ЧИСЛО ГОЛОВ ИЗ XG ПО РАСПРЕДЕЛЕНИЮ ПУАССОНА
const sampleGoals = (expectedGoals: number, random: RandomGenerator): number => {
  const limit = Math.exp(-expectedGoals)
  let product = 1
  let count = 0

  do {
    count += 1
    product *= random.next()
  } while (product > limit && count < 10)

  return Math.max(0, count - 1)
}

// СОЗДАЁТ СОБЫТИЯ ГОЛОВ С АВТОРАМИ И МИНУТАМИ
const createGoalEvents = (
  count: number,
  club: Club,
  players: readonly Player[],
  random: RandomGenerator,
): GoalEvent[] =>
  Array.from({ length: count }, () => {
    const scorer = pickGoalScorer(players, random)
    const assister = pickGoalAssister(players, scorer.id, random)
    return {
      minute: random.int(3, 90),
      clubId: club.id,
      playerId: scorer.id,
      playerName: formatPlayerName(scorer.firstName, scorer.lastName),
      assistPlayerId: assister?.id,
      assistPlayerName: assister
        ? formatPlayerName(assister.firstName, assister.lastName)
        : undefined,
    }
  })

// РАСПРЕДЕЛЯЕТ ЖЁЛТЫЕ И КРАСНЫЕ КАРТОЧКИ МЕЖДУ ИГРОКАМИ
const createCardEvents = (
  home: TeamMetrics,
  away: TeamMetrics,
  homeClubId: string,
  awayClubId: string,
  homeYellowCards: number,
  awayYellowCards: number,
  random: RandomGenerator,
  includeMinutes: boolean,
): CardEvent[] => {
  // СОЗДАЁТ НАБОР КАРТОЧЕК ДЛЯ ОДНОЙ КОМАНДЫ
  const createForTeam = (team: TeamMetrics, clubId: string, yellowCards: number): CardEvent[] => {
    const cards: CardEvent[] = Array.from({ length: yellowCards }, () => ({
      minute: includeMinutes ? random.int(8, 89) : undefined,
      clubId,
      playerId: random.pick(team.players).id,
      card: 'yellow' as const,
    }))

    if (random.chance(matchSimulationConfig.redCard.chancePerTeam)) {
      cards.push({
        minute: includeMinutes ? random.int(35, 89) : undefined,
        clubId,
        playerId: random.pick(team.players).id,
        card: 'red',
        dismissalReason: 'direct-red',
      })
    }
    return cards
  }

  return normalizeCardEvents([
    ...createForTeam(home, homeClubId, homeYellowCards),
    ...createForTeam(away, awayClubId, awayYellowCards),
  ])
}

// ГЕНЕРИРУЕТ ТРАВМЫ И СРОКИ ВОССТАНОВЛЕНИЯ ДЛЯ ОБЕИХ КОМАНД
const createInjuryEvents = (
  home: TeamMetrics,
  away: TeamMetrics,
  homeClubId: string,
  awayClubId: string,
  random: RandomGenerator,
  includeMinutes: boolean,
): InjuryEvent[] => {
  const config = matchSimulationConfig.injury
  const injuries: InjuryEvent[] = []
  if (random.chance(config.chancePerTeam)) {
    injuries.push({
      minute: includeMinutes ? random.int(config.minMinute, config.maxMinute) : undefined,
      clubId: homeClubId,
      playerId: random.pick(home.players).id,
      durationMatchdays: random.int(config.minDurationMatchdays, config.maxDurationMatchdays),
    })
  }
  if (random.chance(config.chancePerTeam)) {
    injuries.push({
      minute: includeMinutes ? random.int(config.minMinute, config.maxMinute) : undefined,
      clubId: awayClubId,
      playerId: random.pick(away.players).id,
      durationMatchdays: random.int(config.minDurationMatchdays, config.maxDurationMatchdays),
    })
  }
  return injuries
}

// СОЗДАЁТ ПОЗИЦИОННО СОВМЕСТИМЫЕ ЗАМЕНЫ БЕЗ УЧАСТИЯ ВРАТАРЯ
const createSubstitutions = (
  club: Club,
  lineup: PlayedLineup,
  random: RandomGenerator,
): SubstitutionEvent[] => {
  const config = matchSimulationConfig.substitutions
  const playersById = new Map(club.squad.map((player) => [player.id, player]))
  const substitutes = lineup.substitutes
    .map((playerId) => playersById.get(playerId))
    .filter(
      (player): player is Player =>
        player !== undefined &&
        !lineup.starters.includes(player.id) &&
        !isPlayerUnavailable(player),
    )
  const starters = lineup.starters.filter(
    (playerId) => playersById.get(playerId)?.position !== 'GK',
  )
  const count = Math.min(
    random.int(config.minCount, config.maxCount),
    substitutes.length,
    starters.length,
  )

  const events: SubstitutionEvent[] = []

  for (let index = 0; index < count; index += 1) {
    const viableStarters = starters.filter((playerId) => {
      const playerOut = playersById.get(playerId)
      return Boolean(
        playerOut &&
        substitutes.some((playerIn) => getPositionFit(playerOut.position, playerIn.position) <= 1),
      )
    })
    if (viableStarters.length === 0) {
      break
    }

    const playerOutId = random.pick(viableStarters)
    const playerOut = playersById.get(playerOutId)
    if (!playerOut) {
      break
    }

    const compatibleSubstitutes = substitutes.filter(
      (player) => getPositionFit(playerOut.position, player.position) <= 1,
    )
    const bestFit = Math.min(
      ...compatibleSubstitutes.map((player) => getPositionFit(playerOut.position, player.position)),
    )
    const bestSubstitutes = compatibleSubstitutes.filter(
      (player) => getPositionFit(playerOut.position, player.position) === bestFit,
    )
    const playerIn = random.pick(bestSubstitutes)

    starters.splice(starters.indexOf(playerOutId), 1)
    substitutes.splice(
      substitutes.findIndex((player) => player.id === playerIn.id),
      1,
    )
    events.push({
      minute: clamp(
        random.int(config.minMinute, config.maxMinute - config.maxCount + 1) + index,
        config.minMinute,
        config.maxMinute,
      ),
      clubId: club.id,
      playerOutId,
      playerInId: playerIn.id,
    })
  }

  return events
}

// ОБЪЕДИНЯЕТ ВСЕ СОБЫТИЯ В ТЕКСТОВУЮ ХРОНОЛОГИЮ МАТЧА
const createCommentary = (
  goals: readonly GoalEvent[],
  cards: readonly CardEvent[],
  injuries: readonly InjuryEvent[],
  substitutions: readonly SubstitutionEvent[],
  homeClub: Club,
  awayClub: Club,
): CommentaryEvent[] => {
  // НАХОДИТ ОТОБРАЖАЕМОЕ ИМЯ ИГРОКА В НУЖНОМ КЛУБЕ
  const getPlayerName = (clubId: string, playerId: string): string => {
    const club = clubId === homeClub.id ? homeClub : awayClub
    const player = club.squad.find((candidate) => candidate.id === playerId)
    return player ? formatPlayerName(player.firstName, player.lastName) : playerId
  }

  // СКЛОНЯЕТ КОЛИЧЕСТВО ПРОПУЩЕННЫХ ИЗ-ЗА ТРАВМЫ МАТЧЕЙ
  const formatMatchdays = (duration: number): string => {
    const lastTwoDigits = duration % 100
    const lastDigit = duration % 10
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return t('match.commentary.matchesMany', { count: duration })
    }
    if (lastDigit === 1) {
      return t('match.commentary.matchesOne', { count: duration })
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
      return t('match.commentary.matchesFew', { count: duration })
    }
    return t('match.commentary.matchesMany', { count: duration })
  }

  // ФОРМИРУЕТ ЧИТАЕМУЮ СТРОКУ ЗАМЕНЫ ДЛЯ ТРАНСЛЯЦИИ
  const substitutionText = (substitution: SubstitutionEvent): string => {
    const club = substitution.clubId === homeClub.id ? homeClub : awayClub
    const playerOut = club.squad.find((player) => player.id === substitution.playerOutId)
    const playerIn = club.squad.find((player) => player.id === substitution.playerInId)
    const playerOutName = playerOut
      ? formatPlayerName(playerOut.firstName, playerOut.lastName)
      : substitution.playerOutId
    const playerInName = playerIn
      ? formatPlayerName(playerIn.firstName, playerIn.lastName)
      : substitution.playerInId

    return t('match.commentary.substitution', {
      club: club.shortName,
      playerOut: playerOutName,
      playerIn: playerInName,
    })
  }

  const events: CommentaryEvent[] = [
    { minute: 1, text: t('match.commentary.started') },
    ...goals.map((goal) => ({
      minute: goal.minute,
      text: t('match.commentary.goal', { player: goal.playerName }),
    })),
    ...cards.map((card) => ({
      minute: card.minute ?? 0,
      text:
        card.card === 'red'
          ? t(
              card.dismissalReason === 'second-yellow'
                ? 'match.commentary.secondYellow'
                : 'match.commentary.redCard',
              {
                player: getPlayerName(card.clubId, card.playerId),
              },
            )
          : t('match.commentary.yellowCard', {
              player: getPlayerName(card.clubId, card.playerId),
            }),
    })),
    ...injuries.map((injury) => ({
      minute: injury.minute ?? 0,
      text: t('match.commentary.injury', {
        player: getPlayerName(injury.clubId, injury.playerId),
        matches: formatMatchdays(
          injury.durationMatchdays ?? matchSimulationConfig.injury.minDurationMatchdays,
        ),
      }),
    })),
    ...substitutions.map((substitution) => ({
      minute: substitution.minute,
      text: substitutionText(substitution),
      kind: 'substitution' as const,
      clubId: substitution.clubId,
      playerOutId: substitution.playerOutId,
      playerInId: substitution.playerInId,
    })),
    { minute: 90, text: t('match.commentary.finished') },
  ]

  return events.sort((left, right) => left.minute - right.minute)
}

// СТРОИТ ПОЛНУЮ ПОМИНУТНУЮ ТРАНСЛЯЦИЮ И ФИНАЛЬНЫЙ РЕЗУЛЬТАТ
export const createMatchTimeline = (input: MatchSimulationInput): MatchTimeline => {
  const random = createSeededRandom(input.seed ?? hashString(input.matchId))
  const home = createTeamMetrics(input.homeClub, input.homeLineup, true, input.neutralVenue)
  const away = createTeamMetrics(input.awayClub, input.awayLineup, false, input.neutralVenue)
  const state = initializeRunningState(home, away, random)
  const minutes: MinuteSnapshot[] = []
  const rawCards: CardEvent[] = []
  const injuries = createInjuryEvents(
    home,
    away,
    input.homeClub.id,
    input.awayClub.id,
    random,
    true,
  )
  const plannedSubstitutions = [
    ...createSubstitutions(input.homeClub, input.homeLineup, random),
    ...createSubstitutions(input.awayClub, input.awayLineup, random),
  ]
  const substitutions: SubstitutionEvent[] = []
  const usedSubstitutes = new Map<string, Set<string>>([
    [input.homeClub.id, new Set<string>()],
    [input.awayClub.id, new Set<string>()],
  ])
  const substitutionCounts = new Map<string, number>([
    [input.homeClub.id, 0],
    [input.awayClub.id, 0],
  ])
  const directRedSchedules = [
    ...(random.chance(matchSimulationConfig.redCard.chancePerTeam)
      ? [{ minute: random.int(35, 89), clubId: input.homeClub.id }]
      : []),
    ...(random.chance(matchSimulationConfig.redCard.chancePerTeam)
      ? [{ minute: random.int(35, 89), clubId: input.awayClub.id }]
      : []),
  ]
  const teamFor = (clubId: string): TeamMetrics =>
    clubId === input.homeClub.id ? home : away
  const clubFor = (clubId: string): Club =>
    clubId === input.homeClub.id ? input.homeClub : input.awayClub
  const lineupFor = (clubId: string): PlayedLineup =>
    clubId === input.homeClub.id ? input.homeLineup : input.awayLineup
  const removeActivePlayer = (team: TeamMetrics, playerId: string): boolean => {
    const index = team.players.findIndex((player) => player.id === playerId)
    if (index < 0) return false
    team.players.splice(index, 1)
    return true
  }
  const addSubstitution = (event: SubstitutionEvent, playerIn: Player): void => {
    const team = teamFor(event.clubId)
    team.players.push(playerIn)
    usedSubstitutes.get(event.clubId)?.add(playerIn.id)
    substitutionCounts.set(event.clubId, (substitutionCounts.get(event.clubId) ?? 0) + 1)
    state.playerScores.set(playerIn.id, playerEffectiveRating(playerIn) + random.int(-5, 5))
    substitutions.push(event)
  }
  const availableBench = (clubId: string): Player[] => {
    const club = clubFor(clubId)
    const team = teamFor(clubId)
    const used = usedSubstitutes.get(clubId) ?? new Set<string>()
    const playersById = new Map(club.squad.map((player) => [player.id, player]))
    return lineupFor(clubId).substitutes
      .map((playerId) => playersById.get(playerId))
      .filter(
        (player): player is Player =>
          player !== undefined &&
          !lineupFor(clubId).starters.includes(player.id) &&
          !isPlayerUnavailable(player) &&
          !used.has(player.id) &&
          !team.players.some((active) => active.id === player.id),
      )
  }
  const replaceInjuredPlayer = (injury: InjuryEvent): void => {
    if ((substitutionCounts.get(injury.clubId) ?? 0) >= matchSimulationConfig.substitutions.maxCount) {
      return
    }
    const injured = clubFor(injury.clubId).squad.find((player) => player.id === injury.playerId)
    if (!injured) return
    const candidates = availableBench(injury.clubId).filter((player) =>
      injured.position === 'GK'
        ? player.position === 'GK'
        : player.position !== 'GK' && getPositionFit(injured.position, player.position) <= 2,
    )
    if (!candidates.length) return
    const bestFit = Math.min(
      ...candidates.map((player) => getPositionFit(injured.position, player.position)),
    )
    const playerIn = random.pick(
      candidates.filter((player) => getPositionFit(injured.position, player.position) === bestFit),
    )
    addSubstitution(
      { minute: injury.minute ?? 1, clubId: injury.clubId, playerOutId: injured.id, playerInId: playerIn.id },
      playerIn,
    )
  }
  const restoreGoalkeeperAfterDismissal = (clubId: string, minute: number): void => {
    const team = teamFor(clubId)
    if (
      team.players.some((player) => player.position === 'GK') ||
      (substitutionCounts.get(clubId) ?? 0) >= matchSimulationConfig.substitutions.maxCount
    ) {
      return
    }
    const goalkeeper = availableBench(clubId).find((player) => player.position === 'GK')
    if (!goalkeeper) return
    const playerOut = [...team.players]
      .filter((player) => player.position !== 'GK')
      .sort((left, right) => playerEffectiveRating(left) - playerEffectiveRating(right))[0]
    if (!playerOut || !removeActivePlayer(team, playerOut.id)) return
    addSubstitution(
      { minute, clubId, playerOutId: playerOut.id, playerInId: goalkeeper.id },
      goalkeeper,
    )
  }

  for (let minute = 1; minute <= 90; minute += 1) {
    for (const injury of injuries.filter((event) => event.minute === minute)) {
      const team = teamFor(injury.clubId)
      if (!team.players.some((player) => player.id === injury.playerId) && team.players.length) {
        injury.playerId = random.pick(team.players).id
      }
      if (removeActivePlayer(team, injury.playerId)) {
        replaceInjuredPlayer(injury)
      }
    }

    for (const schedule of directRedSchedules.filter((event) => event.minute === minute)) {
      const team = teamFor(schedule.clubId)
      if (!team.players.length) continue
      const dismissedPlayer = random.pick(team.players)
      rawCards.push({
        minute,
        clubId: schedule.clubId,
        playerId: dismissedPlayer.id,
        card: 'red',
        dismissalReason: 'direct-red',
      })
      const stats = schedule.clubId === input.homeClub.id ? state.homeStats : state.awayStats
      stats.redCards = (stats.redCards ?? 0) + 1
      addPlayerScore(state.playerScores, dismissedPlayer.id, -18)
      removeActivePlayer(team, dismissedPlayer.id)
      if (dismissedPlayer.position === 'GK') {
        restoreGoalkeeperAfterDismissal(schedule.clubId, minute)
      }
    }

    for (const substitution of plannedSubstitutions.filter((event) => event.minute === minute)) {
      const team = teamFor(substitution.clubId)
      if ((substitutionCounts.get(substitution.clubId) ?? 0) >= matchSimulationConfig.substitutions.maxCount) continue
      const playerIn = clubFor(substitution.clubId).squad.find(
        (player) => player.id === substitution.playerInId,
      )
      if (!playerIn || !availableBench(substitution.clubId).some((player) => player.id === playerIn.id)) continue
      if (!removeActivePlayer(team, substitution.playerOutId)) continue
      addSubstitution(substitution, playerIn)
    }

    processAttack(
      minute,
      input.homeClub,
      home,
      away,
      state.homeStats,
      (goal) => {
        state.homeGoals += 1
        state.goals.push(goal)
      },
      state,
      random,
    )

    processAttack(
      minute,
      input.awayClub,
      away,
      home,
      state.awayStats,
      (goal) => {
        state.awayGoals += 1
        state.goals.push(goal)
      },
      state,
      random,
    )

    processDiscipline(
      minute,
      input.homeClub.id,
      home,
      state.homeStats,
      state,
      rawCards,
      random,
    )
    restoreGoalkeeperAfterDismissal(input.homeClub.id, minute)
    processDiscipline(
      minute,
      input.awayClub.id,
      away,
      state.awayStats,
      state,
      rawCards,
      random,
    )
    restoreGoalkeeperAfterDismissal(input.awayClub.id, minute)

    minutes.push({
      minute,
      homeGoals: state.homeGoals,
      awayGoals: state.awayGoals,
      goals: [...state.goals],
      stats: {
        home: cloneStats(state.homeStats),
        away: cloneStats(state.awayStats),
      },
    })
  }

  if (state.awayGoals === 0) {
    for (const player of home.players.filter(
      (candidate) => positionLine[candidate.position] === 'defense',
    )) {
      addPlayerScore(state.playerScores, player.id, state.homeGoals === 0 ? 8 : 2)
    }
  }

  if (state.homeGoals === 0) {
    for (const player of away.players.filter(
      (candidate) => positionLine[candidate.position] === 'defense',
    )) {
      addPlayerScore(state.playerScores, player.id, state.awayGoals === 0 ? 8 : 2)
    }
  }

  const cards = normalizeCardEvents(rawCards)
  const result: MatchResult = {
    detail: 'full',
    homeGoals: state.homeGoals,
    awayGoals: state.awayGoals,
    winnerClubId:
      state.homeGoals > state.awayGoals
        ? input.homeClub.id
        : state.awayGoals > state.homeGoals
          ? input.awayClub.id
          : undefined,
    goals: [...state.goals],
    stats: {
      home: cloneStats(state.homeStats),
      away: cloneStats(state.awayStats),
    },
    bestPlayerId: pickBestPlayer(state.playerScores),
    cards,
    injuries,
    substitutions,
    commentary: createCommentary(
      state.goals,
      cards,
      injuries,
      substitutions,
      input.homeClub,
      input.awayClub,
    ),
  }

  if (input.allowPenaltyShootout && result.homeGoals === result.awayGoals) {
    const penaltyWinnerClubId = random.chance(0.5) ? input.homeClub.id : input.awayClub.id
    result.penaltyWinnerClubId = penaltyWinnerClubId
    result.winnerClubId = penaltyWinnerClubId
  }

  return {
    finalResult: result,
    minutes,
  }
}

// СИМУЛИРУЕТ МАТЧ СО СТАТИСТИКОЙ БЕЗ ПОМИНУТНОГО ЦИКЛА
const simulateMediumMatch = (input: MatchSimulationInput): MatchResult => {
  const random = createSeededRandom(input.seed ?? hashString(input.matchId))
  const home = createTeamMetrics(input.homeClub, input.homeLineup, true, input.neutralVenue)
  const away = createTeamMetrics(input.awayClub, input.awayLineup, false, input.neutralVenue)
  const midfieldDifference = home.midfield - away.midfield
  const homePossession = Math.round(clamp(50 + midfieldDifference * 0.4, 35, 65))
  const mediumConfig = matchSimulationConfig.mediumMatch
  const homeXG = clamp(
    mediumConfig.homeBaseXG +
      (home.attack - away.defense) * mediumConfig.attackDefenseFactor +
      (home.overall - away.overall) * mediumConfig.overallRatingFactor,
    mediumConfig.minXG,
    mediumConfig.maxXG,
  )
  const awayXG = clamp(
    mediumConfig.awayBaseXG +
      (away.attack - home.defense) * mediumConfig.attackDefenseFactor +
      (away.overall - home.overall) * mediumConfig.overallRatingFactor,
    mediumConfig.minXG,
    mediumConfig.maxXG,
  )
  const sampledHomeGoals = sampleGoals(homeXG, random)
  const sampledAwayGoals = sampleGoals(awayXG, random)
  const generatedGoals = [
    ...createGoalEvents(sampledHomeGoals, input.homeClub, home.players, random),
    ...createGoalEvents(sampledAwayGoals, input.awayClub, away.players, random),
  ].sort((left, right) => left.minute - right.minute)
  const homeShots = Math.max(sampledHomeGoals, Math.round(homeXG * 3.5) + random.int(3, 7))
  const awayShots = Math.max(sampledAwayGoals, Math.round(awayXG * 3.5) + random.int(3, 7))
  const homeYellowCards = random.int(
    matchSimulationConfig.yellowCard.mediumMatchMin,
    matchSimulationConfig.yellowCard.mediumMatchMax,
  )
  const awayYellowCards = random.int(
    matchSimulationConfig.yellowCard.mediumMatchMin,
    matchSimulationConfig.yellowCard.mediumMatchMax,
  )
  const cards = createCardEvents(
    home,
    away,
    input.homeClub.id,
    input.awayClub.id,
    homeYellowCards,
    awayYellowCards,
    random,
    true,
  )
  const injuries = createInjuryEvents(
    home,
    away,
    input.homeClub.id,
    input.awayClub.id,
    random,
    true,
  )
  const goals = removeGoalsAfterPlayerExit(generatedGoals, cards, injuries)
  const homeGoals = goals.filter((goal) => goal.clubId === input.homeClub.id).length
  const awayGoals = goals.filter((goal) => goal.clubId === input.awayClub.id).length

  const result: MatchResult = {
    detail: 'medium',
    homeGoals,
    awayGoals,
    winnerClubId:
      homeGoals > awayGoals
        ? input.homeClub.id
        : awayGoals > homeGoals
          ? input.awayClub.id
          : undefined,
    goals,
    stats: {
      home: {
        possession: homePossession,
        shots: homeShots,
        shotsOnTarget: Math.max(homeGoals, Math.round(homeShots * 0.42)),
        yellowCards: homeYellowCards,
        redCards: cards.filter((card) => card.clubId === input.homeClub.id && card.card === 'red')
          .length,
        xG: Number(homeXG.toFixed(2)),
      },
      away: {
        possession: 100 - homePossession,
        shots: awayShots,
        shotsOnTarget: Math.max(awayGoals, Math.round(awayShots * 0.42)),
        yellowCards: awayYellowCards,
        redCards: cards.filter((card) => card.clubId === input.awayClub.id && card.card === 'red')
          .length,
        xG: Number(awayXG.toFixed(2)),
      },
    },
    bestPlayerId: goals[0]?.playerId ?? random.pick([...home.players, ...away.players]).id,
    cards,
    injuries,
  }

  if (input.allowPenaltyShootout && result.homeGoals === result.awayGoals) {
    const penaltyWinnerClubId = random.chance(0.5) ? input.homeClub.id : input.awayClub.id
    result.penaltyWinnerClubId = penaltyWinnerClubId
    result.winnerClubId = penaltyWinnerClubId
  }

  return result
}

// БЫСТРО РАССЧИТЫВАЕТ ФОНОВЫЙ МАТЧ С МИНИМАЛЬНЫМИ ДАННЫМИ
export const simulateFastMatch = (input: FastMatchSimulationInput): MatchResult => {
  const random = createSeededRandom(input.seed ?? hashString(input.matchId))
  const config = matchSimulationConfig.fastMatch
  const homeAdvantage = input.neutralVenue
    ? 0
    : matchEngineConfig.homeAdvantage * config.homeAdvantageFactor
  const ratingDifference =
    calculateClubRating(input.homeClub, input.homeLineup) -
    calculateClubRating(input.awayClub, input.awayLineup)
  const homeXG = clamp(
    config.homeBaseXG + ratingDifference * config.ratingFactor + homeAdvantage,
    config.minXG,
    config.maxXG,
  )
  const awayXG = clamp(
    config.awayBaseXG - ratingDifference * config.ratingFactor,
    config.minXG,
    config.maxXG,
  )
  const sampledHomeGoals = sampleGoals(homeXG, random)
  const sampledAwayGoals = sampleGoals(awayXG, random)
  const fastPlayers = (club: Club, lineup?: PlayedLineup): Player[] => {
    if (lineup) return getLineupPlayers(club, lineup)
    const available = club.squad.filter((player) => !isPlayerUnavailable(player))
    return [...(available.length >= 11 ? available : club.squad)]
      .sort((left, right) => playerEffectiveRating(right) - playerEffectiveRating(left))
      .slice(0, 11)
  }
  const homePlayers = fastPlayers(input.homeClub, input.homeLineup)
  const awayPlayers = fastPlayers(input.awayClub, input.awayLineup)
  const generatedGoals = [
    ...createGoalEvents(sampledHomeGoals, input.homeClub, homePlayers, random),
    ...createGoalEvents(sampledAwayGoals, input.awayClub, awayPlayers, random),
  ].sort((left, right) => left.minute - right.minute)
  const homeShots = Math.max(sampledHomeGoals, Math.round(homeXG * 4) + random.int(3, 8))
  const awayShots = Math.max(sampledAwayGoals, Math.round(awayXG * 4) + random.int(3, 8))
  const homeYellowCards = random.int(0, 4)
  const awayYellowCards = random.int(0, 4)
  const injuries: InjuryEvent[] = []
  const cards: CardEvent[] = [
    ...Array.from({ length: homeYellowCards }, () => ({
      minute: random.int(8, 89),
      clubId: input.homeClub.id,
      playerId: random.pick(homePlayers).id,
      card: 'yellow' as const,
    })),
    ...Array.from({ length: awayYellowCards }, () => ({
      minute: random.int(8, 89),
      clubId: input.awayClub.id,
      playerId: random.pick(awayPlayers).id,
      card: 'yellow' as const,
    })),
  ]

  if (random.chance(matchSimulationConfig.injury.fastMatchChance)) {
    const club = random.chance(0.5) ? input.homeClub : input.awayClub
    const availablePlayers = club.id === input.homeClub.id ? homePlayers : awayPlayers
    if (availablePlayers.length) {
      injuries.push({
        minute: random.int(
          matchSimulationConfig.injury.minMinute,
          matchSimulationConfig.injury.maxMinute,
        ),
        clubId: club.id,
        playerId: random.pick(availablePlayers).id,
        durationMatchdays: random.int(
          matchSimulationConfig.injury.minDurationMatchdays,
          matchSimulationConfig.injury.maxDurationMatchdays,
        ),
      })
    }
  }
  if (random.chance(matchSimulationConfig.redCard.fastMatchChance)) {
    const club = random.chance(0.5) ? input.homeClub : input.awayClub
    const availablePlayers = club.id === input.homeClub.id ? homePlayers : awayPlayers
    if (availablePlayers.length) {
      cards.push({
        minute: random.int(35, 89),
        clubId: club.id,
        playerId: random.pick(availablePlayers).id,
        card: 'red',
        dismissalReason: 'direct-red',
      })
    }
  }

  const normalizedCards = normalizeCardEvents(cards)
  const goals = removeGoalsAfterPlayerExit(generatedGoals, normalizedCards, injuries)
  const homeGoals = goals.filter((goal) => goal.clubId === input.homeClub.id).length
  const awayGoals = goals.filter((goal) => goal.clubId === input.awayClub.id).length

  return {
    detail: 'fast',
    homeGoals,
    awayGoals,
    winnerClubId:
      homeGoals > awayGoals
        ? input.homeClub.id
        : awayGoals > homeGoals
          ? input.awayClub.id
          : undefined,
    goals,
    stats: {
      home: {
        possession: 50,
        shots: homeShots,
        shotsOnTarget: Math.max(homeGoals, Math.round(homeShots * 0.4)),
        yellowCards: homeYellowCards,
        redCards: normalizedCards.filter(
          (card) => card.clubId === input.homeClub.id && card.card === 'red',
        ).length,
        xG: Number(homeXG.toFixed(2)),
      },
      away: {
        possession: 50,
        shots: awayShots,
        shotsOnTarget: Math.max(awayGoals, Math.round(awayShots * 0.4)),
        yellowCards: awayYellowCards,
        redCards: normalizedCards.filter(
          (card) => card.clubId === input.awayClub.id && card.card === 'red',
        ).length,
        xG: Number(awayXG.toFixed(2)),
      },
    },
    bestPlayerId: goals[0]?.playerId ?? random.pick([...homePlayers, ...awayPlayers]).id,
    cards: normalizedCards.length ? normalizedCards : undefined,
    injuries: injuries.length ? injuries : undefined,
  }
}

// ВЫБИРАЕТ ДЕТАЛИЗАЦИЮ И ЗАПУСКАЕТ СООТВЕТСТВУЮЩИЙ СИМУЛЯТОР
export const simulateMatch = (
  input: MatchSimulationInput,
  detail: MatchSimulationDetail = 'medium',
): MatchResult => {
  if (detail === 'full') {
    return createMatchTimeline(input).finalResult
  }
  if (detail === 'fast') {
    return simulateFastMatch(input)
  }
  return simulateMediumMatch(input)
}
