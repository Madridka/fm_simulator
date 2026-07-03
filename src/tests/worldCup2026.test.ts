import { describe, expect, it } from 'vitest'
import { generateGroupFixtures } from '@/services/worldCup2026/generateGroupFixtures'
import { calculateGroupStandings } from '@/services/worldCup2026/calculateGroupStandings'
import {
  calculateBestThirdPlacedTeams,
  getThirdPlacedGroupLetters,
} from '@/services/worldCup2026/calculateBestThirdPlacedTeams'
import { createInitialKnockoutBracket, assignKnockoutTeams } from '@/services/worldCup2026/generateKnockoutBracket'
import { createInitialWorldCup2026State, refreshAllStandings } from '@/services/worldCup2026/initializeTournament'
import { simulateWorldCupMatch } from '@/services/worldCup2026/simulateWorldCupMatch'
import { simulateWorldCupMatchDay } from '@/services/worldCup2026/simulateWorldCupRound'
import { buildNationalTeam } from '@/data/nationalTeams/worldCup2026/rosters/generator'
import { worldCup2026ProfilesById } from '@/data/nationalTeams/worldCup2026/ratings'
import { worldCup2026SaveRepository } from '@/repositories/worldCup2026SaveRepository'
import { createMemoryStorage } from '@/repositories/gameSaveRepository'
import type { WorldCupMatch } from '@/stores/worldCup2026/types'
import { createSeededRandom } from '@/utils/random'
import { WORLD_CUP_GROUP_IDS } from '@/stores/worldCup2026/enums'

describe('generateGroupFixtures', () => {
  it('generates six matches for a group of four teams', () => {
    const fixtures = generateGroupFixtures(['a', 'b', 'c', 'd'])
    expect(fixtures).toHaveLength(6)
  })

  it('ensures each team plays exactly three matches without duplicate pairs', () => {
    const teamIds = ['a', 'b', 'c', 'd']
    const fixtures = generateGroupFixtures(teamIds)
    const pairCounts = new Map<string, number>()

    for (const teamId of teamIds) {
      const teamMatches = fixtures.filter(
        (fixture) => fixture.homeTeamId === teamId || fixture.awayTeamId === teamId,
      )
      expect(teamMatches).toHaveLength(3)
    }

    for (const fixture of fixtures) {
      const key = [fixture.homeTeamId, fixture.awayTeamId].sort().join('-')
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
    }

    expect(pairCounts.size).toBe(6)
    for (const count of pairCounts.values()) {
      expect(count).toBe(1)
    }
  })
})

describe('calculateGroupStandings', () => {
  const teams = ['t1', 't2', 't3', 't4'].map((id, index) =>
    buildNationalTeam(
      {
        ...worldCup2026ProfilesById.argentina!,
        id,
        name: `Team ${index + 1}`,
        shortName: `T${index + 1}`,
      },
      index,
    ),
  )

  const playedMatch = (
    homeTeamId: string,
    awayTeamId: string,
    homeScore: number,
    awayScore: number,
  ): WorldCupMatch => ({
    id: `${homeTeamId}-${awayTeamId}`,
    competitionType: 'world-cup-2026',
    competitionId: 'world-cup-2026',
    stage: 'group-J',
    groupId: 'J',
    round: 'group-stage-1',
    matchday: 1,
    homeTeamId,
    awayTeamId,
    date: '2026-06-12',
    order: 1,
    status: 'played',
    neutralVenue: true,
    isKnockout: false,
    result: { homeScore, awayScore, decidedBy: 'regular-time' },
  })

  it('awards points correctly', () => {
    const standings = calculateGroupStandings(teams, [
      playedMatch('t1', 't2', 2, 0),
      playedMatch('t3', 't4', 1, 1),
    ])
    const t1 = standings.find((row) => row.teamId === 't1')
    const t2 = standings.find((row) => row.teamId === 't2')
    const t3 = standings.find((row) => row.teamId === 't3')
    expect(t1?.points).toBe(3)
    expect(t2?.points).toBe(0)
    expect(t3?.points).toBe(1)
  })

  it('sorts teams with equal points by goal difference', () => {
    const standings = calculateGroupStandings(teams, [
      playedMatch('t1', 't2', 2, 0),
      playedMatch('t1', 't3', 1, 3),
      playedMatch('t2', 't3', 0, 1),
      playedMatch('t1', 't4', 0, 0),
      playedMatch('t2', 't4', 3, 0),
      playedMatch('t3', 't4', 2, 2),
    ])
    expect(standings[0]?.teamId).toBe('t3')
  })
})

describe('knockout and tournament flow', () => {
  it('selects eight best third-placed teams', () => {
    const state = createInitialWorldCup2026State('argentina', 42)
    let current = state

    while (current.matches.some((match) => !match.isKnockout && match.status === 'scheduled')) {
      current = simulateWorldCupMatchDay(current)
    }

    expect(current.groupStageComplete).toBe(true)
    expect(current.qualifiedThirdPlacedTeamIds).toHaveLength(8)
    expect(current.knockoutBracket?.roundOf32).toHaveLength(16)
  })

  it('resolves knockout winner progression', () => {
    const bracket = createInitialKnockoutBracket()
    const groupWinners = Object.fromEntries(
      WORLD_CUP_GROUP_IDS.map((groupId) => [groupId, `${groupId}-w`]),
    ) as Record<(typeof WORLD_CUP_GROUP_IDS)[number], string>
    const groupRunnersUp = Object.fromEntries(
      WORLD_CUP_GROUP_IDS.map((groupId) => [groupId, `${groupId}-r`]),
    ) as Record<(typeof WORLD_CUP_GROUP_IDS)[number], string>
    const thirdPlaceByGroup = Object.fromEntries(
      WORLD_CUP_GROUP_IDS.map((groupId) => [groupId, `${groupId}-t`]),
    ) as Record<(typeof WORLD_CUP_GROUP_IDS)[number], string>

    const assigned = assignKnockoutTeams(
      bracket,
      groupWinners,
      groupRunnersUp,
      thirdPlaceByGroup,
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    )

    expect(assigned.roundOf32.every((tie) => tie.homeTeamId && tie.awayTeamId)).toBe(true)
    expect(assigned.roundOf32).toHaveLength(16)
  })
})

describe('simulateWorldCupMatch', () => {
  it('decides knockout draws via extra time or penalties', () => {
    const home = buildNationalTeam(worldCup2026ProfilesById.argentina!, 1)
    const away = buildNationalTeam(worldCup2026ProfilesById.haiti!, 2)
    const random = createSeededRandom(999)

    let penaltiesCount = 0
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const result = simulateWorldCupMatch(home, away, `test-${attempt}`, true, random, 'fast')
      if (result.decidedBy === 'penalties') {
        penaltiesCount += 1
        expect(result.penaltyHomeScore).toBeGreaterThan(0)
        expect(result.winnerTeamId).toBeTruthy()
      }
    }

    expect(penaltiesCount).toBeGreaterThan(0)
  })
})

describe('worldCup2026SaveRepository', () => {
  it('restores tournament from save', () => {
    const storage = createMemoryStorage()
    const state = createInitialWorldCup2026State('france', 100)
    worldCup2026SaveRepository.save(state, storage)
    const loaded = worldCup2026SaveRepository.load(storage)
    expect(loaded?.selectedTeamId).toBe('france')
    expect(loaded?.teams).toHaveLength(48)
  })
})
