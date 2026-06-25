import type { ClubProfile } from '@/data/clubs/types'
import { germanyBundesligaClubProfiles } from '@/data/champs/germany/1/clubs'
import { germanyBundesliga2ClubProfiles } from '@/data/champs/germany/2/clubs'

export const germanyClubConfigs: ClubProfile[] = [
  ...germanyBundesligaClubProfiles,
  ...germanyBundesliga2ClubProfiles,
]
