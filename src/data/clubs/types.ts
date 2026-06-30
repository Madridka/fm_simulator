import type { Player } from '@/types/football'

// РАСШИРЕННЫЙ ПРОФИЛЬ КЛУБА, ОБЪЕДИНЯЮЩИЙ ИГРОВЫЕ И СПРАВОЧНЫЕ ДАННЫЕ
export interface ClubProfile {
  config: ClubConfig
  assets?: ClubAssets
  stadium?: ClubStadium
  historicalStats?: ClubHistoricalStats
  squad?: Player[]
}

// ОБЯЗАТЕЛЬНАЯ ИГРОВАЯ КОНФИГУРАЦИЯ КЛУБА
export interface ClubConfig {
  id: string
  name: string
  shortName: string
  city: string
  divisionId: number
  competitionId?: string
  leagueId: string
  groupId?: string
  rating: number
  attackRating: number
  midfieldRating: number
  defenseRating: number
  budget: number
  primaryColor: string
  secondaryColor: string
  logoUrl?: string
}

// ВНЕШНИЕ ГРАФИЧЕСКИЕ РЕСУРСЫ КЛУБА
export interface ClubAssets {
  crestUrl?: string
}

// СПРАВОЧНЫЕ ДАННЫЕ ДОМАШНЕГО СТАДИОНА
export interface ClubStadium {
  name: string
  city: string
  capacity?: number
}

// КРАТКАЯ ИСТОРИЧЕСКАЯ СТАТИСТИКА КЛУБА
export interface ClubHistoricalStats {
  foundedYear?: number
  domesticTitles?: number
  domesticCups?: number
}
