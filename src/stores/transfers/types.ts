import type { ChampionshipId, Player } from '@/types/football'

// ПРЕДСТАВЛЕНИЕ ИГРОКА НА РЫНКЕ ВМЕСТЕ С КЛУБОМ-ВЛАДЕЛЬЦЕМ
export interface MarketPlayer {
  clubId: string
  clubName: string
  championshipId: ChampionshipId
  competitionId: string
  leagueName: string
  source: 'club' | 'academy'
  player: Player
}

// ДОСТУПНЫЕ КРИТЕРИИ СОРТИРОВКИ ТРАНСФЕРНЫХ СПИСКОВ
export type TransferSortKey = 'rating' | 'age' | 'value'
