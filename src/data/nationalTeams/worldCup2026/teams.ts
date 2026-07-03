import type { WorldCupGroupId } from '@/stores/worldCup2026/enums'
import type { Player } from '@/types/football'

export interface NationalTeamProfile {
  id: string
  name: string
  shortName: string
  fifaCode: string
  groupId: WorldCupGroupId
  flagCode: string
  rating: number
  attackRating: number
  midfieldRating: number
  defenseRating: number
  primaryColor: string
  secondaryColor: string
}

export interface NationalTeam extends NationalTeamProfile {
  players: Player[]
}

export const flagEmoji = (code: string): string => {
  const normalized = code.toUpperCase()
  if (normalized.length !== 2) {
    return '⚽'
  }

  return String.fromCodePoint(
    ...[...normalized].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  )
}
