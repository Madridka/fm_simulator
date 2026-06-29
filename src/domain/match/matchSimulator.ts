import { gameConfig } from '@/config/gameConfig'
import { matchSimulationConfig } from '@/config/matchSimulationConfig'
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

export type FastMatchSimulationInput = Omit<
  MatchSimulationInput,
  'homeLineup' | 'awayLineup'
>

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

const hashString = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2_147_483_647
  }
  return hash || 1
}

const cloneStats = (stats: MatchTeamStats): MatchTeamStats => ({ ...stats })

const playerEffectiveRating = (player: Player): number => {
  return player.rating * 0.76 + player.form * 0.14 + player.fitness * 0.1
}

const average = (values: readonly number[], fallback: number): number => {
  if (values.length === 0) {
    return fallback
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

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

const createTeamMetrics = (
  club: Club,
  lineup: PlayedLineup,
  isHome: boolean,
  neutralVenue: boolean,
): TeamMetrics => {
  const players = getLineupPlayers(club, lineup)
  const modifiers = tacticalModifiers[lineup.tacticalStyle]
  const homeBonus = isHome && !neutralVenue ? gameConfig.homeAdvantage : 0
  const attack =
    getLineAverage(players, 'attack', club.attackRating) + modifiers.attack + homeBonus * 0.45
  const midfield =
    getLineAverage(players, 'midfield', club.midfieldRating) + modifiers.midfield + homeBonus * 0.25
  const defense =
    getLineAverage(players, 'defense', club.defenseRating) + modifiers.defense + homeBonus * 0.3

  return {
    attack: clamp(attack, 1, 110),
    midfield: clamp(midfield, 1, 110),
    defense: clamp(defense, 1, 110),
    overall: clamp((attack + midfield + defense) / 3, 1, 110),
    players,
    lineup,
  }
}

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
    return 0.05
  }
  return 0.45
}

const pickGoalScorer = (players: readonly Player[], random: RandomGenerator): Player => {
  const weighted = players.map((player) => ({
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

const addPlayerScore = (scores: Map<string, number>, playerId: string, delta: number): void => {
  scores.set(playerId, (scores.get(playerId) ?? 0) + delta)
}

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
  const randomness = (random.next() - 0.5) * gameConfig.randomnessFactor
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
  addPlayerScore(state.playerScores, scorer.id, 24)
  addGoal({
    minute,
    clubId: attackingClub.id,
    playerId: scorer.id,
    playerName: formatPlayerName(scorer.firstName, scorer.lastName),
  })
}

const processDiscipline = (
  team: TeamMetrics,
  stats: MatchTeamStats,
  state: RunningState,
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
  if (!random.chance(chance)) {
    return
  }

  stats.yellowCards += 1
  const bookedPlayer = random.pick(team.players)
  addPlayerScore(state.playerScores, bookedPlayer.id, -6)
}

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

const createGoalEvents = (
  count: number,
  club: Club,
  players: readonly Player[],
  random: RandomGenerator,
): GoalEvent[] =>
  Array.from({ length: count }, () => {
    const scorer = pickGoalScorer(players, random)
    return {
      minute: random.int(3, 90),
      clubId: club.id,
      playerId: scorer.id,
      playerName: formatPlayerName(scorer.firstName, scorer.lastName),
    }
  })

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
  const createForTeam = (
    team: TeamMetrics,
    clubId: string,
    yellowCards: number,
  ): CardEvent[] => {
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
      })
    }
    return cards
  }

  return [
    ...createForTeam(home, homeClubId, homeYellowCards),
    ...createForTeam(away, awayClubId, awayYellowCards),
  ]
}

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

const createSubstitutions = (
  club: Club,
  lineup: PlayedLineup,
  random: RandomGenerator,
): SubstitutionEvent[] => {
  const config = matchSimulationConfig.substitutions
  const substitutes = club.squad.filter(
    (player) => !lineup.starters.includes(player.id) && !player.isInjured,
  )
  const starters = [...lineup.starters]
  const count = Math.min(
    random.int(config.minCount, config.maxCount),
    substitutes.length,
    starters.length,
  )

  return Array.from({ length: count }, (_, index) => {
    const playerOutIndex = random.int(0, starters.length - 1)
    const playerInIndex = random.int(0, substitutes.length - 1)
    const playerOutId = starters.splice(playerOutIndex, 1)[0] ?? lineup.starters[0] ?? ''
    const playerInId = substitutes.splice(playerInIndex, 1)[0]?.id ?? ''
    return {
      minute: clamp(
        random.int(config.minMinute, config.maxMinute - config.maxCount + 1) + index,
        config.minMinute,
        config.maxMinute,
      ),
      clubId: club.id,
      playerOutId,
      playerInId,
    }
  })
}

const createCommentary = (
  goals: readonly GoalEvent[],
  cards: readonly CardEvent[],
  injuries: readonly InjuryEvent[],
  substitutions: readonly SubstitutionEvent[],
  homeClub: Club,
  awayClub: Club,
): CommentaryEvent[] => {
  const getPlayerName = (clubId: string, playerId: string): string => {
    const club = clubId === homeClub.id ? homeClub : awayClub
    const player = club.squad.find((candidate) => candidate.id === playerId)
    return player ? formatPlayerName(player.firstName, player.lastName) : playerId
  }

  const formatMatchdays = (duration: number): string => {
    const lastTwoDigits = duration % 100
    const lastDigit = duration % 10
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return `${duration} матчей`
    }
    if (lastDigit === 1) {
      return `${duration} матч`
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
      return `${duration} матча`
    }
    return `${duration} матчей`
  }

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

    return `Замена ${club.shortName}: ${playerOutName} ↕ ${playerInName}`
  }

  const events: CommentaryEvent[] = [
    { minute: 1, text: 'Матч начался.' },
    ...goals.map((goal) => ({ minute: goal.minute, text: `Гол! ${goal.playerName}.` })),
    ...cards.map((card) => ({
      minute: card.minute ?? 0,
      text:
        card.card === 'red'
          ? `Красная карточка! ${getPlayerName(card.clubId, card.playerId)} удален с поля.`
          : `Желтая карточка: ${getPlayerName(card.clubId, card.playerId)}.`,
    })),
    ...injuries.map((injury) => ({
      minute: injury.minute ?? 0,
      text: `${getPlayerName(injury.clubId, injury.playerId)} получил травму и пропустит ${formatMatchdays(injury.durationMatchdays ?? matchSimulationConfig.injury.minDurationMatchdays)}.`,
    })),
    ...substitutions.map((substitution) => ({
      minute: substitution.minute,
      text: substitutionText(substitution),
      kind: 'substitution' as const,
      clubId: substitution.clubId,
      playerOutId: substitution.playerOutId,
      playerInId: substitution.playerInId,
    })),
    { minute: 90, text: 'Матч завершен.' },
  ]

  return events.sort((left, right) => left.minute - right.minute)
}

export const createMatchTimeline = (input: MatchSimulationInput): MatchTimeline => {
  const random = createSeededRandom(input.seed ?? hashString(input.matchId))
  const home = createTeamMetrics(input.homeClub, input.homeLineup, true, input.neutralVenue)
  const away = createTeamMetrics(input.awayClub, input.awayLineup, false, input.neutralVenue)
  const state = initializeRunningState(home, away, random)
  const minutes: MinuteSnapshot[] = []

  for (let minute = 1; minute <= 90; minute += 1) {
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

    processDiscipline(home, state.homeStats, state, random)
    processDiscipline(away, state.awayStats, state, random)

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

  const cards = createCardEvents(
    home,
    away,
    input.homeClub.id,
    input.awayClub.id,
    state.homeStats.yellowCards,
    state.awayStats.yellowCards,
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
  const substitutions = [
    ...createSubstitutions(input.homeClub, input.homeLineup, random),
    ...createSubstitutions(input.awayClub, input.awayLineup, random),
  ]
  state.homeStats.redCards = cards.filter(
    (card) => card.clubId === input.homeClub.id && card.card === 'red',
  ).length
  state.awayStats.redCards = cards.filter(
    (card) => card.clubId === input.awayClub.id && card.card === 'red',
  ).length
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
  const homeGoals = sampleGoals(homeXG, random)
  const awayGoals = sampleGoals(awayXG, random)
  const goals = [
    ...createGoalEvents(homeGoals, input.homeClub, home.players, random),
    ...createGoalEvents(awayGoals, input.awayClub, away.players, random),
  ].sort((left, right) => left.minute - right.minute)
  const homeShots = Math.max(homeGoals, Math.round(homeXG * 3.5) + random.int(3, 7))
  const awayShots = Math.max(awayGoals, Math.round(awayXG * 3.5) + random.int(3, 7))
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
        redCards: cards.filter((card) => card.clubId === input.homeClub.id && card.card === 'red').length,
        xG: Number(homeXG.toFixed(2)),
      },
      away: {
        possession: 100 - homePossession,
        shots: awayShots,
        shotsOnTarget: Math.max(awayGoals, Math.round(awayShots * 0.42)),
        yellowCards: awayYellowCards,
        redCards: cards.filter((card) => card.clubId === input.awayClub.id && card.card === 'red').length,
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

export const simulateFastMatch = (input: FastMatchSimulationInput): MatchResult => {
  const random = createSeededRandom(input.seed ?? hashString(input.matchId))
  const config = matchSimulationConfig.fastMatch
  const homeAdvantage = input.neutralVenue
    ? 0
    : gameConfig.homeAdvantage * config.homeAdvantageFactor
  const ratingDifference = input.homeClub.rating - input.awayClub.rating
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
  const homeGoals = sampleGoals(homeXG, random)
  const awayGoals = sampleGoals(awayXG, random)
  const injuries: InjuryEvent[] = []
  const cards: CardEvent[] = []

  if (random.chance(matchSimulationConfig.injury.fastMatchChance)) {
    const club = random.chance(0.5) ? input.homeClub : input.awayClub
    const availablePlayers = club.squad.filter((player) => !player.isInjured)
    if (availablePlayers.length) {
      injuries.push({
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
    cards.push({ clubId: club.id, playerId: random.pick(club.squad).id, card: 'red' })
  }

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
    goals: [],
    stats: {
      home: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
      away: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
    },
    bestPlayerId: '',
    cards: cards.length ? cards : undefined,
    injuries: injuries.length ? injuries : undefined,
  }
}

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
