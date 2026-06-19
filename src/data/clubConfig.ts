import { buildSquad } from '@/data/players'
import { ClubConfig } from '@/stores/clubs/types'
import type { Club } from '@/types/football'

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
