import { computed } from 'vue'
import { calculateClubRating } from '@/domain/club/teamRating'
import { useGameStore } from '@/stores/game/gameStore'
import { useMatchStore } from '@/stores/matches/matchStore'
import { useSquadStore } from '@/stores/squad/squadStore'

export const useScoutReport = () => {
  const gameStore = useGameStore()
  const matchStore = useMatchStore()
  const squadStore = useSquadStore()

  const nextMatch = computed(() => matchStore.nextMatch)
  const nextOpponent = computed(() => matchStore.nextOpponent)

  const nextMatchVenue = computed(() => {
    const game = gameStore.game
    const match = nextMatch.value
    if (!game || !match) return ''
    return match.homeClubId === game.selectedClubId ? 'дома' : 'в гостях'
  })

  const nextOpponentRating = computed(() =>
    nextOpponent.value ? calculateClubRating(nextOpponent.value) : 0,
  )

  const items = computed<string[]>(() => {
    const opponent = nextOpponent.value
    const own = squadStore.club
    if (!opponent || !own) {
      return [
        'Следующий соперник пока не определён — настройте базовую модель игры под сильные стороны состава.',
      ]
    }

    const ownRating = calculateClubRating(own, squadStore.lineup)
    const opponentRating = calculateClubRating(opponent)
    const ratingGap = Number((ownRating - opponentRating).toFixed(1))
    const opponentDefense = opponent.defenseRating
    const opponentMidfield = opponent.midfieldRating
    const opponentAttack = opponent.attackRating
    const reportItems: string[] = []

    if (ratingGap >= 5) {
      reportItems.push(
        `${opponent.shortName} заметно слабее по общему рейтингу — можно играть смелее и давить выше.`,
      )
    } else if (ratingGap <= -5) {
      reportItems.push(
        `${opponent.shortName} сильнее по рейтингу — лучше заранее закрыть центр и снизить риск потерь.`,
      )
    } else {
      reportItems.push(
        `${opponent.shortName} близок по силе — детали плана и роли игроков могут решить матч.`,
      )
    }

    if (opponentDefense <= opponentMidfield - 3 || opponentDefense <= opponentAttack - 3) {
      reportItems.push(
        'Защита соперника выглядит слабее остальных линий: быстрый темп и роли под завершение могут дать шанс.',
      )
    } else if (opponentDefense >= opponentAttack + 4) {
      reportItems.push(
        'Оборона соперника крепкая: пригодятся плеймейкеры, ширина и терпеливое владение.',
      )
    }

    if (opponentAttack >= opponentDefense + 4 || opponentAttack >= opponentMidfield + 4) {
      reportItems.push(
        'Атака соперника — главная угроза. Высокая линия и жёсткий прессинг будут рискованнее обычного.',
      )
    }

    if (opponentMidfield < opponentAttack && opponentMidfield < opponentDefense) {
      reportItems.push(
        'Центр поля соперника уязвим: можно перегружать середину и играть через плеймейкера.',
      )
    }

    return reportItems.slice(0, 4)
  })

  return {
    items,
    nextMatch,
    nextMatchVenue,
    nextOpponent,
    nextOpponentRating,
  }
}
