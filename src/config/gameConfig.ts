// ОПИСЫВАЕТ ГЛОБАЛЬНЫЕ ЛИМИТЫ, ЭКОНОМИКУ И ПРАВИЛА КАРЬЕРЫ
export interface GameConfig {
  maximumSeasons: number
  divisionsCount: number
  clubsPerDivision: number
  promotedClubsCount: number
  relegatedClubsCount: number
  homeAdvantage: number
  randomnessFactor: number
  minimumSquadSize: number
  maximumSquadSize: number
  transferSaleCoefficient: number
  promotionReward: number
  cupWinnerReward: number
  seasonRewards: Record<number, number[]>
  cupRoundRewards: Record<string, number>
}

// РЕЗЕРВНЫЕ НАЗВАНИЯ УРОВНЕЙ ДИВИЗИОНОВ
export const divisionNames: Record<number, string> = {
  1: t('common.divisionFallback', { division: 1 }),
  2: t('common.divisionFallback', { division: 2 }),
  3: t('common.divisionFallback', { division: 3 }),
  4: t('common.divisionFallback', { division: 4 }),
}

// ЧИТАЕМЫЕ НАЗВАНИЯ СТАДИЙ КУБКА
export const cupRoundNames: Record<string, string> = {
  preliminary: t('cup.roundNames.preliminary'),
  round_of_128: t('cup.roundNames.round_of_128'),
  round_of_64: t('cup.roundNames.round_of_64'),
  round_of_32: t('cup.roundNames.round_of_32'),
  round_of_16: t('cup.roundNames.round_of_16'),
  quarter_final: t('cup.roundNames.quarter_final'),
  semi_final: t('cup.roundNames.semi_final'),
  final: t('cup.roundNames.final'),
}

// ИГРОВЫЕ ДНИ, ЗАРЕЗЕРВИРОВАННЫЕ ПОД СТАДИИ КУБКА
export const cupRoundOrders: Record<string, number> = {
  preliminary: 3,
  round_of_128: 3,
  round_of_64: 7,
  round_of_32: 11,
  round_of_16: 15,
  quarter_final: 19,
  semi_final: 23,
  final: 27,
}

// ЕДИНАЯ ТОЧКА НАСТРОЙКИ ПРОДОЛЖИТЕЛЬНОСТИ, ТРАНСФЕРОВ И ПРИЗОВЫХ
export const gameConfig: GameConfig = {
  maximumSeasons: 6,
  divisionsCount: 4,
  clubsPerDivision: 10,
  promotedClubsCount: 2,
  relegatedClubsCount: 2,
  homeAdvantage: 5,
  randomnessFactor: 0.22,
  minimumSquadSize: 16,
  maximumSquadSize: 26,
  transferSaleCoefficient: 0.8,
  promotionReward: 12_000_000,
  cupWinnerReward: 25_000_000,
  seasonRewards: {
    1: [
      32_000_000, 27_000_000, 23_000_000, 20_000_000, 18_000_000, 16_000_000, 14_000_000,
      12_000_000, 10_000_000, 8_000_000,
    ],
    2: [
      18_000_000, 15_000_000, 12_000_000, 10_000_000, 8_500_000, 7_500_000, 6_500_000, 5_500_000,
      4_500_000, 3_500_000,
    ],
    3: [
      10_000_000, 8_500_000, 7_000_000, 6_000_000, 5_000_000, 4_500_000, 4_000_000, 3_500_000,
      3_000_000, 2_500_000,
    ],
    4: [
      6_000_000, 5_000_000, 4_000_000, 3_500_000, 3_000_000, 2_500_000, 2_000_000, 1_750_000,
      1_500_000, 1_250_000,
    ],
  },
  cupRoundRewards: {
    preliminary: 750_000,
    round_of_128: 750_000,
    round_of_64: 1_000_000,
    round_of_32: 1_250_000,
    round_of_16: 2_500_000,
    quarter_final: 5_000_000,
    semi_final: 9_000_000,
    final: 15_000_000,
  },
}
import { t } from '@/plugins/i18n/i18n'
