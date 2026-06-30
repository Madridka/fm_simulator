// БАЗОВЫЕ СПРАВОЧНИКИ ПОЗИЦИЙ И ЧЕМПИОНАТОВ
export type PlayerPosition = 'GK' | 'LB' | 'CB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST'

export type ChampionshipId = 'russia' | 'spain' | 'england' | 'germany' | 'france' | 'italy'

// ОСНОВНЫЕ ДОМЕННЫЕ СУЩНОСТИ ИГРОКА И КЛУБА
export interface Player {
  id: string
  firstName: string
  lastName: string
  age: number
  position: PlayerPosition
  rating: number
  potential: number
  fitness: number
  form: number
  value: number
  salary: number
  isInjured: boolean
  injuryUntilOrder?: number
}

export interface Club {
  id: string
  name: string
  shortName: string
  city: string
  divisionId: number
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
}

// ТАКТИЧЕСКИЕ СХЕМЫ, СЛОТЫ И СОСТАВЫ
export type Formation = '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '4-5-1'

export type TacticalStyle = 'defensive' | 'balanced' | 'attacking'

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
  starters: Record<string, string | null>
  substitutes: string[]
}

export interface PlayedLineup {
  formation: Formation
  tacticalStyle: TacticalStyle
  starters: string[]
}

export interface MatchLineups {
  home: PlayedLineup
  away: PlayedLineup
}

// ТИПЫ МАТЧЕЙ И СОБЫТИЙ СИМУЛЯЦИИ
export type MatchType = 'league' | 'cup'

export type MatchStatus = 'scheduled' | 'played'

export interface GoalEvent {
  minute: number
  clubId: string
  playerId: string
  playerName: string
}

export type MatchSimulationDetail = 'full' | 'medium' | 'fast'

export interface CardEvent {
  minute?: number
  clubId: string
  playerId: string
  card: 'yellow' | 'red'
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
}

export interface Match {
  id: string
  championshipId?: ChampionshipId
  season: number
  type: MatchType
  date: string
  order: number
  round: number
  divisionId?: number
  competitionId?: string
  cupRoundId?: string
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
  status: CupRoundStatus
  byes: string[]
  ties: CupTie[]
}

export interface CupState {
  season: number
  rounds: CupRound[]
  championClubId?: string
}

// НАКОПИТЕЛЬНАЯ СЕЗОННАЯ СТАТИСТИКА ИГРОКА
export interface PlayerStats {
  appearances: number
  goals: number
  yellowCards: number
  averageRating: number
  matchesRated: number
}

// КОРНЕВОЕ СОСТОЯНИЕ КАРЬЕРЫ, СОХРАНЯЕМОЕ МЕЖДУ СЕССИЯМИ
export interface GameState {
  championshipId: ChampionshipId
  selectedClubId: string
  season: number
  clubs: Club[]
  matches: Match[]
  leagueTables: Record<string, LeagueTableRow[]>
  worldClubs?: Partial<Record<ChampionshipId, Club[]>>
  worldMatches?: Partial<Record<ChampionshipId, Match[]>>
  worldLeagueTables?: Partial<Record<ChampionshipId, Record<string, LeagueTableRow[]>>>
  cup: CupState
  lineups: Record<string, ClubLineup>
  playerStats: Record<string, PlayerStats>
  lastCompletedOrder: number
}
