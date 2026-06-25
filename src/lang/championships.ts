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

export const championshipTranslations =
  ruMessages.championships as Record<ChampionshipId, ChampionshipTranslation>
