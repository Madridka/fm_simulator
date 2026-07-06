import {
  completePreparedUserMatchDay,
  prepareUserMatchDay,
  settleAiOnlyDaysUntilNextUserMatch,
} from '@/domain/season/seasonService'
import {
  setRuntimeSimulationSettings,
  type SimulationSettings,
} from '@/domain/admin/simulationSettings'
import { t } from '@/plugins/i18n/i18n'
import type { GameState, MatchResult, PreparedMatchContext } from '@/types/football'

type MatchDayRequest =
  | {
      type: 'prepare'
      state: GameState
      matchId: string
      simulationSettings: SimulationSettings
    }
  | { type: 'complete'; result: MatchResult }

type MatchDayResponse =
  | { type: 'ready'; context: PreparedMatchContext }
  | { type: 'complete'; state: GameState }
  | { type: 'error'; error: string }

interface WorkerScope {
  onmessage: ((event: MessageEvent<MatchDayRequest>) => void) | null
  postMessage: (response: MatchDayResponse) => void
}

// ТИПИЗИРУЕТ ГЛОБАЛЬНУЮ ОБЛАСТЬ ФОНОВОГО ПОТОКА И ЕГО ПРОТОКОЛ
const workerScope = self as unknown as WorkerScope
let preparedState: GameState | null = null
let preparedMatchId = ''

// ГОТОВИТ И ЗАВЕРШАЕТ ИГРОВОЙ ДЕНЬ В ФОНОВОМ ПОТОКЕ
workerScope.onmessage = ({ data }): void => {
  try {
    if (data.type === 'prepare') {
      setRuntimeSimulationSettings(data.simulationSettings)
      preparedMatchId = data.matchId
      preparedState = prepareUserMatchDay(data.state, data.matchId)
      const match = preparedState.matches.find((candidate) => candidate.id === data.matchId)
      const homeClub = preparedState.clubs.find((club) => club.id === match?.homeClubId)
      const awayClub = preparedState.clubs.find((club) => club.id === match?.awayClubId)
      if (!match?.lineups || !homeClub || !awayClub) {
        throw new Error(t('match.errors.dayNotPrepared'))
      }
      workerScope.postMessage({
        type: 'ready',
        context: {
          matchId: match.id,
          homeClub,
          awayClub,
          lineups: match.lineups,
        },
      })
      return
    }

    if (!preparedState || !preparedMatchId) {
      throw new Error(t('match.errors.dayNotPrepared'))
    }

    workerScope.postMessage({
      type: 'complete',
      state: settleAiOnlyDaysUntilNextUserMatch(
        completePreparedUserMatchDay(preparedState, preparedMatchId, data.result),
      ),
    })
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : t('match.errors.calculateDay'),
    })
  }
}
