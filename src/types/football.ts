// БАЗОВЫЕ СПРАВОЧНИКИ ПОЗИЦИЙ И ЧЕМПИОНАТОВ
export type PlayerPosition = 'GK' | 'LB' | 'CB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST'

export type ChampionshipId = 'england' | 'germany' | 'spain' | 'italy' | 'russia' | 'france'

// ОСНОВНЫЕ ДОМЕННЫЕ СУЩНОСТИ ИГРОКА И КЛУБА
export interface Player {
  id: string
  firstName: string
  lastName: string
  age: number
  position: PlayerPosition
  rating: number
  shirtNumber?: number | null
  preferredFoot?: string
  potential: number
  fitness: number
  form: number
  value: number
  salary: number
  isInjured: boolean
  injuryUntilOrder?: number
  suspensionMatchesRemaining?: number
  suspensionReason?: 'red-card' | 'second-yellow'
  academyClubId?: string
  intakeSeason?: number
  homegrown?: boolean
  nationality?: string
}

export type ClubTeamType = 'first' | 'reserve'

export interface Club {
  id: string
  name: string
  shortName: string
  city: string
  divisionId: number
  competitionId?: string
  leagueId?: string
  groupId?: string
  rating: number
  attackRating: number
  midfieldRating: number
  defenseRating: number
  budget: number
  primaryColor: string
  secondaryColor: string
  logoUrl?: string
  squad: Player[]
  teamType?: ClubTeamType
  parentClubId?: string
}

export type ReserveTeamMode = 'virtual' | 'competition'

export interface ReserveTeamState {
  id: string
  parentClubId: string
  name: string
  shortName: string
  mode: ReserveTeamMode
  linkedClubId?: string
  squad: Player[]
}

export interface AcademyState {
  clubId: string
  level: number
  recruitment: number
  coaching: number
  facilities: number
  annualBudget: number
  intakeSize: { min: number; max: number }
  nextIntakeSeason: number
  reserveTeam: ReserveTeamState
}

// ТАКТИЧЕСКИЕ СХЕМЫ, СЛОТЫ И СОСТАВЫ
export type Formation =
  | '4-4-2'
  | '4-3-3'
  | '4-2-3-1'
  | '4-5-1'
  | '4-1-4-1'
  | '4-1-2-1-2'
  | '4-3-1-2'
  | '4-2-2-2'
  | '4-3-2-1'
  | '3-5-2'
  | '3-4-3'
  | '3-4-2-1'
  | '3-4-1-2'
  | '4-4-1-1'
  | '5-3-2'
  | '5-4-1'
  | '5-2-3'
  | '4-2-4'
  | '2-3-5'
  | '4-6-0'

export type TacticalStyle = 'defensive' | 'balanced' | 'attacking'
export type MatchMentality = 'parkTheBus' | 'defensive' | 'balanced' | 'attacking' | 'allOutAttack'
export type TacticalIntensity = 'low' | 'balanced' | 'high'
export type MatchTempo = 'slow' | 'balanced' | 'fast'
export type MatchWidth = 'narrow' | 'balanced' | 'wide'
export type DefensiveLine = 'low' | 'medium' | 'high'
export type AttackPlan =
  | 'shortPassing'
  | 'directPassing'
  | 'widePlay'
  | 'centralPlay'
  | 'earlyCrosses'
  | 'throughBalls'
export type DefensiveShape = 'compact' | 'balanced' | 'wide'
export type TacklingStyle = 'cautious' | 'normal' | 'hard'
export type MatchCommand =
  | 'none'
  | 'calm'
  | 'raiseTempo'
  | 'holdLead'
  | 'loadBox'
  | 'timeWasting'
export type TeamTalk = 'balanced' | 'encourage' | 'calm' | 'demandMore' | 'praise'

export interface TeamTacticsSettings {
  mentality: MatchMentality
  pressing: TacticalIntensity
  tempo: MatchTempo
  width: MatchWidth
  defensiveLine: DefensiveLine
  attackPlan: AttackPlan
  defensiveShape: DefensiveShape
  tackling: TacklingStyle
  matchCommand: MatchCommand
  teamTalk: TeamTalk
}

export interface FormationSlot {
  id: string
  label: string
  position: PlayerPosition
  x: number
  y: number
}

export interface ClubLineup {
  formation: Formation
  tacticalStyle: TacticalStyle
  tactics?: TeamTacticsSettings
  starters: Record<string, string | null>
  substitutes: string[]
}

export interface PlayedLineup {
  formation: Formation
  tacticalStyle: TacticalStyle
  tactics?: TeamTacticsSettings
  starters: string[]
  substitutes: string[]
}

export interface MatchLineups {
  home: PlayedLineup
  away: PlayedLineup
}

export interface PreparedMatchContext {
  matchId: string
  homeClub: Club
  awayClub: Club
  lineups: MatchLineups
}

// ТИПЫ МАТЧЕЙ И СОБЫТИЙ СИМУЛЯЦИИ
export type MatchType = 'league' | 'cup' | 'playoff'

export type MatchStatus = 'scheduled' | 'played'

export interface GoalEvent {
  minute: number
  clubId: string
  playerId: string
  playerName: string
  assistPlayerId?: string
  assistPlayerName?: string
}

export type MatchSimulationDetail = 'full' | 'medium' | 'fast'

export interface CardEvent {
  minute?: number
  clubId: string
  playerId: string
  card: 'yellow' | 'red'
  dismissalReason?: 'direct-red' | 'second-yellow'
}

export interface InjuryEvent {
  minute?: number
  clubId: string
  playerId: string
  durationMatchdays?: number
}

export interface SubstitutionEvent {
  minute: number
  clubId: string
  playerOutId: string
  playerInId: string
}

export interface MatchTactics extends TeamTacticsSettings {
  formation: Formation
}

export interface TacticalChangeEvent {
  minute: number
  teamId: string
  changes: Partial<MatchTactics>
}

export type MatchEventType =
  | 'goal'
  | 'yellow-card'
  | 'red-card'
  | 'injury'
  | 'substitution'
  | 'tactical-change'
  | 'chance'
  | 'save'
  | 'half-time'
  | 'full-time'

export interface MatchEvent {
  id: string
  minute: number
  type: MatchEventType
  teamId?: string
  playerId?: string
  playerOutId?: string
  playerInId?: string
  changes?: Partial<MatchTactics>
  text: string
}

export interface LiveMatchState {
  matchId: string
  minute: number
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  homeTactics: MatchTactics
  awayTactics: MatchTactics
  homeLineupPlayerIds: string[]
  awayLineupPlayerIds: string[]
  homeBenchPlayerIds: string[]
  awayBenchPlayerIds: string[]
  homeSubstitutionsUsed: number
  awaySubstitutionsUsed: number
  maxSubstitutions: number
  fitness: Record<string, number>
  events: MatchEvent[]
}

export interface CommentaryEvent {
  minute: number
  text: string
  kind?: 'substitution'
  clubId?: string
  playerOutId?: string
  playerInId?: string
}

// СТАТИСТИКА, РЕЗУЛЬТАТ И ПОЛНАЯ МОДЕЛЬ МАТЧА
export interface MatchTeamStats {
  possession: number
  shots: number
  shotsOnTarget: number
  yellowCards: number
  redCards?: number
  xG?: number
}

export interface MatchResult {
  detail?: MatchSimulationDetail
  homeGoals: number
  awayGoals: number
  winnerClubId?: string
  penaltyWinnerClubId?: string
  goals: GoalEvent[]
  stats: {
    home: MatchTeamStats
    away: MatchTeamStats
  }
  bestPlayerId: string
  cards?: CardEvent[]
  injuries?: InjuryEvent[]
  substitutions?: SubstitutionEvent[]
  commentary?: CommentaryEvent[]
  matchEvents?: MatchEvent[]
  tacticalChanges?: TacticalChangeEvent[]
  playerMinutes?: Record<string, number>
  playerFitness?: Record<string, number>
}

export interface Match {
  id: string
  championshipId?: ChampionshipId
  season: number
  type: MatchType
  date: string
  order: number
  round: number
  roundNumber?: number
  kickoffTime?: string
  divisionId?: number
  competitionId?: string
  cupRoundId?: string
  playoffId?: string
  playoffStageId?: string
  playoffTieId?: string
  leg?: 1 | 2
  homeClubId: string
  awayClubId: string
  neutralVenue: boolean
  status: MatchStatus
  result?: MatchResult
  lineups?: MatchLineups
}

// ТУРНИРНАЯ ТАБЛИЦА ЛИГИ
export interface LeagueTableRow {
  clubId: string
  divisionId: number
  competitionId: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  position: number
  xGFor?: number
  xGAgainst?: number
  shotsFor?: number
  shotsAgainst?: number
  recentForm?: Array<'W' | 'D' | 'L'>
}

// КУБКОВАЯ СЕТКА, РАУНДЫ И ПАРЫ
export type CupRoundStatus = 'scheduled' | 'completed'

export interface CupTie {
  id: string
  matchId?: string
  homeClubId?: string
  awayClubId?: string
  winnerClubId?: string
}

export interface CupRound {
  id: string
  name: string
  order: number
  scheduledDate?: string
  status: CupRoundStatus
  byes: string[]
  ties: CupTie[]
}

export interface CupState {
  season: number
  seed?: number
  countryId?: ChampionshipId
  cupId?: string
  rounds: CupRound[]
  championClubId?: string
}

// НАКОПИТЕЛЬНАЯ СЕЗОННАЯ СТАТИСТИКА ИГРОКА
export interface PlayerStats {
  appearances: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  cleanSheets: number
  averageRating: number
  matchesRated: number
}

export interface PlayerLeaderboardEntry {
  playerId: string
  clubId: string
  playerName: string
  value: number
}

export interface CompetitionPlayerLeaderboards {
  goals: PlayerLeaderboardEntry[]
  assists: PlayerLeaderboardEntry[]
  cleanSheets: PlayerLeaderboardEntry[]
  yellowCards: PlayerLeaderboardEntry[]
  redCards: PlayerLeaderboardEntry[]
}

export type SeasonTaskCategory = 'important' | 'secondary' | 'optional'

export type SeasonTaskKind =
  | 'league_position'
  | 'cup_stage'
  | 'academy_promotions'
  | 'academy_appearances'
  | 'academy_purchase'
  | 'first_team_purchase'
  | 'weak_position_purchase'
  | 'goals_in_match'
  | 'win_with_formation'
  | 'clean_sheet_with_formation'
  | 'win_with_mentality'
  | 'clean_sheet_with_mentality'
  | 'goals_with_mentality'
  | 'win_with_tactical_style'

export interface SeasonTask {
  id: string
  season: number
  kind: SeasonTaskKind
  category: SeasonTaskCategory
  title: string
  description: string
  targetCount?: number
  targetPosition?: number
  targetCupRoundId?: string
  targetFormation?: Formation
  targetMentality?: MatchMentality
  targetTacticalStyle?: TacticalStyle
  weakPosition?: PlayerPosition
  minimumRating?: number
}

export type SeasonTaskEventType =
  | 'academy-promotion'
  | 'academy-purchase'
  | 'first-team-purchase'

export interface SeasonTaskEvent {
  season: number
  type: SeasonTaskEventType
  playerId: string
  position?: PlayerPosition
  rating?: number
}

// КОРНЕВОЕ СОСТОЯНИЕ КАРЬЕРЫ, СОХРАНЯЕМОЕ МЕЖДУ СЕССИЯМИ
export interface GameState {
  configVersion: number
  careerSeed: number
  championshipId: ChampionshipId
  selectedClubId: string
  season: number
  clubs: Club[]
  matches: Match[]
  leagueTables: Record<string, LeagueTableRow[]>
  worldClubs?: Partial<Record<ChampionshipId, Club[]>>
  worldMatches?: Partial<Record<ChampionshipId, Match[]>>
  worldLeagueTables?: Partial<Record<ChampionshipId, Record<string, LeagueTableRow[]>>>
  externalClubOverrides?: Partial<Record<ChampionshipId, Record<string, Club>>>
  cup: CupState
  playoffs?: import('@/data/gameConfig/types').PlayoffState[]
  scheduleConflictResolutions?: import('@/data/gameConfig/types').ScheduleConflictResolution[]
  lineups: Record<string, ClubLineup>
  playerStats: Record<string, PlayerStats>
  worldPlayerStats?: Partial<Record<ChampionshipId, Record<string, PlayerStats>>>
  academies: Record<string, AcademyState>
  seasonTasks: SeasonTask[]
  seasonTaskEvents: SeasonTaskEvent[]
  lastCompletedOrder: number
}
