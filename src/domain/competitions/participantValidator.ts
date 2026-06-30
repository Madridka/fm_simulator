import type { CountryCompetitionConfig } from '@/data/gameConfig/types'
import { getClubCompetitionId } from '@/domain/competition/competitionIdentity'
import type { Club } from '@/types/football'

export const validateCompetitionParticipants = (
  clubs: readonly Club[],
  config: CountryCompetitionConfig,
  expectedClubIds: ReadonlySet<string> = new Set(clubs.map((club) => club.id)),
  expectedCounts?: Readonly<Record<string, number>>,
): void => {
  const problems: string[] = []
  const seenIds = new Set<string>()
  const duplicateIds = new Set<string>()
  const counts: Record<string, number> = {}

  for (const club of clubs) {
    if (seenIds.has(club.id)) duplicateIds.add(club.id)
    seenIds.add(club.id)
    const competitionId = getClubCompetitionId(club)
    const competition = config.competitions[competitionId]
    counts[competitionId] = (counts[competitionId] ?? 0) + 1

    if (!competition) {
      problems.push(`${club.id}: unknown competition ${competitionId}`)
      continue
    }
    if (club.leagueId !== competition.legacyLeagueId) {
      problems.push(`${club.id}: leagueId ${club.leagueId ?? '-'} != ${competition.legacyLeagueId}`)
    }
    if ((club.groupId ?? undefined) !== (competition.legacyGroupId ?? undefined)) {
      problems.push(`${club.id}: invalid groupId ${club.groupId ?? '-'}`)
    }
  }

  const missing = [...expectedClubIds].filter((clubId) => !seenIds.has(clubId))
  const unexpected = [...seenIds].filter((clubId) => !expectedClubIds.has(clubId))
  if (duplicateIds.size) problems.push(`duplicate clubs: ${[...duplicateIds].join(', ')}`)
  if (missing.length) problems.push(`missing clubs: ${missing.join(', ')}`)
  if (unexpected.length) problems.push(`unexpected clubs: ${unexpected.join(', ')}`)

  if (expectedCounts) {
    for (const competitionId of Object.keys(config.competitions)) {
      const expected = expectedCounts[competitionId] ?? 0
      const actual = counts[competitionId] ?? 0
      if (actual !== expected) problems.push(`${competitionId}: expected ${expected}, received ${actual}`)
    }
  }

  if (problems.length) {
    throw new Error(`Competition participant validation failed for ${config.countryId}: ${problems.join('; ')}`)
  }
}
