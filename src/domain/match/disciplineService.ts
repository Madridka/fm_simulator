import type { CardEvent, MatchResult } from '@/types/football'

interface IndexedCard {
  card: CardEvent
  index: number
}

export const normalizeCardEvents = (cards: readonly CardEvent[]): CardEvent[] => {
  const ordered: IndexedCard[] = cards
    .map((card, index) => ({ card: { ...card }, index }))
    .sort(
      (left, right) =>
        (left.card.minute ?? Number.POSITIVE_INFINITY) -
          (right.card.minute ?? Number.POSITIVE_INFINITY) ||
        left.index - right.index,
    )
  const yellowCardsByPlayer = new Map<string, number>()
  const dismissedPlayers = new Set<string>()
  const normalized: CardEvent[] = []

  for (const { card } of ordered) {
    const playerKey = `${card.clubId}:${card.playerId}`
    if (dismissedPlayers.has(playerKey)) continue

    if (card.card === 'red') {
      normalized.push({
        ...card,
        dismissalReason: card.dismissalReason ?? 'direct-red',
      })
      dismissedPlayers.add(playerKey)
      continue
    }

    const yellowCards = yellowCardsByPlayer.get(playerKey) ?? 0
    if (yellowCards >= 1) {
      normalized.push({
        ...card,
        card: 'red',
        dismissalReason: 'second-yellow',
      })
      dismissedPlayers.add(playerKey)
      continue
    }

    yellowCardsByPlayer.set(playerKey, yellowCards + 1)
    normalized.push({ ...card })
  }

  return normalized
}

export const normalizeMatchResultDiscipline = (
  result: MatchResult,
  homeClubId: string,
  awayClubId: string,
): MatchResult => {
  const cards = normalizeCardEvents(result.cards ?? [])
  const redCardsFor = (clubId: string): number =>
    cards.filter((card) => card.clubId === clubId && card.card === 'red').length
  const yellowCardsFor = (clubId: string): number =>
    cards.filter(
      (card) =>
        card.clubId === clubId &&
        (card.card === 'yellow' || card.dismissalReason === 'second-yellow'),
    ).length
  if (!cards.length) {
    return { ...result, cards: undefined }
  }
  return {
    ...result,
    cards,
    stats: {
      home: {
        ...result.stats.home,
        yellowCards: yellowCardsFor(homeClubId),
        redCards: redCardsFor(homeClubId),
      },
      away: {
        ...result.stats.away,
        yellowCards: yellowCardsFor(awayClubId),
        redCards: redCardsFor(awayClubId),
      },
    },
  }
}
