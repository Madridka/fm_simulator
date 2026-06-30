import type { CardEvent, Club, Match, Player } from '@/types/football'

export const isPlayerSuspended = (player: Player): boolean =>
  (player.suspensionMatchesRemaining ?? 0) > 0

export const isPlayerUnavailable = (player: Player): boolean =>
  player.isInjured || isPlayerSuspended(player)

export const applySuspensionsAfterMatch = (
  clubs: readonly Club[],
  match: Pick<Match, 'homeClubId' | 'awayClubId'>,
  cards: readonly CardEvent[] = [],
): Club[] => {
  const participatingClubIds = new Set([match.homeClubId, match.awayClubId])
  const dismissalByPlayerId = new Map(
    cards
      .filter((card) => card.card === 'red')
      .map((card) => [
        `${card.clubId}:${card.playerId}`,
        card.dismissalReason ?? 'direct-red',
      ] as const),
  )

  return clubs.map((club) => {
    if (!participatingClubIds.has(club.id)) {
      return { ...club, squad: club.squad.map((player) => ({ ...player })) }
    }

    return {
      ...club,
      squad: club.squad.map((player) => {
        const remaining = Math.max(0, (player.suspensionMatchesRemaining ?? 0) - 1)
        const dismissalReason = dismissalByPlayerId.get(`${club.id}:${player.id}`)
        if (dismissalReason) {
          return {
            ...player,
            suspensionMatchesRemaining: 1,
            suspensionReason:
              dismissalReason === 'second-yellow' ? 'second-yellow' : 'red-card',
          }
        }
        return {
          ...player,
          suspensionMatchesRemaining: remaining || undefined,
          suspensionReason: remaining ? player.suspensionReason : undefined,
        }
      }),
    }
  })
}
