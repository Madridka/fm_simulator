import { italySerieAClubProfiles } from '@/data/championships/italy/1/clubs'
import { italySerieBClubProfiles } from '@/data/championships/italy/2/clubs'
import type { ClubProfile } from '@/data/clubs/types'

export const italyClubConfigs: ClubProfile[] = [
  ...italySerieAClubProfiles,
  ...italySerieBClubProfiles,
]
