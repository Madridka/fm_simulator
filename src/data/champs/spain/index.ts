import { spainDivision1ClubProfiles } from '@/data/champs/spain/1/clubs'
import { spainDivision2ClubProfiles } from '@/data/champs/spain/2/clubs'
import { ClubProfile } from '@/data/clubs/types'

export const spainClubConfigs: ClubProfile[] = [
  ...spainDivision1ClubProfiles,
  ...spainDivision2ClubProfiles,
]
