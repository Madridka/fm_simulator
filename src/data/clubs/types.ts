import type { Player } from '@/types/football'

export interface ClubConfig {
  id: string
  name: string
  shortName: string
  city: string
  divisionId: number
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

export interface ClubProfile {
  config: ClubConfig
  assets?: ClubAssets
  stadium?: ClubStadium
  historicalStats?: ClubHistoricalStats
  squad?: Player[]
}

export type RussianLeagueId = 'rpl' | 'first-league' | 'second-league-a' | 'second-league-b'

export type RussianLeagueGroupId = 'gold' | 'silver' | 'group-1' | 'group-2' | 'group-3' | 'group-4'

export interface RussianClubConfig extends ClubConfig {
  leagueId: RussianLeagueId
  groupId?: RussianLeagueGroupId
}
