import { createClubs } from '@/data/clubConfig'
import { russiaClubConfigs } from '@/data/champs/russia'
import { spainClubConfigs } from '@/data/champs/spain'
import type { ChampionshipId, Club } from '@/types/football'
import type { ClubConfig } from '@/stores/clubs/types'

export type { ChampionshipId } from '@/types/football'

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
    description: 'Россия, четыре уровня, 108 клубов.',
    divisionNames: {
      1: 'МИР Российская Премьер-Лига',
      2: 'PARI Первая лига',
      3: 'LEON Вторая лига, Дивизион А',
      4: 'LEON Вторая лига, Дивизион Б',
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

// Совместимость для доменных тестов и кода, которому нужен дефолтный набор клубов.
export const clubs = getChampionshipClubs('russia')

export const getChampionship = (championshipId: ChampionshipId) => championships[championshipId]
