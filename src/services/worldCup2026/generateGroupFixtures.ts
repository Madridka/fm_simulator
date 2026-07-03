import { worldCup2026Config } from '@/data/nationalTeams/worldCup2026/config'
import type { WorldCupGroupId } from '@/stores/worldCup2026/enums'
import type { WorldCupMatch } from '@/stores/worldCup2026/types'

export interface GroupFixture {
  homeTeamId: string
  awayTeamId: string
  matchday: number
}

// КАЛЕНДАРЬ ГРУППЫ ИЗ 4 КОМАНД: 6 МАТЧЕЙ, 3 ТУРА
export const generateGroupFixtures = (teamIds: readonly string[]): GroupFixture[] => {
  if (teamIds.length !== worldCup2026Config.teamsPerGroup) {
    throw new Error(`Group must have exactly ${worldCup2026Config.teamsPerGroup} teams`)
  }

  const [t1, t2, t3, t4] = teamIds as [string, string, string, string]

  return [
    { homeTeamId: t1, awayTeamId: t2, matchday: 1 },
    { homeTeamId: t3, awayTeamId: t4, matchday: 1 },
    { homeTeamId: t1, awayTeamId: t3, matchday: 2 },
    { homeTeamId: t4, awayTeamId: t2, matchday: 2 },
    { homeTeamId: t4, awayTeamId: t1, matchday: 3 },
    { homeTeamId: t2, awayTeamId: t3, matchday: 3 },
  ]
}

const GROUP_STAGE_DATES = ['2026-06-12', '2026-06-18', '2026-06-24']

export const buildGroupStageMatches = (
  groupId: WorldCupGroupId,
  teamIds: readonly string[],
  startOrder: number,
): { matches: WorldCupMatch[]; nextOrder: number } => {
  const fixtures = generateGroupFixtures(teamIds)
  const matches: WorldCupMatch[] = []
  let order = startOrder

  fixtures.forEach((fixture, index) => {
    const round =
      fixture.matchday === 1
        ? 'group-stage-1'
        : fixture.matchday === 2
          ? 'group-stage-2'
          : 'group-stage-3'

    matches.push({
      id: `wc26-${groupId}-md${fixture.matchday}-${index}`,
      competitionType: 'world-cup-2026',
      competitionId: worldCup2026Config.id,
      stage: `group-${groupId}`,
      groupId,
      round,
      matchday: fixture.matchday,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      date: GROUP_STAGE_DATES[fixture.matchday - 1] ?? GROUP_STAGE_DATES[2] ?? '2026-06-24',
      order,
      status: 'scheduled',
      neutralVenue: true,
      isKnockout: false,
    })
    order += 1
  })

  return { matches, nextOrder: order }
}
