import type { Player } from '@/types/football'

export interface MarketPlayer {
  clubId: string
  clubName: string
  player: Player
}

export type TransferSortKey = 'rating' | 'age' | 'value'
