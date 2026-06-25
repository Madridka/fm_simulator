import type { Club, Match } from '@/types/football'

export type CompetitionId = string

export interface ChampionshipCompetitionNames {
  id?: string
  divisionNames: Record<number, string>
  competitionNames?: Record<string, string>
}

const russianCompetitionNames: Record<string, string> = {
  '1': '\u041c\u0418\u0420 \u0420\u043e\u0441\u0441\u0438\u0439\u0441\u043a\u0430\u044f \u041f\u0440\u0435\u043c\u044c\u0435\u0440-\u041b\u0438\u0433\u0430',
  '2': 'PARI \u041f\u0435\u0440\u0432\u0430\u044f \u043b\u0438\u0433\u0430',
  '3:gold': 'LEON \u0412\u0442\u043e\u0440\u0430\u044f \u043b\u0438\u0433\u0430, \u0414\u0438\u0432\u0438\u0437\u0438\u043e\u043d \u0410 - \u0413\u0440\u0443\u043f\u043f\u0430 \u00ab\u0417\u043e\u043b\u043e\u0442\u043e\u00bb',
  '3:silver': 'LEON \u0412\u0442\u043e\u0440\u0430\u044f \u043b\u0438\u0433\u0430, \u0414\u0438\u0432\u0438\u0437\u0438\u043e\u043d \u0410 - \u0413\u0440\u0443\u043f\u043f\u0430 \u00ab\u0421\u0435\u0440\u0435\u0431\u0440\u043e\u00bb',
  '4:group-1': 'LEON \u0412\u0442\u043e\u0440\u0430\u044f \u043b\u0438\u0433\u0430, \u0414\u0438\u0432\u0438\u0437\u0438\u043e\u043d \u0411 - \u0413\u0440\u0443\u043f\u043f\u0430 1',
  '4:group-2': 'LEON \u0412\u0442\u043e\u0440\u0430\u044f \u043b\u0438\u0433\u0430, \u0414\u0438\u0432\u0438\u0437\u0438\u043e\u043d \u0411 - \u0413\u0440\u0443\u043f\u043f\u0430 2',
  '4:group-3': 'LEON \u0412\u0442\u043e\u0440\u0430\u044f \u043b\u0438\u0433\u0430, \u0414\u0438\u0432\u0438\u0437\u0438\u043e\u043d \u0411 - \u0413\u0440\u0443\u043f\u043f\u0430 3',
  '4:group-4': 'LEON \u0412\u0442\u043e\u0440\u0430\u044f \u043b\u0438\u0433\u0430, \u0414\u0438\u0432\u0438\u0437\u0438\u043e\u043d \u0411 - \u0413\u0440\u0443\u043f\u043f\u0430 4',
}

export const getClubCompetitionId = (
  club: Pick<Club, 'divisionId' | 'groupId'>,
): CompetitionId => (club.groupId ? `${club.divisionId}:${club.groupId}` : String(club.divisionId))

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
