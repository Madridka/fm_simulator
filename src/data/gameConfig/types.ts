export type CountryId = 'england' | 'russia' | 'spain' | 'italy' | 'germany' | 'france'

export type CompetitionId = string

export type WeekDay =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'

export interface DateRangeTemplate {
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
}

export interface SeasonCalendarConfig {
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
  leagueEndMonth: number
  leagueEndDay: number
  weekendMatchDays: WeekDay[]
  midweekMatchDays: WeekDay[]
  preferredMatchDay: WeekDay
  minimumRestDays: number
  winterBreaks: DateRangeTemplate[]
  cupPriority: number
  leaguePriority: number
}

export interface CareerConfig {
  maximumSeasons: number | null
  minimumSquadSize: number
  maximumSquadSize: number
  transferSaleCoefficient: number
}

export interface MatchEngineConfig {
  homeAdvantage: number
  randomnessFactor: number
}

export interface LeagueFormat {
  rounds: number
}

export interface LeagueScheduleConfig {
  rounds: number
  avoidHomeAwayStreakLongerThan: number
}

export type PositionSelector =
  | { type: 'top'; count: number }
  | { type: 'positions'; positions: number[] }
  | { type: 'bottom'; count: number }
  | { type: 'from-bottom'; offsets: number[] }
  | { type: 'range'; from: number; to: number }

export type TransitionType =
  | 'direct-promotion'
  | 'direct-relegation'
  | 'promotion-playoff'
  | 'relegation-playoff'
  | 'group-promotion'
  | 'group-relegation'
  | 'internal-group-swap'

export interface DirectTransitionRule {
  id: string
  type: 'direct-promotion' | 'direct-relegation' | 'group-promotion'
  sourceCompetitionId: CompetitionId
  targetCompetitionId: CompetitionId
  selector: PositionSelector
}

export interface GroupRelegationRule {
  id: string
  type: 'group-relegation'
  sourceCompetitionId: CompetitionId
  targetCompetitionIds: CompetitionId[]
  selector: PositionSelector
  distribution: 'preserve-or-balance'
}

export interface InternalGroupSwapRule {
  id: string
  type: 'internal-group-swap'
  sourceCompetitionId: CompetitionId
  targetCompetitionId: CompetitionId
  sourceSelector: PositionSelector
  targetSelector: PositionSelector
}

export interface TablePlayoffParticipantSource {
  type: 'table'
  competitionId: CompetitionId
  selector: PositionSelector
}

export interface StagePlayoffParticipantSource {
  type: 'stage'
  stageId: string
  tieIndex: number
  outcome: 'winner' | 'loser'
}

export type PlayoffParticipantSource =
  | TablePlayoffParticipantSource
  | StagePlayoffParticipantSource

export interface PlayoffParticipantRule {
  competitionId: CompetitionId
  selector: PositionSelector
}

export interface PlayoffStageTieConfig {
  home: PlayoffParticipantSource
  away: PlayoffParticipantSource
}

export interface PlayoffStageConfig {
  id: string
  format: 'single-leg' | 'two-leg'
  neutralVenue?: boolean
  firstLegAtHomeSource?: boolean
  extraTime: boolean
  penalties: boolean
  awayGoals: false
  ties: PlayoffStageTieConfig[]
}

export interface PlayoffTransitionRule {
  id: string
  type: 'promotion-playoff' | 'relegation-playoff'
  participants: PlayoffParticipantRule[]
  stages: PlayoffStageConfig[]
  targetCompetitionId: CompetitionId
  loserCompetitionId: CompetitionId
  winnerStageId: string
  winnerTieIndex?: number
  maximumPointsGapForPlayout?: number
}

export type TransitionRule =
  | DirectTransitionRule
  | GroupRelegationRule
  | InternalGroupSwapRule
  | PlayoffTransitionRule

export interface CompetitionTransitionConfig {
  rules: TransitionRule[]
  implementationMode?: 'simplified' | 'official'
}

export interface CompetitionRewardsConfig {
  positionRewards: number[]
  promotionReward?: number
  playoffWinReward?: number
  relegationPayment?: number
}

export type BottomBoundaryPolicy = 'closed' | 'external-pool' | 'generated-clubs'

export type TableZoneType =
  | 'champion'
  | 'direct-promotion'
  | 'promotion-playoff'
  | 'relegation-playoff'
  | 'direct-relegation'

export interface TableZoneConfig {
  type: TableZoneType
  selector: PositionSelector
  labelKey: string
}

export interface LeagueCompetitionConfig {
  id: CompetitionId
  countryId: CountryId
  level: number
  nameKey: string
  legacyLeagueId: string
  legacyGroupId?: string
  format: LeagueFormat
  schedule: LeagueScheduleConfig
  transitions: CompetitionTransitionConfig
  rewards: CompetitionRewardsConfig
  tableZones: TableZoneConfig[]
  bottomBoundaryPolicy?: BottomBoundaryPolicy
}

export interface CupCompetitionConfig {
  id: string
  countryId: CountryId
  nameKey: string
  roundNameKeyPrefix: string
  preferredMatchDays: WeekDay[]
  finalMatchDays: WeekDay[]
  rewards: {
    roundRewards: Record<string, number>
    winnerReward: number
  }
}

export interface CountryCompetitionConfig {
  countryId: CountryId
  configVersion: 2
  calendar: SeasonCalendarConfig
  competitions: Record<CompetitionId, LeagueCompetitionConfig>
  cups: Record<string, CupCompetitionConfig>
}

export type PlayoffStatus = 'scheduled' | 'first-leg-played' | 'completed'

export interface PlayoffTieState {
  id: string
  stageId: string
  tieIndex: number
  status: PlayoffStatus
  homeClubId: string
  awayClubId: string
  matchIds: string[]
  winnerClubId?: string
  loserClubId?: string
}

export interface PlayoffStageState {
  id: string
  status: PlayoffStatus
  ties: PlayoffTieState[]
}

export interface PlayoffState {
  id: string
  ruleId: string
  status: PlayoffStatus
  stages: PlayoffStageState[]
}

export interface ScheduleConflictResolution {
  matchId: string
  originalDate: string
  resolvedDate: string
  reason:
    | 'same-day-match'
    | 'minimum-rest'
    | 'cup-conflict'
    | 'playoff-conflict'
    | 'winter-break'
}
