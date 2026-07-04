import type { Match, MatchResult } from '@/types/football'
import type { WorldCupMatch, WorldCupMatchResult } from '@/stores/worldCup2026/types'

const emptyStats = {
  possession: 50,
  shots: 0,
  shotsOnTarget: 0,
  yellowCards: 0,
}

const adaptResult = (result: WorldCupMatchResult, homeTeamId: string): MatchResult => ({
  homeGoals: result.homeScore,
  awayGoals: result.awayScore,
  winnerClubId: result.winnerTeamId,
  penaltyWinnerClubId: result.decidedBy === 'penalties' ? result.winnerTeamId : undefined,
  penaltyHomeGoals: result.penaltyHomeScore,
  penaltyAwayGoals: result.penaltyAwayScore,
  goals: [],
  stats: {
    home: { ...emptyStats },
    away: { ...emptyStats },
  },
  bestPlayerId: homeTeamId,
})

export const adaptWorldCupMatch = (match: WorldCupMatch): Match => ({
  id: match.id,
  competitionType: 'world-cup-2026',
  season: 1,
  type: match.isKnockout ? 'playoff' : 'league',
  date: match.date,
  order: match.order,
  round: match.matchday,
  roundNumber: match.matchday,
  playoffStageId: match.isKnockout ? match.round : undefined,
  homeClubId: match.homeTeamId,
  awayClubId: match.awayTeamId,
  neutralVenue: match.neutralVenue,
  status: match.status,
  result: match.result ? adaptResult(match.result, match.homeTeamId) : undefined,
})
