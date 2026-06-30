import { countryCompetitionConfigs, findCompetitionConfig } from '@/data/gameConfig'
import { getClubCompetitionId, resolveLegacyCompetitionId } from '@/domain/competition/competitionIdentity'
import type { ChampionshipId, Club, Match } from '@/types/football'

interface MigratableSave {
  configVersion?: number
  championshipId?: ChampionshipId
  selectedClubId: string
  clubs: Club[]
  matches: Match[]
}

const inferCountryId = (clubs: readonly Club[], selectedClubId: string): ChampionshipId => {
  const selected = clubs.find((club) => club.id === selectedClubId)
  const leagueId = selected?.leagueId
  for (const config of Object.values(countryCompetitionConfigs)) {
    if (Object.values(config.competitions).some((competition) => competition.legacyLeagueId === leagueId)) {
      return config.countryId
    }
  }
  return 'russia'
}

export const migrateSaveToCompetitionConfigV2 = <T extends MigratableSave>(source: T): T & {
  configVersion: 2
  championshipId: ChampionshipId
} => {
  const championshipId = source.championshipId ?? inferCountryId(source.clubs, source.selectedClubId)
  const clubs = source.clubs.map((club) => ({
    ...club,
    competitionId:
      (club.competitionId && findCompetitionConfig(club.competitionId)
        ? club.competitionId
        : resolveLegacyCompetitionId(club.leagueId, club.groupId, club.divisionId)),
    squad: club.squad.map((player) => ({ ...player })),
  }))
  const clubsById = new Map(clubs.map((club) => [club.id, club]))
  const matches = source.matches.map((match) => {
    if (match.type !== 'league') return { ...match, roundNumber: match.roundNumber ?? match.round }
    const homeClub = clubsById.get(match.homeClubId)
    return {
      ...match,
      competitionId:
        match.competitionId && findCompetitionConfig(match.competitionId)
          ? match.competitionId
          : homeClub
            ? getClubCompetitionId(homeClub)
            : String(match.divisionId ?? 1),
      roundNumber: match.roundNumber ?? match.round,
    }
  })

  return {
    ...source,
    configVersion: 2,
    championshipId,
    clubs,
    matches,
  }
}
