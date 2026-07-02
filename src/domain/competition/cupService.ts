import { getCountryCompetitionConfig } from '@/data/gameConfig'
import type { CountryId, CupCompetitionConfig } from '@/data/gameConfig/types'
import { assignCupRoundDates } from '@/domain/schedule/cupScheduleGenerator'
import { getSeasonOrderFromDate } from '@/domain/schedule/calendarSlotResolver'
import { t } from '@/plugins/i18n/i18n'
import type { Club, CupRound, CupState, CupTie, Match } from '@/types/football'
import { isReserveClubId } from '@/data/reserveClubRelations'
import { createSeededRandom } from '@/utils/random'

export const cupRoundIds = [
  'preliminary',
  'round_of_128',
  'round_of_64',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'final',
] as const

const highestPowerOfTwoAtMost = (value: number): number => {
  let power = 1
  while (power * 2 <= value) power *= 2
  return power
}

const getRoundIdForBracketSize = (bracketSize: number): string => {
  if (bracketSize >= 128) return 'round_of_128'
  if (bracketSize >= 64) return 'round_of_64'
  if (bracketSize >= 32) return 'round_of_32'
  if (bracketSize >= 16) return 'round_of_16'
  if (bracketSize >= 8) return 'quarter_final'
  if (bracketSize >= 4) return 'semi_final'
  return 'final'
}

const getActiveRoundIds = (bracketSize: number, hasPreliminary: boolean): string[] => {
  const firstStandard = getRoundIdForBracketSize(bracketSize)
  const firstIndex = cupRoundIds.indexOf(firstStandard as (typeof cupRoundIds)[number])
  const standard = cupRoundIds.slice(Math.max(1, firstIndex))
  return hasPreliminary ? ['preliminary', ...standard] : [...standard]
}

const shuffle = <T>(items: readonly T[], seed: number): T[] => {
  const random = createSeededRandom(seed)
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = random.int(0, index)
    const current = result[index]
    const target = result[swapIndex]
    if (current !== undefined && target !== undefined) {
      result[index] = target
      result[swapIndex] = current
    }
  }
  return result
}

const createTie = (
  season: number,
  roundId: string,
  tieIndex: number,
  homeClubId: string,
  awayClubId: string,
): CupTie => ({
  id: `s${season}-cup-${roundId}-t${tieIndex + 1}`,
  matchId: `s${season}-cup-${roundId}-m${tieIndex + 1}`,
  homeClubId,
  awayClubId,
})

const createMatchFromTie = (
  season: number,
  countryId: CountryId,
  roundId: string,
  roundNumber: number,
  scheduledDate: string,
  tie: CupTie,
): Match => {
  if (!tie.matchId || !tie.homeClubId || !tie.awayClubId) {
    throw new Error('Cannot create a cup match without both clubs')
  }
  const calendar = getCountryCompetitionConfig(countryId).calendar
  return {
    id: tie.matchId,
    championshipId: countryId,
    season,
    type: 'cup',
    date: scheduledDate,
    kickoffTime: roundId === 'final' ? '18:00' : '19:45',
    order: getSeasonOrderFromDate(season, scheduledDate, calendar),
    round: roundNumber,
    roundNumber,
    cupRoundId: roundId,
    homeClubId: tie.homeClubId,
    awayClubId: tie.awayClubId,
    neutralVenue: roundId === 'final',
    status: 'scheduled',
  }
}

const createRound = (
  id: string,
  season: number,
  countryId: CountryId,
  participants: readonly string[],
  roundNumber: number,
  scheduledDate: string,
): { round: CupRound; matches: Match[] } => {
  const ties: CupTie[] = []
  const matches: Match[] = []
  for (let index = 0; index < participants.length; index += 2) {
    const homeClubId = participants[index]
    const awayClubId = participants[index + 1]
    if (!homeClubId || !awayClubId) throw new Error('Cup round requires an even number of participants')
    const tie = createTie(season, id, index / 2, homeClubId, awayClubId)
    ties.push(tie)
    matches.push(createMatchFromTie(season, countryId, id, roundNumber, scheduledDate, tie))
  }
  return {
    round: {
      id,
      name: `cup.roundNames.${id}`,
      order: roundNumber,
      scheduledDate,
      status: 'scheduled',
      byes: [],
      ties,
    },
    matches,
  }
}

const createEmptyRound = (id: string, order: number, scheduledDate: string): CupRound => ({
  id,
  name: `cup.roundNames.${id}`,
  order,
  scheduledDate,
  status: 'scheduled',
  byes: [],
  ties: [],
})

const getCupConfig = (countryId: CountryId, cupId?: string): CupCompetitionConfig => {
  const country = getCountryCompetitionConfig(countryId)
  const cup = cupId ? country.cups[cupId] : Object.values(country.cups)[0]
  if (!cup) throw new Error(`No cup config for ${countryId}`)
  return cup
}

export const initializeCup = (
  clubs: readonly Club[],
  season: number,
  countryId: CountryId = 'russia',
): { cup: CupState; matches: Match[] } => {
  const eligibleClubs = clubs.filter((club) => !isReserveClubId(club.id))
  const bracketSize = highestPowerOfTwoAtMost(eligibleClubs.length)
  const playInTeamsCount = (eligibleClubs.length - bracketSize) * 2
  const hasPreliminary = playInTeamsCount > 0
  const activeRoundIds = getActiveRoundIds(bracketSize, hasPreliminary)
  const cupConfig = getCupConfig(countryId)
  const country = getCountryCompetitionConfig(countryId)
  const dates = assignCupRoundDates(activeRoundIds, season, country.calendar, cupConfig)
  const sortedClubs = [...eligibleClubs].sort((left, right) =>
    right.divisionId - left.divisionId || left.rating - right.rating || left.id.localeCompare(right.id),
  )
  const initialClubIds = hasPreliminary
    ? sortedClubs.slice(0, playInTeamsCount).map((club) => club.id)
    : sortedClubs.map((club) => club.id)
  const byes = hasPreliminary
    ? sortedClubs.slice(playInTeamsCount).map((club) => club.id)
    : []
  const initialRoundId = activeRoundIds[0]
  if (!initialRoundId) throw new Error('A cup requires at least one round')
  const initial = createRound(
    initialRoundId,
    season,
    countryId,
    shuffle(initialClubIds, season * 101 + 7),
    1,
    dates[initialRoundId]!,
  )
  const rounds = activeRoundIds.map((roundId, index) =>
    createEmptyRound(roundId, index + 1, dates[roundId]!),
  )
  rounds[0] = { ...initial.round, byes }
  return {
    cup: { season, countryId, cupId: cupConfig.id, rounds },
    matches: initial.matches,
  }
}

const getCupMatchWinner = (match: Match): string | undefined =>
  match.result?.winnerClubId ?? match.result?.penaltyWinnerClubId

const isRoundCompleted = (round: CupRound, matches: readonly Match[]): boolean =>
  round.ties.length > 0 && round.ties.every((tie) => {
    if (tie.winnerClubId) return true
    const match = tie.matchId ? matches.find((candidate) => candidate.id === tie.matchId) : undefined
    return Boolean(match && match.status === 'played' && getCupMatchWinner(match))
  })

export const advanceCupIfPossible = (
  cup: CupState,
  matches: readonly Match[],
): { cup: CupState; newMatches: Match[]; completedRoundId?: string } => {
  const rounds = cup.rounds.map((round) => ({ ...round, byes: [...round.byes], ties: round.ties.map((tie) => ({ ...tie })) }))
  const currentRoundIndex = rounds.findIndex((round) => round.status === 'scheduled' && round.ties.length > 0)
  if (currentRoundIndex === -1) return { cup: { ...cup, rounds }, newMatches: [] }
  const currentRound = rounds[currentRoundIndex]
  if (!currentRound || !isRoundCompleted(currentRound, matches)) return { cup: { ...cup, rounds }, newMatches: [] }

  const winners = currentRound.ties.map((tie) => {
    const match = tie.matchId ? matches.find((candidate) => candidate.id === tie.matchId) : undefined
    const winner = match ? getCupMatchWinner(match) : tie.winnerClubId
    if (!winner) throw new Error(`Completed cup tie ${tie.id} has no winner`)
    tie.winnerClubId = winner
    return winner
  })
  currentRound.status = 'completed'
  if (currentRound.id === 'final') {
    return { cup: { ...cup, championClubId: winners[0], rounds }, newMatches: [], completedRoundId: currentRound.id }
  }

  const nextRound = rounds[currentRoundIndex + 1]
  if (!nextRound?.scheduledDate) return { cup: { ...cup, rounds }, newMatches: [], completedRoundId: currentRound.id }
  const countryId = cup.countryId ?? 'russia'
  const participants = shuffle([...winners, ...currentRound.byes], cup.season * 313 + currentRoundIndex * 19)
  const created = createRound(nextRound.id, cup.season, countryId, participants, currentRoundIndex + 2, nextRound.scheduledDate)
  rounds[currentRoundIndex + 1] = created.round
  return { cup: { ...cup, rounds }, newMatches: created.matches, completedRoundId: currentRound.id }
}

export const getCupRoundForMatch = (cup: CupState, matchId: string): CupRound | undefined =>
  cup.rounds.find((round) => round.ties.some((tie) => tie.matchId === matchId))

export const getClubCupProgress = (cup: CupState, clubId: string): string => {
  if (cup.championClubId === clubId) return t('cup.progress.winner')
  const latestRound = [...cup.rounds].reverse().find((round) =>
    round.byes.includes(clubId) || round.ties.some((tie) =>
      tie.homeClubId === clubId || tie.awayClubId === clubId || tie.winnerClubId === clubId,
    ),
  )
  if (!latestRound) return t('cup.progress.notStarted')
  const tie = latestRound.ties.find((candidate) => candidate.homeClubId === clubId || candidate.awayClubId === clubId)
  const roundName = t(latestRound.name)
  if (tie?.winnerClubId && tie.winnerClubId !== clubId) return t('cup.progress.eliminated', { round: roundName })
  return latestRound.status === 'completed' ? t('cup.progress.advanced', { round: roundName }) : roundName
}
