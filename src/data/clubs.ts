import { createClubs } from '@/data/clubConfig'
import { russiaClubConfigs } from '@/data/champs/russia'
import { spainClubConfigs } from '@/data/champs/spain'
import { englandClubConfigs } from '@/data/champs/england'
import { germanyClubConfigs } from '@/data/champs/germany'
import { franceClubConfigs } from '@/data/champs/france'
import { italyClubConfigs } from '@/data/champs/italy'
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

  england: {
    id: 'england',
    name: 'Англия',
    description: 'Англия, четыре дивизиона, 88 клубов.',
    divisionNames: {
      1: 'Premier League',
      2: 'EFL Championship',
      3: 'EFL League One',
      4: 'EFL League Two',
    },
    clubConfigs: englandClubConfigs,
  },

  germany: {
    id: 'germany',
    name: 'Германия',
    description: 'Германия, два дивизиона, 40 клубов.',
    divisionNames: {
      1: 'Bundesliga',
      2: '2. Bundesliga',
    },
    clubConfigs: germanyClubConfigs,
  },

  france: {
    id: 'france',
    name: 'Франция',
    description: 'Франция, два дивизиона, 40 клубов.',
    divisionNames: {
      1: 'Ligue 1',
      2: 'Ligue 2',
    },
    clubConfigs: franceClubConfigs,
  },

  italy: {
    id: 'italy',
    name: 'Италия',
    description: 'Италия, два дивизиона, 40 клубов.',
    divisionNames: {
      1: 'Serie A',
      2: 'Serie B',
    },
    clubConfigs: italyClubConfigs,
  },
}

export const getChampionshipClubs = (championshipId: ChampionshipId): Club[] => {
  return createClubs(championships[championshipId].clubConfigs)
}

// Совместимость для доменных тестов и кода, которому нужен дефолтный набор клубов.
export const clubs = getChampionshipClubs('russia')

export const getChampionship = (championshipId: ChampionshipId) => championships[championshipId]
