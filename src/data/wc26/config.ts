export const worldCup2026Config = {
  id: 'world-cup-2026',
  teamsCount: 48,
  groupsCount: 12,
  teamsPerGroup: 4,
  matchesPerTeamInGroup: 3,
  pointsForWin: 3,
  pointsForDraw: 1,
  pointsForLoss: 0,
  directQualifiersPerGroup: 2,
  bestThirdPlacedQualifiersCount: 8,
  knockoutTeamsCount: 32,
  hasExtraTime: true,
  hasPenaltyShootout: true,
  hasThirdPlaceMatch: true,
  fitnessRecoveryPerMatch: 0.35,
  yellowCardSuspensionThreshold: 2,
  clearYellowCardsAfterRound: 'quarter-final' as const,
} as const

export const WORLD_CUP_SAVE_VERSION = 1
