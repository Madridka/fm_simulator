export type WorldCupGroupId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L'

export const WORLD_CUP_GROUP_IDS: WorldCupGroupId[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
]

export type WorldCupRound =
  | 'group-stage-1'
  | 'group-stage-2'
  | 'group-stage-3'
  | 'round-of-32'
  | 'round-of-16'
  | 'quarter-final'
  | 'semi-final'
  | 'third-place'
  | 'final'

export type WorldCupStage =
  | 'group-stage'
  | 'round-of-32'
  | 'round-of-16'
  | 'quarter-finals'
  | 'semi-finals'
  | 'third-place'
  | 'final'
  | 'completed'

export type WorldCupTournamentStatus =
  | 'not-started'
  | 'group-stage'
  | 'knockout-stage'
  | 'finished'

export type QualificationStatus =
  | 'qualified-directly'
  | 'qualified-third-place'
  | 'pending'
  | 'eliminated'

export type WorldCupQualificationStatus = QualificationStatus
