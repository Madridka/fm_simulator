import { italySerieAClubProfiles } from '@/data/champs/italy/1/clubs'
import { italySerieBClubProfiles } from '@/data/champs/italy/2/clubs'
import type { ClubProfile } from '@/data/clubs/types'

export const italyClubConfigs: ClubProfile[] = [
  ...italySerieAClubProfiles,
  ...italySerieBClubProfiles,
]
