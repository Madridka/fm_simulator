import type { Player } from '@/types/football'

export interface ClubProfile {
  config: ClubConfig
  assets?: ClubAssets
  stadium?: ClubStadium
  historicalStats?: ClubHistoricalStats
  squad?: Player[]
}

export interface ClubConfig {
  id: string
  name: string
  shortName: string
  city: string
  divisionId: number
  leagueId: string
  groupId?: string
  rating: number
  attackRating: number
  midfieldRating: number
  defenseRating: number
  budget: number
  primaryColor: string
  secondaryColor: string
  logoUrl?: string
}

export interface ClubAssets {
  crestUrl?: string
}

export interface ClubStadium {
  name: string
  city: string
  capacity?: number
}

export interface ClubHistoricalStats {
  foundedYear?: number
  domesticTitles?: number
  domesticCups?: number
}
