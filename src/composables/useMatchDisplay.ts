import { useI18n } from '@/composables/useI18n'
import { useGameStore } from '@/stores/game/gameStore'
import { useMatchStore } from '@/stores/matches/matchStore'
import type { Club, Match } from '@/types/football'

export const useMatchDisplay = () => {
  const gameStore = useGameStore()
  const matchStore = useMatchStore()
  const { t } = useI18n()

  const opponent = (match: Match): Club | undefined => matchStore.getOpponent(match)

  const matchDate = (match: Match): string => {
    const date = new Date(`${match.date}T12:00:00`)
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
      .format(date)
      .replace('.', '')
  }

  const matchCompetition = (match: Match): string =>
    match.type === 'league' ? t('match.round', { round: match.round }) : t('match.cup')

  const venue = (match: Match): string =>
    match.homeClubId === gameStore.game?.selectedClubId ? t('match.home') : t('match.away')

  const resultData = (match: Match): { letter: string; score: string; tone: string } => {
    const game = gameStore.game
    if (!game || !match.result) {
      return { letter: t('common.dash'), score: t('common.dash'), tone: 'slate' }
    }

    const isHome = match.homeClubId === game.selectedClubId
    const own = isHome ? match.result.homeGoals : match.result.awayGoals
    const rival = isHome ? match.result.awayGoals : match.result.homeGoals

    if (own > rival || match.result.winnerClubId === game.selectedClubId) {
      return { letter: t('match.winLetter'), score: `${own}:${rival}`, tone: 'emerald' }
    }

    if (own === rival) {
      return { letter: t('match.drawLetter'), score: `${own}:${rival}`, tone: 'amber' }
    }

    return { letter: t('match.lossLetter'), score: `${own}:${rival}`, tone: 'rose' }
  }

  return {
    matchCompetition,
    matchDate,
    opponent,
    resultData,
    venue,
  }
}