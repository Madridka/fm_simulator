import type { CompetitionRewardsConfig } from '@/data/gameConfig/types'

const rewardsByLevel: Record<number, readonly number[]> = {
  1: [32_000_000, 27_000_000, 23_000_000, 20_000_000, 18_000_000, 16_000_000, 14_000_000, 12_000_000, 10_000_000, 8_000_000],
  2: [18_000_000, 15_000_000, 12_000_000, 10_000_000, 8_500_000, 7_500_000, 6_500_000, 5_500_000, 4_500_000, 3_500_000],
  3: [10_000_000, 8_500_000, 7_000_000, 6_000_000, 5_000_000, 4_500_000, 4_000_000, 3_500_000, 3_000_000, 2_500_000],
  4: [6_000_000, 5_000_000, 4_000_000, 3_500_000, 3_000_000, 2_500_000, 2_000_000, 1_750_000, 1_500_000, 1_250_000],
}

export const createCompetitionRewards = (level: number): CompetitionRewardsConfig => ({
  positionRewards: [...(rewardsByLevel[level] ?? rewardsByLevel[4] ?? [0])],
  promotionReward: 12_000_000,
  playoffWinReward: 5_000_000,
})

export const getPositionReward = (
  rewards: CompetitionRewardsConfig,
  position: number,
  participantsCount: number,
): number => {
  const values = rewards.positionRewards
  if (values.length === 0 || participantsCount <= 0) return 0
  if (values.length === 1 || participantsCount === 1) return values[0] ?? 0

  const normalized = ((Math.max(1, position) - 1) * (values.length - 1)) / (participantsCount - 1)
  const lowerIndex = Math.floor(normalized)
  const upperIndex = Math.min(values.length - 1, Math.ceil(normalized))
  const lower = values[lowerIndex] ?? values.at(-1) ?? 0
  const upper = values[upperIndex] ?? lower
  return Math.round(lower + (upper - lower) * (normalized - lowerIndex))
}
