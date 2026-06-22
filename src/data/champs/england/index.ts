import { ClubConfig } from '@/data/clubConfig'
import { englandPremierLeagueClubConfigs } from '@/data/champs/england/1/clubs'
import { englandChampionshipClubConfigs } from '@/data/champs/england/2/clubs'
import { englandLeague1ClubConfigs } from '@/data/champs/england/3/clubs'
import { englandLeague2ClubConfigs } from '@/data/champs/england/4/clubs'

export const englandClubConfigs: ClubConfig[] = [
  ...englandPremierLeagueClubConfigs,
  ...englandChampionshipClubConfigs,
  ...englandLeague1ClubConfigs,
  ...englandLeague2ClubConfigs,
]
