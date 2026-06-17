import { gameConfig } from '@/config/gameConfig'
import type { Club, GoalEvent, MatchResult, MatchTeamStats, PlayedLineup, Player, PlayerPosition, TacticalStyle } from '@/types/football'
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

const tacticalModifiers: Record<TacticalStyle, { attack: number; midfield: number; defense: number }> = {
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

const getLineAverage = (players: readonly Player[], line: 'attack' | 'midfield' | 'defense', fallback: number): number => {
  const ratings = players
    .filter((player) => positionLine[player.position] === line)
    .map(playerEffectiveRating)

  return average(ratings, fallback)
}

const getLineupPlayers = (club: Club, lineup: PlayedLineup): Player[] => {
  const playersById = new Map(club.squad.map((player) => [player.id, player]))
  const players = lineup.starters.map((playerId) => playersById.get(playerId)).filter((player): player is Player => Boolean(player))

  if (players.length !== 11) {
    throw new Error(`Lineup for ${club.name} must contain 11 existing players`)
  }

  return players
}

const createTeamMetrics = (club: Club, lineup: PlayedLineup, isHome: boolean, neutralVenue: boolean): TeamMetrics => {
  const players = getLineupPlayers(club, lineup)
  const modifiers = tacticalModifiers[lineup.tacticalStyle]
  const homeBonus = isHome && !neutralVenue ? gameConfig.homeAdvantage : 0
  const attack = getLineAverage(players, 'attack', club.attackRating) + modifiers.attack + homeBonus * 0.45
  const midfield = getLineAverage(players, 'midfield', club.midfieldRating) + modifiers.midfield + homeBonus * 0.25
  const defense = getLineAverage(players, 'defense', club.defenseRating) + modifiers.defense + homeBonus * 0.3

  return {
    attack: clamp(attack, 1, 110),
    midfield: clamp(midfield, 1, 110),
    defense: clamp(defense, 1, 110),
    overall: clamp((attack + midfield + defense) / 3, 1, 110),
    players,
    lineup,
  }
}

const initializeRunningState = (home: TeamMetrics, away: TeamMetrics, random: RandomGenerator): RunningState => {
  const midfieldDifference = home.midfield - away.midfield
  const homePossession = Math.round(clamp(50 + midfieldDifference * 0.42 + random.int(-4, 4), 35, 65))

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
    },
    awayStats: {
      possession: 100 - homePossession,
      shots: 0,
      shotsOnTarget: 0,
      yellowCards: 0,
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
  const edge = attacking.attack - defending.defense
  const randomness = (random.next() - 0.5) * gameConfig.randomnessFactor
  const shotChance = clamp(0.062 + attacking.attack * 0.00042 + edge * 0.0012 + randomness * 0.035, 0.035, 0.22)

  if (!random.chance(shotChance)) {
    return
  }

  attackingStats.shots += 1

  const onTargetChance = clamp(0.34 + edge * 0.0023 + attacking.midfield * 0.0009, 0.23, 0.62)
  if (!random.chance(onTargetChance)) {
    return
  }

  attackingStats.shotsOnTarget += 1

  const goalChance = clamp(0.23 + edge * 0.002 + attacking.attack * 0.0008, 0.08, 0.46)
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

const processDiscipline = (team: TeamMetrics, stats: MatchTeamStats, state: RunningState, random: RandomGenerator): void => {
  const defensiveStylePenalty = team.lineup.tacticalStyle === 'defensive' ? 0.006 : 0
  const chance = clamp(0.014 + defensiveStylePenalty + (100 - team.defense) * 0.00008, 0.008, 0.035)
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
    for (const player of home.players.filter((candidate) => positionLine[candidate.position] === 'defense')) {
      addPlayerScore(state.playerScores, player.id, state.homeGoals === 0 ? 8 : 2)
    }
  }

  if (state.homeGoals === 0) {
    for (const player of away.players.filter((candidate) => positionLine[candidate.position] === 'defense')) {
      addPlayerScore(state.playerScores, player.id, state.awayGoals === 0 ? 8 : 2)
    }
  }

  const result: MatchResult = {
    homeGoals: state.homeGoals,
    awayGoals: state.awayGoals,
    winnerClubId: state.homeGoals > state.awayGoals ? input.homeClub.id : state.awayGoals > state.homeGoals ? input.awayClub.id : undefined,
    goals: [...state.goals],
    stats: {
      home: cloneStats(state.homeStats),
      away: cloneStats(state.awayStats),
    },
    bestPlayerId: pickBestPlayer(state.playerScores),
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

export const simulateMatch = (input: MatchSimulationInput): MatchResult => createMatchTimeline(input).finalResult
