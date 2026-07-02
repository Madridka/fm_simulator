import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { buyPlayer, buyReservePlayer, sellPlayer } from '@/domain/transfer/transferService'
import { useGameStore } from '@/stores/game/gameStore'
import type { ChampionshipId, Club, Player, PlayerPosition } from '@/types/football'
import type { MarketPlayer, TransferSortKey } from '@/stores/transfers/types'
import { getOrganizationClubId } from '@/data/reserveClubRelations'
import { moveToReserveTeam } from '@/domain/academy/academyService'
import { refreshLineupsAfterSquadChange } from '@/domain/season/seasonService'
import { getChampionship } from '@/data/clubs'
import { getClubCompetitionId, getCompetitionName } from '@/domain/competition/competitionIdentity'

export type { MarketPlayer, TransferSortKey } from '@/stores/transfers/types'

// УПРАВЛЯЕТ ФИЛЬТРАМИ РЫНКА И ОПЕРАЦИЯМИ ПОКУПКИ И ПРОДАЖИ ИГРОКОВ
export const useTransferStore = defineStore('transfers', () => {
  const gameStore = useGameStore()
  const marketPositionFilter = ref<PlayerPosition | 'all'>('all')
  const marketSortKey = ref<TransferSortKey>('rating')
  const marketSearchQuery = ref('')
  const marketLeagueFilter = ref('all')
  const marketClubFilter = ref('all')
  const squadPositionFilter = ref<PlayerPosition | 'all'>('all')
  const squadSortKey = ref<TransferSortKey>('rating')
  const message = ref('')
  const messageId = ref(0)

  // СОРТИРУЕТ ИГРОКОВ ПО ВОЗРАСТУ, СТОИМОСТИ ИЛИ РЕЙТИНГУ
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

  interface MarketClubSource {
    club: Club
    championshipId: ChampionshipId
    competitionId: string
    leagueName: string
    clubKey: string
  }

  // СОБИРАЕТ ТОЛЬКО ЛЁГКИЕ МЕТАДАННЫЕ КЛУБОВ, НЕ РАЗВОРАЧИВАЯ СОСТАВЫ В ОБЩИЙ МАССИВ
  const marketClubSources = computed<MarketClubSource[]>(() => {
    const game = gameStore.game
    if (!game) return []

    return (Object.entries(game.worldClubs ?? {}) as Array<[ChampionshipId, Club[] | undefined]>)
      .flatMap(([championshipId, worldClubs]) => {
        const countryClubs = championshipId === game.championshipId ? game.clubs : (worldClubs ?? [])
        const championship = getChampionship(championshipId)
        return countryClubs
          .filter(
            (club) =>
              championshipId !== game.championshipId ||
              getOrganizationClubId(club.id) !== getOrganizationClubId(game.selectedClubId),
          )
          .map((club) => {
            const competitionId = getClubCompetitionId(club)
            const leagueName = `${championship.name} · ${getCompetitionName(championship, competitionId)}`
            return {
              club,
              championshipId,
              competitionId,
              leagueName,
              clubKey: `${championshipId}|${club.id}`,
            }
          })
      })
  })

  const marketLeagueOptions = computed(() =>
    [...new Map(marketClubSources.value.map((item) => [
      `${item.championshipId}|${item.competitionId}`,
      { value: `${item.championshipId}|${item.competitionId}`, label: item.leagueName },
    ])).values()].sort((left, right) => left.label.localeCompare(right.label)),
  )

  const marketClubOptions = computed(() =>
    marketClubSources.value
      .filter((item) =>
        marketLeagueFilter.value === 'all' ||
        `${item.championshipId}|${item.competitionId}` === marketLeagueFilter.value,
      )
      .map((item) => ({ value: item.clubKey, label: `${item.club.name} · ${item.leagueName}` }))
      .sort((left, right) => left.label.localeCompare(right.label)),
  )

  watch(marketLeagueFilter, () => {
    marketClubFilter.value = 'all'
  })

  const marketPlayers = computed<MarketPlayer[]>(() => {
    const query = marketSearchQuery.value.trim().toLocaleLowerCase()
    const hasLeague = marketLeagueFilter.value !== 'all'
    const hasClub = marketClubFilter.value !== 'all'
    if (!hasLeague && !hasClub && query.length < 2) return []

    const players = marketClubSources.value
      .filter(
        (item) =>
          (!hasLeague || `${item.championshipId}|${item.competitionId}` === marketLeagueFilter.value) &&
          (!hasClub || item.clubKey === marketClubFilter.value),
      )
      .flatMap((item) => item.club.squad.map((player): MarketPlayer => ({
        clubId: item.club.id,
        clubName: item.club.name,
        championshipId: item.championshipId,
        competitionId: item.competitionId,
        leagueName: item.leagueName,
        source: 'club',
        player,
      })))
      .filter((item) =>
        (marketPositionFilter.value === 'all' || item.player.position === marketPositionFilter.value) &&
        (!query ||
          item.player.lastName.toLocaleLowerCase().includes(query) ||
          item.player.firstName.toLocaleLowerCase().includes(query)),
      )

    return sortPlayers(players, marketSortKey.value).slice(0, 150)
  })

  // ФОРМИРУЕТ ОТФИЛЬТРОВАННЫЙ СПИСОК ИГРОКОВ СВОЕГО КЛУБА
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

  // ПОКУПАЕТ ИГРОКА И ПРИМЕНЯЕТ ОБНОВЛЁННЫЕ СОСТАВЫ
  const buy = (playerId: string, destination: 'first' | 'reserve' = 'first'): void => {
    const game = gameStore.game
    if (!game) {
      return
    }
    const marketPlayer = marketPlayers.value.find((item) => item.player.id === playerId)
    if (marketPlayer?.source === 'academy') {
      const sourceAcademy = game.academies[marketPlayer.clubId]
      if (!sourceAcademy) return
      const result = buyReservePlayer(game.clubs, sourceAcademy, game.selectedClubId, playerId)
      message.value = result.message
      messageId.value += 1
      if (result.success) {
        let nextState = {
          ...game,
          clubs: result.clubs,
          academies: { ...game.academies, [result.academy.clubId]: result.academy },
        }
        if (destination === 'reserve') {
          const movement = moveToReserveTeam(nextState, playerId)
          if (movement.success) nextState = movement.state
        }
        gameStore.updateGame({
          ...nextState,
          lineups: refreshLineupsAfterSquadChange(nextState),
        })
      }
      return
    }
    if (marketPlayer && marketPlayer.championshipId !== game.championshipId) {
      const sourceClubs = game.worldClubs?.[marketPlayer.championshipId] ?? []
      const result = buyPlayer(
        [...game.clubs, ...sourceClubs],
        game.selectedClubId,
        playerId,
      )
      message.value = result.message
      messageId.value += 1
      if (!result.success) return

      const clubs = result.clubs.slice(0, game.clubs.length)
      const updatedSourceClubs = result.clubs.slice(game.clubs.length)
      const changedExternalClubIds = new Set([
        marketPlayer.clubId,
        getOrganizationClubId(marketPlayer.clubId),
      ])
      const changedExternalClubs = updatedSourceClubs.filter((club) =>
        changedExternalClubIds.has(club.id),
      )
      const countryOverrides = {
        ...game.externalClubOverrides?.[marketPlayer.championshipId],
        ...Object.fromEntries(changedExternalClubs.map((club) => [club.id, club])),
      }
      let nextState = {
        ...game,
        clubs,
        worldClubs: {
          ...game.worldClubs,
          [game.championshipId]: clubs,
          [marketPlayer.championshipId]: updatedSourceClubs,
        },
        externalClubOverrides: {
          ...game.externalClubOverrides,
          [marketPlayer.championshipId]: countryOverrides,
        },
      }
      if (destination === 'reserve') {
        const movement = moveToReserveTeam(nextState, playerId)
        if (movement.success) nextState = movement.state
      }
      gameStore.updateGame({
        ...nextState,
        lineups: refreshLineupsAfterSquadChange(nextState),
      })
      return
    }
    const result = buyPlayer(game.clubs, game.selectedClubId, playerId)
    message.value = result.message
    messageId.value += 1
    if (result.success) {
      if (destination === 'reserve') {
        const purchasedState = { ...game, clubs: result.clubs }
        const movement = moveToReserveTeam(purchasedState, playerId)
        if (movement.success) {
          gameStore.updateGame({
            ...movement.state,
            lineups: refreshLineupsAfterSquadChange(movement.state),
          })
          return
        }
      }
      gameStore.replaceClubs(result.clubs)
    }
  }

  // ПРОДАЁТ ИГРОКА И ПРИМЕНЯЕТ ОБНОВЛЁННЫЕ СОСТАВЫ
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
    marketSearchQuery,
    marketLeagueFilter,
    marketLeagueOptions,
    marketClubFilter,
    marketClubOptions,
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
