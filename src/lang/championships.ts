import type { ChampionshipId } from '@/types/football'
import ruMessages from '@/lang/ru.json'

export interface ChampionshipTranslation {
  name: string
  description: string
  divisionNames: Record<number, string>
  divisionShortNames?: Record<number, string>
  competitionNames?: Record<string, string>
  groupNames?: Record<string, string>
}

export interface RussianChampionshipTranslation extends ChampionshipTranslation {
  divisionShortNames: Record<number, string>
  competitionNames: Record<string, string>
  groupNames: Record<string, string>
}

type ChampionshipTranslations = Record<ChampionshipId, ChampionshipTranslation> & {
  russia: RussianChampionshipTranslation
}

export const championshipTranslations =
  ruMessages.championships as ChampionshipTranslations
