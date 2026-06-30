import { useI18n } from 'vue-i18n'
import { useGameStore } from '@/stores/game/gameStore'
import { useMatchStore } from '@/stores/matches/matchStore'
import type { Club, Match } from '@/types/football'
import { formatDate } from '@/utils/format'

// СОБИРАЕТ ОБЩИЕ ФОРМАТТЕРЫ МАТЧА ДЛЯ КАЛЕНДАРЯ И ВИДЖЕТОВ
export const useMatchDisplay = () => {
  const gameStore = useGameStore()
  const matchStore = useMatchStore()
  const { t } = useI18n()

  // ВОЗВРАЩАЕТ СОПЕРНИКА В КОНКРЕТНОМ МАТЧЕ
  const opponent = (match: Match): Club | undefined => matchStore.getOpponent(match)

  // ФОРМАТИРУЕТ ДАТУ МАТЧА ДЛЯ ИНТЕРФЕЙСА
  const matchDate = (match: Match): string => formatDate(match.date)

  // ФОРМИРУЕТ ПОДПИСЬ ТУРА ЛИГИ ИЛИ КУБКА
  const matchCompetition = (match: Match): string =>
    match.type === 'league'
      ? t('match.round', { round: match.roundNumber ?? match.round })
      : match.type === 'playoff'
        ? t('match.playoff')
        : t('match.cup')

  // ОПРЕДЕЛЯЕТ, ИГРАЕТ ЛИ КЛУБ ДОМА ИЛИ В ГОСТЯХ
  const venue = (match: Match): string =>
    match.homeClubId === gameStore.game?.selectedClubId ? t('match.home') : t('match.away')

  // ПРЕОБРАЗУЕТ РЕЗУЛЬТАТ В СЧЁТ, БУКВУ И ЦВЕТОВОЙ ТОН
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
