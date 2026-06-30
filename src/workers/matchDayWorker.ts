import {
  completePreparedUserMatchDay,
  prepareUserMatchDay,
  settleAiOnlyDaysUntilNextUserMatch,
} from '@/domain/season/seasonService'
import { t } from '@/plugins/i18n/i18n'
import type { GameState, MatchResult } from '@/types/football'

type MatchDayRequest =
  | { type: 'prepare'; state: GameState; matchId: string }
  | { type: 'complete'; result: MatchResult }

type MatchDayResponse =
  | { type: 'ready' }
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
      preparedMatchId = data.matchId
      preparedState = prepareUserMatchDay(data.state, data.matchId)
      workerScope.postMessage({ type: 'ready' })
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
