import { getCountryCompetitionConfig } from '@/data/gameConfig'
import type { CountryId } from '@/data/gameConfig/types'
import {
  generateLeagueRoundPairings,
  generateLeagueSchedule as generateConfiguredLeagueSchedule,
} from '@/domain/schedule/leagueScheduleGenerator'
import { assignLeagueRoundDates } from '@/domain/schedule/calendarSlotResolver'
import type { Club, Match } from '@/types/football'

// Compatibility aliases retained while callers migrate to the schedule domain.
export const generateDivisionPairings = generateLeagueRoundPairings

export const getSeasonMatchDate = (
  season: number,
  order: number,
  countryId: CountryId = 'england',
): string => {
  const calendar = getCountryCompetitionConfig(countryId).calendar
  return assignLeagueRoundDates(order, season, calendar)[order - 1]!
}

export const generateLeagueSchedule = (
  clubs: readonly Club[],
  season: number,
  countryId: CountryId = 'russia',
): Match[] => generateConfiguredLeagueSchedule(clubs, season, countryId)
