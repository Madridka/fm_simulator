import { computed } from 'vue'
import { defineStore } from 'pinia'
import {
  getReservePlayers,
  moveToReserveTeam,
  promoteToFirstTeam,
  releaseReservePlayer,
  type AcademyMutationResult,
} from '@/domain/academy/academyService'
import { refreshLineupsAfterSquadChange } from '@/domain/season/seasonService'
import { useGameStore } from '@/stores/game/gameStore'
import { useToastStore } from '@/stores/ui/toastStore'
import { sellReservePlayer } from '@/domain/transfer/transferService'
import type { AcademyState, Player } from '@/types/football'

export const useAcademyStore = defineStore('academy', () => {
  const gameStore = useGameStore()
  const toastStore = useToastStore()

  const academy = computed<AcademyState | undefined>(() => {
    const game = gameStore.game
    return game?.academies[game.selectedClubId]
  })

  const reservePlayers = computed<Player[]>(() => {
    const game = gameStore.game
    return game && academy.value ? getReservePlayers(academy.value, game.clubs) : []
  })

  const firstTeamPlayers = computed<Player[]>(() =>
    (gameStore.selectedClub?.squad ?? []).filter((player) => player.age <= 23),
  )

  const apply = (result: AcademyMutationResult): void => {
    toastStore.show(result.message, result.success ? 'success' : 'warning')
    if (!result.success) return
    const state = {
      ...result.state,
      lineups: refreshLineupsAfterSquadChange(result.state),
    }
    gameStore.updateGame(state)
  }

  const promote = (playerId: string): void => {
    if (gameStore.game) apply(promoteToFirstTeam(gameStore.game, playerId))
  }

  const demote = (playerId: string): void => {
    if (gameStore.game) apply(moveToReserveTeam(gameStore.game, playerId))
  }

  const release = (playerId: string): void => {
    if (gameStore.game) apply(releaseReservePlayer(gameStore.game, playerId))
  }

  const sell = (playerId: string): void => {
    const game = gameStore.game
    if (!game || !academy.value) return
    const result = sellReservePlayer(game.clubs, academy.value, playerId)
    toastStore.show(result.message, result.success ? 'success' : 'warning')
    if (!result.success) return
    const nextState = {
      ...game,
      clubs: result.clubs,
      academies: { ...game.academies, [result.academy.clubId]: result.academy },
    }
    gameStore.updateGame({
      ...nextState,
      lineups: refreshLineupsAfterSquadChange(nextState),
    })
  }

  return { academy, reservePlayers, firstTeamPlayers, promote, demote, release, sell }
})
