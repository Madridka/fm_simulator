import { getCountryCompetitionConfig } from '@/data/gameConfig'
import type { CompetitionId, TransitionRule } from '@/data/gameConfig/types'
import { getClubCompetitionId } from '@/domain/competition/competitionIdentity'
import { selectTableRows } from '@/domain/competitions/selectors'
import { achievementCatalog, type AchievementDefinition } from '@/domain/achievements/achievementCatalog'
import type { ChampionshipId, Club, GameState, Match } from '@/types/football'

type TopLeagueChampionshipId = Extract<
  ChampionshipId,
  'england' | 'france' | 'germany' | 'italy' | 'spain'
>
type TopFlightMovement = 'promoted-to-top' | 'relegated-from-top' | 'none'

interface LastClubOutcome {
  season: number
  leagueChampion: boolean
  promotedToTop: boolean
  relegated: boolean
  relegatedFromTop: boolean
}

export interface AchievementAccountStats {
  careerSlotsStarted: number[]
  seasonsFinished: number
  bestLeaguePosition?: number
  leagueTitles: number
  leagueTitleChampionshipIds: ChampionshipId[]
  leagueTitlesByClubId: Record<string, number>
  seasonsByClubId: Record<string, number>
  biggestWinMargin: number
  cleanSheetWinStreak: number
  debutDoubleClubIds: string[]
  undefeatedLeagueTitleClubIds: string[]
  lastFiveCleanSheetTitleClubIds: string[]
  championThenRelegatedClubIds: string[]
  relegationCandidateTitleClubIds: string[]
  kaiserslauternClubIds: string[]
  doubleRelegationClubIds: string[]
  yoYoClubIds: string[]
  lastClubOutcomes: Record<string, LastClubOutcome>
  relegationStreakByClubId: Record<string, number>
  recentTopFlightMovementsByClubId: Record<string, TopFlightMovement[]>
}

export interface AchievementSnapshot {
  stats: AchievementAccountStats
  unlockedIds: string[]
}

const bigFiveChampionshipIds: TopLeagueChampionshipId[] = [
  'england',
  'france',
  'germany',
  'italy',
  'spain',
]

export const createInitialAchievementStats = (): AchievementAccountStats => ({
  careerSlotsStarted: [],
  seasonsFinished: 0,
  leagueTitles: 0,
  leagueTitleChampionshipIds: [],
  leagueTitlesByClubId: {},
  seasonsByClubId: {},
  biggestWinMargin: 0,
  cleanSheetWinStreak: 0,
  debutDoubleClubIds: [],
  undefeatedLeagueTitleClubIds: [],
  lastFiveCleanSheetTitleClubIds: [],
  championThenRelegatedClubIds: [],
  relegationCandidateTitleClubIds: [],
  kaiserslauternClubIds: [],
  doubleRelegationClubIds: [],
  yoYoClubIds: [],
  lastClubOutcomes: {},
  relegationStreakByClubId: {},
  recentTopFlightMovementsByClubId: {},
})

const uniqueStrings = (items?: readonly string[]): string[] => Array.from(new Set(items ?? []))

const normalizeNumberRecord = (record?: Record<string, number>): Record<string, number> =>
  Object.fromEntries(
    Object.entries(record ?? {}).map(([key, value]) => [key, Math.max(0, Math.trunc(value))]),
  )

const normalizeTopFlightMovements = (
  record?: Record<string, TopFlightMovement[]>,
): Record<string, TopFlightMovement[]> =>
  Object.fromEntries(
    Object.entries(record ?? {}).map(([clubId, movements]) => [
      clubId,
      movements
        .filter((movement): movement is TopFlightMovement =>
          movement === 'promoted-to-top' || movement === 'relegated-from-top' || movement === 'none',
        )
        .slice(-5),
    ]),
  )

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
  leagueTitleChampionshipIds: uniqueStrings(stats?.leagueTitleChampionshipIds) as ChampionshipId[],
  leagueTitlesByClubId: normalizeNumberRecord(stats?.leagueTitlesByClubId),
  seasonsByClubId: normalizeNumberRecord(stats?.seasonsByClubId),
  biggestWinMargin: Math.max(0, Math.trunc(stats?.biggestWinMargin ?? 0)),
  cleanSheetWinStreak: Math.max(0, Math.trunc(stats?.cleanSheetWinStreak ?? 0)),
  debutDoubleClubIds: uniqueStrings(stats?.debutDoubleClubIds),
  undefeatedLeagueTitleClubIds: uniqueStrings(stats?.undefeatedLeagueTitleClubIds),
  lastFiveCleanSheetTitleClubIds: uniqueStrings(stats?.lastFiveCleanSheetTitleClubIds),
  championThenRelegatedClubIds: uniqueStrings(stats?.championThenRelegatedClubIds),
  relegationCandidateTitleClubIds: uniqueStrings(stats?.relegationCandidateTitleClubIds),
  kaiserslauternClubIds: uniqueStrings(stats?.kaiserslauternClubIds),
  doubleRelegationClubIds: uniqueStrings(stats?.doubleRelegationClubIds),
  yoYoClubIds: uniqueStrings(stats?.yoYoClubIds),
  lastClubOutcomes: Object.fromEntries(
    Object.entries(stats?.lastClubOutcomes ?? {}).map(([clubId, outcome]) => [
      clubId,
      {
        season: Math.max(1, Math.trunc(outcome.season)),
        leagueChampion: Boolean(outcome.leagueChampion),
        promotedToTop: Boolean(outcome.promotedToTop),
        relegated: Boolean(outcome.relegated),
        relegatedFromTop: Boolean(outcome.relegatedFromTop),
      },
    ]),
  ),
  relegationStreakByClubId: normalizeNumberRecord(stats?.relegationStreakByClubId),
  recentTopFlightMovementsByClubId: normalizeTopFlightMovements(
    stats?.recentTopFlightMovementsByClubId,
  ),
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
  if (achievement.id === 'bald-fraud') {
    return {
      current: bigFiveChampionshipIds.filter((id) =>
        stats.leagueTitleChampionshipIds.includes(id),
      ).length,
      target: 5,
    }
  }
  if (achievement.id === 'ferguson-heir') {
    const current = Math.max(
      0,
      ...Object.entries(stats.seasonsByClubId).map(([clubId, seasons]) =>
        (stats.leagueTitlesByClubId[clubId] ?? 0) >= 10 ? seasons : 0,
      ),
    )
    return { current: Math.min(current, 20), target: 20 }
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

  if (
    bigFiveChampionshipIds.every((championshipId) =>
      stats.leagueTitleChampionshipIds.includes(championshipId),
    )
  ) {
    unlocked.add('bald-fraud')
  }
  if (stats.debutDoubleClubIds.length > 0) unlocked.add('special-one')
  if (stats.undefeatedLeagueTitleClubIds.length > 0) unlocked.add('arsene-knows')
  if (
    Object.entries(stats.seasonsByClubId).some(
      ([clubId, seasons]) => seasons >= 20 && (stats.leagueTitlesByClubId[clubId] ?? 0) >= 10,
    )
  ) {
    unlocked.add('ferguson-heir')
  }
  if (stats.lastFiveCleanSheetTitleClubIds.length > 0) unlocked.add('park-the-bus')
  if (stats.championThenRelegatedClubIds.length > 0) unlocked.add('from-champions-to-relegation')
  if (stats.relegationCandidateTitleClubIds.length > 0) unlocked.add('leicester-fairytale')
  if (stats.kaiserslauternClubIds.length > 0) unlocked.add('kaiserslautern')
  if (stats.doubleRelegationClubIds.length > 0) unlocked.add('double-relegation')
  if (stats.yoYoClubIds.length > 0) unlocked.add('yo-yo-club')

  return achievementCatalog
    .filter((achievement) => unlocked.has(achievement.id))
    .map((achievement) => achievement.id)
}

const selectedClub = (state: GameState): Club | undefined =>
  state.clubs.find((club) => club.id === state.selectedClubId)

const selectedClubRow = (state: GameState) => {
  const club = selectedClub(state)
  if (!club) return undefined
  return state.leagueTables[getClubCompetitionId(club)]?.find((row) => row.clubId === club.id)
}

const userMatchMargin = (match: Match, selectedClubId: string): number | null => {
  if (!match.result || match.status !== 'played') return null
  if (match.homeClubId === selectedClubId) return match.result.homeGoals - match.result.awayGoals
  if (match.awayClubId === selectedClubId) return match.result.awayGoals - match.result.homeGoals
  return null
}

const userGoalsAgainst = (match: Match, selectedClubId: string): number | null => {
  if (!match.result || match.status !== 'played') return null
  if (match.homeClubId === selectedClubId) return match.result.awayGoals
  if (match.awayClubId === selectedClubId) return match.result.homeGoals
  return null
}

const playedUserMatches = (state: GameState, type?: Match['type']): Match[] =>
  state.matches
    .filter(
      (match) =>
        match.status === 'played' &&
        (!type || match.type === type) &&
        (match.homeClubId === state.selectedClubId || match.awayClubId === state.selectedClubId),
    )
    .sort((left, right) => left.date.localeCompare(right.date) || left.order - right.order)

export const getCleanSheetWinStreak = (state: GameState): number => {
  let streak = 0
  let best = 0

  for (const match of playedUserMatches(state)) {
    const margin = userMatchMargin(match, state.selectedClubId)
    const goalsAgainst = userGoalsAgainst(match, state.selectedClubId)
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

export const getUserLeaguePosition = (state: GameState): number | undefined =>
  selectedClubRow(state)?.position

const getTransitionRules = (state: GameState): TransitionRule[] =>
  Object.values(getCountryCompetitionConfig(state.championshipId).competitions).flatMap(
    (competition) => competition.transitions.rules,
  )

const transitionTargetForSelectedClub = (state: GameState): CompetitionId | undefined => {
  const club = selectedClub(state)
  if (!club) return undefined

  const competitionId = getClubCompetitionId(club)

  for (const rule of getTransitionRules(state)) {
    if (
      (rule.type === 'direct-promotion' ||
        rule.type === 'direct-relegation' ||
        rule.type === 'group-promotion') &&
      rule.sourceCompetitionId === competitionId
    ) {
      const rows = state.leagueTables[rule.sourceCompetitionId] ?? []
      if (selectTableRows(rows, rule.selector).some((row) => row.clubId === club.id)) {
        return rule.targetCompetitionId
      }
    }

    if (rule.type === 'group-relegation' && rule.sourceCompetitionId === competitionId) {
      const rows = state.leagueTables[rule.sourceCompetitionId] ?? []
      if (selectTableRows(rows, rule.selector).some((row) => row.clubId === club.id)) {
        return rule.targetCompetitionIds[0]
      }
    }

    if (rule.type === 'internal-group-swap') {
      const sourceRows = state.leagueTables[rule.sourceCompetitionId] ?? []
      if (
        rule.sourceCompetitionId === competitionId &&
        selectTableRows(sourceRows, rule.sourceSelector).some((row) => row.clubId === club.id)
      ) {
        return rule.targetCompetitionId
      }
      const targetRows = state.leagueTables[rule.targetCompetitionId] ?? []
      if (
        rule.targetCompetitionId === competitionId &&
        selectTableRows(targetRows, rule.targetSelector).some((row) => row.clubId === club.id)
      ) {
        return rule.sourceCompetitionId
      }
    }

    if (rule.type === 'promotion-playoff' || rule.type === 'relegation-playoff') {
      const playoff = state.playoffs?.find(
        (candidate) => candidate.ruleId === rule.id && candidate.status === 'completed',
      )
      const winnerStage = playoff?.stages.find(
        (stage) => stage.id === rule.winnerStageId && stage.status === 'completed',
      )
      const tie = winnerStage?.ties.find(
        (candidate) =>
          candidate.winnerClubId === club.id || candidate.loserClubId === club.id,
      )
      if (!tie) continue
      return tie.winnerClubId === club.id ? rule.targetCompetitionId : rule.loserCompetitionId
    }
  }

  return undefined
}

const selectedClubMovement = (state: GameState) => {
  const club = selectedClub(state)
  if (!club) {
    return { promoted: false, relegated: false, promotedToTop: false, relegatedFromTop: false }
  }

  const sourceCompetitionId = getClubCompetitionId(club)
  const targetCompetitionId = transitionTargetForSelectedClub(state)
  if (!targetCompetitionId || targetCompetitionId === sourceCompetitionId) {
    return { promoted: false, relegated: false, promotedToTop: false, relegatedFromTop: false }
  }

  const config = getCountryCompetitionConfig(state.championshipId)
  const sourceLevel = config.competitions[sourceCompetitionId]?.level ?? club.divisionId
  const targetLevel = config.competitions[targetCompetitionId]?.level
  if (!targetLevel) {
    return { promoted: false, relegated: false, promotedToTop: false, relegatedFromTop: false }
  }

  return {
    promoted: targetLevel < sourceLevel,
    relegated: targetLevel > sourceLevel,
    promotedToTop: sourceLevel > 1 && targetLevel === 1,
    relegatedFromTop: sourceLevel === 1 && targetLevel > 1,
  }
}

const leagueWasUndefeated = (state: GameState): boolean =>
  playedUserMatches(state, 'league').every(
    (match) => (userMatchMargin(match, state.selectedClubId) ?? 0) >= 0,
  )

const lastFiveLeagueMatchesWereCleanSheets = (state: GameState): boolean => {
  const lastFive = playedUserMatches(state, 'league').slice(-5)
  return (
    lastFive.length >= 5 &&
    lastFive.every((match) => userGoalsAgainst(match, state.selectedClubId) === 0)
  )
}

const isRelegationCandidate = (state: GameState): boolean => {
  const club = selectedClub(state)
  if (!club || club.divisionId !== 1) return false

  const baseBudget = state.initialClubBudget ?? club.budget
  const strengthScore = club.rating + baseBudget / 2_000_000 - club.divisionId * 8
  return strengthScore < 92
}

export const getSeasonAchievementStats = (
  state: GameState,
  currentStats: AchievementAccountStats,
): Partial<AchievementAccountStats> => {
  const club = selectedClub(state)
  if (!club) return {}

  const position = getUserLeaguePosition(state)
  const leagueChampion = position === 1
  const cupChampion = state.cup.championClubId === club.id
  const movement = selectedClubMovement(state)
  const previousOutcome = currentStats.lastClubOutcomes[club.id]
  const previousRelegationStreak = currentStats.relegationStreakByClubId[club.id] ?? 0
  const nextRelegationStreak = movement.relegated ? previousRelegationStreak + 1 : 0
  const movementType: TopFlightMovement = movement.promotedToTop
    ? 'promoted-to-top'
    : movement.relegatedFromTop
      ? 'relegated-from-top'
      : 'none'
  const recentTopFlightMovements = [
    ...(currentStats.recentTopFlightMovementsByClubId[club.id] ?? []),
    movementType,
  ].slice(-5)
  const addClubId = (condition: boolean, ids: string[]): string[] =>
    condition ? uniqueStrings([...ids, club.id]) : ids

  return {
    leagueTitleChampionshipIds: leagueChampion
      ? (uniqueStrings([...currentStats.leagueTitleChampionshipIds, state.championshipId]) as ChampionshipId[])
      : currentStats.leagueTitleChampionshipIds,
    leagueTitlesByClubId: {
      ...currentStats.leagueTitlesByClubId,
      [club.id]: (currentStats.leagueTitlesByClubId[club.id] ?? 0) + (leagueChampion ? 1 : 0),
    },
    seasonsByClubId: {
      ...currentStats.seasonsByClubId,
      [club.id]: (currentStats.seasonsByClubId[club.id] ?? 0) + 1,
    },
    debutDoubleClubIds: addClubId(
      state.season === 1 && leagueChampion && cupChampion,
      currentStats.debutDoubleClubIds,
    ),
    undefeatedLeagueTitleClubIds: addClubId(
      leagueChampion && leagueWasUndefeated(state),
      currentStats.undefeatedLeagueTitleClubIds,
    ),
    lastFiveCleanSheetTitleClubIds: addClubId(
      leagueChampion && lastFiveLeagueMatchesWereCleanSheets(state),
      currentStats.lastFiveCleanSheetTitleClubIds,
    ),
    championThenRelegatedClubIds: addClubId(
      Boolean(previousOutcome?.leagueChampion) && movement.relegatedFromTop,
      currentStats.championThenRelegatedClubIds,
    ),
    relegationCandidateTitleClubIds: addClubId(
      leagueChampion && isRelegationCandidate(state),
      currentStats.relegationCandidateTitleClubIds,
    ),
    kaiserslauternClubIds: addClubId(
      leagueChampion &&
        club.divisionId === 1 &&
        previousOutcome?.promotedToTop === true &&
        previousOutcome.season === state.season - 1,
      currentStats.kaiserslauternClubIds,
    ),
    doubleRelegationClubIds: addClubId(
      nextRelegationStreak >= 2,
      currentStats.doubleRelegationClubIds,
    ),
    yoYoClubIds: addClubId(
      recentTopFlightMovements.filter((item) => item === 'promoted-to-top').length >= 2 &&
        recentTopFlightMovements.filter((item) => item === 'relegated-from-top').length >= 2,
      currentStats.yoYoClubIds,
    ),
    lastClubOutcomes: {
      ...currentStats.lastClubOutcomes,
      [club.id]: {
        season: state.season,
        leagueChampion,
        promotedToTop: movement.promotedToTop,
        relegated: movement.relegated,
        relegatedFromTop: movement.relegatedFromTop,
      },
    },
    relegationStreakByClubId: {
      ...currentStats.relegationStreakByClubId,
      [club.id]: nextRelegationStreak,
    },
    recentTopFlightMovementsByClubId: {
      ...currentStats.recentTopFlightMovementsByClubId,
      [club.id]: recentTopFlightMovements,
    },
  }
}

const mergeStringLists = (left: string[], right?: string[]): string[] =>
  uniqueStrings([...left, ...(right ?? [])])

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
    leagueTitleChampionshipIds: mergeStringLists(
      current.stats.leagueTitleChampionshipIds,
      nextStats.leagueTitleChampionshipIds,
    ) as ChampionshipId[],
    biggestWinMargin: Math.max(
      current.stats.biggestWinMargin,
      nextStats.biggestWinMargin ?? 0,
    ),
    cleanSheetWinStreak: Math.max(
      current.stats.cleanSheetWinStreak,
      nextStats.cleanSheetWinStreak ?? 0,
    ),
    debutDoubleClubIds: mergeStringLists(current.stats.debutDoubleClubIds, nextStats.debutDoubleClubIds),
    undefeatedLeagueTitleClubIds: mergeStringLists(
      current.stats.undefeatedLeagueTitleClubIds,
      nextStats.undefeatedLeagueTitleClubIds,
    ),
    lastFiveCleanSheetTitleClubIds: mergeStringLists(
      current.stats.lastFiveCleanSheetTitleClubIds,
      nextStats.lastFiveCleanSheetTitleClubIds,
    ),
    championThenRelegatedClubIds: mergeStringLists(
      current.stats.championThenRelegatedClubIds,
      nextStats.championThenRelegatedClubIds,
    ),
    relegationCandidateTitleClubIds: mergeStringLists(
      current.stats.relegationCandidateTitleClubIds,
      nextStats.relegationCandidateTitleClubIds,
    ),
    kaiserslauternClubIds: mergeStringLists(
      current.stats.kaiserslauternClubIds,
      nextStats.kaiserslauternClubIds,
    ),
    doubleRelegationClubIds: mergeStringLists(
      current.stats.doubleRelegationClubIds,
      nextStats.doubleRelegationClubIds,
    ),
    yoYoClubIds: mergeStringLists(current.stats.yoYoClubIds, nextStats.yoYoClubIds),
  })

  return {
    stats,
    unlockedIds: getUnlockedAchievementIds(stats, current.unlockedIds),
  }
}
