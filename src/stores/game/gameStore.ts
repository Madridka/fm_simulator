import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { calculateLeagueTables } from '@/domain/competition/leagueTableService'
import { getSimulationSettings } from '@/domain/admin/simulationSettings'
import { careerConfig, willPlayerRetireAfterSeason } from '@/data/gameConfig/career'
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
import { gameSaveRepository, type SaveSlotSummary } from '@/repositories/gameSaveRepository'
import { achievementById } from '@/domain/achievements/achievementCatalog'
import { t } from '@/plugins/i18n/i18n'
import { useAchievementStore } from '@/stores/achievements/achievementStore'
import { useToastStore } from '@/stores/ui/toastStore'
import type {
  ChampionshipId,
  Club,
  ClubLineup,
  GameState,
  Match,
  MatchResult,
  PreparedMatchContext,
} from '@/types/football'

type MatchDayWorkerResponse =
  | { type: 'ready'; context: PreparedMatchContext }
  | { type: 'complete'; state: GameState }
  | { type: 'error'; error: string }

// ХРАНИТ КАРЬЕРУ, УПРАВЛЯЕТ МАТЧАМИ, СЕЗОНАМИ И СОХРАНЕНИЕМ ИГРЫ
export const useGameStore = defineStore('game', () => {
  const achievementStore = useAchievementStore()
  const toastStore = useToastStore()
  const savedGame = gameSaveRepository.load()
  const game = ref<GameState | null>(
    savedGame ? settleAiOnlyDaysUntilNextUserMatch(savedGame) : null,
  )
  const activeSlotId = ref(gameSaveRepository.activeSlotId())
  const saveSlots = ref<SaveSlotSummary[]>(gameSaveRepository.listSlots())
  const activeMatchId = ref<string | null>(null)
  const preparedMatchContext = ref<PreparedMatchContext | null>(null)
  const seasonTasksDialogVisible = ref(false)
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

    const isUserMatch =
      match.homeClubId === state.selectedClubId || match.awayClubId === state.selectedClubId
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
      ? (careerConfig.maximumSeasons === null || game.value.season < careerConfig.maximumSeasons) &&
        isSeasonReadyToFinish(game.value)
      : false,
  )

  // ПОКАЗЫВАЕТ, ДОСТИГНУТ ЛИ ЛИМИТ ПРОДОЛЖИТЕЛЬНОСТИ КАРЬЕРЫ
  const isFinalSeason = computed<boolean>(
    () =>
      careerConfig.maximumSeasons !== null &&
      (game.value?.season ?? 0) >= careerConfig.maximumSeasons,
  )

  const showAchievementUnlocks = (achievementIds: string[]): void => {
    const firstAchievement = achievementById[achievementIds[0]]
    if (!firstAchievement) return

    toastStore.show(`Достижение открыто: ${firstAchievement.title}`, 'success')
  }

  // СОХРАНЯЕТ ТЕКУЩУЮ КАРЬЕРУ И УВЕДОМЛЯЕТ О ПЕРЕПОЛНЕНИИ ХРАНИЛИЩА
  const save = (): void => {
    if (game.value) {
      const result = gameSaveRepository.save(game.value)
      activeSlotId.value = gameSaveRepository.activeSlotId()
      saveSlots.value = gameSaveRepository.listSlots()
      if (!result.saved) {
        toastStore.show(t('app.saveStorageFull'), 'warning')
      }
    }
  }

  // СОЗДАЁТ НОВУЮ КАРЬЕРУ ДЛЯ ВЫБРАННОГО КЛУБА
  const startNewGame = (championshipId: ChampionshipId, clubId: string): void => {
    disposeMatchDayWorker()
    activeMatchId.value = null
    game.value = createInitialGameState(championshipId, clubId)
    showAchievementUnlocks(achievementStore.recordCareerStarted(activeSlotId.value))
    seasonTasksDialogVisible.value = true
    save()
  }

  const startNewGameInSlot = (
    slotId: number,
    championshipId: ChampionshipId,
    clubId: string,
  ): void => {
    gameSaveRepository.selectSlot(slotId)
    activeSlotId.value = gameSaveRepository.activeSlotId()
    startNewGame(championshipId, clubId)
  }

  const selectSaveSlot = (slotId: number): void => {
    gameSaveRepository.selectSlot(slotId)
    activeSlotId.value = gameSaveRepository.activeSlotId()
    saveSlots.value = gameSaveRepository.listSlots()
  }

  const prepareNewCareerSlot = (slotId: number): void => {
    disposeMatchDayWorker()
    activeMatchId.value = null
    seasonTasksDialogVisible.value = false
    game.value = null
    selectSaveSlot(slotId)
  }

  const loadSaveSlot = (slotId: number): boolean => {
    const loaded = gameSaveRepository.loadSlot(slotId)
    if (!loaded) {
      saveSlots.value = gameSaveRepository.listSlots()
      return false
    }

    disposeMatchDayWorker()
    activeMatchId.value = null
    seasonTasksDialogVisible.value = false
    game.value = settleAiOnlyDaysUntilNextUserMatch(loaded)
    activeSlotId.value = gameSaveRepository.activeSlotId()
    saveSlots.value = gameSaveRepository.listSlots()
    return true
  }

  const deleteSaveSlot = (slotId: number): void => {
    gameSaveRepository.clearSlot(slotId)
    if (slotId === activeSlotId.value) {
      disposeMatchDayWorker()
      activeMatchId.value = null
      seasonTasksDialogVisible.value = false
      game.value = null
    }
    saveSlots.value = gameSaveRepository.listSlots()
  }

  // ПОЛНОСТЬЮ СБРАСЫВАЕТ КАРЬЕРУ И ЛОКАЛЬНОЕ СОХРАНЕНИЕ
  const resetGame = (): void => {
    disposeMatchDayWorker()
    activeMatchId.value = null
    seasonTasksDialogVisible.value = false
    game.value = null
    gameSaveRepository.clear()
  }

  // ЗАКРЫТИЕ ДИАЛОГА С ЗАДАЧЕЙ НА СЕЗОН
  const closeSeasonTasksDialog = (): void => {
    seasonTasksDialogVisible.value = false
  }

  // ДЕЛАЕТ МАТЧ АКТИВНЫМ И ЗАРАНЕЕ ЗАПУСКАЕТ ПОДГОТОВКУ ТУРА
  const openMatch = (matchId: string): boolean => {
    const match = game.value?.matches.find((candidate) => candidate.id === matchId)
    if (!match || !canOpenMatch(match)) {
      return false
    }

    activeMatchId.value = match.id
    if (match.status === 'scheduled') {
      void prepareMatchDay(match.id).catch((error: unknown) => {
        toastStore.show(
          error instanceof Error ? error.message : t('match.errors.prepareDay'),
          'warning',
        )
      })
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
    showAchievementUnlocks(achievementStore.recordMatchSnapshot(game.value))
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
    preparedMatchContext.value = null
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
      rejectMatchDayWorker(new Error(t('match.errors.dayReplaced')))
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
        preparedMatchContext.value = event.data.context
        preparationResolve?.()
        preparationResolve = null
        preparationReject = null
        return
      }

      updateGame(event.data.state)
      const resolve = completionResolve
      completionResolve = null
      completionReject = null
      disposeMatchDayWorker()
      resolve?.()
    }

    matchDayWorker.onerror = (event) => {
      rejectMatchDayWorker(new Error(event.message || t('match.errors.workerStart')))
    }

    matchDayWorker.onmessageerror = () => {
      rejectMatchDayWorker(new Error(t('match.errors.prepareDay')))
    }

    matchDayWorker.postMessage(
      createWorkerData({
        type: 'prepare',
        state: currentGame,
        matchId,
        simulationSettings: getSimulationSettings(),
      }),
    )
    return pendingPreparation
  }

  // ДОБАВЛЯЕТ ИТОГ ПОЛЬЗОВАТЕЛЯ В ГОТОВЫЙ ТУР
  const completeMatchAsync = async (matchId: string, result: MatchResult): Promise<void> => {
    await prepareMatchDay(matchId)
    if (!matchDayWorker || preparedMatchId !== matchId) {
      throw new Error(t('match.errors.dayNotPrepared'))
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
    const finishedSeasonState = game.value
    const retiringPlayers =
      selectedClub.value?.squad.filter((player) => willPlayerRetireAfterSeason(player.age)) ?? []
    const nextState = finishSeason(finishedSeasonState)
    showAchievementUnlocks(achievementStore.recordSeasonFinished(finishedSeasonState))
    updateGame(nextState)
    if (retiringPlayers.length) {
      const visibleNames = retiringPlayers
        .slice(0, 3)
        .map((player) => `${player.firstName} ${player.lastName}`)
      const hiddenCount = retiringPlayers.length - visibleNames.length
      const players =
        hiddenCount > 0
          ? `${visibleNames.join(', ')} и ещё ${hiddenCount}`
          : visibleNames.join(', ')
      toastStore.show(t('squad.retirementNotice', { players }), 'info')
    }
  }

  return {
    game,
    activeSlotId,
    saveSlots,
    championship,
    selectedClub,
    nextMatch,
    activeMatch,
    preparedMatchContext,
    seasonTasksDialogVisible,
    seasonCanFinish,
    isFinalSeason,
    startNewGame,
    startNewGameInSlot,
    selectSaveSlot,
    prepareNewCareerSlot,
    loadSaveSlot,
    deleteSaveSlot,
    resetGame,
    closeSeasonTasksDialog,
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
