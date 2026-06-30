import { getPositionReward } from '@/data/gameConfig/economy'
import type {
  CountryCompetitionConfig,
  PlayoffState,
  PlayoffTransitionRule,
  TransitionRule,
} from '@/data/gameConfig/types'
import { getClubCompetitionId } from '@/domain/competition/competitionIdentity'
import { selectTableRows } from '@/domain/competitions/selectors'
import { validateCompetitionParticipants } from '@/domain/competitions/participantValidator'
import type { Club, LeagueTableRow } from '@/types/football'

interface Movement {
  clubId: string
  targetCompetitionId: string
  promoted: boolean
}

const getRules = (config: CountryCompetitionConfig): TransitionRule[] => {
  const rules = Object.values(config.competitions).flatMap((competition) => competition.transitions.rules)
  return [...new Map(rules.map((rule) => [rule.id, rule])).values()]
}

const playoffMovements = (
  rule: PlayoffTransitionRule,
  playoffs: readonly PlayoffState[],
  config: CountryCompetitionConfig,
): Movement[] => {
  const playoff = playoffs.find((candidate) => candidate.ruleId === rule.id)
  if (!playoff || playoff.status !== 'completed') {
    throw new Error(`Playoff ${rule.id} must be completed before movements are applied`)
  }
  const stage = playoff.stages.find((candidate) => candidate.id === rule.winnerStageId)
  if (!stage || stage.status !== 'completed') throw new Error(`Playoff stage ${rule.winnerStageId} is incomplete`)

  return stage.ties.flatMap((tie) => {
    if (!tie.winnerClubId || !tie.loserClubId) throw new Error(`Playoff tie ${tie.id} has no result`)
    const winnerSource = Object.values(config.competitions).find((competition) =>
      competition.id === rule.targetCompetitionId,
    )
    return [
      { clubId: tie.winnerClubId, targetCompetitionId: rule.targetCompetitionId, promoted: Boolean(winnerSource) },
      { clubId: tie.loserClubId, targetCompetitionId: rule.loserCompetitionId, promoted: false },
    ]
  })
}

export const resolveCompetitionMovements = (
  clubs: readonly Club[],
  tables: Readonly<Record<string, readonly LeagueTableRow[]>>,
  config: CountryCompetitionConfig,
  playoffs: readonly PlayoffState[] = [],
): Club[] => {
  const expectedClubIds = new Set(clubs.map((club) => club.id))
  const expectedCounts = Object.fromEntries(
    Object.keys(config.competitions).map((competitionId) => [
      competitionId,
      clubs.filter((club) => getClubCompetitionId(club) === competitionId).length,
    ]),
  )
  const movements: Movement[] = []
  const groupRelegations: Extract<TransitionRule, { type: 'group-relegation' }>[] = []

  for (const rule of getRules(config)) {
    if (rule.type === 'promotion-playoff' || rule.type === 'relegation-playoff') {
      movements.push(...playoffMovements(rule, playoffs, config))
      continue
    }
    if (rule.type === 'group-relegation') {
      groupRelegations.push(rule)
      continue
    }
    if (rule.type === 'internal-group-swap') {
      const sourceRows = tables[rule.sourceCompetitionId] ?? []
      const targetRows = tables[rule.targetCompetitionId] ?? []
      movements.push(
        ...selectTableRows(sourceRows, rule.sourceSelector).map((row) => ({ clubId: row.clubId, targetCompetitionId: rule.targetCompetitionId, promoted: false })),
        ...selectTableRows(targetRows, rule.targetSelector).map((row) => ({ clubId: row.clubId, targetCompetitionId: rule.sourceCompetitionId, promoted: true })),
      )
      continue
    }

    const rows = tables[rule.sourceCompetitionId] ?? []
    movements.push(...selectTableRows(rows, rule.selector).map((row) => ({
      clubId: row.clubId,
      targetCompetitionId: rule.targetCompetitionId,
      promoted: rule.type === 'direct-promotion' || rule.type === 'group-promotion',
    })))
  }

  for (const rule of groupRelegations) {
    const rows = selectTableRows(tables[rule.sourceCompetitionId] ?? [], rule.selector)
    const orderedTargets = [...rule.targetCompetitionIds].sort()
    rows.forEach((row, index) => {
      const original = clubs.find((club) => club.id === row.clubId)
      const preserved = original?.groupId
        ? orderedTargets.find((competitionId) => config.competitions[competitionId]?.legacyGroupId === original.groupId)
        : undefined
      movements.push({
        clubId: row.clubId,
        targetCompetitionId: preserved ?? orderedTargets[index % orderedTargets.length]!,
        promoted: false,
      })
    })
  }

  const movementByClubId = new Map<string, Movement>()
  for (const movement of movements) movementByClubId.set(movement.clubId, movement)

  const nextClubs = clubs.map((club) => {
    const sourceCompetitionId = getClubCompetitionId(club)
    const sourceConfig = config.competitions[sourceCompetitionId]
    const sourceRows = tables[sourceCompetitionId] ?? []
    const row = sourceRows.find((candidate) => candidate.clubId === club.id)
    const reward = sourceConfig && row
      ? getPositionReward(sourceConfig.rewards, row.position, sourceRows.length)
      : 0
    const movement = movementByClubId.get(club.id)
    if (!movement) return { ...club, squad: club.squad.map((player) => ({ ...player })), budget: club.budget + reward }

    const target = config.competitions[movement.targetCompetitionId]
    if (!target) throw new Error(`Unknown movement target ${movement.targetCompetitionId} for ${club.id}`)
    const promotionReward = sourceConfig && target.level < sourceConfig.level
      ? (sourceConfig.rewards.promotionReward ?? 0)
      : 0
    return {
      ...club,
      competitionId: target.id,
      divisionId: target.level,
      leagueId: target.legacyLeagueId,
      groupId: target.legacyGroupId,
      budget: club.budget + reward + promotionReward,
      squad: club.squad.map((player) => ({ ...player })),
    }
  })

  validateCompetitionParticipants(nextClubs, config, expectedClubIds, expectedCounts)
  return nextClubs
}
