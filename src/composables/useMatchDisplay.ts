import { useI18n } from 'vue-i18n'
import { useCareerContext } from '@/composables/useCareerContext'
import { useMatchStore } from '@/stores/matches/matchStore'
import type { Club, Match } from '@/types/football'
import { formatDate } from '@/utils/format'
import { getWorldCupStageLabel } from '@/data/worldCup2026/stageLabels'
import type { WorldCupRound } from '@/stores/worldCup2026/enums'

export const useMatchDisplay = () => {
  const matchStore = useMatchStore()
  const { isWorldCupMode, selectedTeamId } = useCareerContext()
  const { t } = useI18n()

  const opponent = (match: Match): Club | undefined => matchStore.getOpponent(match)

  const matchDate = (match: Match): string => formatDate(match.date)

  const matchCompetition = (match: Match): string => {
    if (isWorldCupMode.value) {
      if (match.type === 'playoff') {
        return getWorldCupStageLabel(match.playoffStageId as WorldCupRound)
      }
      return t('worldCup2026.overview.matchday', {
        current: match.roundNumber ?? match.round,
        total: 3,
      })
    }

    return match.type === 'league'
      ? t('match.round', { round: match.roundNumber ?? match.round })
      : match.type === 'playoff'
        ? t('match.playoff')
        : t('match.cup')
  }

  const venue = (match: Match): string => {
    const teamId = selectedTeamId.value
    if (!teamId) {
      return t('match.away')
    }
    return match.homeClubId === teamId ? t('match.home') : t('match.away')
  }

  const resultData = (match: Match): { letter: string; score: string; tone: string } => {
    const teamId = selectedTeamId.value
    if (!teamId || !match.result) {
      return { letter: t('common.dash'), score: t('common.dash'), tone: 'slate' }
    }

    const isHome = match.homeClubId === teamId
    const own = isHome ? match.result.homeGoals : match.result.awayGoals
    const rival = isHome ? match.result.awayGoals : match.result.homeGoals

    if (own > rival || match.result.winnerClubId === teamId) {
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
