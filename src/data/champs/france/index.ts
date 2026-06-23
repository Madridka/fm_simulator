import type { ClubConfig } from '@/data/clubs/types'
import { franceLigue1ClubConfigs } from '@/data/champs/france/1/clubs'
import { franceLigue2ClubConfigs } from '@/data/champs/france/2/clubs'

export const franceClubConfigs: ClubConfig[] = [
  ...franceLigue1ClubConfigs,
  ...franceLigue2ClubConfigs,
]
