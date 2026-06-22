import { ClubConfig } from '@/data/clubConfig'
import { germanyBundesligaClubConfigs } from '@/data/champs/germany/1/clubs'
import { germanyBundesliga2ClubConfigs } from '@/data/champs/germany/2/clubs'

export const germanyClubConfigs: ClubConfig[] = [
  ...germanyBundesligaClubConfigs,
  ...germanyBundesliga2ClubConfigs,
]
