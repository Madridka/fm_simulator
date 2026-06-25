import { spainDivision1ClubProfiles } from '@/data/championships/spain/1/clubs'
import { spainDivision2ClubProfiles } from '@/data/championships/spain/2/clubs'
import type { ClubProfile } from '@/data/clubs/types'

export const spainClubConfigs: ClubProfile[] = [
  ...spainDivision1ClubProfiles,
  ...spainDivision2ClubProfiles,
]
