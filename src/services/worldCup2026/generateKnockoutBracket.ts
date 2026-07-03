import type { WorldCupGroupId } from '@/stores/worldCup2026/enums'
import type { KnockoutSource, WorldCupKnockoutBracket, WorldCupKnockoutTie } from '@/stores/worldCup2026/types'
import { getThirdPlaceSlotAssignment } from '@/services/worldCup2026/bestThirdPlaceCombinationMap'

const createTie = (
  id: string,
  round: WorldCupKnockoutTie['round'],
  sourceHome: KnockoutSource,
  sourceAway: KnockoutSource,
): WorldCupKnockoutTie => ({
  id,
  round,
  sourceHome,
  sourceAway,
})

export const ROUND_OF_32_TEMPLATE: Array<{
  id: string
  home: KnockoutSource
  away: KnockoutSource
}> = [
  { id: 'r32-73', home: { type: 'group-runner-up', groupId: 'A' }, away: { type: 'group-runner-up', groupId: 'B' } },
  { id: 'r32-74', home: { type: 'group-winner', groupId: 'E' }, away: { type: 'best-third-place', groupId: 'E' } },
  { id: 'r32-75', home: { type: 'group-winner', groupId: 'F' }, away: { type: 'group-runner-up', groupId: 'C' } },
  { id: 'r32-76', home: { type: 'group-winner', groupId: 'C' }, away: { type: 'group-runner-up', groupId: 'F' } },
  { id: 'r32-77', home: { type: 'group-winner', groupId: 'I' }, away: { type: 'best-third-place', groupId: 'I' } },
  { id: 'r32-78', home: { type: 'group-runner-up', groupId: 'E' }, away: { type: 'group-runner-up', groupId: 'I' } },
  { id: 'r32-79', home: { type: 'group-winner', groupId: 'A' }, away: { type: 'best-third-place', groupId: 'A' } },
  { id: 'r32-80', home: { type: 'group-winner', groupId: 'L' }, away: { type: 'best-third-place', groupId: 'L' } },
  { id: 'r32-81', home: { type: 'group-winner', groupId: 'D' }, away: { type: 'best-third-place', groupId: 'D' } },
  { id: 'r32-82', home: { type: 'group-winner', groupId: 'G' }, away: { type: 'best-third-place', groupId: 'G' } },
  { id: 'r32-83', home: { type: 'group-runner-up', groupId: 'K' }, away: { type: 'group-runner-up', groupId: 'L' } },
  { id: 'r32-84', home: { type: 'group-winner', groupId: 'H' }, away: { type: 'group-runner-up', groupId: 'J' } },
  { id: 'r32-85', home: { type: 'group-winner', groupId: 'B' }, away: { type: 'best-third-place', groupId: 'B' } },
  { id: 'r32-86', home: { type: 'group-winner', groupId: 'J' }, away: { type: 'group-runner-up', groupId: 'H' } },
  { id: 'r32-87', home: { type: 'group-winner', groupId: 'K' }, away: { type: 'best-third-place', groupId: 'K' } },
  { id: 'r32-88', home: { type: 'group-runner-up', groupId: 'D' }, away: { type: 'group-runner-up', groupId: 'G' } },
]

const THIRD_PLACE_ELIGIBLE: Partial<Record<WorldCupGroupId, WorldCupGroupId[]>> = {
  A: ['C', 'E', 'F', 'H', 'I'],
  B: ['E', 'F', 'G', 'I', 'J'],
  D: ['B', 'E', 'F', 'I', 'J'],
  E: ['A', 'B', 'C', 'D', 'F'],
  G: ['A', 'E', 'H', 'I', 'J'],
  I: ['C', 'D', 'F', 'G', 'H'],
  K: ['D', 'E', 'I', 'J', 'L'],
  L: ['E', 'H', 'I', 'J', 'K'],
}

const resolveThirdPlaceGroup = (
  winnerGroupId: WorldCupGroupId,
  slotAssignment: Record<string, WorldCupGroupId>,
): WorldCupGroupId => {
  const slotKey = `1${winnerGroupId}` as keyof typeof slotAssignment
  const assignedGroup = slotAssignment[slotKey]
  if (!assignedGroup) {
    throw new Error(`No third-place slot for ${winnerGroupId}`)
  }
  return assignedGroup
}

export const createInitialKnockoutBracket = (): WorldCupKnockoutBracket => ({
  roundOf32: ROUND_OF_32_TEMPLATE.map((template) =>
    createTie(template.id, 'round-of-32', template.home, template.away),
  ),
  roundOf16: [
    createTie('r16-89', 'round-of-16', { type: 'winner', tieId: 'r32-74' }, { type: 'winner', tieId: 'r32-77' }),
    createTie('r16-90', 'round-of-16', { type: 'winner', tieId: 'r32-73' }, { type: 'winner', tieId: 'r32-75' }),
    createTie('r16-91', 'round-of-16', { type: 'winner', tieId: 'r32-76' }, { type: 'winner', tieId: 'r32-78' }),
    createTie('r16-92', 'round-of-16', { type: 'winner', tieId: 'r32-79' }, { type: 'winner', tieId: 'r32-80' }),
    createTie('r16-93', 'round-of-16', { type: 'winner', tieId: 'r32-83' }, { type: 'winner', tieId: 'r32-84' }),
    createTie('r16-94', 'round-of-16', { type: 'winner', tieId: 'r32-81' }, { type: 'winner', tieId: 'r32-82' }),
    createTie('r16-95', 'round-of-16', { type: 'winner', tieId: 'r32-86' }, { type: 'winner', tieId: 'r32-88' }),
    createTie('r16-96', 'round-of-16', { type: 'winner', tieId: 'r32-85' }, { type: 'winner', tieId: 'r32-87' }),
  ],
  quarterFinals: [
    createTie('qf-97', 'quarter-final', { type: 'winner', tieId: 'r16-89' }, { type: 'winner', tieId: 'r16-90' }),
    createTie('qf-98', 'quarter-final', { type: 'winner', tieId: 'r16-93' }, { type: 'winner', tieId: 'r16-94' }),
    createTie('qf-99', 'quarter-final', { type: 'winner', tieId: 'r16-91' }, { type: 'winner', tieId: 'r16-92' }),
    createTie('qf-100', 'quarter-final', { type: 'winner', tieId: 'r16-95' }, { type: 'winner', tieId: 'r16-96' }),
  ],
  semiFinals: [
    createTie('sf-101', 'semi-final', { type: 'winner', tieId: 'qf-97' }, { type: 'winner', tieId: 'qf-98' }),
    createTie('sf-102', 'semi-final', { type: 'winner', tieId: 'qf-99' }, { type: 'winner', tieId: 'qf-100' }),
  ],
  thirdPlaceMatch: createTie(
    'tp-103',
    'third-place',
    { type: 'loser', tieId: 'sf-101' },
    { type: 'loser', tieId: 'sf-102' },
  ),
  final: createTie('f-104', 'final', { type: 'winner', tieId: 'sf-101' }, { type: 'winner', tieId: 'sf-102' }),
})

export const assignKnockoutTeams = (
  bracket: WorldCupKnockoutBracket,
  groupWinners: Record<WorldCupGroupId, string>,
  groupRunnersUp: Record<WorldCupGroupId, string>,
  thirdPlaceByGroup: Record<WorldCupGroupId, string>,
  qualifyingThirdGroups: readonly WorldCupGroupId[],
): WorldCupKnockoutBracket => {
  const slotAssignment = getThirdPlaceSlotAssignment(qualifyingThirdGroups)

  const resolveSource = (source: KnockoutSource): string | undefined => {
    if (source.type === 'group-winner') {
      return groupWinners[source.groupId]
    }
    if (source.type === 'group-runner-up') {
      return groupRunnersUp[source.groupId]
    }
    if (source.type === 'best-third-place') {
      const assignedGroup = resolveThirdPlaceGroup(source.groupId, slotAssignment)
      return thirdPlaceByGroup[assignedGroup]
    }
    return undefined
  }

  const fillTies = (ties: WorldCupKnockoutTie[]): WorldCupKnockoutTie[] =>
    ties.map((tie) => ({
      ...tie,
      homeTeamId: tie.sourceHome ? resolveSource(tie.sourceHome) : tie.homeTeamId,
      awayTeamId: tie.sourceAway ? resolveSource(tie.sourceAway) : tie.awayTeamId,
    }))

  return {
    ...bracket,
    roundOf32: fillTies(bracket.roundOf32),
    roundOf16: bracket.roundOf16,
    quarterFinals: bracket.quarterFinals,
    semiFinals: bracket.semiFinals,
    thirdPlaceMatch: bracket.thirdPlaceMatch,
    final: bracket.final,
  }
}

export { THIRD_PLACE_ELIGIBLE }
