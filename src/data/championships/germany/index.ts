import type { ClubProfile } from '@/data/clubs/types'
import { germanyBundesligaClubProfiles } from '@/data/championships/germany/1/clubs'
import { germanyBundesliga2ClubProfiles } from '@/data/championships/germany/2/clubs'

export const germanyClubConfigs: ClubProfile[] = [
  ...germanyBundesligaClubProfiles,
  ...germanyBundesliga2ClubProfiles,
]
