import type { ClubConfig } from '@/data/clubs/types'
import { italySerieAClubConfigs } from '@/data/champs/italy/1/clubs'
import { italySerieBClubConfigs } from '@/data/champs/italy/2/clubs'

export const italyClubConfigs: ClubConfig[] = [
  ...italySerieAClubConfigs,
  ...italySerieBClubConfigs,
]
