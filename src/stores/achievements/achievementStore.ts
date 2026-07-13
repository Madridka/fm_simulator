import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { achievementById, achievementCatalog } from '@/domain/achievements/achievementCatalog'
import {
  getBiggestUserWinMargin,
  getCleanSheetWinStreak,
  getAchievementProgress,
  getUserLeaguePosition,
  mergeAchievementSnapshot,
  type AchievementAccountStats,
} from '@/domain/achievements/achievementService'
import { achievementRepository } from '@/repositories/achievementRepository'
import type { GameState } from '@/types/football'

export const useAchievementStore = defineStore('achievements', () => {
  const snapshot = ref(achievementRepository.load())
  const lastUnlockedIds = ref<string[]>([])

  const unlockedIds = computed(() => snapshot.value.unlockedIds)
  const unlockedSet = computed(() => new Set(unlockedIds.value))
  const totalPoints = computed(() =>
    unlockedIds.value.reduce((sum, id) => sum + (achievementById[id]?.points ?? 0), 0),
  )
  const unlockedCount = computed(() => unlockedIds.value.length)
  const totalCount = computed(() => achievementCatalog.length)

  const saveSnapshot = (): void => {
    achievementRepository.save(snapshot.value)
  }

  const applyStats = (stats: Partial<AchievementAccountStats>): string[] => {
    const before = new Set(snapshot.value.unlockedIds)
    snapshot.value = mergeAchievementSnapshot(snapshot.value, stats)
    saveSnapshot()

    const unlockedNow = snapshot.value.unlockedIds.filter((id) => !before.has(id))
    lastUnlockedIds.value = unlockedNow
    return unlockedNow
  }

  const recordCareerStarted = (slotId: number): string[] =>
    applyStats({ careerSlotsStarted: [slotId] })

  const recordMatchSnapshot = (state: GameState): string[] =>
    applyStats({
      biggestWinMargin: getBiggestUserWinMargin(state),
      cleanSheetWinStreak: getCleanSheetWinStreak(state),
    })

  const recordSeasonFinished = (stateBeforeSeasonChange: GameState): string[] => {
    const position = getUserLeaguePosition(stateBeforeSeasonChange)
    return applyStats({
      seasonsFinished: snapshot.value.stats.seasonsFinished + 1,
      bestLeaguePosition: position,
      leagueTitles:
        position === 1 ? snapshot.value.stats.leagueTitles + 1 : snapshot.value.stats.leagueTitles,
      biggestWinMargin: getBiggestUserWinMargin(stateBeforeSeasonChange),
      cleanSheetWinStreak: getCleanSheetWinStreak(stateBeforeSeasonChange),
    })
  }

  const progressFor = (achievementId: string): { current: number; target: number } => {
    const achievement = achievementById[achievementId]
    return achievement
      ? getAchievementProgress(achievement, snapshot.value.stats)
      : { current: 0, target: 1 }
  }

  return {
    achievements: achievementCatalog,
    snapshot,
    unlockedIds,
    unlockedSet,
    unlockedCount,
    totalCount,
    totalPoints,
    lastUnlockedIds,
    progressFor,
    recordCareerStarted,
    recordMatchSnapshot,
    recordSeasonFinished,
  }
})
