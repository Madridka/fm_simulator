import { worldCup2026Config } from '@/data/nationalTeams/worldCup2026/config'
import { calculateBestThirdPlacedTeams, getThirdPlacedGroupLetters } from '@/services/worldCup2026/calculateBestThirdPlacedTeams'
import {
  assignKnockoutTeams,
  createInitialKnockoutBracket,
} from '@/services/worldCup2026/generateKnockoutBracket'
import { refreshAllStandings } from '@/services/worldCup2026/initializeTournament'
import { simulateWorldCupMatch } from '@/services/worldCup2026/simulateWorldCupMatch'
import type { WorldCupGroupId, WorldCupRound } from '@/stores/worldCup2026/enums'
import type {
  WorldCup2026State,
  WorldCupKnockoutBracket,
  WorldCupKnockoutTie,
  WorldCupMatch,
} from '@/stores/worldCup2026/types'
import { createSeededRandom } from '@/utils/random'

const getTeamById = (state: WorldCup2026State, teamId: string) =>
  state.teams.find((team) => team.id === teamId)

const roundForMatchday = (matchday: number): WorldCupRound => {
  if (matchday === 1) return 'group-stage-1'
  if (matchday === 2) return 'group-stage-2'
  return 'group-stage-3'
}

const getNextGroupMatchday = (state: WorldCup2026State): number | null => {
  const pending = state.matches.filter(
    (match) => !match.isKnockout && match.status === 'scheduled',
  )
  if (!pending.length) {
    return null
  }
  return Math.min(...pending.map((match) => match.matchday))
}

const getMatchesForOrder = (state: WorldCup2026State, order: number): WorldCupMatch[] =>
  state.matches.filter((match) => match.order === order && match.status === 'scheduled')

const getNextScheduledOrder = (state: WorldCup2026State): number | null => {
  const pending = state.matches.filter((match) => match.status === 'scheduled')
  if (!pending.length) {
    return null
  }
  return Math.min(...pending.map((match) => match.order))
}

const applyFitnessRecovery = (state: WorldCup2026State): WorldCup2026State => ({
  ...state,
  teams: state.teams.map((team) => ({
    ...team,
    players: team.players.map((player) => ({
      ...player,
      fitness: Math.min(100, player.fitness + worldCup2026Config.fitnessRecoveryPerMatch * 100),
      suspensionMatchesRemaining: Math.max(0, (player.suspensionMatchesRemaining ?? 0) - 1),
    })),
  })),
})

const simulateSingleMatch = (
  state: WorldCup2026State,
  match: WorldCupMatch,
  random: ReturnType<typeof createSeededRandom>,
  userDetail: 'fast' | 'medium' = 'fast',
): WorldCupMatch => {
  const homeTeam = getTeamById(state, match.homeTeamId)
  const awayTeam = getTeamById(state, match.awayTeamId)
  if (!homeTeam || !awayTeam) {
    throw new Error(`Teams not found for match ${match.id}`)
  }

  const isUserMatch =
    match.homeTeamId === state.selectedTeamId || match.awayTeamId === state.selectedTeamId
  const detail = isUserMatch ? userDetail : 'fast'

  const result = simulateWorldCupMatch(
    homeTeam,
    awayTeam,
    match.id,
    match.isKnockout,
    random,
    detail,
  )

  return {
    ...match,
    status: 'played',
    result,
  }
}

export const simulateWorldCupMatchDay = (
  state: WorldCup2026State,
  userDetail: 'fast' | 'medium' = 'fast',
): WorldCup2026State => {
  const nextOrder = getNextScheduledOrder(state)
  if (nextOrder === null) {
    return state
  }

  const random = createSeededRandom(state.tournamentSeed + nextOrder)
  const dayMatches = getMatchesForOrder(state, nextOrder)
  if (!dayMatches.length) {
    return state
  }

  const updatedMatches = state.matches.map((match) => {
    if (match.order !== nextOrder || match.status === 'played') {
      return match
    }
    return simulateSingleMatch(state, match, random, userDetail)
  })

  let nextState: WorldCup2026State = {
    ...state,
    matches: updatedMatches,
    lastSimulatedOrder: nextOrder,
  }

  nextState = applyFitnessRecovery(refreshAllStandings(nextState))

  if (!nextState.groupStageComplete) {
    const pendingGroup = nextState.matches.some(
      (match) => !match.isKnockout && match.status === 'scheduled',
    )
    if (!pendingGroup) {
      nextState = initializeKnockoutStage(nextState)
    } else {
      const nextMatchday = getNextGroupMatchday(nextState)
      if (nextMatchday) {
        nextState.currentMatchday = nextMatchday
        nextState.currentRound = roundForMatchday(nextMatchday)
      }
    }
  } else {
    nextState = advanceKnockoutWinners(nextState)
    nextState = checkTournamentFinished(nextState)
  }

  return nextState
}

export const initializeKnockoutStage = (state: WorldCup2026State): WorldCup2026State => {
  if (state.knockoutInitialized) {
    return state
  }

  const refreshed = refreshAllStandings(state)
  const bestThird = calculateBestThirdPlacedTeams(refreshed.standings)
  const qualifiedThirdIds = bestThird.map((row) => row.teamId)
  const qualifyingGroups = getThirdPlacedGroupLetters(refreshed.standings, qualifiedThirdIds)

  const groupWinners = Object.fromEntries(
    Object.entries(refreshed.standings).map(([groupId, rows]) => [
      groupId,
      rows.find((row) => row.position === 1)?.teamId,
    ]),
  ) as Record<WorldCupGroupId, string>

  const groupRunnersUp = Object.fromEntries(
    Object.entries(refreshed.standings).map(([groupId, rows]) => [
      groupId,
      rows.find((row) => row.position === 2)?.teamId,
    ]),
  ) as Record<WorldCupGroupId, string>

  const thirdPlaceByGroup = Object.fromEntries(
    Object.entries(refreshed.standings).map(([groupId, rows]) => [
      groupId,
      rows.find((row) => row.position === 3)?.teamId,
    ]),
  ) as Record<WorldCupGroupId, string>

  const baseBracket = createInitialKnockoutBracket()
  const bracket = assignKnockoutTeams(
    baseBracket,
    groupWinners,
    groupRunnersUp,
    thirdPlaceByGroup,
    qualifyingGroups,
  )

  const knockoutMatches = createKnockoutMatches(
    bracket,
    refreshed.matches.length + 1,
    ['round-of-32'],
  )

  const userThird = refreshed.standings[
    refreshed.teams.find((team) => team.id === refreshed.selectedTeamId)?.groupId as WorldCupGroupId
  ]?.find((row) => row.teamId === refreshed.selectedTeamId)

  let userEliminatedAt = refreshed.userEliminatedAt
  if (userThird?.position === 4) {
    userEliminatedAt = 'group-stage-3'
  } else if (userThird?.position === 3 && !qualifiedThirdIds.includes(refreshed.selectedTeamId)) {
    userEliminatedAt = 'group-stage-3'
  }

  return {
    ...refreshed,
    status: 'knockout-stage',
    currentRound: 'round-of-32',
    qualifiedThirdPlacedTeamIds: qualifiedThirdIds,
    knockoutBracket: bracket,
    matches: [...refreshed.matches, ...knockoutMatches],
    groupStageComplete: true,
    knockoutInitialized: true,
    userEliminatedAt,
  }
}

const KNOCKOUT_ROUND_ORDER: WorldCupRound[] = [
  'round-of-32',
  'round-of-16',
  'quarter-final',
  'semi-final',
  'third-place',
  'final',
]

const createKnockoutMatches = (
  bracket: WorldCupKnockoutBracket,
  startOrder: number,
  rounds?: WorldCupRound[],
): WorldCupMatch[] => {
  const allTies: WorldCupKnockoutTie[] = [
    ...bracket.roundOf32,
    ...bracket.roundOf16,
    ...bracket.quarterFinals,
    ...bracket.semiFinals,
    ...(bracket.thirdPlaceMatch ? [bracket.thirdPlaceMatch] : []),
    ...(bracket.final ? [bracket.final] : []),
  ]

  const ties = rounds ? allTies.filter((tie) => rounds.includes(tie.round)) : allTies

  let order = startOrder
  const dates: Record<WorldCupRound, string> = {
    'group-stage-1': '2026-06-12',
    'group-stage-2': '2026-06-18',
    'group-stage-3': '2026-06-24',
    'round-of-32': '2026-06-28',
    'round-of-16': '2026-07-04',
    'quarter-final': '2026-07-09',
    'semi-final': '2026-07-14',
    'third-place': '2026-07-18',
    final: '2026-07-19',
  }

  return ties
    .filter((tie) => tie.homeTeamId && tie.awayTeamId)
    .map((tie) => {
      const match: WorldCupMatch = {
        id: `wc26-ko-${tie.id}`,
        competitionType: 'world-cup-2026',
        competitionId: worldCup2026Config.id,
        stage: tie.round,
        round: tie.round,
        matchday: KNOCKOUT_ROUND_ORDER.indexOf(tie.round) + 4,
        homeTeamId: tie.homeTeamId as string,
        awayTeamId: tie.awayTeamId as string,
        date: dates[tie.round],
        order,
        status: 'scheduled',
        neutralVenue: true,
        isKnockout: true,
      }
      order += 1
      return match
    })
}

const findTieWinner = (state: WorldCup2026State, tieId: string): string | undefined => {
  const match = state.matches.find((candidate) => candidate.id === `wc26-ko-${tieId}`)
  return match?.result?.winnerTeamId
}

const findTieLoser = (state: WorldCup2026State, tieId: string): string | undefined => {
  const match = state.matches.find((candidate) => candidate.id === `wc26-ko-${tieId}`)
  if (!match?.result?.winnerTeamId) {
    return undefined
  }
  return match.result.winnerTeamId === match.homeTeamId
    ? match.awayTeamId
    : match.homeTeamId
}

const resolveBracketTeams = (
  bracket: WorldCupKnockoutBracket,
  state: WorldCup2026State,
): WorldCupKnockoutBracket => {
  const fill = (ties: WorldCupKnockoutTie[]): WorldCupKnockoutTie[] =>
    ties.map((tie) => ({
      ...tie,
      homeTeamId:
        tie.sourceHome?.type === 'winner'
          ? findTieWinner(state, tie.sourceHome.tieId)
          : tie.sourceHome?.type === 'loser'
            ? findTieLoser(state, tie.sourceHome.tieId)
            : tie.homeTeamId,
      awayTeamId:
        tie.sourceAway?.type === 'winner'
          ? findTieWinner(state, tie.sourceAway.tieId)
          : tie.sourceAway?.type === 'loser'
            ? findTieLoser(state, tie.sourceAway.tieId)
            : tie.awayTeamId,
      winnerTeamId: findTieWinner(state, tie.id),
    }))

  return {
    roundOf32: fill(bracket.roundOf32),
    roundOf16: fill(bracket.roundOf16),
    quarterFinals: fill(bracket.quarterFinals),
    semiFinals: fill(bracket.semiFinals),
    thirdPlaceMatch: bracket.thirdPlaceMatch ? fill([bracket.thirdPlaceMatch])[0] : undefined,
    final: bracket.final ? fill([bracket.final])[0] : undefined,
  }
}

export const advanceKnockoutWinners = (state: WorldCup2026State): WorldCup2026State => {
  if (!state.knockoutBracket) {
    return state
  }

  const bracket = resolveBracketTeams(state.knockoutBracket, state)
  const existingIds = new Set(state.matches.map((match) => match.id))

  const roundsToTry: WorldCupRound[] = [
    'round-of-16',
    'quarter-final',
    'semi-final',
    'third-place',
    'final',
  ]

  const newMatches = roundsToTry.flatMap((round) =>
    createKnockoutMatches(bracket, state.matches.length + 500, [round]).filter(
      (match) => !existingIds.has(match.id),
    ),
  )

  let userEliminatedAt = state.userEliminatedAt
  const userLostKnockout = state.matches.find(
    (match) =>
      match.isKnockout &&
      match.status === 'played' &&
      (match.homeTeamId === state.selectedTeamId || match.awayTeamId === state.selectedTeamId) &&
      match.result?.winnerTeamId &&
      match.result.winnerTeamId !== state.selectedTeamId,
  )
  if (userLostKnockout && !userEliminatedAt) {
    userEliminatedAt = userLostKnockout.round
  }

  const pendingRound = state.matches.find((match) => match.status === 'scheduled')?.round

  return {
    ...state,
    knockoutBracket: bracket,
    matches: [...state.matches, ...newMatches],
    currentRound: pendingRound ?? state.currentRound,
    userEliminatedAt,
  }
}

const checkTournamentFinished = (state: WorldCup2026State): WorldCup2026State => {
  const finalMatch = state.matches.find((match) => match.round === 'final' && match.status === 'played')
  if (!finalMatch?.result?.winnerTeamId) {
    return state
  }

  const championTeamId = finalMatch.result.winnerTeamId
  const runnerUpTeamId =
    finalMatch.homeTeamId === championTeamId ? finalMatch.awayTeamId : finalMatch.homeTeamId
  const thirdPlaceMatch = state.matches.find(
    (match) => match.round === 'third-place' && match.status === 'played',
  )

  return {
    ...state,
    status: 'finished',
    championTeamId,
    runnerUpTeamId,
    thirdPlaceTeamId: thirdPlaceMatch?.result?.winnerTeamId,
    currentRound: 'final',
  }
}

export const getUserNextMatch = (state: WorldCup2026State): WorldCupMatch | undefined =>
  state.matches.find(
    (match) =>
      match.status === 'scheduled' &&
      (match.homeTeamId === state.selectedTeamId || match.awayTeamId === state.selectedTeamId),
  )

export const canSimulateMatchDay = (state: WorldCup2026State): boolean =>
  getNextScheduledOrder(state) !== null
