import { achievementCatalog, type AchievementDefinition } from '@/domain/achievements/achievementCatalog'
import type { GameState, Match } from '@/types/football'

export interface AchievementAccountStats {
  careerSlotsStarted: number[]
  seasonsFinished: number
  bestLeaguePosition?: number
  leagueTitles: number
  biggestWinMargin: number
  cleanSheetWinStreak: number
}

export interface AchievementSnapshot {
  stats: AchievementAccountStats
  unlockedIds: string[]
}

export const createInitialAchievementStats = (): AchievementAccountStats => ({
  careerSlotsStarted: [],
  seasonsFinished: 0,
  leagueTitles: 0,
  biggestWinMargin: 0,
  cleanSheetWinStreak: 0,
})

export const normalizeAchievementStats = (
  stats?: Partial<AchievementAccountStats>,
): AchievementAccountStats => ({
  careerSlotsStarted: Array.from(
    new Set((stats?.careerSlotsStarted ?? []).filter((slotId) => slotId >= 1 && slotId <= 5)),
  ).sort((left, right) => left - right),
  seasonsFinished: Math.max(0, Math.trunc(stats?.seasonsFinished ?? 0)),
  bestLeaguePosition: stats?.bestLeaguePosition
    ? Math.max(1, Math.trunc(stats.bestLeaguePosition))
    : undefined,
  leagueTitles: Math.max(0, Math.trunc(stats?.leagueTitles ?? 0)),
  biggestWinMargin: Math.max(0, Math.trunc(stats?.biggestWinMargin ?? 0)),
  cleanSheetWinStreak: Math.max(0, Math.trunc(stats?.cleanSheetWinStreak ?? 0)),
})

export const getAchievementProgress = (
  achievement: AchievementDefinition,
  stats: AchievementAccountStats,
): { current: number; target: number } => {
  if (achievement.id === 'five-careers') {
    return { current: stats.careerSlotsStarted.length, target: 5 }
  }

  if (achievement.id === 'three-seasons') {
    return { current: Math.min(stats.seasonsFinished, 3), target: 3 }
  }

  if (achievement.id === 'clean-sheet-streak-3') {
    return { current: Math.min(stats.cleanSheetWinStreak, 3), target: 3 }
  }

  return { current: 0, target: 1 }
}

export const getUnlockedAchievementIds = (
  stats: AchievementAccountStats,
  previousIds: string[] = [],
): string[] => {
  const unlocked = new Set(previousIds)

  if (stats.careerSlotsStarted.length >= 1) unlocked.add('first-career')
  if (stats.careerSlotsStarted.length >= 5) unlocked.add('five-careers')
  if (stats.seasonsFinished >= 1) unlocked.add('season-finished')
  if (stats.seasonsFinished >= 3) unlocked.add('three-seasons')
  if ((stats.bestLeaguePosition ?? Number.MAX_SAFE_INTEGER) <= 3) unlocked.add('league-podium')
  if (stats.leagueTitles >= 1) unlocked.add('league-champion')
  if (stats.biggestWinMargin >= 4) unlocked.add('big-win')
  if (stats.cleanSheetWinStreak >= 3) unlocked.add('clean-sheet-streak-3')

  return achievementCatalog
    .filter((achievement) => unlocked.has(achievement.id))
    .map((achievement) => achievement.id)
}

const userMatchMargin = (match: Match, selectedClubId: string): number | null => {
  if (!match.result || match.status !== 'played') return null
  if (match.homeClubId === selectedClubId) return match.result.homeGoals - match.result.awayGoals
  if (match.awayClubId === selectedClubId) return match.result.awayGoals - match.result.homeGoals
  return null
}

export const getCleanSheetWinStreak = (state: GameState): number => {
  const userMatches = state.matches
    .filter(
      (match) =>
        match.status === 'played' &&
        match.result &&
        (match.homeClubId === state.selectedClubId || match.awayClubId === state.selectedClubId),
    )
    .sort((left, right) => left.date.localeCompare(right.date) || left.order - right.order)

  let streak = 0
  let best = 0

  for (const match of userMatches) {
    const margin = userMatchMargin(match, state.selectedClubId)
    const goalsAgainst =
      match.homeClubId === state.selectedClubId
        ? match.result?.awayGoals
        : match.result?.homeGoals

    if ((margin ?? 0) > 0 && goalsAgainst === 0) {
      streak += 1
      best = Math.max(best, streak)
    } else {
      streak = 0
    }
  }

  return best
}

export const getBiggestUserWinMargin = (state: GameState): number =>
  state.matches.reduce((best, match) => {
    const margin = userMatchMargin(match, state.selectedClubId)
    return margin && margin > best ? margin : best
  }, 0)

export const getUserLeaguePosition = (state: GameState): number | undefined => {
  const selectedClub = state.clubs.find((club) => club.id === state.selectedClubId)
  if (!selectedClub) return undefined

  return Object.values(state.leagueTables)
    .flat()
    .find((row) => row.clubId === selectedClub.id)?.position
}

export const mergeAchievementSnapshot = (
  current: AchievementSnapshot,
  nextStats: Partial<AchievementAccountStats>,
): AchievementSnapshot => {
  const stats = normalizeAchievementStats({
    ...current.stats,
    ...nextStats,
    careerSlotsStarted: Array.from(
      new Set([
        ...current.stats.careerSlotsStarted,
        ...(nextStats.careerSlotsStarted ?? []),
      ]),
    ),
    bestLeaguePosition:
      nextStats.bestLeaguePosition && current.stats.bestLeaguePosition
        ? Math.min(current.stats.bestLeaguePosition, nextStats.bestLeaguePosition)
        : (nextStats.bestLeaguePosition ?? current.stats.bestLeaguePosition),
    biggestWinMargin: Math.max(
      current.stats.biggestWinMargin,
      nextStats.biggestWinMargin ?? 0,
    ),
    cleanSheetWinStreak: Math.max(
      current.stats.cleanSheetWinStreak,
      nextStats.cleanSheetWinStreak ?? 0,
    ),
  })

  return {
    stats,
    unlockedIds: getUnlockedAchievementIds(stats, current.unlockedIds),
  }
}
