import { createClubs } from '@/data/clubConfig'
import { russiaClubConfigs } from '@/data/champs/russia'
import { spainClubConfigs } from '@/data/champs/spain'
import type { Club } from '@/types/football'
import { ClubConfig } from '@/stores/clubs/types'

export type ChampionshipId = 'russia' | 'spain'

export interface ChampionshipConfig {
  id: ChampionshipId
  name: string
  description: string
  divisionNames: Record<number, string>
  clubConfigs: readonly ClubConfig[]
}

export const championships: Record<ChampionshipId, ChampionshipConfig> = {
  russia: {
    id: 'russia',
    name: 'Россия',
    description: 'Россия, четыре дивизиона, 40 клубов.',
    divisionNames: {
      1: 'Премьер-лига',
      2: 'Первая лига',
      3: 'Вторая лига',
      4: 'Третья лига',
    },
    clubConfigs: russiaClubConfigs,
  },

  spain: {
    id: 'spain',
    name: 'Испания',
    description: 'Испания, два дивизиона, 42 клуба.',
    divisionNames: {
      1: 'La Liga',
      2: 'Segunda División',
    },
    clubConfigs: spainClubConfigs,
  },
}

export const getChampionshipClubs = (championshipId: ChampionshipId): Club[] => {
  return createClubs(championships[championshipId].clubConfigs)
}
