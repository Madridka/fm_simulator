import type { WorldCup2026State } from '@/stores/worldCup2026/types'
import { createMemoryStorage, type StorageLike } from '@/repositories/gameSaveRepository'

export const WORLD_CUP_SAVE_KEY = 'fm-simulator:world-cup-2026'
export const CLUB_CAREER_SAVE_KEY = 'fm-simulator:club-career'
const LEGACY_SAVE_KEY = 'football-manager-mvp-save'

export interface WorldCupSaveResult {
  saved: boolean
  size: number
  error?: string
}

const getStorage = (): StorageLike => {
  if (typeof window === 'undefined') {
    return createMemoryStorage()
  }
  return window.localStorage
}

export const worldCup2026SaveRepository = {
  load(storage: StorageLike = getStorage()): WorldCup2026State | null {
    const raw = storage.getItem(WORLD_CUP_SAVE_KEY)
    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw) as WorldCup2026State
      if (!parsed.version || !parsed.selectedTeamId) {
        return null
      }
      return parsed
    } catch {
      return null
    }
  },

  save(state: WorldCup2026State, storage: StorageLike = getStorage()): WorldCupSaveResult {
    try {
      const serialized = JSON.stringify(state)
      storage.setItem(WORLD_CUP_SAVE_KEY, serialized)
      return { saved: true, size: serialized.length }
    } catch (error) {
      return {
        saved: false,
        size: 0,
        error: error instanceof Error ? error.message : 'Save failed',
      }
    }
  },

  clear(storage: StorageLike = getStorage()): void {
    storage.removeItem(WORLD_CUP_SAVE_KEY)
  },
}

export const migrateLegacyClubSaveKey = (storage: StorageLike = getStorage()): void => {
  const legacy = storage.getItem(LEGACY_SAVE_KEY)
  if (legacy && !storage.getItem(CLUB_CAREER_SAVE_KEY)) {
    storage.setItem(CLUB_CAREER_SAVE_KEY, legacy)
    storage.removeItem(LEGACY_SAVE_KEY)
  }
}
