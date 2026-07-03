import { worldCup2026Config } from '@/data/nationalTeams/worldCup2026/config'
import { worldCup2026RatingByTeamId } from '@/data/nationalTeams/worldCup2026/ratings'
import type { NationalTeam } from '@/data/nationalTeams/worldCup2026/teams'
import type { WorldCupMatch, WorldCupStanding } from '@/stores/worldCup2026/types'

const createEmptyStanding = (teamId: string): WorldCupStanding => ({
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
  position: 0,
  qualificationStatus: 'pending',
})

const fairPlayScore = (standing: WorldCupStanding): number =>
  standing.yellowCards + standing.indirectRedCards * 2 + standing.directRedCards * 3

const headToHeadStats = (
  teamIds: readonly string[],
  matches: readonly WorldCupMatch[],
): Map<string, { points: number; goalDifference: number; goalsFor: number }> => {
  const stats = new Map(
    teamIds.map((teamId) => [teamId, { points: 0, goalDifference: 0, goalsFor: 0 }]),
  )

  for (const match of matches) {
    if (match.status !== 'played' || !match.result) {
      continue
    }

    if (!teamIds.includes(match.homeTeamId) || !teamIds.includes(match.awayTeamId)) {
      continue
    }

    const home = stats.get(match.homeTeamId)
    const away = stats.get(match.awayTeamId)
    if (!home || !away) {
      continue
    }

    const homeGoals = match.result.homeScore
    const awayGoals = match.result.awayScore

    home.goalsFor += homeGoals
    home.goalDifference += homeGoals - awayGoals
    away.goalsFor += awayGoals
    away.goalDifference += awayGoals - homeGoals

    if (homeGoals > awayGoals) {
      home.points += worldCup2026Config.pointsForWin
      away.points += worldCup2026Config.pointsForLoss
    } else if (homeGoals < awayGoals) {
      away.points += worldCup2026Config.pointsForWin
      home.points += worldCup2026Config.pointsForLoss
    } else {
      home.points += worldCup2026Config.pointsForDraw
      away.points += worldCup2026Config.pointsForDraw
    }
  }

  return stats
}

const compareStandings = (
  left: WorldCupStanding,
  right: WorldCupStanding,
  headToHead: Map<string, { points: number; goalDifference: number; goalsFor: number }>,
): number => {
  if (right.points !== left.points) {
    return right.points - left.points
  }
  if (right.goalDifference !== left.goalDifference) {
    return right.goalDifference - left.goalDifference
  }
  if (right.goalsFor !== left.goalsFor) {
    return right.goalsFor - left.goalsFor
  }

  const leftH2H = headToHead.get(left.teamId)
  const rightH2H = headToHead.get(right.teamId)
  if (leftH2H && rightH2H) {
    if (rightH2H.points !== leftH2H.points) {
      return rightH2H.points - leftH2H.points
    }
    if (rightH2H.goalDifference !== leftH2H.goalDifference) {
      return rightH2H.goalDifference - leftH2H.goalDifference
    }
    if (rightH2H.goalsFor !== leftH2H.goalsFor) {
      return rightH2H.goalsFor - leftH2H.goalsFor
    }
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

export const calculateGroupStandings = (
  teams: readonly NationalTeam[],
  matches: readonly WorldCupMatch[],
): WorldCupStanding[] => {
  const teamIds = teams.map((team) => team.id)
  const groupMatches = matches.filter(
    (match) => teamIds.includes(match.homeTeamId) && teamIds.includes(match.awayTeamId),
  )

  const standings = teamIds.map((teamId) => createEmptyStanding(teamId))

  for (const match of groupMatches) {
    if (match.status !== 'played' || !match.result) {
      continue
    }

    const home = standings.find((row) => row.teamId === match.homeTeamId)
    const away = standings.find((row) => row.teamId === match.awayTeamId)
    if (!home || !away) {
      continue
    }

    const homeGoals = match.result.homeScore
    const awayGoals = match.result.awayScore

    home.played += 1
    away.played += 1
    home.goalsFor += homeGoals
    home.goalsAgainst += awayGoals
    away.goalsFor += awayGoals
    away.goalsAgainst += homeGoals
    home.goalDifference = home.goalsFor - home.goalsAgainst
    away.goalDifference = away.goalsFor - away.goalsAgainst

    if (homeGoals > awayGoals) {
      home.wins += 1
      home.points += worldCup2026Config.pointsForWin
      away.losses += 1
      away.points += worldCup2026Config.pointsForLoss
    } else if (homeGoals < awayGoals) {
      away.wins += 1
      away.points += worldCup2026Config.pointsForWin
      home.losses += 1
      home.points += worldCup2026Config.pointsForLoss
    } else {
      home.draws += 1
      away.draws += 1
      home.points += worldCup2026Config.pointsForDraw
      away.points += worldCup2026Config.pointsForDraw
    }
  }

  const tiedTeamIds = [...new Set(standings.map((row) => row.teamId))]
  const headToHead = headToHeadStats(tiedTeamIds, groupMatches)

  const sorted = [...standings].sort((left, right) =>
    compareStandings(left, right, headToHead),
  )

  return sorted.map((row, index) => ({
    ...row,
    position: index + 1,
    qualificationStatus:
      index === 0 || index === 1
        ? 'qualified-directly'
        : index === 2
          ? 'pending'
          : 'eliminated',
  }))
}
