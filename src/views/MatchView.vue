<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { createMatchTimeline, type MatchTimeline } from '@/domain/match/matchSimulator'
import {
  autoSelectLineup,
  getFormationSlots,
  validateLineup,
} from '@/domain/season/squadSelectionService'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useGameStore } from '@/stores/game/gameStore'
import type {
  Club,
  ClubLineup,
  Match,
  MatchLineups,
  MatchResult,
  PlayedLineup,
  Player,
} from '@/types/football'

import ClubBadge from '@/components/ui/ClubBadge.vue'

type MatchSnapshot = MatchTimeline['minutes'][number]

// ЗАВИСИМОСТИ ЭКРАНА И ИСТОЧНИКИ ДАННЫХ АКТИВНОГО МАТЧА
const router = useRouter()
const gameStore = useGameStore()
const clubStore = useClubStore()
// ИЗМЕНЯЕМОЕ СОСТОЯНИЕ ПОМИНУТНОЙ СИМУЛЯЦИИ И ФОНОВОГО ЗАВЕРШЕНИЯ
const timeline = ref<MatchTimeline | null>(null)
const currentMinute = ref(0)
const timerId = ref<number | null>(null)
const isCalculating = ref(false)
const calculationError = ref('')
let matchCompletionPromise: Promise<void> | null = null

// ВОЗВРАЩАЕТ АКТИВНЫЙ МАТЧ
const match = computed((): Match | undefined => gameStore.activeMatch)

// ВОЗВРАЩАЕТ ДОМАШНИЙ КЛУБ
const homeClub = computed((): Club | undefined =>
  match.value ? clubStore.getClubById(match.value.homeClubId) : undefined,
)

// ВОЗВРАЩАЕТ ГОСТЕВОЙ КЛУБ
const awayClub = computed((): Club | undefined =>
  match.value ? clubStore.getClubById(match.value.awayClubId) : undefined,
)

// СОЗДАЁТ ЧИСЛОВОЙ ХЕШ ИЗ СТРОКИ
const hashString = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) % 2_147_483_647
  }
  return hash || 1
}

// ФОРМИРУЕТ СОСТАВ КЛУБА ДЛЯ СИМУЛЯЦИИ
const buildPlayedLineup = (club: Club, lineup: ClubLineup): PlayedLineup => {
  const starters = getFormationSlots(lineup.formation)
    .map((slot) => lineup.starters[slot.id])
    .filter((playerId): playerId is string => typeof playerId === 'string')

  if (starters.length !== 11) {
    const fallback = autoSelectLineup(club, lineup.formation, lineup.tacticalStyle)
    return buildPlayedLineup(club, fallback)
  }

  return {
    formation: lineup.formation,
    tacticalStyle: lineup.tacticalStyle,
    starters,
  }
}

// ПОДГОТАВЛИВАЕТ СОСТАВЫ ОБЕИХ КОМАНД
const preparedLineups = computed((): MatchLineups | undefined => {
  const game = gameStore.game
  const currentMatch = match.value
  const home = homeClub.value
  const away = awayClub.value

  if (!game || !currentMatch || !home || !away) {
    return undefined
  }

  if (currentMatch.lineups) {
    return currentMatch.lineups
  }

  const homeLineup =
    currentMatch.homeClubId === game.selectedClubId
      ? game.lineups[currentMatch.homeClubId]
      : autoSelectLineup(
          home,
          game.lineups[currentMatch.homeClubId]?.formation ?? '4-4-2',
          game.lineups[currentMatch.homeClubId]?.tacticalStyle ?? 'balanced',
        )
  const awayLineup =
    currentMatch.awayClubId === game.selectedClubId
      ? game.lineups[currentMatch.awayClubId]
      : autoSelectLineup(
          away,
          game.lineups[currentMatch.awayClubId]?.formation ?? '4-4-2',
          game.lineups[currentMatch.awayClubId]?.tacticalStyle ?? 'balanced',
        )

  if (!homeLineup || !awayLineup) {
    return undefined
  }

  return {
    home: buildPlayedLineup(home, homeLineup),
    away: buildPlayedLineup(away, awayLineup),
  }
})

// ПРОВЕРЯЕТ КОРРЕКТНОСТЬ СОСТАВА ИГРОКА
const userValidation = computed(() => {
  const game = gameStore.game
  const currentMatch = match.value
  if (!game || !currentMatch) {
    return { valid: false, errors: ['Матч не найден.'] }
  }

  const userClub = clubStore.getClubById(game.selectedClubId)
  const lineup = game.lineups[game.selectedClubId]
  if (!userClub || !lineup) {
    return { valid: false, errors: ['Состав не выбран.'] }
  }

  return validateLineup(userClub, lineup)
})

// ПРОВЕРЯЕТ УЧАСТИЕ КЛУБА ИГРОКА В МАТЧЕ
const isUserMatch = computed((): boolean => {
  const game = gameStore.game
  const currentMatch = match.value
  return Boolean(
    game &&
    currentMatch &&
    (currentMatch.homeClubId === game.selectedClubId ||
      currentMatch.awayClubId === game.selectedClubId),
  )
})

// ПРОВЕРЯЕТ ДОСТУПНОСТЬ МАТЧА ДЛЯ ИГРЫ
const isPlayableMatch = computed(
  (): boolean => match.value?.status === 'scheduled' && gameStore.nextMatch?.id === match.value.id,
)

// ПРОВЕРЯЕТ ВОЗМОЖНОСТЬ ЗАПУСКА СИМУЛЯЦИИ
const canSimulate = computed((): boolean =>
  Boolean(isUserMatch.value && isPlayableMatch.value && userValidation.value.valid),
)

// ВОЗВРАЩАЕТ ТЕКУЩИЙ ИЛИ ИТОГОВЫЙ РЕЗУЛЬТАТ
const currentResult = computed<MatchResult | undefined>(() => {
  if (match.value?.result) {
    return match.value.result
  }
  return currentMinute.value >= 90 ? timeline.value?.finalResult : undefined
})

// СОЗДАЁТ ПУСТОЙ СНИМОК СОСТОЯНИЯ МАТЧА
const emptySnapshot = (): MatchSnapshot => ({
  minute: 0,
  homeGoals: 0,
  awayGoals: 0,
  goals: [],
  stats: {
    home: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
    away: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
  },
})

// ВОЗВРАЩАЕТ СОСТОЯНИЕ МАТЧА НА ТЕКУЩЕЙ МИНУТЕ
const visibleSnapshot = computed<MatchSnapshot>(() => {
  if (!timeline.value || currentMinute.value === 0) {
    return emptySnapshot()
  }
  return (
    timeline.value.minutes[currentMinute.value - 1] ??
    timeline.value.minutes[timeline.value.minutes.length - 1] ??
    emptySnapshot()
  )
})

// ВОЗВРАЩАЕТ ВИДИМЫЕ СОБЫТИЯ С ГОЛАМИ
const visibleGoals = computed(() => match.value?.result?.goals ?? visibleSnapshot.value.goals)

// ВОЗВРАЩАЕТ ДЕТАЛИ ПОЛНОЙ СИМУЛЯЦИИ
const detailedResult = computed<MatchResult | undefined>(
  () => match.value?.result ?? timeline.value?.finalResult,
)

// ВОЗВРАЩАЕТ ДОСТУПНУЮ ТЕКСТОВУЮ ТРАНСЛЯЦИЮ
const visibleCommentary = computed(() =>
  (detailedResult.value?.commentary ?? []).filter(
    (event) => match.value?.status === 'played' || event.minute <= currentMinute.value,
  ),
)

interface PlayerEventMarker {
  key: string
  label: string
  title: string
  className: string
}

// ПРОВЕРЯЕТ, НАСТУПИЛА ЛИ МИНУТА СОБЫТИЯ В ТЕКУЩЕЙ ТРАНСЛЯЦИИ
const isMatchEventVisible = (minute?: number): boolean =>
  match.value?.status === 'played' || (minute ?? 0) <= currentMinute.value

// СОБИРАЕТ ВИДИМЫЕ ГОЛЫ, КАРТОЧКИ, ТРАВМЫ И ЗАМЕНЫ ОДНОГО ИГРОКА
const playerEventMarkers = (playerId: string): PlayerEventMarker[] => {
  const result = detailedResult.value
  if (!result) {
    return []
  }

  const markers: PlayerEventMarker[] = []

  result.goals
    .filter((goal) => goal.playerId === playerId && isMatchEventVisible(goal.minute))
    .forEach((goal, index) =>
      markers.push({
        key: `goal-${goal.minute}-${index}`,
        label: '⚽',
        title: `Гол, ${goal.minute}'`,
        className: 'bg-emerald-100 text-emerald-800',
      }),
    )

  ;(result.cards ?? [])
    .filter((card) => card.playerId === playerId && isMatchEventVisible(card.minute))
    .forEach((card, index) =>
      markers.push({
        key: `${card.card}-${card.minute ?? 0}-${index}`,
        label: card.card === 'red' ? '🟥' : '🟨',
        title: `${card.card === 'red' ? 'Красная' : 'Жёлтая'} карточка${card.minute ? `, ${card.minute}'` : ''}`,
        className: card.card === 'red' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800',
      }),
    )

  ;(result.injuries ?? [])
    .filter((injury) => injury.playerId === playerId && isMatchEventVisible(injury.minute))
    .forEach((injury, index) =>
      markers.push({
        key: `injury-${injury.minute ?? 0}-${index}`,
        label: '✚',
        title: `Травма${injury.minute ? `, ${injury.minute}'` : ''}`,
        className: 'bg-orange-100 text-orange-800',
      }),
    )

  ;(result.substitutions ?? [])
    .filter((substitution) => isMatchEventVisible(substitution.minute))
    .forEach((substitution, index) => {
      if (substitution.playerOutId === playerId) {
        markers.push({
          key: `sub-out-${substitution.minute}-${index}`,
          label: `${substitution.minute}' ↓`,
          title: `Заменён, ${substitution.minute}'`,
          className: 'bg-rose-100 text-rose-700',
        })
      }
      if (substitution.playerInId === playerId) {
        markers.push({
          key: `sub-in-${substitution.minute}-${index}`,
          label: `${substitution.minute}' ↑`,
          title: `Вышел на замену, ${substitution.minute}'`,
          className: 'bg-sky-100 text-sky-700',
        })
      }
    })

  return markers
}

// ВОЗВРАЩАЕТ ДОСТУПНЫХ ЗАПАСНЫХ, НЕ ВХОДЯЩИХ В СТАРТОВЫЙ СОСТАВ
const benchPlayers = (club: Club, starters: readonly string[] = []): Player[] =>
  club.squad.filter(
    (player) => !starters.includes(player.id) && !player.isInjured,
  )

// ОБЪЕДИНЯЕТ ИГРОКОВ ОБЕИХ КОМАНД
const allPlayers = computed<Player[]>(() => {
  const home = homeClub.value?.squad ?? []
  const away = awayClub.value?.squad ?? []
  return [...home, ...away]
})

// ВОЗВРАЩАЕТ РОДНУЮ ПОЗИЦИЮ ИГРОКА ДЛЯ СТРОКИ СОСТАВА
const playerPosition = (playerId: string): string =>
  allPlayers.value.find((player) => player.id === playerId)?.position ?? '—'

// ВОЗВРАЩАЕТ ИМЯ ИГРОКА ПО ИДЕНТИФИКАТОРУ
const playerName = (playerId?: string): string => {
  if (!playerId) {
    return '-'
  }
  const player = allPlayers.value.find((candidate) => candidate.id === playerId)
  return player ? `${player.firstName} ${player.lastName}` : playerId
}

// СОЗДАЁТ ИЛИ ВОЗВРАЩАЕТ ВРЕМЕННУЮ ШКАЛУ МАТЧА
const ensureTimeline = (): MatchTimeline | undefined => {
  const currentMatch = match.value
  const home = homeClub.value
  const away = awayClub.value
  const lineups = preparedLineups.value
  const game = gameStore.game

  if (!currentMatch || !home || !away || !lineups || !game) {
    return undefined
  }

  if (!timeline.value) {
    timeline.value = createMatchTimeline({
      matchId: currentMatch.id,
      homeClub: home,
      awayClub: away,
      homeLineup: lineups.home,
      awayLineup: lineups.away,
      neutralVenue: currentMatch.neutralVenue,
      allowPenaltyShootout: currentMatch.type === 'cup',
      seed: hashString(currentMatch.id) + game.season * 10_000,
    })
  }

  return timeline.value
}

// ОСТАНАВЛИВАЕТ ТАЙМЕР СИМУЛЯЦИИ
const clearTimer = (): void => {
  if (timerId.value !== null) {
    window.clearInterval(timerId.value)
    timerId.value = null
  }
}

// ЗАВЕРШАЕТ МАТЧ И СОХРАНЯЕТ РЕЗУЛЬТАТ
const finish = async (result: MatchResult): Promise<void> => {
  clearTimer()
  const currentMatch = match.value
  if (
    !currentMatch ||
    currentMatch.status !== 'scheduled' ||
    !isPlayableMatch.value ||
    isCalculating.value
  ) {
    return
  }

  isCalculating.value = true
  calculationError.value = ''
  const completion = gameStore.completeMatchAsync(currentMatch.id, result)
  matchCompletionPromise = completion
  try {
    await completion
  } catch (error) {
    calculationError.value =
      error instanceof Error ? error.message : 'Не удалось рассчитать игровой день.'
  } finally {
    if (matchCompletionPromise === completion) {
      matchCompletionPromise = null
    }
    isCalculating.value = false
  }
}

// ПЕРЕВОДИТ СИМУЛЯЦИЮ НА СЛЕДУЮЩУЮ МИНУТУ
const nextMinute = (): void => {
  const currentTimeline = ensureTimeline()
  if (!currentTimeline) {
    return
  }

  currentMinute.value = Math.min(90, currentMinute.value + 1)
  if (currentMinute.value >= 90) {
    void finish(currentTimeline.finalResult)
  }
}

// ЗАПУСКАЕТ ПОМИНУТНУЮ СИМУЛЯЦИЮ
const startSimulation = (): void => {
  if (!canSimulate.value || timerId.value !== null || currentMinute.value >= 90) {
    return
  }

  ensureTimeline()
  timerId.value = window.setInterval(() => {
    nextMinute()
  }, 130)
}

// МГНОВЕННО ЗАВЕРШАЕТ СИМУЛЯЦИЮ
const instantResult = (): void => {
  if (!canSimulate.value || isCalculating.value) {
    return
  }
  const currentTimeline = ensureTimeline()
  if (!currentTimeline) {
    return
  }
  currentMinute.value = 90
  void finish(currentTimeline.finalResult)
}

// ВОЗВРАЩАЕТ ПОЛЬЗОВАТЕЛЯ НА ГЛАВНУЮ СТРАНИЦУ
const goBack = async (): Promise<void> => {
  try {
    await matchCompletionPromise
  } catch {
    return
  }
  gameStore.clearActiveMatch()
  await router.push('/dashboard')
}

// СБРАСЫВАЕТ СИМУЛЯЦИЮ ПРИ СМЕНЕ МАТЧА
watch(
  () => match.value?.id,
  () => {
    clearTimer()
    timeline.value = null
    currentMinute.value = 0
    isCalculating.value = false
    calculationError.value = ''
    matchCompletionPromise = null
    const currentMatch = match.value
    if (currentMatch?.status === 'scheduled') {
      void gameStore.prepareMatchDay(currentMatch.id).catch((error: unknown) => {
        calculationError.value =
          error instanceof Error ? error.message : 'Не удалось подготовить игровой день.'
      })
    }
  },
  { immediate: true },
)

// АВТОМАТИЧЕСКИ ЗАПУСКАЕТ ИЛИ ОСТАНАВЛИВАЕТ СИМУЛЯЦИЮ
watch(
  canSimulate,
  (ready) => {
    if (ready) {
      startSimulation()
    } else {
      clearTimer()
    }
  },
  { immediate: true },
)

// ОСТАНАВЛИВАЕТ ТАЙМЕР ПЕРЕД УДАЛЕНИЕМ КОМПОНЕНТА
onBeforeUnmount(clearTimer)
</script>

<template>
  <!-- СТРАНИЦА МАТЧА -->
  <section
    v-if="match && homeClub && awayClub"
    class="space-y-5 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:gap-3 xl:space-y-0"
  >
    <!-- ТАБЛО И УПРАВЛЕНИЕ СИМУЛЯЦИЕЙ -->
    <div
      class="shrink-0 rounded-lg border border-white/70 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(255,255,255,0.96)),#ffffff] p-3 shadow-[0_18px_50px_rgba(20,46,38,0.1)] sm:p-5 xl:p-3"
    >
      <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
        <div class="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <ClubBadge
            :club="homeClub"
            size="lg"
            class="!h-10 !w-10 !text-xs sm:!h-16 sm:!w-16 sm:!text-lg"
          />
          <div class="min-w-0">
            <h1 class="truncate text-sm font-bold text-slate-950 sm:text-xl">
              {{ homeClub.name }}
            </h1>
            <div class="hidden text-sm text-slate-500 sm:block">Хозяева</div>
          </div>
        </div>
        <div class="text-center">
          <div
            class="min-w-[72px] rounded-lg bg-[linear-gradient(135deg,#10251f,#17603d)] px-2 py-2 text-[1.75rem] font-black leading-none text-emerald-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] sm:min-w-[156px] sm:px-5 sm:py-2.5 sm:text-[2.75rem]"
          >
            {{ match.result?.homeGoals ?? visibleSnapshot.homeGoals }}:{{
              match.result?.awayGoals ?? visibleSnapshot.awayGoals
            }}
          </div>
          <div class="mt-1 text-[10px] font-semibold text-slate-500 sm:text-sm">
            {{
              match.status === 'played' || currentMinute >= 90
                ? 'Матч завершен'
                : `${visibleSnapshot.minute}'`
            }}
          </div>
        </div>
        <div class="flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
          <div class="min-w-0 text-right">
            <h1 class="truncate text-sm font-bold text-slate-950 sm:text-xl">
              {{ awayClub.name }}
            </h1>
            <div class="hidden text-sm text-slate-500 sm:block">Гости</div>
          </div>
          <ClubBadge
            :club="awayClub"
            size="lg"
            class="!h-10 !w-10 !text-xs sm:!h-16 sm:!w-16 sm:!text-lg"
          />
        </div>
      </div>

      <!-- УПРАВЛЕНИЕ МАТЧЕМ -->
      <div class="mt-2 grid justify-items-center gap-1.5 sm:mt-3 sm:gap-2">
        <template v-if="match.status === 'scheduled' && isPlayableMatch && currentMinute < 90">
          <div
            v-if="canSimulate"
            class="rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-extrabold text-emerald-800 sm:px-3 sm:py-2 sm:text-sm"
          >
            Симуляция идет автоматически
          </div>
          <Button
            class="w-full max-w-[180px] sm:min-w-[220px]"
            :disabled="!canSimulate || isCalculating"
            severity="success"
            :label="isCalculating ? 'Расчет...' : 'Мгновенный расчет'"
            @click="instantResult"
          />
          <RouterLink v-if="!userValidation.valid" to="/squad" class="w-full text-center">
            <Button
              class="w-full max-w-[180px] sm:min-w-[220px]"
              severity="danger"
              label="Исправить состав"
            />
          </RouterLink>
        </template>
        <template v-else-if="match.status === 'played' || currentMinute >= 90">
          <Button
            class="w-full max-w-[180px] sm:min-w-[220px]"
            label="Назад к обзору"
            @click="goBack"
          />
        </template>
      </div>

      <div
        v-if="calculationError"
        class="mt-2 rounded-md bg-rose-50 px-3 py-2 text-center text-xs font-semibold text-rose-800"
      >
        {{ calculationError }}
      </div>

      <div
        v-if="match.status === 'scheduled' && isUserMatch && !isPlayableMatch"
        class="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Этот матч еще не доступен. Сначала сыграйте ближайший матч сезона.
      </div>

      <div
        v-if="!userValidation.valid && match.status === 'scheduled' && isUserMatch"
        class="mt-4 space-y-2"
      >
        <div
          v-for="error in userValidation.errors"
          :key="error"
          class="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {{ error }}
        </div>
      </div>
    </div>

    <!-- СОСТАВЫ СТАТИСТИКА И ТРАНСЛЯЦИЯ -->
    <div class="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[0.8fr_1.2fr_1fr] xl:gap-3">
      <!-- СОСТАВЫ КОМАНД -->
      <div
        class="rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:min-h-0 xl:overflow-auto xl:p-3"
      >
        <h2 class="text-lg font-semibold text-slate-950 xl:text-base">Составы</h2>
        <!-- ЛЕГЕНДА СОБЫТИЙ, КОТОРЫЕ ПОЯВЛЯЮТСЯ У ИГРОКОВ ПО ХОДУ МАТЧА -->
        <div class="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] font-semibold text-slate-500">
          <span>⚽ Гол</span>
          <span>🟨 ЖК</span>
          <span>🟥 КК</span>
          <span>✚ Травма</span>
          <span><b class="text-sky-700">↑</b>/<b class="text-rose-700">↓</b> Замена</span>
        </div>
        <!-- ОСНОВА И СКАМЕЙКА ХОЗЯЕВ И ГОСТЕЙ -->
        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:mt-3 xl:gap-3">
          <!-- СОСТАВ ХОЗЯЕВ С СИНХРОНИЗИРОВАННЫМИ СОБЫТИЯМИ -->
          <div>
            <div class="mb-2 font-semibold text-slate-950 xl:mb-1.5 xl:text-sm">
              {{ homeClub.shortName }} · {{ preparedLineups?.home.formation }}
            </div>
            <div class="space-y-1 text-sm text-slate-700 xl:space-y-0.5 xl:text-xs">
              <div
                v-for="playerId in preparedLineups?.home.starters"
                :key="playerId"
                class="flex h-7 min-w-0 items-center gap-1 overflow-hidden rounded bg-slate-50 px-2"
              >
                <span class="w-7 shrink-0 text-[9px] font-black text-slate-400">
                  {{ playerPosition(playerId) }}
                </span>
                <span class="min-w-0 flex-1 truncate">{{ playerName(playerId) }}</span>
                <span
                  v-for="marker in playerEventMarkers(playerId)"
                  :key="marker.key"
                  :title="marker.title"
                  :aria-label="marker.title"
                  class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 text-[11px] font-black leading-none"
                  :class="marker.className"
                >
                  {{ marker.label }}
                </span>
              </div>
            </div>
            <!-- ПОЛНЫЙ СПИСОК ДОСТУПНЫХ ЗАПАСНЫХ ХОЗЯЕВ -->
            <div
              v-if="benchPlayers(homeClub, preparedLineups?.home.starters).length"
              class="mt-3 border-t border-slate-200 pt-2"
            >
              <div class="mb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                Запасные
              </div>
              <div class="space-y-1 text-xs text-slate-700">
                <div
                  v-for="player in benchPlayers(homeClub, preparedLineups?.home.starters)"
                  :key="player.id"
                  class="flex h-7 min-w-0 items-center gap-1 overflow-hidden rounded bg-slate-50 px-2"
                >
                  <span class="w-7 shrink-0 text-[9px] font-black text-slate-400">
                    {{ player.position }}
                  </span>
                  <span class="min-w-0 flex-1 truncate">{{ playerName(player.id) }}</span>
                  <span
                    v-for="marker in playerEventMarkers(player.id)"
                    :key="marker.key"
                    :title="marker.title"
                    :aria-label="marker.title"
                    class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 text-[11px] font-black leading-none"
                    :class="marker.className"
                  >{{ marker.label }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- СОСТАВ ГОСТЕЙ С СИНХРОНИЗИРОВАННЫМИ СОБЫТИЯМИ -->
          <div>
            <div class="mb-2 font-semibold text-slate-950 xl:mb-1.5 xl:text-sm">
              {{ awayClub.shortName }} · {{ preparedLineups?.away.formation }}
            </div>
            <div class="space-y-1 text-sm text-slate-700 xl:space-y-0.5 xl:text-xs">
              <div
                v-for="playerId in preparedLineups?.away.starters"
                :key="playerId"
                class="flex h-7 min-w-0 items-center gap-1 overflow-hidden rounded bg-slate-50 px-2"
              >
                <span class="w-7 shrink-0 text-[9px] font-black text-slate-400">
                  {{ playerPosition(playerId) }}
                </span>
                <span class="min-w-0 flex-1 truncate">{{ playerName(playerId) }}</span>
                <span
                  v-for="marker in playerEventMarkers(playerId)"
                  :key="marker.key"
                  :title="marker.title"
                  :aria-label="marker.title"
                  class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 text-[11px] font-black leading-none"
                  :class="marker.className"
                >
                  {{ marker.label }}
                </span>
              </div>
            </div>
            <!-- ПОЛНЫЙ СПИСОК ДОСТУПНЫХ ЗАПАСНЫХ ГОСТЕЙ -->
            <div
              v-if="benchPlayers(awayClub, preparedLineups?.away.starters).length"
              class="mt-3 border-t border-slate-200 pt-2"
            >
              <div class="mb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                Запасные
              </div>
              <div class="space-y-1 text-xs text-slate-700">
                <div
                  v-for="player in benchPlayers(awayClub, preparedLineups?.away.starters)"
                  :key="player.id"
                  class="flex h-7 min-w-0 items-center gap-1 overflow-hidden rounded bg-slate-50 px-2"
                >
                  <span class="w-7 shrink-0 text-[9px] font-black text-slate-400">
                    {{ player.position }}
                  </span>
                  <span class="min-w-0 flex-1 truncate">{{ playerName(player.id) }}</span>
                  <span
                    v-for="marker in playerEventMarkers(player.id)"
                    :key="marker.key"
                    :title="marker.title"
                    :aria-label="marker.title"
                    class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 text-[11px] font-black leading-none"
                    :class="marker.className"
                  >{{ marker.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- СТАТИСТИКА И СОБЫТИЯ МАТЧА -->
      <div
        class="rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:min-h-0 xl:overflow-auto xl:p-3"
      >
        <h2 class="text-lg font-semibold text-slate-950 xl:text-base">Статистика</h2>
        <!-- СРАВНЕНИЕ КЛЮЧЕВЫХ МАТЧЕВЫХ ПОКАЗАТЕЛЕЙ ОБЕИХ КОМАНД -->
        <div class="mt-4 space-y-3 xl:mt-3 xl:space-y-2">
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold"
              >{{
                match.result?.stats.home.possession ?? visibleSnapshot.stats.home.possession
              }}%</span
            >
            <span class="text-slate-500">Владение</span>
            <span class="font-semibold"
              >{{
                match.result?.stats.away.possession ?? visibleSnapshot.stats.away.possession
              }}%</span
            >
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold">
              {{ match.result?.stats.home.xG ?? visibleSnapshot.stats.home.xG ?? 0 }}
            </span>
            <span class="text-slate-500">xG</span>
            <span class="font-semibold">
              {{ match.result?.stats.away.xG ?? visibleSnapshot.stats.away.xG ?? 0 }}
            </span>
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold">{{
              match.result?.stats.home.shots ?? visibleSnapshot.stats.home.shots
            }}</span>
            <span class="text-slate-500">Удары</span>
            <span class="font-semibold">{{
              match.result?.stats.away.shots ?? visibleSnapshot.stats.away.shots
            }}</span>
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold">{{
              match.result?.stats.home.shotsOnTarget ?? visibleSnapshot.stats.home.shotsOnTarget
            }}</span>
            <span class="text-slate-500">В створ</span>
            <span class="font-semibold">{{
              match.result?.stats.away.shotsOnTarget ?? visibleSnapshot.stats.away.shotsOnTarget
            }}</span>
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold">{{
              match.result?.stats.home.yellowCards ?? visibleSnapshot.stats.home.yellowCards
            }}</span>
            <span class="text-slate-500">Желтые</span>
            <span class="font-semibold">{{
              match.result?.stats.away.yellowCards ?? visibleSnapshot.stats.away.yellowCards
            }}</span>
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold">{{
              match.result?.stats.home.redCards ?? visibleSnapshot.stats.home.redCards ?? 0
            }}</span>
            <span class="text-slate-500">Красные</span>
            <span class="font-semibold">{{
              match.result?.stats.away.redCards ?? visibleSnapshot.stats.away.redCards ?? 0
            }}</span>
          </div>
        </div>
        <!-- ЛУЧШИЙ ИГРОК ПО ИТОГАМ НАКОПЛЕННЫХ МАТЧЕВЫХ ОЦЕНОК -->
        <div
          v-if="currentResult"
          class="mt-5 rounded-md bg-slate-50 p-3 text-sm xl:mt-3 xl:p-2 xl:text-xs"
        >
          Лучший игрок:
          <span class="font-semibold text-slate-950">{{
            playerName(currentResult.bestPlayerId)
          }}</span>
        </div>

        <!-- ХРОНОЛОГИЯ ГОЛОВ С РАЗДЕЛЕНИЕМ ХОЗЯЕВ И ГОСТЕЙ ПО СТОРОНАМ -->
        <div class="mt-5 border-t border-slate-100 pt-4 xl:mt-3 xl:pt-3">
          <h3 class="text-sm font-black uppercase tracking-wide text-slate-700">Голы</h3>
          <div v-if="visibleGoals.length" class="mt-3 xl:mt-2">
            <div class="mb-1 grid grid-cols-2 gap-2">
              <div class="truncate px-1 text-xs font-black text-slate-500">
                {{ homeClub.shortName }}
              </div>
              <div class="truncate px-1 text-right text-xs font-black text-slate-500">
                {{ awayClub.shortName }}
              </div>
            </div>
            <div class="space-y-2 xl:space-y-1">
              <div
                v-for="goal in visibleGoals"
                :key="`${goal.minute}-${goal.playerId}`"
                class="grid grid-cols-2 gap-2"
              >
                <div
                  v-if="goal.clubId === homeClub.id"
                  class="flex min-w-0 items-center gap-1 rounded-md bg-slate-50 px-3 py-2 text-sm xl:px-2 xl:py-1.5 xl:text-xs"
                >
                  <span class="shrink-0 font-black text-emerald-700">{{ goal.minute }}'</span>
                  <span class="min-w-0 truncate">{{ goal.playerName }}</span>
                </div>
                <div
                  v-else
                  class="col-start-2 flex min-w-0 items-center justify-end gap-1 rounded-md bg-slate-50 px-3 py-2 text-right text-sm xl:px-2 xl:py-1.5 xl:text-xs"
                >
                  <span class="min-w-0 truncate">{{ goal.playerName }}</span>
                  <span class="shrink-0 font-black text-emerald-700">{{ goal.minute }}'</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="mt-3 text-sm text-slate-600">Голов пока нет.</div>
        </div>

        <!-- РЕЗУЛЬТАТ СЕРИИ ПЕНАЛЬТИ ДЛЯ КУБКОВОГО МАТЧА -->
        <div
          v-if="match.result?.penaltyWinnerClubId"
          class="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
        >
          Победитель серии пенальти:
          {{ clubStore.getClubById(match.result.penaltyWinnerClubId)?.name }}
        </div>

      </div>

      <!-- ТЕКСТОВАЯ ТРАНСЛЯЦИЯ -->
      <div
        class="flex min-h-[320px] flex-col rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:min-h-0 xl:p-3"
      >
        <h2 class="text-lg font-semibold text-slate-950 xl:text-base">Текстовая трансляция</h2>
        <!-- ПОМИНУТНЫЙ ПОТОК УЖЕ НАСТУПИВШИХ СОБЫТИЙ МАТЧА -->
        <div
          v-if="visibleCommentary.length"
          class="mt-4 min-h-0 flex-1 space-y-1.5 overflow-auto pr-1 xl:mt-3"
        >
          <div
            v-for="event in visibleCommentary"
            :key="`${event.minute}-${event.text}`"
            class="flex gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm xl:px-2 xl:py-1.5 xl:text-xs"
          >
            <span class="w-7 shrink-0 font-black text-emerald-700">{{ event.minute }}'</span>
            <span
              v-if="event.kind === 'substitution'"
              class="flex min-w-0 flex-wrap items-center gap-1"
            >
              <span class="font-semibold">
                Замена {{ clubStore.getClubById(event.clubId ?? '')?.shortName }}:
              </span>
              <span>{{ playerName(event.playerOutId) }}</span>
              <span
                class="inline-flex shrink-0 flex-col items-center text-xs font-black leading-[0.55]"
                aria-label="заменён на"
              >
                <span class="text-rose-600">→</span>
                <span class="text-emerald-600">←</span>
              </span>
              <span>{{ playerName(event.playerInId) }}</span>
            </span>
            <span v-else>{{ event.text }}</span>
          </div>
        </div>
        <div v-else class="mt-4 text-sm text-slate-500 xl:mt-3 xl:text-xs">Событий пока нет.</div>
      </div>
    </div>
  </section>
  <!-- СОСТОЯНИЕ БЕЗ ВЫБРАННОГО МАТЧА -->
  <section
    v-else
    class="rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
  >
    Матч не найден.
  </section>
</template>
