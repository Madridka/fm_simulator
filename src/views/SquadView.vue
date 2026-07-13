<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave } from 'vue-router'
import { useSquadStore } from '@/stores/squad/squadStore'
import { useToastStore } from '@/stores/ui/toastStore'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useGameStore } from '@/stores/game/gameStore'
import type {
  Club,
  Formation,
  Player,
  PlayerPosition,
  PlayerRoleId,
  PlayerStats,
  TeamTacticsSettings,
} from '@/types/football'
import {
  defaultRoleForPosition,
  defaultTeamTactics,
} from '@/domain/season/squadSelectionService'
import { getPlayerRole, rolesForPosition } from '@/domain/tactics/playerRoles'
import { calculateClubRating } from '@/domain/club/teamRating'
import { formatMoney } from '@/utils/format'
import { isPlayerSuspended, isPlayerUnavailable } from '@/domain/season/playerAvailability'
import SectionHero from '@/components/ui/SectionHero.vue'
import TacticsPanel from '@/components/tactics/TacticsPanel.vue'
import { seasonsUntilPlayerRetirement } from '@/data/gameConfig/career'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

type DragSource = 'starter' | 'substitute' | 'reserve'

interface DragPayload {
  playerId: string
  source: DragSource
  slotId?: string
}

interface PointerDragState {
  active: boolean
  payload: DragPayload
  pointerId: number
  startX: number
  startY: number
}

interface PlayerStatisticsRow {
  id: string
  name: string
  position: string
  appearances: number
  goals: number
  assists: number
  cleanSheets: number
  yellowCards: number
  redCards: number
  averageRating: number
  matchesRated: number
}

interface PlayerContractRow {
  id: string
  name: string
  position: string
  age: number
  retirementSeasons: number
}

interface TacticalIndicator {
  key: string
  label: string
  value: number
  description: string
  tone: string
}

interface StarterRoleRow {
  slotId: string
  slotLabel: string
  player: Player
  roleId: PlayerRoleId
  options: ReturnType<typeof rolesForPosition>
}

// ХРАНИЛИЩА СОСТАВА И ПОЛЬЗОВАТЕЛЬСКИХ УВЕДОМЛЕНИЙ
const squadStore = useSquadStore()
const toastStore = useToastStore()
const clubStore = useClubStore()
const gameStore = useGameStore()
const { t } = useI18n()
// СОСТОЯНИЕ МЫШИ, КАСАНИЯ И ЦЕЛИ ПЕРЕТАСКИВАНИЯ ИГРОКА
const draggingPlayerId = ref<string | null>(null)
const dragOverSlotId = ref<string | null>(null)
const dragOverGroup = ref<'substitutes' | 'reserve' | null>(null)
const selectedTouchPayload = ref<DragPayload | null>(null)
const activeSection = ref<'lineup' | 'tactics' | 'stats' | 'contracts'>('lineup')
let pointerDragState: PointerDragState | null = null
let suppressNextSlotClick = false

// СОЗДАЁТ КАРТУ ИГРОКОВ ПО ИДЕНТИФИКАТОРАМ
const playersById = computed(() => {
  const club = squadStore.club
  return new Map((club?.squad ?? []).map((player) => [player.id, player]))
})

// СОПОСТАВЛЯЕТ ПОЗИЦИИ С НАЗНАЧЕННЫМИ ИГРОКАМИ
const assignedPlayerBySlot = computed<Record<string, Player | undefined>>(() => {
  const lineup = squadStore.lineup
  if (!lineup) {
    return {}
  }

  return Object.fromEntries(
    squadStore.slots.map((slot) => {
      const playerId = lineup.starters[slot.id]
      return [slot.id, playerId ? playersById.value.get(playerId) : undefined]
    }),
  )
})

// ФОРМИРУЕТ НАБОР ИДЕНТИФИКАТОРОВ СТАРТОВЫХ ИГРОКОВ
const starterIds = computed(() => {
  const lineup = squadStore.lineup
  if (!lineup) {
    return new Set<string>()
  }
  return new Set(
    Object.values(lineup.starters).filter(
      (playerId): playerId is string => typeof playerId === 'string',
    ),
  )
})

// ВОЗВРАЩАЕТ СПИСОК ЗАПАСНЫХ ИГРОКОВ
const substitutePlayers = computed(() => {
  const lineup = squadStore.lineup
  if (!lineup) {
    return []
  }

  return lineup.substitutes
    .map((playerId) => playersById.value.get(playerId))
    .filter((player): player is Player => Boolean(player))
})

// ВОЗВРАЩАЕТ ОТСОРТИРОВАННЫЙ СПИСОК РЕЗЕРВИСТОВ
const reservePlayers = computed(() => {
  const club = squadStore.club
  const lineup = squadStore.lineup
  if (!club || !lineup) {
    return []
  }

  const substituteIds = new Set(lineup.substitutes)
  return [...club.squad]
    .filter((player) => !starterIds.value.has(player.id) && !substituteIds.has(player.id))
    .sort((left, right) => right.rating - left.rating || right.form - left.form)
})

// РАССЧИТЫВАЕТ ОБЩУЮ СТОИМОСТЬ СОСТАВА
const totalValue = computed(
  () => squadStore.club?.squad.reduce((sum, player) => sum + player.value, 0) ?? 0,
)

const playerStats = (playerId: string): PlayerStats =>
  squadStore.gameStats[playerId] ?? {
    appearances: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    cleanSheets: 0,
    averageRating: 0,
    matchesRated: 0,
  }

const statisticsRows = computed<PlayerStatisticsRow[]>(() =>
  (squadStore.club?.squad ?? []).map((player) => {
    const stats = playerStats(player.id)
    return {
      id: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: positionLabels[player.position],
      appearances: stats.appearances,
      goals: stats.goals,
      assists: stats.assists,
      cleanSheets: stats.cleanSheets,
      yellowCards: stats.yellowCards,
      redCards: stats.redCards,
      averageRating: stats.averageRating,
      matchesRated: stats.matchesRated,
    }
  }),
)

const contractRows = computed<PlayerContractRow[]>(() =>
  (squadStore.club?.squad ?? []).map((player) => ({
    id: player.id,
    name: `${player.firstName} ${player.lastName}`,
    position: positionLabels[player.position],
    age: player.age,
    retirementSeasons: seasonsUntilPlayerRetirement(player.age),
  })),
)

const retirementLabel = (seasons: number): string => {
  return seasons === 1
    ? t('squad.retirement.currentSeason')
    : t('squad.retirement.inSeasons', { count: seasons })
}

// ВОЗВРАЩАЕТ ПЕРВОЕ СООБЩЕНИЕ ОБ ОШИБКЕ СОСТАВА
const validationMessage = computed(() => squadStore.validation.errors[0] ?? '')

const positionLabels: Record<PlayerPosition, string> = {
  GK: t('common.positionShort.GK'),
  LB: t('common.positionShort.LB'),
  CB: t('common.positionShort.CB'),
  RB: t('common.positionShort.RB'),
  CDM: t('common.positionShort.CDM'),
  CM: t('common.positionShort.CM'),
  CAM: t('common.positionShort.CAM'),
  LW: t('common.positionShort.LW'),
  RW: t('common.positionShort.RW'),
  ST: t('common.positionShort.ST'),
}

const currentTactics = computed<TeamTacticsSettings>(() => ({
  ...defaultTeamTactics(squadStore.lineup?.tacticalStyle ?? 'balanced'),
  ...squadStore.lineup?.tactics,
}))

const clampValue = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, Math.round(value)))

const nextOpponent = computed<Club | undefined>(() => {
  const game = gameStore.game
  const nextMatch = gameStore.nextMatch
  if (!game || !nextMatch) return undefined
  const opponentId =
    nextMatch.homeClubId === game.selectedClubId ? nextMatch.awayClubId : nextMatch.homeClubId
  return clubStore.getClubById(opponentId)
})

const nextMatchVenue = computed(() => {
  const game = gameStore.game
  const nextMatch = gameStore.nextMatch
  if (!game || !nextMatch) return ''
  return nextMatch.homeClubId === game.selectedClubId ? 'дома' : 'в гостях'
})

const slotRoleId = (slotId: string, position: PlayerPosition): PlayerRoleId => {
  const roleId = squadStore.lineup?.roles?.[slotId]
  const available = rolesForPosition(position)
  return roleId && available.some((role) => role.id === roleId)
    ? roleId
    : defaultRoleForPosition(position)
}

const roleShortLabel = (slotId: string, position: PlayerPosition): string =>
  getPlayerRole(slotRoleId(slotId, position)).shortLabel

const starterRoleRows = computed<StarterRoleRow[]>(() =>
  squadStore.slots
    .map((slot) => {
      const player = slotPlayer(slot.id)
      if (!player) return undefined
      const options = rolesForPosition(slot.position)
      return {
        slotId: slot.id,
        slotLabel: positionLabels[slot.position],
        player,
        roleId: slotRoleId(slot.id, slot.position),
        options,
      }
    })
    .filter((row): row is StarterRoleRow => Boolean(row)),
)

const selectedRoleEffects = computed(() => {
  const base = { attack: 0, control: 0, defense: 0, pressing: 0, width: 0, risk: 0, fatigue: 0 }
  for (const row of starterRoleRows.value) {
    const effects = getPlayerRole(row.roleId).effects
    base.attack += effects.attack
    base.control += effects.control
    base.defense += effects.defense
    base.pressing += effects.pressing
    base.width += effects.width
    base.risk += effects.risk
    base.fatigue += effects.fatigue
  }
  const divider = Math.max(1, starterRoleRows.value.length)
  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => [key, value / divider]),
  ) as typeof base
})

const formationProfile = computed(() => {
  const slots = squadStore.slots
  const defenders = slots.filter((slot) => ['LB', 'CB', 'RB'].includes(slot.position)).length
  const midfielders = slots.filter((slot) => ['CDM', 'CM', 'CAM'].includes(slot.position)).length
  const forwards = slots.filter((slot) => ['LW', 'RW', 'ST'].includes(slot.position)).length
  const widePlayers = slots.filter((slot) => ['LB', 'RB', 'LW', 'RW'].includes(slot.position)).length
  const centerPlayers = slots.filter((slot) => ['CDM', 'CM', 'CAM', 'ST'].includes(slot.position)).length
  return { defenders, midfielders, forwards, widePlayers, centerPlayers }
})

const tacticalIndicators = computed<TacticalIndicator[]>(() => {
  const tactics = currentTactics.value
  const roles = selectedRoleEffects.value
  const formation = formationProfile.value
  const mentalityAttack = {
    parkTheBus: -18,
    defensive: -9,
    balanced: 0,
    attacking: 9,
    allOutAttack: 18,
  }[tactics.mentality]
  const tempoAttack = tactics.tempo === 'fast' ? 8 : tactics.tempo === 'slow' ? -6 : 0
  const pressing = tactics.pressing === 'high' ? 18 : tactics.pressing === 'low' ? -10 : 3
  const lineRisk = tactics.defensiveLine === 'high' ? 13 : tactics.defensiveLine === 'low' ? -7 : 2
  const tacklingRisk = tactics.tackling === 'hard' ? 8 : tactics.tackling === 'cautious' ? -5 : 1
  const width = tactics.width === 'wide' ? 15 : tactics.width === 'narrow' ? -8 : 3
  const attackPlanControl =
    tactics.attackPlan === 'shortPassing'
      ? 14
      : tactics.attackPlan === 'centralPlay'
        ? 8
        : tactics.attackPlan === 'directPassing' || tactics.attackPlan === 'earlyCrosses'
          ? -5
          : 2
  const attackPlanChance =
    tactics.attackPlan === 'throughBalls'
      ? 12
      : tactics.attackPlan === 'earlyCrosses'
        ? 9
        : tactics.attackPlan === 'widePlay'
          ? 7
          : tactics.attackPlan === 'centralPlay'
            ? 5
            : 3

  const chanceCreation = clampValue(
    48 + mentalityAttack + tempoAttack + attackPlanChance + roles.attack * 2 + formation.forwards * 3,
  )
  const control = clampValue(
    50 + attackPlanControl + roles.control * 2 + formation.midfielders * 4 - (tactics.tempo === 'fast' ? 6 : 0),
  )
  const defensiveSecurity = clampValue(
    48 +
      roles.defense * 2 +
      formation.defenders * 5 -
      mentalityAttack * 0.65 -
      lineRisk -
      (tactics.defensiveShape === 'compact' ? -6 : tactics.defensiveShape === 'wide' ? 3 : 0),
  )
  const pressingPower = clampValue(38 + pressing + roles.pressing * 2 + (tactics.tempo === 'fast' ? 5 : 0))
  const attackingWidth = clampValue(42 + width + roles.width * 2 + formation.widePlayers * 4)
  const transitionRisk = clampValue(
    38 + Math.max(0, mentalityAttack) + lineRisk + tacklingRisk + roles.risk * 2 - formation.defenders * 2,
  )
  const workload = clampValue(
    35 +
      roles.fatigue * 2 +
      (tactics.pressing === 'high' ? 18 : tactics.pressing === 'low' ? -6 : 4) +
      (tactics.tempo === 'fast' ? 14 : tactics.tempo === 'slow' ? -5 : 3) +
      (tactics.tackling === 'hard' ? 7 : 0),
  )

  return [
    {
      key: 'chance',
      label: 'Создание моментов',
      value: chanceCreation,
      description: 'Насколько план помогает регулярно доводить атаки до ударов.',
      tone: 'bg-emerald-500',
    },
    {
      key: 'control',
      label: 'Контроль мяча',
      value: control,
      description: 'Способность держать темп и не отдавать матч хаосу.',
      tone: 'bg-sky-500',
    },
    {
      key: 'defense',
      label: 'Защита',
      value: defensiveSecurity,
      description: 'Насколько команда защищена от позиционных атак и провалов.',
      tone: 'bg-indigo-500',
    },
    {
      key: 'pressing',
      label: 'Прессинг',
      value: pressingPower,
      description: 'Агрессия без мяча и шанс вернуть владение высоко.',
      tone: 'bg-lime-500',
    },
    {
      key: 'width',
      label: 'Ширина',
      value: attackingWidth,
      description: 'Насколько активно команда растягивает фланги.',
      tone: 'bg-cyan-500',
    },
    {
      key: 'risk',
      label: 'Риск контратак',
      value: transitionRisk,
      description: 'Чем выше, тем больше пространства можно оставить сопернику.',
      tone: 'bg-amber-500',
    },
    {
      key: 'workload',
      label: 'Нагрузка',
      value: workload,
      description: 'Сколько сил план будет забирать у стартового состава.',
      tone: 'bg-rose-500',
    },
  ]
})

const indicatorText = (value: number): string => {
  if (value >= 72) return 'Высоко'
  if (value >= 48) return 'Средне'
  return 'Низко'
}

const scoutReportItems = computed<string[]>(() => {
  const opponent = nextOpponent.value
  const own = squadStore.club
  if (!opponent || !own) {
    return ['Следующий соперник пока не определён — настройте базовую модель игры под сильные стороны состава.']
  }
  const ownRating = calculateClubRating(own, squadStore.lineup)
  const opponentRating = calculateClubRating(opponent)
  const ratingGap = Number((ownRating - opponentRating).toFixed(1))
  const opponentDefense = opponent.defenseRating
  const opponentMidfield = opponent.midfieldRating
  const opponentAttack = opponent.attackRating
  const items: string[] = []

  if (ratingGap >= 5) {
    items.push(`${opponent.shortName} заметно слабее по общему рейтингу — можно играть смелее и давить выше.`)
  } else if (ratingGap <= -5) {
    items.push(`${opponent.shortName} сильнее по рейтингу — лучше заранее закрыть центр и снизить риск потерь.`)
  } else {
    items.push(`${opponent.shortName} близок по силе — детали плана и роли игроков могут решить матч.`)
  }

  if (opponentDefense <= opponentMidfield - 3 || opponentDefense <= opponentAttack - 3) {
    items.push('Защита соперника выглядит слабее остальных линий: быстрый темп и роли под завершение могут дать шанс.')
  } else if (opponentDefense >= opponentAttack + 4) {
    items.push('Оборона соперника крепкая: пригодятся плеймейкеры, ширина и терпеливое владение.')
  }

  if (opponentAttack >= opponentDefense + 4 || opponentAttack >= opponentMidfield + 4) {
    items.push('Атака соперника — главная угроза. Высокая линия и жёсткий прессинг будут рискованнее обычного.')
  }

  if (opponentMidfield < opponentAttack && opponentMidfield < opponentDefense) {
    items.push('Центр поля соперника уязвим: можно перегружать середину и играть через плеймейкера.')
  }

  return items.slice(0, 4)
})

// ВОЗВРАЩАЕТ ЦВЕТОВОЙ КЛАСС РЕЙТИНГА
const ratingClass = (rating: number): string => {
  if (rating >= 75) {
    return 'bg-emerald-700'
  }
  if (rating >= 64) {
    return 'bg-amber-600'
  }
  return 'bg-orange-700'
}

// ВОЗВРАЩАЕТ ИГРОКА НА УКАЗАННОЙ ПОЗИЦИИ
const slotPlayer = (slotId: string): Player | undefined => assignedPlayerBySlot.value[slotId]

// ПОКАЗЫВАЕТ СРОК ВОЗВРАЩЕНИЯ ТРАВМИРОВАННОГО ИГРОКА
const injuryLabel = (player: Player | undefined): string => {
  if (!player?.isInjured) {
    return ''
  }
  return player.injuryUntilOrder
    ? t('squad.injuryReturn', { round: player.injuryUntilOrder })
    : t('squad.injury')
}

const suspensionLabel = (player: Player | undefined): string => {
  if (!player || !isPlayerSuspended(player)) return ''
  return player.suspensionReason === 'second-yellow'
    ? t('squad.secondYellowSuspension')
    : t('squad.suspension')
}

const availabilityLabel = (player: Player | undefined): string => {
  if (!player) return ''
  return [injuryLabel(player), suspensionLabel(player)].filter(Boolean).join(' · ')
}

// ФОРМИРУЕТ ПОДПИСЬ ТЕКУЩЕЙ ФОРМЫ И ГОТОВНОСТИ ИГРОКА
const conditionLabel = (player: Player): string =>
  t('squad.formFitness', { form: player.form, fitness: player.fitness.toFixed(0) })

// ДОБАВЛЯЕТ ВОЗРАСТ К ПОДПИСИ СОСТОЯНИЯ ИГРОКА
const conditionWithAgeLabel = (player: Player): string =>
  t('squad.formFitnessAge', {
    form: player.form,
    fitness: player.fitness.toFixed(0),
    age: t('common.age', { age: player.age }),
  })

// ИЗМЕНЯЕТ ТАКТИЧЕСКУЮ СХЕМУ
const setFormation = (event: Event): void => {
  squadStore.setFormation((event.target as HTMLSelectElement).value as Formation)
}

const setRole = (slotId: string, event: Event): void => {
  squadStore.setPlayerRole(slotId, (event.target as HTMLSelectElement).value as PlayerRoleId)
}

// ИЗВЛЕКАЕТ ДАННЫЕ ИГРОКА ИЗ СОБЫТИЯ ПЕРЕТАСКИВАНИЯ
const dragPayload = (event: DragEvent): DragPayload | undefined => {
  const raw = event.dataTransfer?.getData('application/json')
  if (!raw) {
    return undefined
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DragPayload>
    if (!parsed.playerId || !parsed.source) {
      return undefined
    }
    return parsed as DragPayload
  } catch {
    return undefined
  }
}

// ЗАПУСКАЕТ ДЕСКТОПНОЕ ПЕРЕТАСКИВАНИЕ ИГРОКА
const startPlayerDrag = (
  event: DragEvent,
  player: Player,
  source: DragSource,
  slotId?: string,
): void => {
  const payload: DragPayload = { playerId: player.id, source, slotId }
  draggingPlayerId.value = player.id
  event.dataTransfer?.setData('application/json', JSON.stringify(payload))
  event.dataTransfer?.setData('text/plain', player.id)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

// ЗАВЕРШАЕТ ПЕРЕТАСКИВАНИЕ И СБРАСЫВАЕТ ПОДСВЕТКУ
const endPlayerDrag = (): void => {
  draggingPlayerId.value = null
  dragOverSlotId.value = null
  dragOverGroup.value = null
}

// ПЕРЕМЕЩАЕТ ИГРОКА НА ПОЗИЦИЮ
const movePayloadToSlot = (payload: DragPayload, slotId: string): void => {
  squadStore.movePlayerToSlot(slotId, payload.playerId, payload.source, payload.slotId)
}

// МЕНЯЕТ ПЕРЕТАСКИВАЕМОГО ИГРОКА С ЗАПАСНЫМ
const movePayloadToSubstitutePlayer = (payload: DragPayload, targetPlayer: Player): void => {
  if (payload.playerId === targetPlayer.id) {
    return
  }

  if (payload.source === 'starter' && payload.slotId) {
    squadStore.movePlayerToSlot(payload.slotId, targetPlayer.id, 'substitute')
  } else if (payload.source === 'reserve') {
    squadStore.swapSubstituteWithReserve(targetPlayer.id, payload.playerId)
  }
}

// МЕНЯЕТ ПЕРЕТАСКИВАЕМОГО ИГРОКА С РЕЗЕРВИСТОМ
const movePayloadToReservePlayer = (payload: DragPayload, targetPlayer: Player): void => {
  if (payload.playerId === targetPlayer.id) {
    return
  }

  if (payload.source === 'starter' && payload.slotId) {
    squadStore.movePlayerToSlot(payload.slotId, targetPlayer.id, 'reserve')
  } else if (payload.source === 'substitute') {
    squadStore.swapSubstituteWithReserve(payload.playerId, targetPlayer.id)
  }
}

// ОБРАБАТЫВАЕТ СБРОС ИГРОКА НА ПОЗИЦИЮ
const dropOnSlot = (event: DragEvent, slotId: string): void => {
  const payload = dragPayload(event)
  if (!payload) {
    return
  }
  movePayloadToSlot(payload, slotId)
  endPlayerDrag()
}

// ОБРАБАТЫВАЕТ СБРОС НА ЗАПАСНОГО ИГРОКА
const dropOnSubstitutePlayer = (event: DragEvent, targetPlayer: Player): void => {
  const payload = dragPayload(event)
  if (!payload) {
    endPlayerDrag()
    return
  }
  movePayloadToSubstitutePlayer(payload, targetPlayer)
  endPlayerDrag()
}

// ОБРАБАТЫВАЕТ СБРОС НА ИГРОКА РЕЗЕРВА
const dropOnReservePlayer = (event: DragEvent, targetPlayer: Player): void => {
  const payload = dragPayload(event)
  if (!payload) {
    endPlayerDrag()
    return
  }
  movePayloadToReservePlayer(payload, targetPlayer)
  endPlayerDrag()
}

// ОБРАБАТЫВАЕТ СБРОС В ОБЛАСТЬ ЗАПАСНЫХ
const dropOnSubstitutes = (event: DragEvent): void => {
  const payload = dragPayload(event)
  if (!payload) {
    return
  }
  squadStore.movePlayerToSubstitutes(payload.playerId)
  endPlayerDrag()
}

// ОБРАБАТЫВАЕТ СБРОС В ОБЛАСТЬ РЕЗЕРВА
const dropOnReserve = (event: DragEvent): void => {
  const payload = dragPayload(event)
  if (!payload) {
    return
  }
  squadStore.movePlayerToReserve(payload.playerId)
  endPlayerDrag()
}

// СРАВНИВАЕТ ДВА ОПИСАНИЯ ПЕРЕМЕЩЕНИЯ
const samePayload = (left: DragPayload, right: DragPayload): boolean =>
  left.playerId === right.playerId && left.source === right.source && left.slotId === right.slotId

// ВОЗВРАЩАЕТ ИГРОКА ИЗ МОБИЛЬНОЙ ЦЕЛИ КАСАНИЯ
const playerFromTouchTarget = (element: HTMLElement): Player | undefined => {
  const playerId = element.dataset.substitutePlayerId ?? element.dataset.reservePlayerId
  return playerId ? playersById.value.get(playerId) : undefined
}

// ПРИМЕНЯЕТ МОБИЛЬНОЕ ПЕРЕМЕЩЕНИЕ К ВЫБРАННОЙ ЦЕЛИ
const applyTouchDrop = (payload: DragPayload, element: HTMLElement): void => {
  const slotId = element.dataset.slotId
  if (slotId) {
    movePayloadToSlot(payload, slotId)
    return
  }

  const targetPlayer = playerFromTouchTarget(element)
  if (targetPlayer && element.dataset.substitutePlayerId) {
    movePayloadToSubstitutePlayer(payload, targetPlayer)
    return
  }
  if (targetPlayer && element.dataset.reservePlayerId) {
    movePayloadToReservePlayer(payload, targetPlayer)
    return
  }

  if (element.dataset.dropGroup === 'substitutes') {
    squadStore.movePlayerToSubstitutes(payload.playerId)
  } else if (element.dataset.dropGroup === 'reserve') {
    squadStore.movePlayerToReserve(payload.playerId)
  }
}

// НАХОДИТ ЦЕЛЬ ПЕРЕМЕЩЕНИЯ ПОД УКАЗАННОЙ ТОЧКОЙ
const touchDropTargetAt = (x: number, y: number): HTMLElement | null =>
  document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-touch-drop]') ?? null

// ОБНОВЛЯЕТ ПОДСВЕТКУ МОБИЛЬНОЙ ЦЕЛИ
const updateTouchDropHighlight = (element: HTMLElement | null): void => {
  dragOverSlotId.value = element?.dataset.slotId ?? null
  const group = element?.dataset.dropGroup
  dragOverGroup.value = group === 'substitutes' || group === 'reserve' ? group : null
}

// ОБРАБАТЫВАЕТ МОБИЛЬНУЮ ЗАМЕНУ ЧЕРЕЗ ДВА КАСАНИЯ
const handleTouchTap = (payload: DragPayload, targetElement: HTMLElement): void => {
  const selected = selectedTouchPayload.value
  if (!selected) {
    selectedTouchPayload.value = payload
    return
  }
  if (samePayload(selected, payload)) {
    selectedTouchPayload.value = null
    return
  }

  applyTouchDrop(selected, targetElement)
  selectedTouchPayload.value = null
}

// ЗАПУСКАЕТ МОБИЛЬНОЕ ПЕРЕТАСКИВАНИЕ УКАЗАТЕЛЕМ
const startPointerDrag = (
  event: PointerEvent,
  player: Player,
  source: DragSource,
  slotId?: string,
): void => {
  if (event.pointerType === 'mouse') {
    return
  }

  pointerDragState = {
    active: false,
    payload: { playerId: player.id, source, slotId },
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

// ОБНОВЛЯЕТ МОБИЛЬНОЕ ПЕРЕТАСКИВАНИЕ
const movePointerDrag = (event: PointerEvent): void => {
  const state = pointerDragState
  if (!state || state.pointerId !== event.pointerId) {
    return
  }

  if (!state.active && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 8) {
    return
  }

  state.active = true
  draggingPlayerId.value = state.payload.playerId
  event.preventDefault()
  updateTouchDropHighlight(touchDropTargetAt(event.clientX, event.clientY))
}

// ЗАВЕРШАЕТ МОБИЛЬНОЕ ПЕРЕТАСКИВАНИЕ
const finishPointerDrag = (event: PointerEvent): void => {
  const state = pointerDragState
  if (!state || state.pointerId !== event.pointerId) {
    return
  }

  const target = touchDropTargetAt(event.clientX, event.clientY)
  if (state.active) {
    event.preventDefault()
    if (target) {
      applyTouchDrop(state.payload, target)
    }
    selectedTouchPayload.value = null
  } else {
    handleTouchTap(state.payload, target ?? (event.currentTarget as HTMLElement))
  }

  suppressNextSlotClick = true
  window.setTimeout(() => {
    suppressNextSlotClick = false
  })
  pointerDragState = null
  endPlayerDrag()
}

// ОТМЕНЯЕТ МОБИЛЬНОЕ ПЕРЕТАСКИВАНИЕ
const cancelPointerDrag = (): void => {
  pointerDragState = null
  endPlayerDrag()
}

// ПЕРЕМЕЩАЕТ ВЫБРАННОГО КАСАНИЕМ ИГРОКА НА ПОЗИЦИЮ
const selectTouchSlot = (slotId: string): void => {
  if (suppressNextSlotClick || !selectedTouchPayload.value) {
    return
  }
  movePayloadToSlot(selectedTouchPayload.value, slotId)
  selectedTouchPayload.value = null
}

const selectSlotForMove = (slotId: string): void => {
  if (!selectedTouchPayload.value) {
    return
  }
  movePayloadToSlot(selectedTouchPayload.value, slotId)
  selectedTouchPayload.value = null
}

const selectPlayerForMove = (player: Player, source: DragSource, slotId?: string): void => {
  const payload: DragPayload = { playerId: player.id, source, slotId }
  const selected = selectedTouchPayload.value
  if (!selected) {
    selectedTouchPayload.value = payload
    return
  }
  if (samePayload(selected, payload)) {
    selectedTouchPayload.value = null
    return
  }

  if (source === 'starter' && slotId) {
    movePayloadToSlot(selected, slotId)
  } else if (source === 'substitute') {
    movePayloadToSubstitutePlayer(selected, player)
  } else {
    movePayloadToReservePlayer(selected, player)
  }
  selectedTouchPayload.value = null
}

// ПРОВЕРЯЕТ ВЫБОР ИГРОКА НА МОБИЛЬНОМ УСТРОЙСТВЕ
const isTouchSelected = (playerId: string): boolean =>
  selectedTouchPayload.value?.playerId === playerId

const selectGroupForMove = (group: 'substitutes' | 'reserve'): void => {
  const selected = selectedTouchPayload.value
  if (!selected) {
    return
  }
  if (group === 'substitutes') {
    squadStore.movePlayerToSubstitutes(selected.playerId)
  } else {
    squadStore.movePlayerToReserve(selected.playerId)
  }
  selectedTouchPayload.value = null
}

// ПОКАЗЫВАЕТ ПРЕДУПРЕЖДЕНИЕ ПРИ ОШИБКЕ СОСТАВА
watch(
  validationMessage,
  (message, previousMessage) => {
    if (!message || message === previousMessage) {
      return
    }
    toastStore.show(message, 'warning')
  },
  { immediate: true },
)

// ИСПРАВЛЯЕТ НЕКОРРЕКТНЫЙ СОСТАВ ПЕРЕД УХОДОМ СО СТРАНИЦЫ
onBeforeRouteLeave(() => {
  if (squadStore.club && squadStore.lineup && !squadStore.validation.valid) {
    squadStore.resetLineup()
    toastStore.show(t('squad.lineupFixed'), 'warning')
  }
})
</script>

<template>
  <!-- СТРАНИЦА УПРАВЛЕНИЯ СОСТАВОМ -->
  <section
    v-if="squadStore.club && squadStore.lineup"
    class="flex flex-col gap-3 xl:h-full xl:min-h-0 xl:overflow-hidden"
  >
    <!-- НАСТРОЙКИ ФОРМАЦИИ И ТАКТИКИ -->
    <SectionHero
      :title="t('squad.title')"
      :subtitle="`${squadStore.club.name} ${t('common.separator')} ${t('common.playersCount', { count: squadStore.club.squad.length })} ${t('common.separator')} ${formatMoney(totalValue)}`"
    >
      <template #actions>
        <div class="flex flex-wrap items-end gap-2">
          <div class="flex h-9 rounded-lg bg-emerald-950/60 p-1 text-xs font-black">
            <button
              type="button"
              class="rounded-md px-3"
              :class="activeSection === 'lineup' ? 'bg-white text-emerald-900' : 'text-emerald-100'"
              @click="activeSection = 'lineup'"
            >
              Состав
            </button>
            <button
              type="button"
              class="rounded-md px-3"
              :class="activeSection === 'stats' ? 'bg-white text-emerald-900' : 'text-emerald-100'"
              @click="activeSection = 'stats'"
            >
              Статистика
            </button>
            <button
              type="button"
              class="rounded-md px-3"
              :class="
                activeSection === 'tactics' ? 'bg-white text-emerald-900' : 'text-emerald-100'
              "
              @click="activeSection = 'tactics'"
            >
              Тактика
            </button>
            <button
              type="button"
              class="rounded-md px-3"
              :class="
                activeSection === 'contracts' ? 'bg-white text-emerald-900' : 'text-emerald-100'
              "
              @click="activeSection = 'contracts'"
            >
              {{ t('squad.contracts') }}
            </button>
          </div>
          <div
            class="flex h-9 items-center gap-1 self-end rounded-lg border border-emerald-700 bg-emerald-900 px-3 text-sm font-black text-white"
          >
            <span class="text-xs font-bold text-emerald-100/70">
              {{ t('dashboard.rating') }}
            </span>
            <span>{{ squadStore.teamRating }}</span>
            <span class="text-[10px] text-emerald-100/50">/ 100</span>
          </div>
          <label class="flex flex-col gap-1 text-xs font-bold text-emerald-100/70">
            {{ t('squad.formation') }}
            <select
              class="h-9 rounded-lg border border-emerald-700 bg-emerald-900 px-3 text-sm text-white outline-none focus:border-emerald-400"
              :value="squadStore.lineup.formation"
              @change="setFormation"
            >
              <option
                v-for="formation in squadStore.formations"
                :key="formation"
                :value="formation"
                class="bg-emerald-950 text-white"
              >
                {{ formation }}
              </option>
            </select>
          </label>
          <Button
            class="!h-9 self-end"
            severity="secondary"
            :label="t('squad.autoLineup')"
            @click="squadStore.resetLineup"
          />
        </div>
      </template>
    </SectionHero>

    <!-- ТАКТИЧЕСКАЯ СХЕМА И СПИСОК КОМАНДЫ -->
    <div
      v-if="activeSection === 'lineup'"
      class="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]"
    >
      <!-- СТАРТОВЫЙ СОСТАВ И ЗАПАСНЫЕ -->
      <div
        class="grid grid-rows-[520px_112px] gap-3 overflow-hidden xl:min-h-0 xl:grid-rows-[minmax(0,1fr)_112px]"
      >
        <!-- ТАКТИЧЕСКОЕ ПОЛЕ -->
        <div
          class="relative min-h-0 overflow-hidden rounded-lg border border-white/15 bg-[linear-gradient(115deg,rgba(255,255,255,0.06)_0_16%,transparent_16%_100%),linear-gradient(90deg,rgba(255,255,255,0.04)_50%,transparent_50%),linear-gradient(180deg,#152233,#101928)] shadow-[0_22px_60px_rgba(15,23,42,0.18)]"
        >
          <div
            class="pointer-events-none absolute inset-[26px] rounded-lg border-2 border-white/30"
          ></div>
          <div
            class="pointer-events-none absolute inset-x-[26px] top-1/2 border-t-2 border-white/30"
          ></div>
          <div
            class="pointer-events-none absolute left-1/2 top-1/2 h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30"
          ></div>
          <div
            class="pointer-events-none absolute left-1/2 top-[26px] h-[104px] w-[260px] -translate-x-1/2 rounded-b-lg border-2 border-t-0 border-white/30"
          ></div>
          <div
            class="pointer-events-none absolute bottom-[26px] left-1/2 h-[104px] w-[260px] -translate-x-1/2 rounded-t-lg border-2 border-b-0 border-white/30"
          ></div>

          <button
            v-for="slot in squadStore.slots"
            :key="slot.id"
            type="button"
            data-touch-drop
            :data-slot-id="slot.id"
            class="absolute grid min-h-[58px] w-[62px] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_auto_auto_auto] justify-items-start gap-0.5 rounded-lg border border-slate-400/30 bg-slate-950/85 p-1 text-left text-slate-50 shadow-[0_12px_26px_rgba(2,6,23,0.22)] transition hover:-translate-y-[52%] hover:border-lime-200 sm:min-h-[68px] sm:w-[88px] sm:p-1.5 xl:min-h-[74px] xl:w-[126px] xl:gap-1 xl:p-[6px_7px]"
            :class="{
              'border-dashed bg-slate-950/60': !slotPlayer(slot.id),
              'border-lime-400 shadow-[0_0_0_2px_rgba(163,230,53,0.24),0_12px_26px_rgba(2,6,23,0.22)]':
                slot.id === dragOverSlotId,
              'border-cyan-300 ring-2 ring-cyan-300 shadow-[0_0_0_4px_rgba(103,232,249,0.18),0_12px_26px_rgba(2,6,23,0.22)]':
                Boolean(slotPlayer(slot.id)) && isTouchSelected(slotPlayer(slot.id)!.id),
              'opacity-45': slotPlayer(slot.id)?.id === draggingPlayerId,
              'border-rose-400 ring-2 ring-rose-500/50':
                Boolean(slotPlayer(slot.id)) && isPlayerUnavailable(slotPlayer(slot.id)!),
            }"
            :style="{ left: `${slot.x}%`, top: `${slot.y}%` }"
            @click="
              slotPlayer(slot.id)
                ? selectPlayerForMove(slotPlayer(slot.id)!, 'starter', slot.id)
                : selectSlotForMove(slot.id)
            "
          >
            <template v-if="slotPlayer(slot.id)">
              <span
                v-if="isTouchSelected(slotPlayer(slot.id)!.id)"
                class="absolute -left-2 -top-2 z-10 rounded-full border border-white bg-cyan-400 px-2 py-0.5 text-[9px] font-black uppercase leading-none text-slate-950 shadow-lg"
              >
                выбран
              </span>
              <span
                v-if="isPlayerUnavailable(slotPlayer(slot.id)!)"
                class="absolute -right-2 -top-2 z-10 flex items-center gap-0.5"
              >
                <span
                  v-if="slotPlayer(slot.id)?.isInjured"
                  :title="injuryLabel(slotPlayer(slot.id))"
                  :aria-label="injuryLabel(slotPlayer(slot.id))"
                  class="inline-grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-orange-500 text-xs font-black text-white shadow-lg"
                  >✚</span
                >
                <span
                  v-if="isPlayerSuspended(slotPlayer(slot.id)!)"
                  :title="suspensionLabel(slotPlayer(slot.id))"
                  :aria-label="suspensionLabel(slotPlayer(slot.id))"
                  class="inline-grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-rose-600 text-[11px] shadow-lg"
                  >🟥</span
                >
              </span>
              <span class="flex items-center gap-1.5">
                <span
                  class="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.52rem] font-black leading-none text-white sm:h-[26px] sm:min-w-[26px] sm:text-xs xl:h-[30px] xl:min-w-[30px] xl:text-[0.7rem]"
                >
                  {{ positionLabels[slotPlayer(slot.id)?.position ?? slot.position] }}
                </span>
                <span
                  class="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-white/80 text-[0.52rem] font-black leading-none text-white sm:h-[26px] sm:min-w-[26px] sm:text-xs xl:h-[30px] xl:min-w-[30px] xl:text-[0.7rem]"
                  :class="ratingClass(slotPlayer(slot.id)?.rating ?? 0)"
                >
                  {{ slotPlayer(slot.id)?.rating }}
                </span>
              </span>
              <span
                class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.55rem] font-black uppercase sm:text-[0.68rem] xl:text-[0.78rem]"
              >
                {{ slotPlayer(slot.id)?.lastName }}
              </span>
              <span
                class="hidden rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-emerald-100 sm:inline-flex"
              >
                {{ roleShortLabel(slot.id, slot.position) }}
              </span>
              <span
                class="hidden w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] font-bold text-slate-200/75 sm:block"
              >
                <template v-if="isPlayerUnavailable(slotPlayer(slot.id)!)">
                  {{ availabilityLabel(slotPlayer(slot.id)) }}
                </template>
                <template v-else>
                  {{ conditionLabel(slotPlayer(slot.id)!) }}
                </template>
              </span>
              <span
                class="hidden h-1.5 w-full overflow-hidden rounded-full bg-slate-400/35 sm:block"
              >
                <span
                  class="block h-full rounded-full bg-lime-400"
                  :style="{ width: `${slotPlayer(slot.id)?.fitness ?? 0}%` }"
                ></span>
              </span>
            </template>
            <template v-else>
              <span class="flex items-center gap-1.5">
                <span
                  class="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.52rem] font-black leading-none text-white sm:h-[26px] sm:min-w-[26px] sm:text-xs xl:h-[30px] xl:min-w-[30px] xl:text-[0.7rem]"
                >
                  {{ positionLabels[slot.position] }}
                </span>
                <span
                  class="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-white/80 bg-orange-700 text-[0.52rem] font-black leading-none text-white sm:h-[26px] sm:min-w-[26px] sm:text-xs xl:h-[30px] xl:min-w-[30px] xl:text-[0.7rem]"
                  >?</span
                >
              </span>
              <span
                class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.55rem] font-black uppercase sm:text-[0.68rem] xl:text-[0.78rem]"
                >{{ t('squad.empty') }}</span
              >
              <span
                class="hidden w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] font-bold text-slate-200/75 sm:block"
                >{{ t('squad.dragPlayer') }}</span
              >
            </template>
          </button>
        </div>

        <!-- ЛЕНТА ЗАПАСНЫХ ИГРОКОВ -->
        <div
          data-touch-drop
          data-drop-group="substitutes"
          class="grid min-h-0 grid-cols-[repeat(7,minmax(92px,1fr))] gap-2 overflow-x-auto rounded-lg border border-white/70 bg-[linear-gradient(115deg,rgba(255,255,255,0.06)_0_18%,transparent_18%_100%),#121d2e] p-2.5 shadow-[0_12px_32px_rgba(20,46,38,0.08)]"
          :class="{
            'shadow-[0_0_0_2px_rgba(163,230,53,0.34),0_12px_32px_rgba(20,46,38,0.08)]':
              dragOverGroup === 'substitutes',
          }"
          @click="selectGroupForMove('substitutes')"
        >
          <button
            v-for="player in substitutePlayers"
            :key="player.id"
            type="button"
            data-touch-drop
            :data-substitute-player-id="player.id"
            class="relative grid min-w-[92px] grid-rows-[auto_auto_auto_auto] justify-items-start gap-0.5 rounded-lg border border-slate-400/30 bg-slate-950/80 p-1.5 text-left text-slate-50 hover:border-lime-200"
            :class="{
              'border-rose-400/80 ring-1 ring-rose-500/40': isPlayerUnavailable(player),
              'opacity-45': player.id === draggingPlayerId,
              'border-cyan-300 ring-2 ring-cyan-300 shadow-[0_0_0_4px_rgba(103,232,249,0.16)]':
                isTouchSelected(player.id),
            }"
            @click.stop="selectPlayerForMove(player, 'substitute')"
          >
            <span
              v-if="isTouchSelected(player.id)"
              class="absolute -left-1.5 -top-1.5 z-10 rounded-full border border-white bg-cyan-400 px-2 py-0.5 text-[9px] font-black uppercase leading-none text-slate-950 shadow-lg"
            >
              выбран
            </span>
            <span
              v-if="isPlayerUnavailable(player)"
              class="absolute -right-1.5 -top-1.5 z-10 flex items-center gap-0.5"
            >
              <span
                v-if="player.isInjured"
                :title="injuryLabel(player)"
                class="inline-grid h-5 w-5 place-items-center rounded-full border border-white bg-orange-500 text-[10px] font-black text-white"
                >✚</span
              >
              <span
                v-if="isPlayerSuspended(player)"
                :title="suspensionLabel(player)"
                class="inline-grid h-5 w-5 place-items-center rounded-full border border-white bg-rose-600 text-[9px]"
                >🟥</span
              >
            </span>
            <span class="flex items-center gap-1.5">
              <span
                class="inline-grid h-[26px] min-w-[26px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.62rem] font-black leading-none text-white"
                >{{ positionLabels[player.position] }}</span
              >
              <span
                class="inline-grid h-[26px] min-w-[26px] place-items-center rounded-full border-2 border-white/80 text-[0.62rem] font-black leading-none text-white"
                :class="ratingClass(player.rating)"
                >{{ player.rating }}</span
              >
            </span>
            <span
              class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] font-black uppercase"
              >{{ player.lastName }}</span
            >
            <span
              class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.58rem] font-bold text-slate-200/75"
              >{{
                isPlayerUnavailable(player) ? availabilityLabel(player) : conditionLabel(player)
              }}</span
            >
            <span class="h-1.5 w-full overflow-hidden rounded-full bg-slate-400/35"
              ><span
                class="block h-full rounded-full bg-lime-400"
                :style="{ width: `${player.fitness}%` }"
              ></span
            ></span>
          </button>
          <div v-if="!substitutePlayers.length" class="px-4 py-6 text-sm text-slate-500">
            {{ t('squad.dragSubstitutes') }}
          </div>
        </div>
      </div>

      <!-- РЕЗЕРВНЫЕ ИГРОКИ -->
      <aside
        class="flex h-[420px] min-h-0 flex-col overflow-hidden rounded-lg border border-white/70 bg-white/90 shadow-[0_12px_32px_rgba(20,46,38,0.08)] xl:h-auto"
      >
        <div class="flex items-start justify-between gap-3 px-4 pb-2.5 pt-4">
          <div>
            <h2 class="text-base font-semibold text-slate-950">{{ t('squad.team') }}</h2>
            <p class="mt-0.5 text-xs text-slate-500">{{ t('squad.outsideLineup') }}</p>
          </div>
        </div>

        <div
          data-touch-drop
          data-drop-group="reserve"
          class="min-h-0 flex-1 overflow-hidden px-4 pb-4"
          :class="{ 'bg-emerald-50': dragOverGroup === 'reserve' }"
          @click="selectGroupForMove('reserve')"
        >
          <h3 class="mb-2 text-xs font-black uppercase text-slate-700">
            {{ t('squad.reserve') }}
          </h3>
          <div class="grid max-h-full gap-1.5 overflow-y-auto pr-0.5">
            <button
              v-for="player in reservePlayers"
              :key="player.id"
              type="button"
              data-touch-drop
              :data-reserve-player-id="player.id"
              class="relative grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-[#dbe7de] bg-white px-2 py-1.5 text-left transition hover:-translate-y-px hover:border-emerald-300 hover:bg-[#f7fdf8]"
              :class="{
                'border-rose-300 bg-rose-50': isPlayerUnavailable(player),
                'opacity-45': player.id === draggingPlayerId,
                'border-cyan-300 ring-2 ring-cyan-400 shadow-[0_0_0_4px_rgba(34,211,238,0.14)]':
                  isTouchSelected(player.id),
              }"
              @click.stop="selectPlayerForMove(player, 'reserve')"
            >
              <span
                v-if="isTouchSelected(player.id)"
                class="absolute -left-1.5 -top-1.5 z-10 rounded-full border border-white bg-cyan-400 px-2 py-0.5 text-[9px] font-black uppercase leading-none text-slate-950 shadow-lg"
              >
                выбран
              </span>
              <span
                v-if="isPlayerUnavailable(player)"
                class="absolute right-1 top-1 flex items-center gap-0.5"
              >
                <span
                  v-if="player.isInjured"
                  :title="injuryLabel(player)"
                  class="text-sm leading-none text-orange-600"
                  >✚</span
                >
                <span
                  v-if="isPlayerSuspended(player)"
                  :title="suspensionLabel(player)"
                  class="text-[10px] leading-none"
                  >🟥</span
                >
              </span>
              <span
                class="inline-grid h-[26px] min-w-[26px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.62rem] font-black leading-none text-white"
                >{{ positionLabels[player.position] }}</span
              >
              <span class="grid min-w-0">
                <span
                  class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-slate-950"
                  >{{ player.firstName }} {{ player.lastName }}</span
                >
                <span
                  class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] text-slate-500"
                  >{{
                    isPlayerUnavailable(player)
                      ? availabilityLabel(player)
                      : conditionWithAgeLabel(player)
                  }}</span
                >
              </span>
              <span
                class="inline-grid h-[26px] min-w-[26px] place-items-center rounded-full border-2 border-white/80 text-[0.62rem] font-black leading-none text-white"
                :class="ratingClass(player.rating)"
                >{{ player.rating }}</span
              >
            </button>
          </div>
        </div>
      </aside>
    </div>
    <article
      v-else-if="activeSection === 'tactics'"
      class="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(20,46,38,0.08)] sm:p-5"
    >
      <div class="mb-4">
        <h2 class="text-lg font-black text-slate-950">Тактика</h2>
        <p class="mt-1 text-sm text-slate-500">Подробная настройка тактики команды</p>
      </div>
      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div class="space-y-4">
          <section class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="text-sm font-black uppercase tracking-wide text-slate-800">
                  Скаутский отчёт
                </h3>
                <p class="mt-1 text-sm text-slate-500">
                  <template v-if="nextOpponent">
                    Следующий матч: {{ nextOpponent.name }} · {{ nextMatchVenue }}
                  </template>
                  <template v-else>Следующий соперник пока не выбран.</template>
                </p>
              </div>
              <div
                v-if="nextOpponent"
                class="rounded-lg bg-white px-3 py-2 text-right text-xs font-bold text-slate-500"
              >
                <div class="text-[10px] uppercase tracking-wide">Рейтинг соперника</div>
                <div class="text-lg font-black text-slate-950">
                  {{ calculateClubRating(nextOpponent) }}
                </div>
              </div>
            </div>
            <ul class="mt-3 grid gap-2">
              <li
                v-for="item in scoutReportItems"
                :key="item"
                class="rounded-lg bg-white px-3 py-2 text-sm font-semibold leading-snug text-slate-700"
              >
                {{ item }}
              </li>
            </ul>
          </section>

          <section class="rounded-xl border border-slate-200 bg-white p-4">
            <h3 class="text-sm font-black uppercase tracking-wide text-slate-800">
              Эффект тактического плана
            </h3>
            <div class="mt-3 grid gap-3 md:grid-cols-2">
              <div
                v-for="indicator in tacticalIndicators"
                :key="indicator.key"
                class="rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-sm font-black text-slate-900">{{ indicator.label }}</div>
                    <div class="mt-0.5 text-xs leading-snug text-slate-500">
                      {{ indicator.description }}
                    </div>
                  </div>
                  <span class="shrink-0 text-xs font-black text-slate-600">
                    {{ indicatorText(indicator.value) }}
                  </span>
                </div>
                <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    class="h-full rounded-full"
                    :class="indicator.tone"
                    :style="{ width: `${indicator.value}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-xl border border-slate-200 bg-white p-4">
            <h3 class="text-sm font-black uppercase tracking-wide text-slate-800">
              Командные инструкции
            </h3>
            <TacticsPanel
              class="mt-3"
              :model-value="currentTactics"
              :exclude-keys="['matchCommand', 'teamTalk']"
              @change="squadStore.setTactics"
            />
          </section>
        </div>

        <aside class="rounded-xl border border-slate-200 bg-slate-950 p-4 text-white">
          <div>
            <h3 class="text-sm font-black uppercase tracking-wide text-emerald-100">
              Роли игроков
            </h3>
            <p class="mt-1 text-xs leading-snug text-slate-300">
              Роль уточняет, что игрок делает в своей позиции: держит ширину, страхует, прессингует
              или ищет последний пас.
            </p>
          </div>
          <div class="mt-4 grid gap-2">
            <label
              v-for="row in starterRoleRows"
              :key="row.slotId"
              class="grid gap-1 rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <span class="flex min-w-0 items-center justify-between gap-2">
                <span class="min-w-0">
                  <span class="block truncate text-sm font-black">
                    {{ row.player.firstName }} {{ row.player.lastName }}
                  </span>
                  <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {{ row.slotLabel }} · {{ row.player.rating }} · форма {{ row.player.form }}
                  </span>
                </span>
                <span
                  class="inline-grid h-7 min-w-7 place-items-center rounded-full bg-emerald-400/15 px-2 text-[10px] font-black text-emerald-200"
                >
                  {{ getPlayerRole(row.roleId).shortLabel }}
                </span>
              </span>
              <select
                class="mt-1 h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm font-semibold text-white outline-none focus:border-emerald-400"
                :value="row.roleId"
                @change="setRole(row.slotId, $event)"
              >
                <option
                  v-for="role in row.options"
                  :key="role.id"
                  :value="role.id"
                  class="bg-slate-950 text-white"
                >
                  {{ role.label }}
                </option>
              </select>
              <span class="text-xs leading-snug text-slate-400">
                {{ getPlayerRole(row.roleId).description }}
              </span>
            </label>
          </div>
        </aside>
      </div>
    </article>
    <article
      v-else-if="activeSection === 'stats'"
      class="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-[0_12px_32px_rgba(20,46,38,0.08)] sm:p-5"
    >
      <DataTable
        :value="statisticsRows"
        data-key="id"
        sort-field="appearances"
        :sort-order="-1"
        removable-sort
        striped-rows
        size="small"
        scrollable
        scroll-height="flex"
        class="h-full text-sm"
        table-style="min-width: 760px"
      >
        <Column field="name" header="Игрок" sortable frozen>
          <template #body="{ data }">
            <span class="whitespace-nowrap font-bold text-slate-900">{{ data.name }}</span>
          </template>
        </Column>
        <Column field="position" header="Поз." sortable />
        <Column field="appearances" header="Матчи" sortable class="text-right" />
        <Column field="goals" header="Голы" sortable class="text-right font-semibold" />
        <Column field="assists" header="ГП" sortable class="text-right" />
        <Column field="cleanSheets" header="Сух." sortable class="text-right" />
        <Column field="yellowCards" header="ЖК" sortable class="text-right" />
        <Column field="redCards" header="КК" sortable class="text-right" />
        <Column field="averageRating" header="Оценка" sortable class="text-right">
          <template #body="{ data }">
            <span class="font-black text-emerald-700">
              {{ data.matchesRated ? data.averageRating.toFixed(2) : '—' }}
            </span>
          </template>
        </Column>
      </DataTable>
    </article>
    <article
      v-else
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-[0_12px_32px_rgba(20,46,38,0.08)] sm:p-5"
    >
      <div class="mb-4">
        <h2 class="text-lg font-black text-slate-950">{{ t('squad.contracts') }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ t('squad.retirement.description') }}</p>
      </div>
      <DataTable
        :value="contractRows"
        data-key="id"
        sort-field="retirementSeasons"
        :sort-order="1"
        removable-sort
        striped-rows
        size="small"
        scrollable
        scroll-height="flex"
        class="min-h-0 flex-1 text-sm"
        table-style="min-width: 640px"
      >
        <Column field="name" :header="t('squad.retirement.player')" sortable frozen>
          <template #body="{ data }">
            <span class="whitespace-nowrap font-bold text-slate-900">{{ data.name }}</span>
          </template>
        </Column>
        <Column field="position" :header="t('squad.retirement.position')" sortable />
        <Column field="age" :header="t('squad.retirement.age')" sortable class="text-right" />
        <Column field="retirementSeasons" :header="t('squad.retirement.departure')" sortable>
          <template #body="{ data }">
            <span
              class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold"
              :class="
                data.retirementSeasons === 1
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
              "
              >{{ retirementLabel(data.retirementSeasons) }}</span
            >
          </template>
        </Column>
      </DataTable>
    </article>
  </section>
</template>
