import { zenitProfile } from '@/data/clubDatabase/russia/rpl/zenit'
import type { ClubProfile } from '@/data/clubs/types'

export const clubProfiles = [zenitProfile] satisfies ClubProfile[]

export const clubProfilesById = clubProfiles.reduce<Record<string, ClubProfile>>(
  (result, profile) => {
    result[profile.config.id] = profile
    return result
  },
  {},
)
