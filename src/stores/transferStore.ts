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
  const marketPositionFilter = ref<PlayerPosition | 'all'>('all')
  const marketSortKey = ref<TransferSortKey>('rating')
  const squadPositionFilter = ref<PlayerPosition | 'all'>('all')
  const squadSortKey = ref<TransferSortKey>('rating')
  const message = ref('')
  const messageId = ref(0)

  const sortPlayers = <T extends { player: Player }>(players: T[], sortKey: TransferSortKey): T[] =>
    [...players].sort((left, right) => {
      if (sortKey === 'age') {
        return left.player.age - right.player.age
      }
      if (sortKey === 'value') {
        return right.player.value - left.player.value
      }
      return right.player.rating - left.player.rating
    })

  const marketPlayers = computed<MarketPlayer[]>(() => {
    const game = gameStore.game
    if (!game) {
      return []
    }

    const players = game.clubs
      .filter((club) => club.id !== game.selectedClubId)
      .flatMap((club) =>
        club.squad.map((player) => ({
          clubId: club.id,
          clubName: club.name,
          player,
        })),
      )
      .filter(
        (item) =>
          marketPositionFilter.value === 'all' ||
          item.player.position === marketPositionFilter.value,
      )

    return sortPlayers(players, marketSortKey.value)
  })

  const squadPlayers = computed<Player[]>(() => {
    const players =
      gameStore.selectedClub?.squad
        .filter(
          (player) =>
            squadPositionFilter.value === 'all' || player.position === squadPositionFilter.value,
        )
        .map((player) => ({ player })) ?? []

    return sortPlayers(players, squadSortKey.value).map((item) => item.player)
  })

  const buy = (playerId: string): void => {
    const game = gameStore.game
    if (!game) {
      return
    }
    const result = buyPlayer(game.clubs, game.selectedClubId, playerId)
    message.value = result.message
    messageId.value += 1
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
    messageId.value += 1
    if (result.success) {
      gameStore.replaceClubs(result.clubs)
    }
  }

  return {
    marketPositionFilter,
    marketSortKey,
    squadPositionFilter,
    squadSortKey,
    message,
    messageId,
    marketPlayers,
    squadPlayers,
    buy,
    sell,
  }
})
