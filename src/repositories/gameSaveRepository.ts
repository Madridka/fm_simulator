import type { ChampionshipId, GameState, MatchResult, PlayerStats } from '@/types/football'
import { ensureWorldCompetitions } from '@/domain/season/seasonService'
import { t } from '@/plugins/i18n/i18n'
import { migrateSaveToAcademiesV3 } from '@/repositories/saveMigration'

const SAVE_KEY = 'football-manager-mvp-save'

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

// ВЫБИРАЕТ БРАУЗЕРНОЕ ХРАНИЛИЩЕ ИЛИ РЕЗЕРВ В ПАМЯТИ
const getStorage = (): StorageLike => {
  if (typeof window === 'undefined') {
    return fallbackStorage
  }
  return window.localStorage
}

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
  // ЗАГРУЖАЕТ СОХРАНЕНИЕ, МИГРИРУЕТ СТАРЫЙ ФОРМАТ И ВОССТАНАВЛИВАЕТ МИР
  load(storage: StorageLike = getStorage()): GameState | null {
    const raw = storage.getItem(SAVE_KEY)
    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw) as PersistedGameState & { configVersion?: number }
      return restorePersistedState(migrateSaveToAcademiesV3(parsed))
    } catch {
      storage.removeItem(SAVE_KEY)
      return null
    }
  },

  // СЖИМАЕТ И АТОМАРНО ЗАПИСЫВАЕТ ТЕКУЩЕЕ СОСТОЯНИЕ
  save(state: GameState, storage: StorageLike = getStorage()): GameSaveResult {
    let serialized = ''
    try {
      serialized = JSON.stringify(createPersistedState(state))
      storage.setItem(SAVE_KEY, serialized)
      return { saved: true, size: serialized.length }
    } catch (error) {
      return {
        saved: false,
        size: serialized.length,
        error: errorMessage(error),
      }
    }
  },

  // УДАЛЯЕТ СОХРАНЁННУЮ КАРЬЕРУ
  clear(storage: StorageLike = getStorage()): void {
    storage.removeItem(SAVE_KEY)
  },
}
