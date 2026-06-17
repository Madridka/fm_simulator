import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { buyPlayer, sellPlayer } from '@/domain/transfer/transferService'
import { useGameStore } from '@/stores/gameStore'
import type { Player, PlayerPosition } from '@/types/football'

export interface MarketPlayer {
  clubId: string
  clubName: string
  player: Player
}

export type TransferSortKey = 'rating' | 'age' | 'value'

export const useTransferStore = defineStore('transfers', () => {
  const gameStore = useGameStore()
  const positionFilter = ref<PlayerPosition | 'all'>('all')
  const sortKey = ref<TransferSortKey>('rating')
  const message = ref('')

  const marketPlayers = computed<MarketPlayer[]>(() => {
    const game = gameStore.game
    if (!game) {
      return []
    }

    return game.clubs
      .filter((club) => club.id !== game.selectedClubId)
      .flatMap((club) =>
        club.squad.map((player) => ({
          clubId: club.id,
          clubName: club.name,
          player,
        })),
      )
      .filter(
        (item) => positionFilter.value === 'all' || item.player.position === positionFilter.value,
      )
      .sort((left, right) => {
        if (sortKey.value === 'age') {
          return left.player.age - right.player.age
        }
        if (sortKey.value === 'value') {
          return right.player.value - left.player.value
        }
        return right.player.rating - left.player.rating
      })
  })

  const buy = (playerId: string): void => {
    const game = gameStore.game
    if (!game) {
      return
    }
    const result = buyPlayer(game.clubs, game.selectedClubId, playerId)
    message.value = result.message
    if (result.success) {
      gameStore.replaceClubs(result.clubs)
    }
  }

  const sell = (playerId: string): void => {
    const game = gameStore.game
    if (!game) {
      return
    }
    const result = sellPlayer(game.clubs, game.selectedClubId, playerId)
    message.value = result.message
    if (result.success) {
      gameStore.replaceClubs(result.clubs)
    }
  }

  return {
    positionFilter,
    sortKey,
    message,
    marketPlayers,
    buy,
    sell,
  }
})
