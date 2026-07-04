import type { WorldCupRound, WorldCupStage } from '@/stores/worldCup2026/enums'

export const worldCupStageLabels: Record<WorldCupStage, string> = {
  'group-stage': 'Групповой этап',
  'round-of-32': '1/16 финала',
  'round-of-16': '1/8 финала',
  'quarter-finals': '1/4 финала',
  'semi-finals': '1/2 финала',
  'third-place': 'Матч за 3-е место',
  final: 'Финал',
  completed: 'Турнир завершен',
}

export const worldCupStageSubLabels: Partial<Record<WorldCupStage, string>> = {
  'round-of-32': 'Round of 32',
  'round-of-16': 'Round of 16',
}

export const worldCupRoundToStage = (round: WorldCupRound): WorldCupStage => {
  switch (round) {
    case 'group-stage-1':
    case 'group-stage-2':
    case 'group-stage-3':
      return 'group-stage'
    case 'quarter-final':
      return 'quarter-finals'
    case 'semi-final':
      return 'semi-finals'
    default:
      return round
  }
}

export const getWorldCupStageLabel = (round: WorldCupRound | WorldCupStage): string => {
  const stage = round.startsWith('group-stage')
    ? 'group-stage'
    : round === 'quarter-final'
      ? 'quarter-finals'
      : round === 'semi-final'
        ? 'semi-finals'
        : round
  return worldCupStageLabels[stage as WorldCupStage] ?? 'Неизвестная стадия'
}
