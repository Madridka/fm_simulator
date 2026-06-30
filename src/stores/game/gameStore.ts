import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { calculateLeagueTables } from '@/domain/competition/leagueTableService'
import { gameConfig } from '@/config/gameConfig'
import { getChampionship } from '@/data/clubs'
import {
  completeUserMatchDay,
  createInitialGameState,
  ensureWorldCompetitions,
  finishSeason,
  getNextUserMatch,
  isSeasonReadyToFinish,
  refreshLineupsAfterSquadChange,
  settleAiOnlyDaysUntilNextUserMatch,
} from '@/domain/season/seasonService'
import { gameSaveRepository } from '@/repositories/gameSaveRepository'
import { useToastStore } from '@/stores/ui/toastStore'
import type { ChampionshipId, Club, ClubLineup, GameState, Match, MatchResult } from '@/types/football'

type MatchDayWorkerResponse =
  | { type: 'ready' }
  | { type: 'complete'; state: GameState }
  | { type: 'error'; error: string }

// ХРАНИТ КАРЬЕРУ, УПРАВЛЯЕТ МАТЧАМИ, СЕЗОНАМИ И СОХРАНЕНИЕМ ИГРЫ
export const useGameStore = defineStore('game', () => {
  const toastStore = useToastStore()
  const savedGame = gameSaveRepository.load()
  const game = ref<GameState | null>(
    savedGame ? settleAiOnlyDaysUntilNextUserMatch(savedGame) : null,
  )
  const activeMatchId = ref<string | null>(null)
  let matchDayWorker: Worker | null = null
  let preparedMatchId: string | null = null
  let preparationPromise: Promise<void> | null = null
  let preparationResolve: (() => void) | null = null
  let preparationReject: ((error: Error) => void) | null = null
  let completionResolve: (() => void) | null = null
  let completionReject: ((error: Error) => void) | null = null

  // ВОЗВРАЩАЕТ КЛУБ, КОТОРЫМ УПРАВЛЯЕТ ПОЛЬЗОВАТЕЛЬ
  const selectedClub = computed<Club | undefined>(() => {
    if (!game.value) {
      return undefined
    }
    return game.value.clubs.find((club) => club.id === game.value?.selectedClubId)
  })

  // ВОЗВРАЩАЕТ БЛИЖАЙШИЙ ДОСТУПНЫЙ МАТЧ ПОЛЬЗОВАТЕЛЯ
  const nextMatch = computed<Match | undefined>(() =>
    game.value ? getNextUserMatch(game.value) : undefined,
  )

  // ПРОВЕРЯЕТ, МОЖНО ЛИ ОТКРЫТЬ МАТЧ ДЛЯ ПРОСМОТРА ИЛИ ИГРЫ
  const canOpenMatch = (match: Match): boolean => {
    const state = game.value
    if (!state) {
      return false
    }

    const isUserMatch = match.homeClubId === state.selectedClubId || match.awayClubId === state.selectedClubId
    return isUserMatch && (match.status === 'played' || nextMatch.value?.id === match.id)
  }

  // ВЫБИРАЕТ ОТКРЫТЫЙ МАТЧ ИЛИ АВТОМАТИЧЕСКИ ПОДСТАВЛЯЕТ СЛЕДУЮЩИЙ
  const activeMatch = computed<Match | undefined>(() => {
    const state = game.value
    if (!state) {
      return undefined
    }

    const selected = activeMatchId.value
      ? state.matches.find((match) => match.id === activeMatchId.value)
      : undefined

    if (selected && canOpenMatch(selected)) {
      return selected
    }

    return nextMatch.value
  })

  // ВОЗВРАЩАЕТ КОНФИГУРАЦИЮ ТЕКУЩЕГО ЧЕМПИОНАТА
  const championship = computed(() =>
    game.value ? getChampionship(game.value.championshipId) : undefined,
  )

  // ОПРЕДЕЛЯЕТ ДОСТУПНОСТЬ ПЕРЕХОДА К СЛЕДУЮЩЕМУ СЕЗОНУ
  const seasonCanFinish = computed<boolean>(() =>
    game.value
      ? game.value.season < gameConfig.maximumSeasons && isSeasonReadyToFinish(game.value)
      : false,
  )

  // ПОКАЗЫВАЕТ, ДОСТИГНУТ ЛИ ЛИМИТ ПРОДОЛЖИТЕЛЬНОСТИ КАРЬЕРЫ
  const isFinalSeason = computed<boolean>(
    () => (game.value?.season ?? 0) >= gameConfig.maximumSeasons,
  )

  // СОХРАНЯЕТ ТЕКУЩУЮ КАРЬЕРУ И УВЕДОМЛЯЕТ О ПЕРЕПОЛНЕНИИ ХРАНИЛИЩА
  const save = (): void => {
    if (game.value) {
      const result = gameSaveRepository.save(game.value)
      if (!result.saved) {
        toastStore.show(
          'Игра продолжена, но сохранение не записано: хранилище браузера переполнено.',
          'warning',
        )
      }
    }
  }

  // СОЗДАЁТ НОВУЮ КАРЬЕРУ ДЛЯ ВЫБРАННОГО КЛУБА
  const startNewGame = (championshipId: ChampionshipId, clubId: string): void => {
    disposeMatchDayWorker()
    activeMatchId.value = null
    game.value = createInitialGameState(championshipId, clubId)
    save()
  }

  // ПОЛНОСТЬЮ СБРАСЫВАЕТ КАРЬЕРУ И ЛОКАЛЬНОЕ СОХРАНЕНИЕ
  const resetGame = (): void => {
    disposeMatchDayWorker()
    activeMatchId.value = null
    game.value = null
    gameSaveRepository.clear()
  }

  // ДЕЛАЕТ МАТЧ АКТИВНЫМ И ЗАРАНЕЕ ЗАПУСКАЕТ ПОДГОТОВКУ ТУРА
  const openMatch = (matchId: string): boolean => {
    const match = game.value?.matches.find((candidate) => candidate.id === matchId)
    if (!match || !canOpenMatch(match)) {
      return false
    }

    activeMatchId.value = match.id
    if (match.status === 'scheduled') {
      void prepareMatchDay(match.id).catch(() => undefined)
    }
    return true
  }

  // ЗАКРЫВАЕТ ТЕКУЩИЙ ЭКРАН МАТЧА
  const clearActiveMatch = (): void => {
    activeMatchId.value = null
  }

  // ПРИМЕНЯЕТ НОВОЕ СОСТОЯНИЕ, ВОССТАНАВЛИВАЕТ МИР И СОХРАНЯЕТ ЕГО
  const updateGame = (nextState: GameState): void => {
    game.value = ensureWorldCompetitions(nextState)
    save()
  }

  // СОХРАНЯЕТ ИЗМЕНЁННЫЙ СОСТАВ КЛУБА И СБРАСЫВАЕТ СТАРЫЙ ФОНОВЫЙ РАСЧЁТ
  const updateLineup = (clubId: string, lineup: ClubLineup): void => {
    if (!game.value) {
      return
    }

    disposeMatchDayWorker()
    updateGame({
      ...game.value,
      lineups: {
        ...game.value.lineups,
        [clubId]: lineup,
      },
    })
  }

  // ЗАМЕНЯЕТ СПИСОК КЛУБОВ ПОСЛЕ ТРАНСФЕРОВ И ОБНОВЛЯЕТ СОСТАВЫ
  const replaceClubs = (clubs: Club[]): void => {
    if (!game.value) {
      return
    }

    const nextState: GameState = {
      ...game.value,
      clubs,
      lineups: refreshLineupsAfterSquadChange({
        ...game.value,
        clubs,
      }),
    }
    updateGame({
      ...nextState,
      leagueTables: calculateLeagueTables(nextState.clubs, nextState.matches),
    })
  }

  // СИНХРОННО ЗАВЕРШАЕТ БЛИЖАЙШИЙ МАТЧ ПОЛЬЗОВАТЕЛЯ
  const completeMatch = (matchId: string, result: MatchResult): void => {
    if (!game.value) {
      return
    }
    const nextUserMatch = getNextUserMatch(game.value)
    if (!nextUserMatch || nextUserMatch.id !== matchId) {
      return
    }
    updateGame(completeUserMatchDay(game.value, matchId, result))
  }

  // СОЗДАЁТ ДАННЫЕ БЕЗ VUE PROXY
  const createWorkerData = <T>(data: T): T => JSON.parse(JSON.stringify(data)) as T

  // ОСТАНАВЛИВАЕТ ФОНОВЫЙ РАСЧЁТ
  function disposeMatchDayWorker(): void {
    matchDayWorker?.terminate()
    matchDayWorker = null
    preparedMatchId = null
    preparationPromise = null
    preparationResolve = null
    preparationReject = null
    completionResolve = null
    completionReject = null
  }

  // ЗАВЕРШАЕТ ФОНОВЫЙ РАСЧЁТ С ОШИБКОЙ
  const rejectMatchDayWorker = (error: Error): void => {
    preparationReject?.(error)
    completionReject?.(error)
    disposeMatchDayWorker()
  }

  // ЗАРАНЕЕ ГОТОВИТ ОСТАЛЬНЫЕ МАТЧИ ТУРА
  const prepareMatchDay = (matchId: string): Promise<void> => {
    if (preparedMatchId === matchId && preparationPromise) {
      return preparationPromise
    }

    const currentGame = game.value
    const nextUserMatch = currentGame ? getNextUserMatch(currentGame) : undefined
    if (!currentGame || !nextUserMatch || nextUserMatch.id !== matchId) {
      return Promise.resolve()
    }

    if (matchDayWorker) {
      rejectMatchDayWorker(new Error('Фоновый расчет заменен новым матчем.'))
    }

    preparedMatchId = matchId
    matchDayWorker = new Worker(new URL('../../workers/matchDayWorker.ts', import.meta.url), {
      type: 'module',
    })
    const pendingPreparation = new Promise<void>((resolve, reject) => {
      preparationResolve = resolve
      preparationReject = reject
    })
    preparationPromise = pendingPreparation

    matchDayWorker.onmessage = (event: MessageEvent<MatchDayWorkerResponse>) => {
      if (event.data.type === 'error') {
        rejectMatchDayWorker(new Error(event.data.error))
        return
      }

      if (event.data.type === 'ready') {
        preparationResolve?.()
        preparationResolve = null
        preparationReject = null
        return
      }

      game.value = event.data.state
      save()
      const resolve = completionResolve
      completionResolve = null
      completionReject = null
      disposeMatchDayWorker()
      resolve?.()
    }

    matchDayWorker.onerror = (event) => {
      rejectMatchDayWorker(
        new Error(event.message || 'Не удалось запустить расчет игрового дня.'),
      )
    }

    matchDayWorker.postMessage(
      createWorkerData({ type: 'prepare', state: currentGame, matchId }),
    )
    return pendingPreparation
  }

  // ДОБАВЛЯЕТ ИТОГ ПОЛЬЗОВАТЕЛЯ В ГОТОВЫЙ ТУР
  const completeMatchAsync = async (matchId: string, result: MatchResult): Promise<void> => {
    await prepareMatchDay(matchId)
    if (!matchDayWorker || preparedMatchId !== matchId) {
      throw new Error('Игровой день не был подготовлен.')
    }

    return new Promise((resolve, reject) => {
      completionResolve = resolve
      completionReject = reject
      matchDayWorker?.postMessage(createWorkerData({ type: 'complete', result }))
    })
  }

  // ПЕРЕВОДИТ КАРЬЕРУ В СЛЕДУЮЩИЙ СЕЗОН, КОГДА ВСЕ ТУРНИРЫ ЗАВЕРШЕНЫ
  const finishCurrentSeason = (): void => {
    if (!game.value || !seasonCanFinish.value) {
      return
    }
    updateGame(finishSeason(game.value))
  }

  return {
    game,
    championship,
    selectedClub,
    nextMatch,
    activeMatch,
    seasonCanFinish,
    isFinalSeason,
    startNewGame,
    resetGame,
    openMatch,
    clearActiveMatch,
    updateGame,
    updateLineup,
    replaceClubs,
    completeMatch,
    prepareMatchDay,
    completeMatchAsync,
    finishCurrentSeason,
  }
})
