import { buildSquad } from '@/data/players'
import type { Club } from '@/types/football'

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
}

const createClub = (config: ClubConfig, index: number): Club => ({
  ...config,
  squad: buildSquad(
    config.id,
    index,
    config.attackRating,
    config.midfieldRating,
    config.defenseRating,
  ),
})

export const createClubs = (clubConfigs: readonly ClubConfig[]): Club[] =>
  clubConfigs.map((club, index) => createClub(club, index))
