import type { Club, Player, PlayedLineup } from '@/types/football'
import type { NationalTeam } from '@/data/nationalTeams/worldCup2026/teams'

export interface MatchTeam {
  id: string
  name: string
  shortName: string
  rating: number
  attackRating: number
  midfieldRating: number
  defenseRating: number
  primaryColor: string
  secondaryColor: string
  players: Player[]
}

export const clubToMatchTeam = (club: Club): MatchTeam => ({
  id: club.id,
  name: club.name,
  shortName: club.shortName,
  rating: club.rating,
  attackRating: club.attackRating,
  midfieldRating: club.midfieldRating,
  defenseRating: club.defenseRating,
  primaryColor: club.primaryColor,
  secondaryColor: club.secondaryColor,
  players: club.squad,
})

export const nationalTeamToMatchTeam = (team: NationalTeam): MatchTeam => ({
  id: team.id,
  name: team.name,
  shortName: team.shortName,
  rating: team.rating,
  attackRating: team.attackRating,
  midfieldRating: team.midfieldRating,
  defenseRating: team.defenseRating,
  primaryColor: team.primaryColor,
  secondaryColor: team.secondaryColor,
  players: team.players,
})

export const matchTeamToClub = (team: MatchTeam): Club => ({
  id: team.id,
  name: team.name,
  shortName: team.shortName,
  city: team.name,
  divisionId: 0,
  rating: team.rating,
  attackRating: team.attackRating,
  midfieldRating: team.midfieldRating,
  defenseRating: team.defenseRating,
  budget: 0,
  primaryColor: team.primaryColor,
  secondaryColor: team.secondaryColor,
  squad: team.players,
})

export interface UniversalMatchSimulationInput {
  matchId: string
  homeTeam: MatchTeam
  awayTeam: MatchTeam
  homeLineup: PlayedLineup
  awayLineup: PlayedLineup
  neutralVenue: boolean
  allowPenaltyShootout: boolean
  seed?: number
}

export const toMatchSimulationInput = (
  input: UniversalMatchSimulationInput,
): import('@/domain/match/matchSimulator').MatchSimulationInput => ({
  matchId: input.matchId,
  homeClub: matchTeamToClub(input.homeTeam),
  awayClub: matchTeamToClub(input.awayTeam),
  homeLineup: input.homeLineup,
  awayLineup: input.awayLineup,
  neutralVenue: input.neutralVenue,
  allowPenaltyShootout: input.allowPenaltyShootout,
  seed: input.seed,
})
