import {
  createInitialAchievementStats,
  normalizeAchievementStats,
  type AchievementSnapshot,
} from '@/domain/achievements/achievementService'
import type { StorageLike } from '@/repositories/gameSaveRepository'

const ACHIEVEMENTS_KEY = 'football-manager-mvp-account-achievements'

const fallbackStorage = new Map<string, string>()

const getStorage = (): StorageLike => {
  if (typeof window === 'undefined') {
    return {
      getItem: (key) => fallbackStorage.get(key) ?? null,
      setItem: (key, value) => fallbackStorage.set(key, value),
      removeItem: (key) => fallbackStorage.delete(key),
    }
  }

  return window.localStorage
}

const createDefaultSnapshot = (): AchievementSnapshot => ({
  stats: createInitialAchievementStats(),
  unlockedIds: [],
})

const normalizeSnapshot = (snapshot: Partial<AchievementSnapshot>): AchievementSnapshot => ({
  stats: normalizeAchievementStats(snapshot.stats),
  unlockedIds: Array.from(new Set(snapshot.unlockedIds ?? [])),
})

export const achievementRepository = {
  load(storage: StorageLike = getStorage()): AchievementSnapshot {
    const raw = storage.getItem(ACHIEVEMENTS_KEY)
    if (!raw) return createDefaultSnapshot()

    try {
      return normalizeSnapshot(JSON.parse(raw) as Partial<AchievementSnapshot>)
    } catch {
      storage.removeItem(ACHIEVEMENTS_KEY)
      return createDefaultSnapshot()
    }
  },

  save(snapshot: AchievementSnapshot, storage: StorageLike = getStorage()): void {
    storage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(normalizeSnapshot(snapshot)))
  },

  clear(storage: StorageLike = getStorage()): void {
    storage.removeItem(ACHIEVEMENTS_KEY)
  },
}
