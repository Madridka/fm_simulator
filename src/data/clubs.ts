import { createClubs } from '@/data/clubConfig'
import { russiaClubConfigs } from '@/data/championships/russia'
import { spainClubConfigs } from '@/data/championships/spain'
import { englandClubConfigs } from '@/data/championships/england'
import { germanyClubConfigs } from '@/data/championships/germany'
import { franceClubConfigs } from '@/data/championships/france'
import { italyClubConfigs } from '@/data/championships/italy'
import type { ChampionshipId, Club } from '@/types/football'
import type { ClubProfile } from '@/data/clubs/types'
import { t } from '@/plugins/i18n/i18n'
export type { ChampionshipId } from '@/types/football'

export interface ChampionshipConfig {
  id: ChampionshipId
  name: string
  description: string
  divisionNames: Record<number, string>
  competitionNames?: Record<string, string>
  clubProfiles: readonly ClubProfile[]
}

export const championships: Record<ChampionshipId, ChampionshipConfig> = {
  russia: {
    id: 'russia',
    name: t('championships.russia.name'),
    description: t('championships.russia.description'),
    divisionNames: {
      1: t('championships.russia.divisionNames.1'),
      2: t('championships.russia.divisionNames.2'),
      3: t('championships.russia.divisionNames.3'),
      4: t('championships.russia.divisionNames.4'),
    },
    competitionNames: {
      1: t('championships.russia.competitionNames.1'),
      2: t('championships.russia.competitionNames.2'),
      '3:gold': t('championships.russia.competitionNames.3:gold'),
      '3:silver': t('championships.russia.competitionNames.3:silver'),
      '4:group-1': t('championships.russia.competitionNames.4:group-1'),
      '4:group-2': t('championships.russia.competitionNames.4:group-2'),
      '4:group-3': t('championships.russia.competitionNames.4:group-3'),
      '4:group-4': t('championships.russia.competitionNames.4:group-4'),
    },
    clubProfiles: russiaClubConfigs,
  },

  spain: {
    id: 'spain',
    name: t('championships.spain.name'),
    description: t('championships.spain.description'),
    divisionNames: {
      1: t('championships.spain.divisionNames.1'),
      2: t('championships.spain.divisionNames.2'),
    },
    clubProfiles: spainClubConfigs,
  },

  england: {
    id: 'england',
    name: t('championships.england.name'),
    description: t('championships.england.description'),
    divisionNames: {
      1: t('championships.england.divisionNames.1'),
      2: t('championships.england.divisionNames.2'),
      3: t('championships.england.divisionNames.3'),
      4: t('championships.england.divisionNames.4'),
    },
    clubProfiles: englandClubConfigs,
  },

  germany: {
    id: 'germany',
    name: t('championships.germany.name'),
    description: t('championships.germany.description'),
    divisionNames: {
      1: t('championships.germany.divisionNames.1'),
      2: t('championships.germany.divisionNames.2'),
    },
    clubProfiles: germanyClubConfigs,
  },

  france: {
    id: 'france',
    name: t('championships.france.name'),
    description: t('championships.france.description'),
    divisionNames: {
      1: t('championships.france.divisionNames.1'),
      2: t('championships.france.divisionNames.2'),
    },
    clubProfiles: franceClubConfigs,
  },

  italy: {
    id: 'italy',
    name: t('championships.italy.name'),
    description: t('championships.italy.description'),
    divisionNames: {
      1: t('championships.italy.divisionNames.1'),
      2: t('championships.italy.divisionNames.2'),
    },
    clubProfiles: italyClubConfigs,
  },
}

// СОЗДАЁТ НОВЫЙ НАБОР КЛУБОВ ВЫБРАННОГО ЧЕМПИОНАТА
export const getChampionshipClubs = (championshipId: ChampionshipId): Club[] => {
  return createClubs(championships[championshipId].clubProfiles)
}

// Compatibility for domain tests and code that needs the default club set.
export const clubs = getChampionshipClubs('russia')

// ВОЗВРАЩАЕТ МЕТАДАННЫЕ И КОНФИГУРАЦИЮ ЧЕМПИОНАТА
export const getChampionship = (championshipId: ChampionshipId) => championships[championshipId]
