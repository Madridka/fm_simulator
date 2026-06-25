import { createClubs } from '@/data/clubConfig'
import { russiaClubConfigs } from '@/data/championships/russia'
import { spainClubConfigs } from '@/data/championships/spain'
import { englandClubConfigs } from '@/data/championships/england'
import { germanyClubConfigs } from '@/data/championships/germany'
import { franceClubConfigs } from '@/data/championships/france'
import { italyClubConfigs } from '@/data/championships/italy'
import { championshipTranslations } from '@/i18n/championships'
import type { ChampionshipId, Club } from '@/types/football'
import type { ClubProfile } from '@/data/clubs/types'
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
    name: championshipTranslations.russia.name,
    description: championshipTranslations.russia.description,
    divisionNames: championshipTranslations.russia.divisionNames,
    competitionNames: championshipTranslations.russia.competitionNames,
    clubProfiles: russiaClubConfigs,
  },

  spain: {
    id: 'spain',
    name: championshipTranslations.spain.name,
    description: championshipTranslations.spain.description,
    divisionNames: championshipTranslations.spain.divisionNames,
    clubProfiles: spainClubConfigs,
  },

  england: {
    id: 'england',
    name: championshipTranslations.england.name,
    description: championshipTranslations.england.description,
    divisionNames: championshipTranslations.england.divisionNames,
    clubProfiles: englandClubConfigs,
  },

  germany: {
    id: 'germany',
    name: championshipTranslations.germany.name,
    description: championshipTranslations.germany.description,
    divisionNames: championshipTranslations.germany.divisionNames,
    clubProfiles: germanyClubConfigs,
  },

  france: {
    id: 'france',
    name: championshipTranslations.france.name,
    description: championshipTranslations.france.description,
    divisionNames: championshipTranslations.france.divisionNames,
    clubProfiles: franceClubConfigs,
  },

  italy: {
    id: 'italy',
    name: championshipTranslations.italy.name,
    description: championshipTranslations.italy.description,
    divisionNames: championshipTranslations.italy.divisionNames,
    clubProfiles: italyClubConfigs,
  },
}

export const getChampionshipClubs = (championshipId: ChampionshipId): Club[] => {
  return createClubs(championships[championshipId].clubProfiles)
}

// Compatibility for domain tests and code that needs the default club set.
export const clubs = getChampionshipClubs('russia')

export const getChampionship = (championshipId: ChampionshipId) => championships[championshipId]
