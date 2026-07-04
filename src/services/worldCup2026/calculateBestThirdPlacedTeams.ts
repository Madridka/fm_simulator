import { worldCup2026Config } from '@/data/nationalTeams/worldCup2026/config'
import { worldCup2026RatingByTeamId } from '@/data/nationalTeams/worldCup2026/ratings'
import type { WorldCupGroupId } from '@/stores/worldCup2026/enums'
import type { WorldCupStanding, WorldCupThirdPlaceStanding } from '@/stores/worldCup2026/types'

const fairPlayScore = (standing: WorldCupStanding): number =>
  standing.yellowCards + standing.indirectRedCards * 2 + standing.directRedCards * 3

const compareThirdPlace = (left: WorldCupStanding, right: WorldCupStanding): number => {
  if (right.points !== left.points) {
    return right.points - left.points
  }
  if (right.goalDifference !== left.goalDifference) {
    return right.goalDifference - left.goalDifference
  }
  if (right.goalsFor !== left.goalsFor) {
    return right.goalsFor - left.goalsFor
  }

  const leftFairPlay = fairPlayScore(left)
  const rightFairPlay = fairPlayScore(right)
  if (leftFairPlay !== rightFairPlay) {
    return leftFairPlay - rightFairPlay
  }

  const leftRating = worldCup2026RatingByTeamId[left.teamId] ?? 0
  const rightRating = worldCup2026RatingByTeamId[right.teamId] ?? 0
  if (rightRating !== leftRating) {
    return rightRating - leftRating
  }

  return left.teamId.localeCompare(right.teamId)
}

export const calculateBestThirdPlacedTeams = (
  standings: Record<WorldCupGroupId, WorldCupStanding[]>,
): WorldCupStanding[] => {
  return calculateThirdPlaceStandings(standings)
    .filter((row) => row.qualificationStatus === 'qualified-third-place')
}

export const calculateThirdPlaceStandings = (
  standings: Record<WorldCupGroupId, WorldCupStanding[]>,
): WorldCupThirdPlaceStanding[] => {
  const thirdPlaced = (Object.entries(standings) as Array<[WorldCupGroupId, WorldCupStanding[]]>)
    .map(([groupId, rows]) => {
      const row = rows.find((candidate) => candidate.position === 3)
      return row ? { ...row, groupId } : undefined
    })
    .filter((row): row is WorldCupStanding & { groupId: WorldCupGroupId } => Boolean(row))
    .sort(compareThirdPlace)

  const groupStageComplete = thirdPlaced.length === 12 && thirdPlaced.every((row) => row.played === 3)
  return thirdPlaced.map((row, index) => ({
    ...row,
    originalGroupPosition: 3,
    thirdPlaceRank: index + 1,
    qualificationStatus: groupStageComplete
      ? index < worldCup2026Config.bestThirdPlacedQualifiersCount
        ? 'qualified-third-place'
        : 'eliminated'
      : 'pending',
  }))
}

export const getThirdPlacedGroupLetters = (
  standings: Record<WorldCupGroupId, WorldCupStanding[]>,
  qualifiedThirdIds: readonly string[],
): WorldCupGroupId[] => {
  const letters: WorldCupGroupId[] = []

  for (const [groupId, groupStandings] of Object.entries(standings) as Array<
    [WorldCupGroupId, WorldCupStanding[]]
  >) {
    const third = groupStandings.find((row) => row.position === 3)
    if (third && qualifiedThirdIds.includes(third.teamId)) {
      letters.push(groupId)
    }
  }

  return letters.sort()
}
