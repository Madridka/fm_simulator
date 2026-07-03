import type { Player } from '@/types/football'
import type { NationalTeamProfile } from '@/data/wc26/types'

export interface NationalTeam extends Omit<NationalTeamProfile, 'squad'> {
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

export const resolveTeamFlagEmoji = (flagCode?: string): string =>
  flagCode ? flagEmoji(flagCode) : '⚽'
