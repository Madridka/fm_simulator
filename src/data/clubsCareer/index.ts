import { createClubs } from '@/data/clubConfig'
import { russiaClubConfigs } from '@/data/championships/russia'
import { spainClubConfigs } from '@/data/championships/spain'
import { englandClubConfigs } from '@/data/championships/england'
import { germanyClubConfigs } from '@/data/championships/germany'
import { franceClubConfigs } from '@/data/championships/france'
import { italyClubConfigs } from '@/data/championships/italy'
import type { ChampionshipId, Club } from '@/types/football'
import type { ClubProfile } from '@/data/clubsCareer/types'
import { t } from '@/plugins/i18n/i18n'

export type { ChampionshipId } from '@/types/football'
export type { ClubConfig, ClubProfile } from '@/data/clubsCareer/types'

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
    get name() { return t('championships.russia.name') },
    get description() { return t('championships.russia.description') },
    divisionNames: {
      get 1() { return t('championships.russia.divisionNames.1') },
      get 2() { return t('championships.russia.divisionNames.2') },
      get 3() { return t('championships.russia.divisionNames.3') },
      get 4() { return t('championships.russia.divisionNames.4') },
    },
    competitionNames: {
      get 1() { return t('championships.russia.competitionNames.1') },
      get 2() { return t('championships.russia.competitionNames.2') },
      get '3:gold'() { return t('championships.russia.competitionNames.3:gold') },
      get '3:silver'() { return t('championships.russia.competitionNames.3:silver') },
      get '4:group-1'() { return t('championships.russia.competitionNames.4:group-1') },
      get '4:group-2'() { return t('championships.russia.competitionNames.4:group-2') },
      get '4:group-3'() { return t('championships.russia.competitionNames.4:group-3') },
      get '4:group-4'() { return t('championships.russia.competitionNames.4:group-4') },
    },
    clubProfiles: russiaClubConfigs,
  },

  spain: {
    id: 'spain',
    get name() { return t('championships.spain.name') },
    get description() { return t('championships.spain.description') },
    divisionNames: {
      get 1() { return t('championships.spain.divisionNames.1') },
      get 2() { return t('championships.spain.divisionNames.2') },
    },
    clubProfiles: spainClubConfigs,
  },

  england: {
    id: 'england',
    get name() { return t('championships.england.name') },
    get description() { return t('championships.england.description') },
    divisionNames: {
      get 1() { return t('championships.england.divisionNames.1') },
      get 2() { return t('championships.england.divisionNames.2') },
      get 3() { return t('championships.england.divisionNames.3') },
      get 4() { return t('championships.england.divisionNames.4') },
    },
    clubProfiles: englandClubConfigs,
  },

  germany: {
    id: 'germany',
    get name() { return t('championships.germany.name') },
    get description() { return t('championships.germany.description') },
    divisionNames: {
      get 1() { return t('championships.germany.divisionNames.1') },
      get 2() { return t('championships.germany.divisionNames.2') },
    },
    clubProfiles: germanyClubConfigs,
  },

  france: {
    id: 'france',
    get name() { return t('championships.france.name') },
    get description() { return t('championships.france.description') },
    divisionNames: {
      get 1() { return t('championships.france.divisionNames.1') },
      get 2() { return t('championships.france.divisionNames.2') },
    },
    clubProfiles: franceClubConfigs,
  },

  italy: {
    id: 'italy',
    get name() { return t('championships.italy.name') },
    get description() { return t('championships.italy.description') },
    divisionNames: {
      get 1() { return t('championships.italy.divisionNames.1') },
      get 2() { return t('championships.italy.divisionNames.2') },
    },
    clubProfiles: italyClubConfigs,
  },
}

export const getChampionshipClubs = (championshipId: ChampionshipId): Club[] => {
  return createClubs(championships[championshipId].clubProfiles)
}

export const clubs = getChampionshipClubs('russia')

export const getChampionship = (championshipId: ChampionshipId) => championships[championshipId]
