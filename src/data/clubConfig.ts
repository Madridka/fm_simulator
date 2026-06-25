import { buildSquad } from '@/data/players'
import { clubProfilesById } from '@/data/clubDatabase'
import type { ClubConfig, ClubProfile } from '@/data/clubs/types'
import type { Club } from '@/types/football'

const mergeProfile = (baseProfile: ClubProfile, overrideProfile?: ClubProfile): ClubProfile => ({
  ...baseProfile,
  ...overrideProfile,
  config: {
    ...baseProfile.config,
    ...overrideProfile?.config,
  },
})

const createClub = (profile: ClubProfile, index: number): Club => {
  const sourceProfile = mergeProfile(profile, clubProfilesById[profile.config.id])
  const sourceConfig = sourceProfile.config

  return {
    ...sourceConfig,
    logoUrl: sourceProfile.assets?.crestUrl ?? sourceConfig.logoUrl,
    squad:
      sourceProfile.squad ??
      buildSquad(
        sourceConfig.id,
        index,
        sourceConfig.attackRating,
        sourceConfig.midfieldRating,
        sourceConfig.defenseRating,
      ),
  }
}

export const createClubs = (clubProfiles: readonly ClubProfile[]): Club[] =>
  clubProfiles.map((club, index) => createClub(club, index))

export type { ClubConfig, ClubProfile }
