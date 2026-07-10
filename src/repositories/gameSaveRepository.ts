import type { ChampionshipId, GameState, MatchResult, PlayerStats } from '@/types/football'
import { ensureWorldCompetitions } from '@/domain/season/seasonService'
import { t } from '@/plugins/i18n/i18n'
import { migrateSaveToAcademiesV3 } from '@/repositories/saveMigration'

const SAVE_KEY = 'football-manager-mvp-save'
const SAVE_SLOT_PREFIX = 'football-manager-mvp-save-slot-'
const ACTIVE_SLOT_KEY = 'football-manager-mvp-active-slot'
const IDB_DATABASE_NAME = 'fm-simulator-saves'
const IDB_STORE_NAME = 'saves'
export const MAX_SAVE_SLOTS = 5

export interface SaveSlotSummary {
  id: number
  occupied: boolean
  selectedClubId?: string
  selectedClubName?: string
  championshipId?: ChampionshipId
  season?: number
  currentRound?: number
  lastCompletedOrder?: number
}

export interface GameSaveResult {
  saved: boolean
  size: number
  error?: string
}

type PersistedWorldResult = [
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  homeXG?: number,
  awayXG?: number,
  homeShots?: number,
  awayShots?: number,
]
type PersistedWorldResults = Partial<Record<ChampionshipId, PersistedWorldResult[]>>
type PersistedPlayerStats = [
  playerId: string,
  appearances: number,
  goals: number,
  assists: number,
  yellowCards: number,
  redCards: number,
  cleanSheets: number,
  averageRating: number,
  matchesRated: number,
]
type PersistedWorldPlayerStats = Partial<
  Record<ChampionshipId, PersistedPlayerStats[] | Record<string, PlayerStats>>
>
type PersistedGameState = Omit<
  GameState,
  'leagueTables' | 'worldClubs' | 'worldMatches' | 'worldLeagueTables' | 'worldPlayerStats'
> & {
  leagueTables?: GameState['leagueTables']
  worldResults?: PersistedWorldResults
  worldPlayerStats?: PersistedWorldPlayerStats
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

// СОЗДАЁТ ПАМЯТЬ-ЗАМЕНУ LOCALSTORAGE ДЛЯ СРЕД БЕЗ БРАУЗЕРА
export const createMemoryStorage = (): StorageLike => {
  const memory = new Map<string, string>()

  return {
    // ЧИТАЕТ ЗНАЧЕНИЕ ИЗ ПАМЯТИ ПО КЛЮЧУ
    getItem(key: string): string | null {
      return memory.get(key) ?? null
    },
    // ЗАПИСЫВАЕТ ЗНАЧЕНИЕ В ПАМЯТЬ
    setItem(key: string, value: string): void {
      memory.set(key, value)
    },
    // УДАЛЯЕТ ЗНАЧЕНИЕ ИЗ ПАМЯТИ
    removeItem(key: string): void {
      memory.delete(key)
    },
  }
}

const fallbackStorage = createMemoryStorage()
const indexedDbCache = new Map<string, string>()
let indexedDbReady = false
let indexedDbInitPromise: Promise<void> | null = null

// ВЫБИРАЕТ БРАУЗЕРНОЕ ХРАНИЛИЩЕ ИЛИ РЕЗЕРВ В ПАМЯТИ
const getStorage = (): StorageLike => {
  if (typeof window === 'undefined') {
    return fallbackStorage
  }
  return window.localStorage
}

const shouldUseIndexedDb = (storage: StorageLike): boolean =>
  typeof window !== 'undefined' &&
  typeof window.indexedDB !== 'undefined' &&
  storage === window.localStorage

const openSaveDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(IDB_DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(IDB_STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })

const readIndexedDbCache = async (): Promise<void> => {
  const database = await openSaveDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(IDB_STORE_NAME, 'readonly')
    const store = transaction.objectStore(IDB_STORE_NAME)
    const request = store.getAllKeys()
    request.onsuccess = () => {
      const keys = request.result.map(String)
      if (!keys.length) {
        resolve()
        return
      }
      let remaining = keys.length
      keys.forEach((key) => {
        const valueRequest = store.get(key)
        valueRequest.onsuccess = () => {
          if (typeof valueRequest.result === 'string') {
            indexedDbCache.set(key, valueRequest.result)
          }
          remaining -= 1
          if (remaining === 0) resolve()
        }
        valueRequest.onerror = () => reject(valueRequest.error ?? new Error('IndexedDB read failed'))
      })
    }
    request.onerror = () => reject(request.error ?? new Error('IndexedDB key read failed'))
  })
  database.close()
}

const writeIndexedDbValue = async (key: string, value: string): Promise<void> => {
  const database = await openSaveDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(IDB_STORE_NAME, 'readwrite')
    transaction.objectStore(IDB_STORE_NAME).put(value, key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed'))
  })
  database.close()
}

const removeIndexedDbValue = async (key: string): Promise<void> => {
  const database = await openSaveDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(IDB_STORE_NAME, 'readwrite')
    transaction.objectStore(IDB_STORE_NAME).delete(key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB delete failed'))
  })
  database.close()
}

const slotKey = (slotId: number): string => `${SAVE_SLOT_PREFIX}${slotId}`

const readSlotRaw = (slotId: number, storage: StorageLike): string | null => {
  const key = slotKey(slotId)
  return shouldUseIndexedDb(storage) ? (indexedDbCache.get(key) ?? null) : storage.getItem(key)
}

const writeSlotRaw = (slotId: number, value: string, storage: StorageLike): void => {
  const key = slotKey(slotId)
  if (!shouldUseIndexedDb(storage)) {
    storage.setItem(key, value)
    return
  }
  indexedDbCache.set(key, value)
  void writeIndexedDbValue(key, value)
}

const removeSlotRaw = (slotId: number, storage: StorageLike): void => {
  const key = slotKey(slotId)
  if (!shouldUseIndexedDb(storage)) {
    storage.removeItem(key)
    return
  }
  indexedDbCache.delete(key)
  void removeIndexedDbValue(key)
}

const normalizeSlotId = (slotId: number): number =>
  Math.min(MAX_SAVE_SLOTS, Math.max(1, Math.trunc(slotId) || 1))

const getActiveSlotId = (storage: StorageLike = getStorage()): number =>
  normalizeSlotId(Number(storage.getItem(ACTIVE_SLOT_KEY) ?? 1))

const setActiveSlotId = (slotId: number, storage: StorageLike = getStorage()): void => {
  storage.setItem(ACTIVE_SLOT_KEY, String(normalizeSlotId(slotId)))
}

const getCurrentRound = (state: GameState): number | undefined => {
  const userMatch = (match: GameState['matches'][number]): boolean =>
    match.homeClubId === state.selectedClubId || match.awayClubId === state.selectedClubId
  const nextLeagueMatch = state.matches
    .filter((match) => match.type === 'league' && match.status === 'scheduled' && userMatch(match))
    .sort((left, right) => left.date.localeCompare(right.date) || left.order - right.order)[0]
  if (nextLeagueMatch) return nextLeagueMatch.roundNumber ?? nextLeagueMatch.round

  return state.matches
    .filter((match) => match.type === 'league' && userMatch(match))
    .reduce<number | undefined>(
      (round, match) => Math.max(round ?? 0, match.roundNumber ?? match.round),
      undefined,
    )
}

const createSlotSummary = (slotId: number, state: GameState): SaveSlotSummary => ({
  id: slotId,
  occupied: true,
  selectedClubId: state.selectedClubId,
  selectedClubName: state.clubs.find((club) => club.id === state.selectedClubId)?.name,
  championshipId: state.championshipId,
  season: state.season,
  currentRound: getCurrentRound(state),
  lastCompletedOrder: state.lastCompletedOrder,
})

// СОЗДАЁТ КОМПАКТНЫЙ РЕЗУЛЬТАТ БЕЗ ТЯЖЁЛЫХ СОБЫТИЙ И СОСТАВОВ
const compactResult = (
  homeGoals: number,
  awayGoals: number,
  homeClubId: string,
  awayClubId: string,
  penaltyWinnerClubId?: string,
  aggregateStats?: MatchResult['stats'],
): MatchResult => ({
  detail: 'fast',
  homeGoals,
  awayGoals,
  winnerClubId:
    homeGoals > awayGoals
      ? homeClubId
      : awayGoals > homeGoals
        ? awayClubId
        : penaltyWinnerClubId,
  penaltyWinnerClubId,
  goals: [],
  stats: {
    home: aggregateStats?.home ?? { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
    away: aggregateStats?.away ?? { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
  },
  bestPlayerId: '',
})

// ОСТАВЛЯЕТ ДЛЯ ФОНОВОГО МАТЧА ТОЛЬКО ДАННЫЕ, НУЖНЫЕ ТАБЛИЦЕ И КУБКУ
const compactMatch = (match: GameState['matches'][number]): GameState['matches'][number] => {
  if (!match.result) {
    return { ...match, lineups: undefined }
  }

  return {
    ...match,
    result: compactResult(
      match.result.homeGoals,
      match.result.awayGoals,
      match.homeClubId,
      match.awayClubId,
      match.result.penaltyWinnerClubId,
      match.result.stats,
    ),
    lineups: undefined,
  }
}

// УДАЛЯЕТ ИЗ СОХРАНЕНИЯ ПРОИЗВОДНЫЕ ДАННЫЕ И ДУБЛИ, ВОССТАНАВЛИВАЕМЫЕ ПРИ ЗАГРУЗКЕ
const createPersistedState = (state: GameState): PersistedGameState => {
  // СОХРАНЯЕТ ПОЛНУЮ ДЕТАЛИЗАЦИЮ ТОЛЬКО ДЛЯ МАТЧЕЙ ПОЛЬЗОВАТЕЛЯ
  const isUserMatch = (match: GameState['matches'][number]): boolean =>
    match.homeClubId === state.selectedClubId || match.awayClubId === state.selectedClubId

  const worldResults = state.worldMatches
    ? Object.fromEntries(
        Object.entries(state.worldMatches)
          .filter(([championshipId]) => championshipId !== state.championshipId)
          .map(([championshipId, matches]) => [
            championshipId,
            matches
              ?.filter((match) => match.status === 'played' && match.result)
              .map(
                (match): PersistedWorldResult => [
                  match.id,
                  match.result!.homeGoals,
                  match.result!.awayGoals,
                  match.result!.stats.home.xG,
                  match.result!.stats.away.xG,
                  match.result!.stats.home.shots,
                  match.result!.stats.away.shots,
                ],
              ),
          ]),
      )
    : undefined
  const worldPlayerStats = state.worldPlayerStats
    ? Object.fromEntries(
        Object.entries(state.worldPlayerStats).map(([championshipId, stats]) => [
          championshipId,
          Object.entries(stats ?? {})
            .filter(([, value]) => value.appearances > 0)
            .map(
              ([playerId, value]): PersistedPlayerStats => [
                playerId,
                value.appearances,
                value.goals,
                value.assists,
                value.yellowCards,
                value.redCards,
                value.cleanSheets,
                value.averageRating,
                value.matchesRated,
              ],
            ),
        ]),
      )
    : undefined

  const {
    leagueTables: _leagueTables,
    worldClubs: _worldClubs,
    worldMatches: _worldMatches,
    worldLeagueTables: _worldLeagueTables,
    worldPlayerStats: _worldPlayerStats,
    ...coreState
  } = state

  return {
    ...coreState,
    matches: state.matches.map((match) => (isUserMatch(match) ? match : compactMatch(match))),
    worldResults,
    worldPlayerStats,
  }
}

// ВОССТАНАВЛИВАЕТ ДЕТЕРМИНИРОВАННЫЕ РАСПИСАНИЯ МИРОВЫХ ЛИГ И НАКЛАДЫВАЕТ СЧЕТА
const restorePersistedState = (persisted: PersistedGameState): GameState => {
  const { worldResults, worldPlayerStats: compactPlayerStats, ...coreState } = persisted
  const worldPlayerStats = compactPlayerStats
    ? Object.fromEntries(
        Object.entries(compactPlayerStats).map(([championshipId, rows]) => [
          championshipId,
          Array.isArray(rows)
            ? Object.fromEntries(
                rows.map((row) => [
                  row[0],
                  {
                    appearances: row[1],
                    goals: row[2],
                    assists: row[3],
                    yellowCards: row[4],
                    redCards: row[5],
                    cleanSheets: row[6],
                    averageRating: row[7],
                    matchesRated: row[8],
                  } satisfies PlayerStats,
                ]),
              )
            : (rows ?? {}),
        ]),
      )
    : undefined
  const hydrated = ensureWorldCompetitions({ ...coreState, worldPlayerStats } as GameState)
  if (!worldResults) {
    return hydrated
  }

  const worldMatches = { ...hydrated.worldMatches }
  for (const [championshipId, results] of Object.entries(worldResults)) {
    if (!results) {
      continue
    }
    const scoreByMatchId = new Map(results.map((result) => [result[0], result]))
    const id = championshipId as ChampionshipId
    worldMatches[id] = (worldMatches[id] ?? []).map((match) => {
      const score = scoreByMatchId.get(match.id)
      if (!score) {
        return match
      }
      return {
        ...match,
        status: 'played' as const,
        result: compactResult(score[1], score[2], match.homeClubId, match.awayClubId, undefined, {
          home: {
            possession: 50,
            shots: score[5] ?? 0,
            shotsOnTarget: 0,
            yellowCards: 0,
            xG: score[3],
          },
          away: {
            possession: 50,
            shots: score[6] ?? 0,
            shotsOnTarget: 0,
            yellowCards: 0,
            xG: score[4],
          },
        }),
      }
    })
  }

  return ensureWorldCompetitions({ ...hydrated, worldMatches })
}

// ПРЕОБРАЗУЕТ НЕИЗВЕСТНУЮ ОШИБКУ СОХРАНЕНИЯ В ПОНЯТНЫЙ ТЕКСТ
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : t('app.saveWriteFailed')

// ИНКАПСУЛИРУЕТ ЗАГРУЗКУ, КОМПАКТНОЕ СОХРАНЕНИЕ И УДАЛЕНИЕ КАРЬЕРЫ
export const gameSaveRepository = {
  maxSlots: MAX_SAVE_SLOTS,

  async init(storage: StorageLike = getStorage()): Promise<void> {
    if (!shouldUseIndexedDb(storage) || indexedDbReady) return
    if (indexedDbInitPromise) return indexedDbInitPromise

    indexedDbInitPromise = (async () => {
      await readIndexedDbCache()
      for (let slotId = 1; slotId <= MAX_SAVE_SLOTS; slotId += 1) {
        const key = slotKey(slotId)
        const localRaw = storage.getItem(key)
        if (localRaw && !indexedDbCache.has(key)) {
          indexedDbCache.set(key, localRaw)
          await writeIndexedDbValue(key, localRaw)
          storage.removeItem(key)
        }
      }
      indexedDbReady = true
    })().catch(() => {
      indexedDbReady = false
    })

    return indexedDbInitPromise
  },

  activeSlotId(storage: StorageLike = getStorage()): number {
    return getActiveSlotId(storage)
  },

  selectSlot(slotId: number, storage: StorageLike = getStorage()): number {
    const normalized = normalizeSlotId(slotId)
    setActiveSlotId(normalized, storage)
    return normalized
  },

  listSlots(storage: StorageLike = getStorage()): SaveSlotSummary[] {
    return Array.from({ length: MAX_SAVE_SLOTS }, (_, index) => {
      const id = index + 1
      const raw = readSlotRaw(id, storage)
      if (!raw) {
        return { id, occupied: false }
      }

      try {
        const parsed = JSON.parse(raw) as PersistedGameState & { configVersion?: number }
        return createSlotSummary(id, restorePersistedState(migrateSaveToAcademiesV3(parsed)))
      } catch {
        removeSlotRaw(id, storage)
        return { id, occupied: false }
      }
    })
  },

  loadSlot(slotId: number, storage: StorageLike = getStorage()): GameState | null {
    const normalized = normalizeSlotId(slotId)
    const raw = readSlotRaw(normalized, storage)
    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw) as PersistedGameState & { configVersion?: number }
      setActiveSlotId(normalized, storage)
      return restorePersistedState(migrateSaveToAcademiesV3(parsed))
    } catch {
      removeSlotRaw(normalized, storage)
      return null
    }
  },

  saveSlot(
    slotId: number,
    state: GameState,
    storage: StorageLike = getStorage(),
  ): GameSaveResult {
    const normalized = normalizeSlotId(slotId)
    let serialized = ''
    try {
      serialized = JSON.stringify(createPersistedState(state))
      writeSlotRaw(normalized, serialized, storage)
      setActiveSlotId(normalized, storage)
      return { saved: true, size: serialized.length }
    } catch (error) {
      return {
        saved: false,
        size: serialized.length,
        error: errorMessage(error),
      }
    }
  },

  clearSlot(slotId: number, storage: StorageLike = getStorage()): void {
    removeSlotRaw(normalizeSlotId(slotId), storage)
  },

  // ЗАГРУЖАЕТ СОХРАНЕНИЕ, МИГРИРУЕТ СТАРЫЙ ФОРМАТ И ВОССТАНАВЛИВАЕТ МИР
  load(storage: StorageLike = getStorage()): GameState | null {
    const activeSlot = getActiveSlotId(storage)
    const activeSave = this.loadSlot(activeSlot, storage)
    if (activeSave) return activeSave

    const raw = storage.getItem(SAVE_KEY)
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw) as PersistedGameState & { configVersion?: number }
      const migrated = restorePersistedState(migrateSaveToAcademiesV3(parsed))
      this.saveSlot(activeSlot, migrated, storage)
      storage.removeItem(SAVE_KEY)
      return migrated
    } catch {
      storage.removeItem(SAVE_KEY)
      return null
    }
  },

  // СЖИМАЕТ И АТОМАРНО ЗАПИСЫВАЕТ ТЕКУЩЕЕ СОСТОЯНИЕ
  save(state: GameState, storage: StorageLike = getStorage()): GameSaveResult {
    return this.saveSlot(getActiveSlotId(storage), state, storage)
  },

  // УДАЛЯЕТ СОХРАНЁННУЮ КАРЬЕРУ
  clear(storage: StorageLike = getStorage()): void {
    this.clearSlot(getActiveSlotId(storage), storage)
  },
}
