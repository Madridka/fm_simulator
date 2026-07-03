import { WORLD_CUP_SAVE_VERSION, worldCup2026Config } from '@/data/nationalTeams/worldCup2026/config'
import { worldCup2026Groups } from '@/data/nationalTeams/worldCup2026/groups'
import { buildAllNationalTeams } from '@/data/nationalTeams/worldCup2026/rosters/generator'
import { createGameSession } from '@/types/gameMode'
import { WORLD_CUP_GROUP_IDS } from '@/stores/worldCup2026/enums'
import type { WorldCup2026State, WorldCupGroup, WorldCupStanding } from '@/stores/worldCup2026/types'
import { buildGroupStageMatches } from '@/services/worldCup2026/generateGroupFixtures'
import { calculateGroupStandings } from '@/services/worldCup2026/calculateGroupStandings'

const createEmptyStandings = (teamIds: readonly string[]): WorldCupStanding[] =>
  teamIds.map((teamId, index) => ({
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    yellowCards: 0,
    indirectRedCards: 0,
    directRedCards: 0,
    position: index + 1,
    qualificationStatus: 'pending',
  }))

export const createInitialWorldCup2026State = (
  selectedTeamId: string,
  seed = Date.now(),
): WorldCup2026State => {
  const teams = buildAllNationalTeams(seed)
  const selectedTeam = teams.find((team) => team.id === selectedTeamId)
  if (!selectedTeam) {
    throw new Error(`Unknown national team: ${selectedTeamId}`)
  }

  const groups: WorldCupGroup[] = worldCup2026Groups.map((group) => ({
    id: group.id,
    teamIds: [...group.teams],
  }))

  let order = 1
  const matches = []
  for (const group of worldCup2026Groups) {
    const built = buildGroupStageMatches(group.id, group.teams, order)
    matches.push(...built.matches)
    order = built.nextOrder
  }

  const standings = Object.fromEntries(
    worldCup2026Groups.map((group) => [group.id, createEmptyStandings(group.teams)]),
  ) as Record<(typeof worldCup2026Groups)[number]['id'], WorldCupStanding[]>

  return {
    version: WORLD_CUP_SAVE_VERSION,
    session: createGameSession('world-cup-2026'),
    status: 'group-stage',
    selectedTeamId,
    teams,
    currentDate: '2026-06-12',
    currentRound: 'group-stage-1',
    currentMatchday: 1,
    groups,
    matches,
    standings,
    qualifiedThirdPlacedTeamIds: [],
    lineups: {},
    playerStats: {},
    groupStageComplete: false,
    knockoutInitialized: false,
    lastSimulatedOrder: 0,
    tournamentSeed: seed,
  }
}

export const refreshAllStandings = (state: WorldCup2026State): WorldCup2026State => {
  const standings = Object.fromEntries(
    WORLD_CUP_GROUP_IDS.map((groupId) => {
      const group = state.groups.find((candidate) => candidate.id === groupId)
      const groupTeams = state.teams.filter((team) => group?.teamIds.includes(team.id) ?? false)
      return [groupId, calculateGroupStandings(groupTeams, state.matches)]
    }),
  ) as WorldCup2026State['standings']

  return { ...state, standings }
}
