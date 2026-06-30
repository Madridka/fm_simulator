import type { CupCompetitionConfig, SeasonCalendarConfig, WeekDay } from '@/data/gameConfig/types'
import { getSeasonBounds, isInWinterBreak, toIsoDate } from '@/domain/schedule/calendarSlotResolver'

const DAY_MS = 86_400_000
const weekDays: readonly WeekDay[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

export const assignCupRoundDates = (
  roundIds: readonly string[],
  season: number,
  calendar: SeasonCalendarConfig,
  cup: CupCompetitionConfig,
): Record<string, string> => {
  const { start, leagueEnd } = getSeasonBounds(season, calendar)
  const cupEnd = new Date(leagueEnd.getTime() - 7 * DAY_MS)
  const candidates: string[] = []
  for (let date = new Date(start.getTime() + 21 * DAY_MS); date <= cupEnd; date = new Date(date.getTime() + DAY_MS)) {
    const day = date.getUTCDay()
    const weekDay = weekDays[day]
    if (weekDay && cup.preferredMatchDays.includes(weekDay) && !isInWinterBreak(date, season, calendar)) {
      candidates.push(toIsoDate(date))
    }
  }
  if (candidates.length < roundIds.length) throw new Error(`Cannot fit ${roundIds.length} cup rounds`)

  const dates = roundIds.map((_, index) => {
    if (roundIds.length === 1) return candidates.at(-1)!
    const sourceIndex = Math.round((index * (candidates.length - 1)) / (roundIds.length - 1))
    return candidates[sourceIndex]!
  })
  return Object.fromEntries(roundIds.map((roundId, index) => [roundId, dates[index]!]))
}
