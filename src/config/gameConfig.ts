export interface GameConfig {
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

export const divisionNames: Record<number, string> = {
  1: 'Высший дивизион',
  2: 'Первый дивизион',
  3: 'Второй дивизион',
  4: 'Третий дивизион',
}

export const cupRoundNames: Record<string, string> = {
  preliminary: 'Предварительный раунд',
  round_of_32: '1/16 финала',
  round_of_16: '1/8 финала',
  quarter_final: '1/4 финала',
  semi_final: '1/2 финала',
  final: 'Финал',
}

export const cupRoundOrders: Record<string, number> = {
  preliminary: 3,
  round_of_32: 7,
  round_of_16: 11,
  quarter_final: 15,
  semi_final: 19,
  final: 23,
}

export const gameConfig: GameConfig = {
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
    round_of_32: 1_250_000,
    round_of_16: 2_500_000,
    quarter_final: 5_000_000,
    semi_final: 9_000_000,
    final: 15_000_000,
  },
}
