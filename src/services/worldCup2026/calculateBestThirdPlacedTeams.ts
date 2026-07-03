import { worldCup2026Config } from '@/data/nationalTeams/worldCup2026/config'
import { worldCup2026RatingByTeamId } from '@/data/nationalTeams/worldCup2026/ratings'
import type { WorldCupGroupId } from '@/stores/worldCup2026/enums'
import type { WorldCupStanding } from '@/stores/worldCup2026/types'

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
  const thirdPlaced = Object.values(standings)
    .map((groupStandings) => groupStandings.find((row) => row.position === 3))
    .filter((row): row is WorldCupStanding => Boolean(row))

  const ranked = [...thirdPlaced].sort(compareThirdPlace)
  const qualified = ranked.slice(0, worldCup2026Config.bestThirdPlacedQualifiersCount)

  return qualified.map((row) => ({
    ...row,
    qualificationStatus: 'qualified-third-place' as const,
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
