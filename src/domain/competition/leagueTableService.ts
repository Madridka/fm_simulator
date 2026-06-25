import { getClubCompetitionId, getMatchCompetitionId } from '@/domain/competition/competitionIdentity'
import type { Club, LeagueTableRow, Match } from '@/types/football'

const createEmptyRow = (
  clubId: string,
  divisionId: number,
  competitionId: string,
): LeagueTableRow => ({
  clubId,
  divisionId,
  competitionId,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
  position: 0,
})

const applyResultToRow = (row: LeagueTableRow, goalsFor: number, goalsAgainst: number): void => {
  row.played += 1
  row.goalsFor += goalsFor
  row.goalsAgainst += goalsAgainst
  row.goalDifference = row.goalsFor - row.goalsAgainst

  if (goalsFor > goalsAgainst) {
    row.wins += 1
    row.points += 3
  } else if (goalsFor === goalsAgainst) {
    row.draws += 1
    row.points += 1
  } else {
    row.losses += 1
  }
}

export const sortLeagueRows = (rows: readonly LeagueTableRow[]): LeagueTableRow[] => {
  return [...rows]
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points
      }
      if (right.goalDifference !== left.goalDifference) {
        return right.goalDifference - left.goalDifference
      }
      if (right.goalsFor !== left.goalsFor) {
        return right.goalsFor - left.goalsFor
      }
      if (right.wins !== left.wins) {
        return right.wins - left.wins
      }
      return left.clubId.localeCompare(right.clubId)
    })
    .map((row, index) => ({
      ...row,
      position: index + 1,
    }))
}

export const calculateLeagueTables = (
  clubs: readonly Club[],
  matches: readonly Match[],
): Record<string, LeagueTableRow[]> => {
  const tables: Record<string, LeagueTableRow[]> = {}
  const clubsById = new Map(clubs.map((club) => [club.id, club]))
  const clubsByCompetition = clubs.reduce<Record<string, Club[]>>((result, club) => {
    const competitionId = getClubCompetitionId(club)
    result[competitionId] = [...(result[competitionId] ?? []), club]
    return result
  }, {})
  const competitionIds = Object.keys(clubsByCompetition).sort(
    (left, right) =>
      Number(left.split(':')[0]) - Number(right.split(':')[0]) || left.localeCompare(right),
  )

  for (const competitionId of competitionIds) {
    const rows = new Map<string, LeagueTableRow>()
    const competitionClubs = clubsByCompetition[competitionId] ?? []

    competitionClubs.forEach((club) => {
      rows.set(club.id, createEmptyRow(club.id, club.divisionId, competitionId))
    })

    matches
      .filter(
        (match) =>
          match.type === 'league' &&
          getMatchCompetitionId(match, clubsById) === competitionId &&
          match.status === 'played' &&
          match.result,
      )
      .forEach((match) => {
        const homeRow = rows.get(match.homeClubId)
        const awayRow = rows.get(match.awayClubId)
        if (!homeRow || !awayRow || !match.result) {
          return
        }

        applyResultToRow(homeRow, match.result.homeGoals, match.result.awayGoals)
        applyResultToRow(awayRow, match.result.awayGoals, match.result.homeGoals)
      })

    tables[competitionId] = sortLeagueRows([...rows.values()])
  }

  return tables
}

export const getClubPosition = (
  tables: Record<string, LeagueTableRow[]>,
  clubId: string,
): LeagueTableRow | undefined => {
  return Object.values(tables)
    .flat()
    .find((row) => row.clubId === clubId)
}
