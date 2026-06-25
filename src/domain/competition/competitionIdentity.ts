import { championshipTranslations } from '@/i18n/championships'
import type { Club, Match } from '@/types/football'

export type CompetitionId = string

export interface ChampionshipCompetitionNames {
  id?: string
  divisionNames: Record<number, string>
  competitionNames?: Record<string, string>
}

const russianCompetitionNames = championshipTranslations.russia.competitionNames

export const getClubCompetitionId = (club: Pick<Club, 'divisionId' | 'groupId'>): CompetitionId =>
  club.groupId ? `${club.divisionId}:${club.groupId}` : String(club.divisionId)

export const getMatchCompetitionId = (
  match: Pick<Match, 'competitionId' | 'divisionId' | 'homeClubId'>,
  clubsById?: ReadonlyMap<string, Club>,
): CompetitionId => {
  if (match.competitionId) {
    return match.competitionId
  }

  const homeClub = clubsById?.get(match.homeClubId)
  if (homeClub) {
    return getClubCompetitionId(homeClub)
  }

  return String(match.divisionId ?? 1)
}

export const getCompetitionNames = (
  championship: ChampionshipCompetitionNames,
): Record<string, string> => {
  if (championship.id === 'russia') {
    return russianCompetitionNames
  }

  return (
    championship.competitionNames ??
    Object.fromEntries(
      Object.entries(championship.divisionNames).map(([divisionId, name]) => [divisionId, name]),
    )
  )
}

export const getCompetitionName = (
  championship: ChampionshipCompetitionNames | undefined,
  competitionId: CompetitionId,
): string => {
  if (!championship) {
    return `Competition ${competitionId}`
  }

  const competitionName = getCompetitionNames(championship)[competitionId]
  if (competitionName) {
    return competitionName
  }

  const divisionId = Number(competitionId.split(':')[0])
  return championship.divisionNames[divisionId] ?? `Competition ${competitionId}`
}
