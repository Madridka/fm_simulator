import type { ClubProfile } from '@/data/clubs/types'
import { englandPremierLeagueClubProfiles } from '@/data/champs/england/1/clubs'
import { englandChampionshipClubProfiles } from '@/data/champs/england/2/clubs'
import { englandLeague1ClubProfiles } from '@/data/champs/england/3/clubs'
import { englandLeague2ClubProfiles } from '@/data/champs/england/4/clubs'

export const englandClubConfigs: ClubProfile[] = [
  ...englandPremierLeagueClubProfiles,
  ...englandChampionshipClubProfiles,
  ...englandLeague1ClubProfiles,
  ...englandLeague2ClubProfiles,
]
