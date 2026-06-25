import type { ClubProfile } from '@/data/clubs/types'
import { englandPremierLeagueClubProfiles } from '@/data/championships/england/1/clubs'
import { englandChampionshipClubProfiles } from '@/data/championships/england/2/clubs'
import { englandLeague1ClubProfiles } from '@/data/championships/england/3/clubs'
import { englandLeague2ClubProfiles } from '@/data/championships/england/4/clubs'

export const englandClubConfigs: ClubProfile[] = [
  ...englandPremierLeagueClubProfiles,
  ...englandChampionshipClubProfiles,
  ...englandLeague1ClubProfiles,
  ...englandLeague2ClubProfiles,
]
