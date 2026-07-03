import type { NationalTeam } from '@/data/nationalTeams/worldCup2026/teams'
import type { ClubLineup, PlayerStats } from '@/types/football'
import type { GameSession } from '@/types/gameMode'
import type {
  QualificationStatus,
  WorldCupGroupId,
  WorldCupRound,
  WorldCupTournamentStatus,
} from '@/stores/worldCup2026/enums'

export interface WorldCupStanding {
  teamId: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  yellowCards: number
  indirectRedCards: number
  directRedCards: number
  position: number
  qualificationStatus: QualificationStatus
}

export interface WorldCupGroup {
  id: WorldCupGroupId
  teamIds: string[]
}

export type WorldCupMatchStatus = 'scheduled' | 'played'

export interface WorldCupMatchResult {
  homeScore: number
  awayScore: number
  extraTimeHomeScore?: number
  extraTimeAwayScore?: number
  penaltyHomeScore?: number
  penaltyAwayScore?: number
  winnerTeamId?: string
  decidedBy?: 'regular-time' | 'extra-time' | 'penalties'
}

export interface WorldCupMatch {
  id: string
  competitionType: 'world-cup-2026'
  competitionId: string
  stage: string
  groupId?: WorldCupGroupId
  round: WorldCupRound
  matchday: number
  homeTeamId: string
  awayTeamId: string
  date: string
  order: number
  status: WorldCupMatchStatus
  neutralVenue: boolean
  isKnockout: boolean
  result?: WorldCupMatchResult
  lineups?: {
    home: import('@/types/football').PlayedLineup
    away: import('@/types/football').PlayedLineup
  }
}

export type KnockoutSource =
  | { type: 'group-winner'; groupId: WorldCupGroupId }
  | { type: 'group-runner-up'; groupId: WorldCupGroupId }
  | { type: 'best-third-place'; groupId: WorldCupGroupId }
  | { type: 'winner'; tieId: string }
  | { type: 'loser'; tieId: string }

export interface WorldCupKnockoutTie {
  id: string
  round: WorldCupRound
  homeTeamId?: string
  awayTeamId?: string
  sourceHome?: KnockoutSource
  sourceAway?: KnockoutSource
  matchId?: string
  winnerTeamId?: string
}

export interface WorldCupKnockoutBracket {
  roundOf32: WorldCupKnockoutTie[]
  roundOf16: WorldCupKnockoutTie[]
  quarterFinals: WorldCupKnockoutTie[]
  semiFinals: WorldCupKnockoutTie[]
  thirdPlaceMatch?: WorldCupKnockoutTie
  final?: WorldCupKnockoutTie
}

export interface WorldCup2026State {
  version: number
  session: GameSession
  status: WorldCupTournamentStatus
  selectedTeamId: string
  teams: NationalTeam[]
  currentDate: string
  currentRound: WorldCupRound
  currentMatchday: number
  groups: WorldCupGroup[]
  matches: WorldCupMatch[]
  standings: Record<WorldCupGroupId, WorldCupStanding[]>
  qualifiedThirdPlacedTeamIds: string[]
  knockoutBracket?: WorldCupKnockoutBracket
  championTeamId?: string
  runnerUpTeamId?: string
  thirdPlaceTeamId?: string
  lineups: Record<string, ClubLineup>
  playerStats: Record<string, PlayerStats>
  userEliminatedAt?: WorldCupRound
  groupStageComplete: boolean
  knockoutInitialized: boolean
  lastSimulatedOrder: number
  tournamentSeed: number
}
