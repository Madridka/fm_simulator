import type { ChampionshipId, GameState, MatchResult } from '@/types/football'
import { championships } from '@/data/clubs'
import { ensureWorldCompetitions } from '@/domain/season/seasonService'

const SAVE_KEY = 'football-manager-mvp-save'

export interface GameSaveResult {
  saved: boolean
  size: number
  error?: string
}

type PersistedWorldResult = [matchId: string, homeGoals: number, awayGoals: number]
type PersistedWorldResults = Partial<Record<ChampionshipId, PersistedWorldResult[]>>
type PersistedGameState = Omit<
  GameState,
  'leagueTables' | 'worldClubs' | 'worldMatches' | 'worldLeagueTables'
> & {
  leagueTables?: GameState['leagueTables']
  worldResults?: PersistedWorldResults
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const createMemoryStorage = (): StorageLike => {
  const memory = new Map<string, string>()

  return {
    getItem(key: string): string | null {
      return memory.get(key) ?? null
    },
    setItem(key: string, value: string): void {
      memory.set(key, value)
    },
    removeItem(key: string): void {
      memory.delete(key)
    },
  }
}

const fallbackStorage = createMemoryStorage()

const getStorage = (): StorageLike => {
  if (typeof window === 'undefined') {
    return fallbackStorage
  }
  return window.localStorage
}

const compactResult = (
  homeGoals: number,
  awayGoals: number,
  homeClubId: string,
  awayClubId: string,
  penaltyWinnerClubId?: string,
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
    home: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
    away: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
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
    ),
    lineups: undefined,
  }
}

// УДАЛЯЕТ ИЗ СОХРАНЕНИЯ ПРОИЗВОДНЫЕ ДАННЫЕ И ДУБЛИ, ВОССТАНАВЛИВАЕМЫЕ ПРИ ЗАГРУЗКЕ
const createPersistedState = (state: GameState): PersistedGameState => {
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
    ...coreState
  } = state

  return {
    ...coreState,
    matches: state.matches.map((match) => (isUserMatch(match) ? match : compactMatch(match))),
    worldResults,
  }
}

// ВОССТАНАВЛИВАЕТ ДЕТЕРМИНИРОВАННЫЕ РАСПИСАНИЯ МИРОВЫХ ЛИГ И НАКЛАДЫВАЕТ СЧЕТА
const restorePersistedState = (persisted: PersistedGameState): GameState => {
  const { worldResults, ...coreState } = persisted
  const hydrated = ensureWorldCompetitions(coreState as GameState)
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
        result: compactResult(score[1], score[2], match.homeClubId, match.awayClubId),
      }
    })
  }

  return ensureWorldCompetitions({ ...hydrated, worldMatches })
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Не удалось записать сохранение.'

export const gameSaveRepository = {
  load(storage: StorageLike = getStorage()): GameState | null {
    const raw = storage.getItem(SAVE_KEY)
    if (!raw) {
      return null
    }

    try {
      const state = JSON.parse(raw) as PersistedGameState
      if (!state.championshipId) {
        state.championshipId = championships.spain.clubProfiles.some(
          (club) => club.config.id === state.selectedClubId,
        )
          ? 'spain'
          : 'russia'
      }
      return restorePersistedState(state)
    } catch {
      storage.removeItem(SAVE_KEY)
      return null
    }
  },

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

  clear(storage: StorageLike = getStorage()): void {
    storage.removeItem(SAVE_KEY)
  },
}
