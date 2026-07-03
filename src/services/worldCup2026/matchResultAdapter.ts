import type { Match, MatchResult } from '@/types/football'
import type { WorldCupMatch, WorldCupMatchResult } from '@/stores/worldCup2026/types'

export const worldCupResultToMatchResult = (result: WorldCupMatchResult): MatchResult => ({
  homeGoals: result.homeScore,
  awayGoals: result.awayScore,
  winnerClubId: result.winnerTeamId,
  penaltyWinnerClubId:
    result.decidedBy === 'penalties' ? result.winnerTeamId : undefined,
  goals: [],
  stats: {
    home: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
    away: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
  },
  bestPlayerId: '',
})

export const adaptWorldCupMatchToMatch = (match: WorldCupMatch): Match => ({
  id: match.id,
  competitionType: 'world-cup-2026',
  competitionId: match.competitionId,
  season: 2026,
  type: match.isKnockout ? 'cup' : 'league',
  date: match.date,
  order: match.order,
  round: match.matchday,
  homeClubId: match.homeTeamId,
  awayClubId: match.awayTeamId,
  neutralVenue: match.neutralVenue,
  status: match.status,
  result: match.result ? worldCupResultToMatchResult(match.result) : undefined,
  lineups: match.lineups,
})

export const matchResultToWorldCupResult = (
  match: WorldCupMatch,
  result: MatchResult,
): WorldCupMatchResult => {
  const homeScore = result.homeGoals
  const awayScore = result.awayGoals

  if (result.penaltyWinnerClubId) {
    return {
      homeScore,
      awayScore,
      penaltyHomeScore: result.penaltyWinnerClubId === match.homeTeamId ? 5 : 4,
      penaltyAwayScore: result.penaltyWinnerClubId === match.awayTeamId ? 5 : 4,
      winnerTeamId: result.penaltyWinnerClubId,
      decidedBy: 'penalties',
    }
  }

  const winnerTeamId =
    result.winnerClubId ??
    (homeScore > awayScore
      ? match.homeTeamId
      : awayScore > homeScore
        ? match.awayTeamId
        : undefined)

  return {
    homeScore,
    awayScore,
    winnerTeamId,
    decidedBy: homeScore === awayScore ? undefined : 'regular-time',
  }
}
