import type {
  ScheduleConflictResolution,
  SeasonCalendarConfig,
  WeekDay,
} from '@/data/gameConfig/types'
import type { Match } from '@/types/football'

const DAY_MS = 86_400_000
const seasonBaseYear = 2026
const weekDayByIndex: readonly WeekDay[] = [
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
]

export const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)
const parseDate = (value: string): Date => new Date(`${value}T12:00:00Z`)
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS)
const dayDifference = (left: string, right: string): number =>
  Math.abs(Math.round((parseDate(left).getTime() - parseDate(right).getTime()) / DAY_MS))

export const getSeasonStartYear = (season: number): number => seasonBaseYear + season - 1

export const getSeasonBounds = (
  season: number,
  calendar: SeasonCalendarConfig,
): { start: Date; leagueEnd: Date; end: Date } => {
  const startYear = getSeasonStartYear(season)
  return {
    start: new Date(Date.UTC(startYear, calendar.startMonth - 1, calendar.startDay, 12)),
    leagueEnd: new Date(Date.UTC(startYear + 1, calendar.leagueEndMonth - 1, calendar.leagueEndDay, 12)),
    end: new Date(Date.UTC(startYear + 1, calendar.endMonth - 1, calendar.endDay, 12)),
  }
}

export const isInWinterBreak = (
  date: Date,
  season: number,
  calendar: SeasonCalendarConfig,
): boolean => {
  const startYear = getSeasonStartYear(season)
  return calendar.winterBreaks.some((template) => {
    const startsInFirstYear = template.startMonth >= calendar.startMonth
    const breakStartYear = startsInFirstYear ? startYear : startYear + 1
    const crossesYear = template.endMonth < template.startMonth
    const breakEndYear = crossesYear ? breakStartYear + 1 : breakStartYear
    const start = new Date(Date.UTC(breakStartYear, template.startMonth - 1, template.startDay, 12))
    const end = new Date(Date.UTC(breakEndYear, template.endMonth - 1, template.endDay, 12))
    return date >= start && date <= end
  })
}

const datesForDays = (
  season: number,
  calendar: SeasonCalendarConfig,
  allowedDays: readonly WeekDay[],
  throughLeagueEnd: boolean,
): string[] => {
  const { start, leagueEnd, end } = getSeasonBounds(season, calendar)
  const limit = throughLeagueEnd ? leagueEnd : end
  const allowed = new Set(allowedDays)
  const result: string[] = []
  for (let date = start; date <= limit; date = addDays(date, 1)) {
    const weekDay = weekDayByIndex[date.getUTCDay()]
    if (weekDay && allowed.has(weekDay) && !isInWinterBreak(date, season, calendar)) {
      result.push(toIsoDate(date))
    }
  }
  return result
}

const evenlySelect = (values: readonly string[], count: number): string[] => {
  if (count <= 0) return []
  if (count >= values.length) return [...values]
  if (count === 1) return values[0] ? [values[0]] : []
  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = Math.round((index * (values.length - 1)) / (count - 1))
    return values[sourceIndex]!
  })
}

export const assignLeagueRoundDates = (
  roundsCount: number,
  season: number,
  calendar: SeasonCalendarConfig,
): string[] => {
  const weekendDates = datesForDays(season, calendar, [calendar.preferredMatchDay], true)
  if (roundsCount <= weekendDates.length) return evenlySelect(weekendDates, roundsCount)

  const preferredMidweekDay = calendar.midweekMatchDays.includes('WEDNESDAY')
    ? 'WEDNESDAY'
    : calendar.midweekMatchDays[0]
  if (!preferredMidweekDay) throw new Error('A calendar must define a midweek match day')
  const midweekDates = datesForDays(season, calendar, [preferredMidweekDay], true)
  const requiredMidweeks = roundsCount - weekendDates.length
  const selectedMidweeks = evenlySelect(midweekDates, requiredMidweeks)
  const result = [...weekendDates, ...selectedMidweeks].sort()
  if (result.length < roundsCount) throw new Error(`Cannot fit ${roundsCount} rounds into season ${season}`)
  return result
}

export const spreadRoundAcrossMatchDays = (
  anchorDate: string,
  matchesCount: number,
  season: number,
  calendar: SeasonCalendarConfig,
): string[] => {
  const anchor = parseDate(anchorDate)
  const { start, leagueEnd } = getSeasonBounds(season, calendar)
  const anchorWeekDay = weekDayByIndex[anchor.getUTCDay()]
  const allowedDays = calendar.midweekMatchDays.includes(anchorWeekDay!)
    ? calendar.midweekMatchDays
    : calendar.weekendMatchDays
  const candidates = Array.from({ length: 7 }, (_, offset) => addDays(anchor, offset - 2))
    .filter((date) => allowedDays.includes(weekDayByIndex[date.getUTCDay()]!))
    .filter((date) => date >= start && date <= leagueEnd)
    .filter((date) => !isInWinterBreak(date, season, calendar))
    .map(toIsoDate)
    .sort()
  if (!candidates.length) return Array(matchesCount).fill(anchorDate) as string[]
  return Array.from({ length: matchesCount }, (_, index) => candidates[index % candidates.length]!)
}

export const getSeasonOrderFromDate = (
  season: number,
  date: string,
  calendar: SeasonCalendarConfig,
): number => {
  const { start } = getSeasonBounds(season, calendar)
  return Math.max(1, Math.floor((parseDate(date).getTime() - start.getTime()) / DAY_MS) + 1)
}

const conflictReason = (match: Match, other: Match | undefined): ScheduleConflictResolution['reason'] => {
  if (match.type === 'cup' || other?.type === 'cup') return 'cup-conflict'
  if (match.type === 'playoff' || other?.type === 'playoff') return 'playoff-conflict'
  return other?.date === match.date ? 'same-day-match' : 'minimum-rest'
}

export const resolveScheduleConflicts = (
  matches: readonly Match[],
  season: number,
  calendar: SeasonCalendarConfig,
): { matches: Match[]; resolutions: ScheduleConflictResolution[] } => {
  const priority = (match: Match): number => match.type === 'cup' ? calendar.cupPriority : match.type === 'playoff' ? calendar.cupPriority - 1 : calendar.leaguePriority
  const ordered = [...matches].sort((left, right) =>
    priority(right) - priority(left) || left.date.localeCompare(right.date) || left.id.localeCompare(right.id),
  )
  const scheduled: Match[] = []
  const resolutions: ScheduleConflictResolution[] = []
  const { end } = getSeasonBounds(season, calendar)

  for (const source of ordered) {
    if (source.status === 'played') {
      scheduled.push({ ...source })
      continue
    }
    const originalDate = source.date
    let candidateDate = originalDate
    let reason: ScheduleConflictResolution['reason'] | undefined
    for (let offset = 0; offset <= 35; offset += 1) {
      const date = addDays(parseDate(originalDate), offset)
      if (date > end) break
      const weekDay = weekDayByIndex[date.getUTCDay()]!
      const allowedDays = source.type === 'league'
        ? [...calendar.weekendMatchDays, ...calendar.midweekMatchDays]
        : source.type === 'cup'
          ? calendar.midweekMatchDays
          : [...calendar.midweekMatchDays, ...calendar.weekendMatchDays]
      if (!allowedDays.includes(weekDay)) continue
      if (isInWinterBreak(date, season, calendar)) {
        reason ??= 'winter-break'
        continue
      }
      const isoDate = toIsoDate(date)
      const conflicting = scheduled.find((other) =>
        [source.homeClubId, source.awayClubId].some((clubId) =>
          (other.homeClubId === clubId || other.awayClubId === clubId) &&
          dayDifference(other.date, isoDate) <= calendar.minimumRestDays,
        ),
      )
      if (conflicting) {
        reason ??= conflictReason({ ...source, date: isoDate }, conflicting)
        continue
      }
      candidateDate = isoDate
      break
    }

    const resolved = {
      ...source,
      date: candidateDate,
      order: getSeasonOrderFromDate(season, candidateDate, calendar),
    }
    scheduled.push(resolved)
    if (candidateDate !== originalDate) {
      resolutions.push({ matchId: source.id, originalDate, resolvedDate: candidateDate, reason: reason ?? 'minimum-rest' })
    }
  }

  return { matches: scheduled.sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id)), resolutions }
}
