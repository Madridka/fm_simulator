import { matchSimulationConfig } from '@/config/matchSimulationConfig'
import { getSimulationSettings } from '@/domain/admin/simulationSettings'
import { calculateClubRating } from '@/domain/club/teamRating'
import {
  defaultRoleForPosition,
  getFormationSlots,
  getPositionFit,
} from '@/domain/season/squadSelectionService'
import { getPlayerRole } from '@/domain/tactics/playerRoles'
import type {
  CardEvent,
  Club,
  Formation,
  GoalEvent,
  InjuryEvent,
  LiveMatchState,
  MatchEvent,
  MatchResult,
  MatchTactics,
  MatchTeamStats,
  PlayedLineup,
  Player,
  PlayerPosition,
  SubstitutionEvent,
  TacticalChangeEvent,
  TacticalStyle,
  TeamTacticsSettings,
} from '@/types/football'
import { formatPlayerName } from '@/utils/format'
import { clamp, createSeededRandom, type RandomGenerator } from '@/utils/random'

export interface LiveMatchInput {
  matchId: string
  homeClub: Club
  awayClub: Club
  homeLineup: PlayedLineup
  awayLineup: PlayedLineup
  neutralVenue: boolean
  allowPenaltyShootout: boolean
  seed: number
  controlledTeamId: string
  maxSubstitutions?: number
}

export interface LiveMatchController {
  readonly state: LiveMatchState
  advance(minutes: number): LiveMatchState
  changeTactics(teamId: string, changes: Partial<MatchTactics>): LiveMatchState
  substitute(teamId: string, playerOutId: string, playerInId: string): LiveMatchState
  result(): MatchResult
}

interface Runtime {
  goals: GoalEvent[]
  cards: CardEvent[]
  injuries: InjuryEvent[]
  substitutions: SubstitutionEvent[]
  tacticalChanges: TacticalChangeEvent[]
  stats: { home: MatchTeamStats; away: MatchTeamStats }
  enteredAt: Map<string, number>
  exitedAt: Map<string, number>
  scores: Map<string, number>
  aiLastChangeMinute: number
}

const initialTactics = (
  formation: Formation,
  tacticalStyle: TacticalStyle,
  tactics?: TeamTacticsSettings,
): MatchTactics => ({
  formation,
  mentality: tacticalStyle,
  pressing: 'balanced',
  tempo: 'balanced',
  width: 'balanced',
  defensiveLine: 'medium',
  attackPlan: 'shortPassing',
  defensiveShape: 'balanced',
  tackling: 'normal',
  matchCommand: 'none',
  teamTalk: 'balanced',
  ...tactics,
})

const lineByPosition: Record<PlayerPosition, 'attack' | 'midfield' | 'defense'> = {
  GK: 'defense', LB: 'defense', CB: 'defense', RB: 'defense',
  CDM: 'midfield', CM: 'midfield', CAM: 'midfield',
  LW: 'attack', RW: 'attack', ST: 'attack',
}

const nameOf = (player: Player): string => formatPlayerName(player.firstName, player.lastName)
const emptyStats = (): MatchTeamStats => ({
  possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0, redCards: 0, xG: 0,
})

const average = (values: readonly number[], fallback = 60): number =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback

const mentalityAttack = { parkTheBus: 0.55, defensive: 0.82, balanced: 1, attacking: 1.14, allOutAttack: 1.32 } as const
const mentalityRisk = { parkTheBus: 0.6, defensive: 0.78, balanced: 1, attacking: 1.2, allOutAttack: 1.5 } as const
const tempoVolume = { slow: 0.88, balanced: 1, fast: 1.12 } as const
const pressingEffect = { low: 0.95, balanced: 1, high: 1.06 } as const
const fitnessCost = { low: 0.72, balanced: 1, high: 1.42 } as const
const tempoCost = { slow: 0.76, balanced: 1, fast: 1.35 } as const
const attackPlanVolume = {
  shortPassing: 0.96,
  directPassing: 1.08,
  widePlay: 1,
  centralPlay: 0.98,
  earlyCrosses: 1.12,
  throughBalls: 1.04,
} as const
const attackPlanQuality = {
  shortPassing: 1.04,
  directPassing: 0.96,
  widePlay: 1,
  centralPlay: 1.03,
  earlyCrosses: 0.94,
  throughBalls: 1.08,
} as const
const commandVolume = {
  none: 1,
  calm: 0.92,
  raiseTempo: 1.12,
  holdLead: 0.82,
  loadBox: 1.18,
  timeWasting: 0.7,
} as const
const commandQuality = {
  none: 1,
  calm: 1.03,
  raiseTempo: 0.98,
  holdLead: 0.9,
  loadBox: 0.96,
  timeWasting: 0.78,
} as const
const teamTalkVolume = {
  balanced: 1,
  encourage: 1.04,
  calm: 0.97,
  demandMore: 1.06,
  praise: 1.01,
} as const
const teamTalkQuality = {
  balanced: 1,
  encourage: 1.01,
  calm: 1.03,
  demandMore: 0.99,
  praise: 1.02,
} as const
const tacklingDefense = { cautious: 1.04, normal: 1, hard: 0.94 } as const
const commandFitnessCost = {
  none: 1,
  calm: 0.9,
  raiseTempo: 1.18,
  holdLead: 0.82,
  loadBox: 1.14,
  timeWasting: 0.7,
} as const

const eventText = (type: MatchEvent['type'], team: Club | undefined, player?: Player): string => {
  const who = player ? nameOf(player) : team?.shortName ?? ''
  if (type === 'goal') return `Гол! ${who}`
  if (type === 'yellow-card') return `Жёлтая карточка: ${who}`
  if (type === 'red-card') return `Удаление: ${who}`
  if (type === 'chance') return `Опасный момент у ${team?.shortName ?? ''}`
  if (type === 'save') return `Вратарь спасает ${team?.shortName ?? ''}`
  if (type === 'half-time') return 'Перерыв'
  if (type === 'full-time') return 'Матч завершён'
  return who
}

export const createLiveMatch = (input: LiveMatchInput): LiveMatchController => {
  const random = createSeededRandom(input.seed)
  const maxSubstitutions = input.maxSubstitutions ?? matchSimulationConfig.liveMatch.maxSubstitutions
  const clubs = new Map([[input.homeClub.id, input.homeClub], [input.awayClub.id, input.awayClub]])
  const players = new Map(
    [input.homeClub, input.awayClub].flatMap((club) =>
      club.squad.map((player) => [player.id, player] as const),
    ),
  )
  const roleByPlayerId = new Map<string, ReturnType<typeof getPlayerRole>>()
  const registerLineupRoles = (lineup: PlayedLineup): void => {
    getFormationSlots(lineup.formation).forEach((slot, index) => {
      const playerId = lineup.starters[index]
      if (!playerId) return
      roleByPlayerId.set(
        playerId,
        getPlayerRole(lineup.roles?.[slot.id] ?? defaultRoleForPosition(slot.position)),
      )
    })
  }
  registerLineupRoles(input.homeLineup)
  registerLineupRoles(input.awayLineup)
  const state: LiveMatchState = {
    matchId: input.matchId,
    minute: 0,
    homeTeamId: input.homeClub.id,
    awayTeamId: input.awayClub.id,
    homeScore: 0,
    awayScore: 0,
    homeTactics: initialTactics(
      input.homeLineup.formation,
      input.homeLineup.tacticalStyle,
      input.homeLineup.tactics,
    ),
    awayTactics: initialTactics(
      input.awayLineup.formation,
      input.awayLineup.tacticalStyle,
      input.awayLineup.tactics,
    ),
    homeLineupPlayerIds: [...input.homeLineup.starters],
    awayLineupPlayerIds: [...input.awayLineup.starters],
    homeBenchPlayerIds: [...input.homeLineup.substitutes],
    awayBenchPlayerIds: [...input.awayLineup.substitutes],
    homeSubstitutionsUsed: 0,
    awaySubstitutionsUsed: 0,
    maxSubstitutions,
    fitness: Object.fromEntries([...players].map(([id, player]) => [id, player.fitness])),
    events: [],
  }
  const runtime: Runtime = {
    goals: [], cards: [], injuries: [], substitutions: [], tacticalChanges: [],
    stats: { home: emptyStats(), away: emptyStats() },
    enteredAt: new Map([...input.homeLineup.starters, ...input.awayLineup.starters].map((id) => [id, 0])),
    exitedAt: new Map(),
    scores: new Map([...players].map(([id, player]) => [id, player.rating])),
    aiLastChangeMinute: 0,
  }
  let eventSequence = 0

  const isHome = (teamId: string): boolean => teamId === state.homeTeamId
  const lineupFor = (teamId: string): string[] =>
    isHome(teamId) ? state.homeLineupPlayerIds : state.awayLineupPlayerIds
  const benchFor = (teamId: string): string[] =>
    isHome(teamId) ? state.homeBenchPlayerIds : state.awayBenchPlayerIds
  const tacticsFor = (teamId: string): MatchTactics =>
    isHome(teamId) ? state.homeTactics : state.awayTactics
  const statsFor = (teamId: string): MatchTeamStats =>
    isHome(teamId) ? runtime.stats.home : runtime.stats.away
  const substitutionsUsed = (teamId: string): number =>
    isHome(teamId) ? state.homeSubstitutionsUsed : state.awaySubstitutionsUsed

  const addEvent = (event: Omit<MatchEvent, 'id' | 'minute'> & { minute?: number }): void => {
    state.events.push({ ...event, id: `${state.matchId}-${++eventSequence}`, minute: event.minute ?? state.minute })
  }

  const activePlayers = (teamId: string): Player[] =>
    lineupFor(teamId).map((id) => players.get(id)).filter((player): player is Player => Boolean(player))

  const defensiveShapeAgainst = (
    attackPlan: MatchTactics['attackPlan'],
    defensiveShape: MatchTactics['defensiveShape'],
  ): number => {
    if (
      defensiveShape === 'compact' &&
      (attackPlan === 'centralPlay' || attackPlan === 'throughBalls')
    ) {
      return 0.88
    }
    if (
      defensiveShape === 'wide' &&
      (attackPlan === 'widePlay' || attackPlan === 'earlyCrosses')
    ) {
      return 0.9
    }
    if (
      defensiveShape === 'compact' &&
      (attackPlan === 'widePlay' || attackPlan === 'earlyCrosses')
    ) {
      return 1.08
    }
    if (
      defensiveShape === 'wide' &&
      (attackPlan === 'centralPlay' || attackPlan === 'throughBalls')
    ) {
      return 1.06
    }
    return 1
  }

  const teamStrength = (teamId: string, line: 'attack' | 'midfield' | 'defense'): number => {
    const candidates = activePlayers(teamId).filter((player) => lineByPosition[player.position] === line)
    return average(candidates.map((player) => {
      const liveFitness = state.fitness[player.id] ?? player.fitness
      const effects = roleByPlayerId.get(player.id)?.effects
      const roleBonus =
        line === 'attack'
          ? (effects?.attack ?? 0) * 0.3 + (effects?.control ?? 0) * 0.08
          : line === 'midfield'
            ? (effects?.control ?? 0) * 0.26 + (effects?.pressing ?? 0) * 0.1
            : (effects?.defense ?? 0) * 0.3 - Math.max(0, effects?.risk ?? 0) * 0.08
      return player.rating * (0.72 + liveFitness / 360) + player.form * 0.08 + roleBonus
    }), calculateClubRating(clubs.get(teamId)!))
  }

  const pickWeightedAttacker = (teamId: string): Player => {
    const candidates = activePlayers(teamId)
    const goalkeeper = candidates.find((player) => player.position === 'GK')
    const goalkeeperChance = getSimulationSettings().goalkeeperGoalChancePercent / 100
    if (goalkeeper && random.chance(goalkeeperChance)) return goalkeeper
    const outfieldCandidates = candidates.filter((player) => player.position !== 'GK')
    const weight = (player: Player): number =>
      player.position === 'ST' ? 5 : player.position === 'LW' || player.position === 'RW' ? 3.5 :
        player.position === 'CAM' ? 3 : player.position === 'CM' ? 1.5 : 0.5
    const scorerCandidates = outfieldCandidates.length ? outfieldCandidates : candidates
    let roll = random.next() * scorerCandidates.reduce((sum, player) => sum + weight(player), 0)
    for (const player of scorerCandidates) {
      roll -= weight(player)
      if (roll <= 0) return player
    }
    return scorerCandidates[0]!
  }

  const processAttack = (teamId: string, opponentId: string): void => {
    const liveConfig = matchSimulationConfig.liveMatch
    const adminSettings = getSimulationSettings()
    const tactics = tacticsFor(teamId)
    const opponentTactics = tacticsFor(opponentId)
    const attack = teamStrength(teamId, 'attack')
    const midfield = teamStrength(teamId, 'midfield')
    const defense = teamStrength(opponentId, 'defense')
    const widthMatchup =
      tactics.width === 'wide' && opponentTactics.width === 'narrow' ? 1.1 :
        tactics.width === 'narrow' && opponentTactics.width === 'wide' ? 0.93 : 1
    const highLineRisk = opponentTactics.defensiveLine === 'high' ? 1.12 : opponentTactics.defensiveLine === 'low' ? 0.9 : 1
    const press = pressingEffect[tactics.pressing]
    const opponentPressRisk = opponentTactics.pressing === 'high' && attack > defense ? 1.08 : 1
    const opponentShape = defensiveShapeAgainst(tactics.attackPlan, opponentTactics.defensiveShape)
    const opponentTackling = tacklingDefense[opponentTactics.tackling]
    const busBlock = opponentTactics.mentality === 'parkTheBus' ? 0.82 : 1
    const volume =
      mentalityAttack[tactics.mentality] *
      tempoVolume[tactics.tempo] *
      press *
      attackPlanVolume[tactics.attackPlan] *
      commandVolume[tactics.matchCommand] *
      teamTalkVolume[tactics.teamTalk] *
      opponentTackling *
      busBlock
    const homeBonus = isHome(teamId) && !input.neutralVenue ? liveConfig.homeShotChanceBonus : 0
    const shotChance = clamp(
      (adminSettings.liveBaseShotChancePercent / 100 + homeBonus +
        (attack + midfield - defense * 1.7) * liveConfig.strengthShotChanceFactor) * volume,
      liveConfig.minShotChance,
      liveConfig.maxShotChance,
    )
    if (!random.chance(shotChance)) return

    const teamStats = statsFor(teamId)
    teamStats.shots += 1
    const quality = clamp(
      (0.08 + (attack - defense) * 0.0022) *
        widthMatchup *
        highLineRisk *
        opponentPressRisk *
        attackPlanQuality[tactics.attackPlan] *
        commandQuality[tactics.matchCommand] *
        teamTalkQuality[tactics.teamTalk] *
        opponentShape *
        opponentTackling *
        busBlock,
      0.035,
      0.45,
    )
    teamStats.xG = Number(((teamStats.xG ?? 0) + quality).toFixed(2))
    addEvent({ type: 'chance', teamId, text: eventText('chance', clubs.get(teamId)) })
    const shotOnTargetChance = clamp(0.34 + (attack - defense) * 0.003, 0.22, 0.67)
    if (!random.chance(shotOnTargetChance)) return
    teamStats.shotsOnTarget += 1
    const scorer = pickWeightedAttacker(teamId)
    // `quality` is xG for this shot. Conditional conversion after the on-target
    // check must preserve that probability instead of reducing live scoring twice.
    const goalChance = clamp(quality / shotOnTargetChance, 0.07, 0.55)
    if (!random.chance(goalChance)) {
      addEvent({ type: 'save', teamId: opponentId, text: eventText('save', clubs.get(opponentId)) })
      return
    }
    if (isHome(teamId)) state.homeScore += 1
    else state.awayScore += 1
    const teammates = activePlayers(teamId).filter((player) => player.id !== scorer.id)
    const assister = random.chance(0.76) && teammates.length ? random.pick(teammates) : undefined
    runtime.goals.push({
      minute: state.minute, clubId: teamId, playerId: scorer.id, playerName: nameOf(scorer),
      assistPlayerId: assister?.id, assistPlayerName: assister ? nameOf(assister) : undefined,
    })
    runtime.scores.set(scorer.id, (runtime.scores.get(scorer.id) ?? scorer.rating) + 20)
    addEvent({ type: 'goal', teamId, playerId: scorer.id, text: eventText('goal', clubs.get(teamId), scorer) })
  }

  const drainFitness = (teamId: string): void => {
    const tactics = tacticsFor(teamId)
    const mentality =
      tactics.mentality === 'parkTheBus' ? 0.78 :
        tactics.mentality === 'allOutAttack' ? 1.35 :
          tactics.mentality === 'attacking' ? 1.12 : 1
    const tackling = tactics.tackling === 'hard' ? 1.12 : tactics.tackling === 'cautious' ? 0.92 : 1
    const talk = tactics.teamTalk === 'demandMore' ? 1.08 : tactics.teamTalk === 'calm' ? 0.94 : 1
    const drain =
      matchSimulationConfig.liveMatch.baseFitnessDrain *
      fitnessCost[tactics.pressing] *
      tempoCost[tactics.tempo] *
      mentality *
      tackling *
      talk *
      commandFitnessCost[tactics.matchCommand]
    for (const player of activePlayers(teamId)) {
      state.fitness[player.id] = clamp((state.fitness[player.id] ?? player.fitness) - drain, 1, 100)
    }
  }

  const processCard = (teamId: string): void => {
    const tactics = tacticsFor(teamId)
    const chance =
      0.009 +
      (tactics.pressing === 'high' ? 0.007 : 0) +
      (tactics.mentality === 'allOutAttack' ? 0.003 : 0) +
      (tactics.tackling === 'hard' ? 0.008 : tactics.tackling === 'cautious' ? -0.004 : 0) +
      (tactics.teamTalk === 'demandMore' ? 0.003 : tactics.teamTalk === 'calm' ? -0.002 : 0) +
      (tactics.matchCommand === 'timeWasting' ? 0.002 : 0)
    if (!random.chance(chance) || !activePlayers(teamId).length) return
    const player = random.pick(activePlayers(teamId))
    const alreadyBooked = runtime.cards.some((card) => card.clubId === teamId && card.playerId === player.id && card.card === 'yellow')
    runtime.cards.push({ minute: state.minute, clubId: teamId, playerId: player.id, card: alreadyBooked ? 'red' : 'yellow', dismissalReason: alreadyBooked ? 'second-yellow' : undefined })
    if (alreadyBooked) {
      statsFor(teamId).redCards = (statsFor(teamId).redCards ?? 0) + 1
      const index = lineupFor(teamId).indexOf(player.id)
      if (index >= 0) lineupFor(teamId).splice(index, 1)
      runtime.exitedAt.set(player.id, state.minute)
      addEvent({ type: 'red-card', teamId, playerId: player.id, text: eventText('red-card', clubs.get(teamId), player) })
    } else {
      statsFor(teamId).yellowCards += 1
      addEvent({ type: 'yellow-card', teamId, playerId: player.id, text: eventText('yellow-card', clubs.get(teamId), player) })
    }
  }

  const processInjury = (teamId: string): void => {
    const tactics = tacticsFor(teamId)
    const intensity =
      (tactics.tackling === 'hard' ? 1.45 : tactics.tackling === 'cautious' ? 0.75 : 1) *
      (tactics.pressing === 'high' ? 1.2 : 1) *
      (tactics.matchCommand === 'raiseTempo' || tactics.matchCommand === 'loadBox' ? 1.15 : 1)
    if (!random.chance(0.00046 * intensity) || !activePlayers(teamId).length) return
    const injured = random.pick(activePlayers(teamId))
    runtime.injuries.push({ minute: state.minute, clubId: teamId, playerId: injured.id, durationMatchdays: random.int(1, 5) })
    addEvent({ type: 'injury', teamId, playerId: injured.id, text: `Травма: ${nameOf(injured)}` })
    const replacement = benchFor(teamId)
      .map((id) => players.get(id))
      .filter((player): player is Player => Boolean(player))
      .sort((a, b) => getPositionFit(injured.position, a.position) - getPositionFit(injured.position, b.position))[0]
    if (replacement && substitutionsUsed(teamId) < state.maxSubstitutions) {
      doSubstitute(teamId, injured.id, replacement.id)
    } else {
      const index = lineupFor(teamId).indexOf(injured.id)
      if (index >= 0) lineupFor(teamId).splice(index, 1)
      runtime.exitedAt.set(injured.id, state.minute)
    }
  }

  const doSubstitute = (teamId: string, playerOutId: string, playerInId: string): LiveMatchState => {
    if (state.minute >= 90) throw new Error('Матч уже завершён')
    if (substitutionsUsed(teamId) >= state.maxSubstitutions) throw new Error('Лимит замен исчерпан')
    const lineup = lineupFor(teamId)
    const bench = benchFor(teamId)
    const outIndex = lineup.indexOf(playerOutId)
    const inIndex = bench.indexOf(playerInId)
    if (outIndex < 0) throw new Error('Заменяемый игрок не находится на поле')
    if (inIndex < 0 || lineup.includes(playerInId)) throw new Error('Новый игрок недоступен на скамейке')
    if (runtime.exitedAt.has(playerOutId)) throw new Error('Игрок уже был заменён')
    lineup.splice(outIndex, 1, playerInId)
    bench.splice(inIndex, 1)
    runtime.exitedAt.set(playerOutId, state.minute)
    runtime.enteredAt.set(playerInId, state.minute)
    const playerIn = players.get(playerInId)
    if (playerIn) {
      roleByPlayerId.set(playerInId, getPlayerRole(defaultRoleForPosition(playerIn.position)))
    }
    if (isHome(teamId)) state.homeSubstitutionsUsed += 1
    else state.awaySubstitutionsUsed += 1
    const event = { minute: state.minute, clubId: teamId, playerOutId, playerInId }
    runtime.substitutions.push(event)
    addEvent({
      type: 'substitution', teamId, playerOutId, playerInId,
      text: `Замена ${clubs.get(teamId)?.shortName}: ${nameOf(players.get(playerOutId)!)} → ${nameOf(players.get(playerInId)!)}`,
    })
    return state
  }

  const doChangeTactics = (teamId: string, changes: Partial<MatchTactics>): LiveMatchState => {
    if (state.minute >= 90) throw new Error('Матч уже завершён')
    const current = tacticsFor(teamId)
    const actual = Object.fromEntries(
      Object.entries(changes).filter(([key, value]) => current[key as keyof MatchTactics] !== value),
    ) as Partial<MatchTactics>
    if (!Object.keys(actual).length) return state
    const updated = { ...current, ...actual }
    if (isHome(teamId)) state.homeTactics = updated
    else state.awayTactics = updated
    runtime.tacticalChanges.push({ minute: state.minute, teamId, changes: actual })
    return state
  }

  const aiSubstitution = (teamId: string, mode: 'attack' | 'defend' | 'fresh'): void => {
    if (substitutionsUsed(teamId) >= state.maxSubstitutions) return
    const active = activePlayers(teamId).filter((player) => player.position !== 'GK')
    const bench = benchFor(teamId).map((id) => players.get(id)).filter((player): player is Player => Boolean(player))
    if (!active.length || !bench.length) return
    const tired = [...active].sort((a, b) => (state.fitness[a.id] ?? 100) - (state.fitness[b.id] ?? 100))[0]!
    const desired = mode === 'attack' ? ['ST', 'LW', 'RW', 'CAM'] : mode === 'defend' ? ['CB', 'CDM', 'LB', 'RB'] : [tired.position]
    const candidate = [...bench]
      .filter((player) => desired.includes(player.position))
      .sort((a, b) => getPositionFit(tired.position, a.position) - getPositionFit(tired.position, b.position) || b.rating - a.rating)[0]
      ?? [...bench].sort((a, b) => getPositionFit(tired.position, a.position) - getPositionFit(tired.position, b.position))[0]
    if (candidate) doSubstitute(teamId, tired.id, candidate.id)
  }

  const runAi = (): void => {
    const teamId = input.controlledTeamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId
    if (state.minute >= 90 || state.minute < 55 || state.minute - runtime.aiLastChangeMinute < 5) return
    const goalDiff = isHome(teamId) ? state.homeScore - state.awayScore : state.awayScore - state.homeScore
    const ownClub = clubs.get(teamId)!
    const rivalClub = clubs.get(isHome(teamId) ? state.awayTeamId : state.homeTeamId)!
    const ownLineup = isHome(teamId) ? input.homeLineup : input.awayLineup
    const rivalLineup = isHome(teamId) ? input.awayLineup : input.homeLineup
    const ownStrength = calculateClubRating(ownClub, ownLineup)
    const rivalStrength = calculateClubRating(rivalClub, rivalLineup)
    const averageFitness = average(activePlayers(teamId).map((player) => state.fitness[player.id] ?? player.fitness))
    if (goalDiff < 0 && state.minute >= 80) {
      doChangeTactics(teamId, { mentality: 'allOutAttack', pressing: 'high', tempo: 'fast', defensiveLine: 'high', matchCommand: 'loadBox' })
      aiSubstitution(teamId, 'attack')
      runtime.aiLastChangeMinute = state.minute
    } else if (goalDiff < 0 && state.minute >= 60) {
      doChangeTactics(teamId, { mentality: 'attacking', pressing: 'high', tempo: 'fast', matchCommand: 'raiseTempo' })
      if (state.minute >= 65) aiSubstitution(teamId, 'attack')
      runtime.aiLastChangeMinute = state.minute
    } else if (goalDiff > 0 && state.minute >= 65) {
      doChangeTactics(teamId, { mentality: state.minute >= 80 ? 'parkTheBus' : 'defensive', tempo: 'slow', defensiveLine: 'low', pressing: 'low', matchCommand: 'holdLead' })
      if (averageFitness < 75 || state.minute >= 72) aiSubstitution(teamId, 'defend')
      runtime.aiLastChangeMinute = state.minute
    } else if (goalDiff === 0 && state.minute >= 70) {
      doChangeTactics(teamId, ownStrength > rivalStrength + 3
        ? { mentality: 'attacking', tempo: 'fast' }
        : { mentality: 'defensive', tempo: 'slow' })
      runtime.aiLastChangeMinute = state.minute
    } else if (averageFitness < 65) {
      aiSubstitution(teamId, 'fresh')
      runtime.aiLastChangeMinute = state.minute
    }
  }

  const possessionControl = (teamId: string): number => {
    const tactics = tacticsFor(teamId)
    const attackPlan =
      tactics.attackPlan === 'shortPassing' ? 1.08 :
        tactics.attackPlan === 'centralPlay' ? 1.04 :
          tactics.attackPlan === 'directPassing' || tactics.attackPlan === 'earlyCrosses' ? 0.92 : 1
    const command =
      tactics.matchCommand === 'calm' ? 1.04 :
        tactics.matchCommand === 'timeWasting' ? 0.93 :
          tactics.matchCommand === 'loadBox' ? 0.94 :
            tactics.matchCommand === 'raiseTempo' ? 0.98 : 1
    const talk =
      tactics.teamTalk === 'calm' ? 1.03 :
        tactics.teamTalk === 'demandMore' ? 0.98 : 1
    return teamStrength(teamId, 'midfield') * mentalityRisk[tactics.mentality] * attackPlan * command * talk
  }

  const simulateMinute = (): void => {
    if (state.minute >= 90) return
    state.minute += 1
    runAi()
    processAttack(state.homeTeamId, state.awayTeamId)
    processAttack(state.awayTeamId, state.homeTeamId)
    processCard(state.homeTeamId)
    processCard(state.awayTeamId)
    processInjury(state.homeTeamId)
    processInjury(state.awayTeamId)
    drainFitness(state.homeTeamId)
    drainFitness(state.awayTeamId)
    const homeControl = possessionControl(state.homeTeamId)
    const awayControl = possessionControl(state.awayTeamId)
    runtime.stats.home.possession = Math.round(clamp(50 + (homeControl - awayControl) * 0.25, 32, 68))
    runtime.stats.away.possession = 100 - runtime.stats.home.possession
    if (state.minute === 45) addEvent({ type: 'half-time', text: eventText('half-time', undefined) })
    if (state.minute === 90) addEvent({ type: 'full-time', text: eventText('full-time', undefined) })
  }

  const bestPlayerId = (): string => [...runtime.scores].sort((left, right) => right[1] - left[1])[0]?.[0] ?? input.homeLineup.starters[0]!
  const playerMinutes = (): Record<string, number> => Object.fromEntries(
    [...runtime.enteredAt].map(([id, entered]) => [id, Math.max(0, (runtime.exitedAt.get(id) ?? state.minute) - entered)]),
  )

  return {
    state,
    advance(minutes: number): LiveMatchState {
      const count = Math.max(0, Math.min(90 - state.minute, Math.floor(minutes)))
      for (let index = 0; index < count; index += 1) simulateMinute()
      return state
    },
    changeTactics: doChangeTactics,
    substitute: doSubstitute,
    result(): MatchResult {
      const result: MatchResult = {
        detail: 'full', homeGoals: state.homeScore, awayGoals: state.awayScore,
        winnerClubId: state.homeScore > state.awayScore ? state.homeTeamId : state.awayScore > state.homeScore ? state.awayTeamId : undefined,
        goals: [...runtime.goals], stats: { home: { ...runtime.stats.home }, away: { ...runtime.stats.away } },
        bestPlayerId: bestPlayerId(), cards: [...runtime.cards], injuries: [...runtime.injuries], substitutions: [...runtime.substitutions],
        tacticalChanges: [...runtime.tacticalChanges], matchEvents: [...state.events], playerMinutes: playerMinutes(),
        playerFitness: { ...state.fitness },
        commentary: state.events.map((event) => ({
          minute: event.minute, text: event.text,
          kind: event.type === 'substitution' ? 'substitution' : undefined,
          clubId: event.teamId, playerOutId: event.playerOutId, playerInId: event.playerInId,
        })),
      }
      if (state.minute >= 90 && input.allowPenaltyShootout && result.homeGoals === result.awayGoals) {
        result.penaltyWinnerClubId = random.chance(0.5) ? state.homeTeamId : state.awayTeamId
        result.winnerClubId = result.penaltyWinnerClubId
      }
      return result
    },
  }
}
