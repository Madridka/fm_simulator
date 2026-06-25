import type { ClubProfile } from '@/data/clubs/types'
import { franceLigue1ClubProfiles } from '@/data/championships/france/1/clubs'
import { franceLigue2ClubProfiles } from '@/data/championships/france/2/clubs'

export const franceClubConfigs: ClubProfile[] = [
  ...franceLigue1ClubProfiles,
  ...franceLigue2ClubProfiles,
]
