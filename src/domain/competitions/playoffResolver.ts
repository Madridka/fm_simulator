import type {
  CountryCompetitionConfig,
  PlayoffParticipantSource,
  PlayoffStageConfig,
  PlayoffStageState,
  PlayoffState,
  PlayoffTieState,
  PlayoffTransitionRule,
} from '@/data/gameConfig/types'
import { selectTableRows } from '@/domain/competitions/selectors'
import { getSeasonBounds, getSeasonOrderFromDate, toIsoDate } from '@/domain/schedule/calendarSlotResolver'
import type { LeagueTableRow, Match } from '@/types/football'

const DAY_MS = 86_400_000

export const getPlayoffRules = (config: CountryCompetitionConfig): PlayoffTransitionRule[] => {
  const rules = Object.values(config.competitions)
    .flatMap((competition) => competition.transitions.rules)
    .filter((rule): rule is PlayoffTransitionRule =>
      rule.type === 'promotion-playoff' || rule.type === 'relegation-playoff',
    )
  return [...new Map(rules.map((rule) => [rule.id, rule])).values()]
}

const resolveParticipant = (
  source: PlayoffParticipantSource,
  tables: Readonly<Record<string, readonly LeagueTableRow[]>>,
  completedStages: readonly PlayoffStageState[],
): string | undefined => {
  if (source.type === 'table') {
    return selectTableRows(tables[source.competitionId] ?? [], source.selector)[0]?.clubId
  }
  const tie = completedStages.find((stage) => stage.id === source.stageId)?.ties[source.tieIndex]
  return source.outcome === 'winner' ? tie?.winnerClubId : tie?.loserClubId
}

const getStageDates = (
  rule: PlayoffTransitionRule,
  stage: PlayoffStageConfig,
  season: number,
  config: CountryCompetitionConfig,
): string[] => {
  const matchesBefore = rule.stages
    .slice(0, rule.stages.findIndex((candidate) => candidate.id === stage.id))
    .reduce((count, candidate) => count + (candidate.format === 'two-leg' ? 2 : 1), 0)
  const totalDates = rule.stages.reduce(
    (count, candidate) => count + (candidate.format === 'two-leg' ? 2 : 1),
    0,
  )
  const datesCount = stage.format === 'two-leg' ? 2 : 1
  const { end } = getSeasonBounds(season, config.calendar)
  return Array.from({ length: datesCount }, (_, index) => {
    const reverseIndex = totalDates - matchesBefore - index - 1
    return toIsoDate(new Date(end.getTime() - reverseIndex * 3 * DAY_MS))
  })
}

const createStage = (
  rule: PlayoffTransitionRule,
  stage: PlayoffStageConfig,
  tables: Readonly<Record<string, readonly LeagueTableRow[]>>,
  completedStages: readonly PlayoffStageState[],
  season: number,
  config: CountryCompetitionConfig,
): { stage: PlayoffStageState; matches: Match[] } | undefined => {
  const dates = getStageDates(rule, stage, season, config)
  const ties: PlayoffTieState[] = []
  const matches: Match[] = []

  for (let tieIndex = 0; tieIndex < stage.ties.length; tieIndex += 1) {
    const tieConfig = stage.ties[tieIndex]
    if (!tieConfig) continue
    const homeClubId = resolveParticipant(tieConfig.home, tables, completedStages)
    const awayClubId = resolveParticipant(tieConfig.away, tables, completedStages)
    if (!homeClubId || !awayClubId) return undefined
    const tieId = `${rule.id}-${stage.id}-${tieIndex + 1}`
    const matchIds: string[] = []
    const legs = stage.format === 'two-leg' ? 2 : 1

    for (let legIndex = 0; legIndex < legs; legIndex += 1) {
      const leg = (legIndex + 1) as 1 | 2
      const reverse = leg === 2
      const date = dates[legIndex]!
      const matchId = `s${season}-${tieId}-leg-${leg}`
      matchIds.push(matchId)
      matches.push({
        id: matchId,
        championshipId: config.countryId,
        season,
        type: 'playoff',
        date,
        kickoffTime: '19:00',
        order: getSeasonOrderFromDate(season, date, config.calendar),
        round: stage.id === rule.winnerStageId ? rule.stages.length : rule.stages.findIndex((candidate) => candidate.id === stage.id) + 1,
        roundNumber: rule.stages.findIndex((candidate) => candidate.id === stage.id) + 1,
        playoffId: rule.id,
        playoffStageId: stage.id,
        playoffTieId: tieId,
        leg,
        homeClubId: reverse ? awayClubId : homeClubId,
        awayClubId: reverse ? homeClubId : awayClubId,
        neutralVenue: Boolean(stage.neutralVenue),
        status: 'scheduled',
      })
    }
    ties.push({ id: tieId, stageId: stage.id, tieIndex, status: 'scheduled', homeClubId, awayClubId, matchIds })
  }

  return { stage: { id: stage.id, status: 'scheduled', ties }, matches }
}

const getTableRow = (
  clubId: string,
  tables: Readonly<Record<string, readonly LeagueTableRow[]>>,
): LeagueTableRow | undefined => Object.values(tables).flat().find((row) => row.clubId === clubId)

export const initializeCompetitionPlayoffs = (
  config: CountryCompetitionConfig,
  tables: Readonly<Record<string, readonly LeagueTableRow[]>>,
  season: number,
): { playoffs: PlayoffState[]; matches: Match[] } => {
  const playoffs: PlayoffState[] = []
  const matches: Match[] = []

  for (const rule of getPlayoffRules(config)) {
    const firstStageConfig = rule.stages[0]
    if (!firstStageConfig) continue
    const created = createStage(rule, firstStageConfig, tables, [], season, config)
    if (!created) continue

    if (rule.maximumPointsGapForPlayout !== undefined && created.stage.ties.length === 1) {
      const tie = created.stage.ties[0]!
      const homeRow = getTableRow(tie.homeClubId, tables)
      const awayRow = getTableRow(tie.awayClubId, tables)
      if (homeRow && awayRow && Math.abs(homeRow.points - awayRow.points) > rule.maximumPointsGapForPlayout) {
        const winnerClubId = homeRow.points >= awayRow.points ? homeRow.clubId : awayRow.clubId
        const loserClubId = winnerClubId === tie.homeClubId ? tie.awayClubId : tie.homeClubId
        const completedTie = { ...tie, status: 'completed' as const, matchIds: [], winnerClubId, loserClubId }
        playoffs.push({ id: rule.id, ruleId: rule.id, status: 'completed', stages: [{ id: firstStageConfig.id, status: 'completed', ties: [completedTie] }] })
        continue
      }
    }

    playoffs.push({ id: rule.id, ruleId: rule.id, status: 'scheduled', stages: [created.stage] })
    matches.push(...created.matches)
  }
  return { playoffs, matches }
}

const resolveTie = (tie: PlayoffTieState, matches: readonly Match[]): PlayoffTieState => {
  const tieMatches = tie.matchIds.map((matchId) => matches.find((match) => match.id === matchId))
  if (tieMatches.some((match) => !match || match.status !== 'played' || !match.result)) {
    return {
      ...tie,
      status: tieMatches[0]?.status === 'played' ? 'first-leg-played' : 'scheduled',
    }
  }
  let homeAggregate = 0
  let awayAggregate = 0
  tieMatches.forEach((match) => {
    if (!match?.result) return
    if (match.homeClubId === tie.homeClubId) {
      homeAggregate += match.result.homeGoals
      awayAggregate += match.result.awayGoals
    } else {
      homeAggregate += match.result.awayGoals
      awayAggregate += match.result.homeGoals
    }
  })
  const lastResult = tieMatches.at(-1)?.result
  const winnerClubId = homeAggregate > awayAggregate
    ? tie.homeClubId
    : awayAggregate > homeAggregate
      ? tie.awayClubId
      : lastResult?.penaltyWinnerClubId ?? lastResult?.winnerClubId
  if (!winnerClubId) throw new Error(`Completed playoff tie ${tie.id} has no winner`)
  return {
    ...tie,
    status: 'completed',
    winnerClubId,
    loserClubId: winnerClubId === tie.homeClubId ? tie.awayClubId : tie.homeClubId,
  }
}

export const advanceCompetitionPlayoffs = (
  playoffs: readonly PlayoffState[],
  matches: readonly Match[],
  tables: Readonly<Record<string, readonly LeagueTableRow[]>>,
  config: CountryCompetitionConfig,
  season: number,
): { playoffs: PlayoffState[]; newMatches: Match[] } => {
  const rules = new Map(getPlayoffRules(config).map((rule) => [rule.id, rule]))
  const newMatches: Match[] = []
  const nextPlayoffs = playoffs.map((source) => {
    if (source.status === 'completed') return source
    const rule = rules.get(source.ruleId)
    if (!rule) throw new Error(`Unknown playoff rule ${source.ruleId}`)
    const stages = source.stages.map((stage) => ({ ...stage, ties: stage.ties.map((tie) => ({ ...tie })) }))
    const activeStage = stages.find((stage) => stage.status !== 'completed')
    if (!activeStage) return { ...source, status: 'completed' as const, stages }
    activeStage.ties = activeStage.ties.map((tie) => resolveTie(tie, matches))
    activeStage.status = activeStage.ties.every((tie) => tie.status === 'completed')
      ? 'completed'
      : activeStage.ties.some((tie) => tie.status === 'first-leg-played')
        ? 'first-leg-played'
        : 'scheduled'
    if (activeStage.status !== 'completed') return { ...source, status: activeStage.status, stages }

    const nextStageConfig = rule.stages[stages.length]
    if (!nextStageConfig) return { ...source, status: 'completed' as const, stages }
    const created = createStage(rule, nextStageConfig, tables, stages, season, config)
    if (!created) throw new Error(`Cannot resolve participants for playoff stage ${nextStageConfig.id}`)
    stages.push(created.stage)
    newMatches.push(...created.matches)
    return { ...source, status: 'scheduled' as const, stages }
  })

  return { playoffs: nextPlayoffs, newMatches }
}
