import { buildSquad } from '@/data/players'
import { clubProfilesById } from '@/data/clubDatabase'
import type { ClubConfig } from '@/data/clubs/types'
import type { Club } from '@/types/football'

const createClub = (config: ClubConfig, index: number): Club => {
  const profile = clubProfilesById[config.id]
  const sourceConfig = profile?.config ?? config

  return {
    ...sourceConfig,
    logoUrl: profile?.assets?.crestUrl ?? sourceConfig.logoUrl,
    squad:
      profile?.squad ??
      buildSquad(
        sourceConfig.id,
        index,
        sourceConfig.attackRating,
        sourceConfig.midfieldRating,
        sourceConfig.defenseRating,
      ),
  }
}

export const createClubs = (clubConfigs: readonly ClubConfig[]): Club[] =>
  clubConfigs.map((club, index) => createClub(club, index))

export type { ClubConfig }