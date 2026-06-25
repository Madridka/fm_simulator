import type { GameState } from '@/types/football'
import { championships } from '@/data/clubs'

const SAVE_KEY = 'football-manager-mvp-save'

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

export const gameSaveRepository = {
  load(storage: StorageLike = getStorage()): GameState | null {
    const raw = storage.getItem(SAVE_KEY)
    if (!raw) {
      return null
    }

    try {
      const state = JSON.parse(raw) as GameState
      if (!state.championshipId) {
        state.championshipId = championships.spain.clubProfiles.some(
          (club) => club.config.id === state.selectedClubId,
        )
          ? 'spain'
          : 'russia'
      }
      return state
    } catch {
      storage.removeItem(SAVE_KEY)
      return null
    }
  },

  save(state: GameState, storage: StorageLike = getStorage()): void {
    storage.setItem(SAVE_KEY, JSON.stringify(state))
  },

  clear(storage: StorageLike = getStorage()): void {
    storage.removeItem(SAVE_KEY)
  },
}
