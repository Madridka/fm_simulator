import type { Club, ClubLineup, Formation, FormationSlot, Player, PlayerPosition, TacticalStyle } from '@/types/football'

export interface LineupValidationResult {
  valid: boolean
  errors: string[]
}

const createSlot = (id: string, label: string, position: PlayerPosition, x: number, y: number): FormationSlot => ({
  id,
  label,
  position,
  x,
  y,
})

const formationSlots: Record<Formation, FormationSlot[]> = {
  '4-4-2': [
    createSlot('gk', 'GK', 'GK', 50, 92),
    createSlot('lb', 'LB', 'LB', 18, 73),
    createSlot('cb1', 'CB', 'CB', 39, 76),
    createSlot('cb2', 'CB', 'CB', 61, 76),
    createSlot('rb', 'RB', 'RB', 82, 73),
    createSlot('lw', 'LW', 'LW', 18, 47),
    createSlot('cm1', 'CM', 'CM', 39, 51),
    createSlot('cm2', 'CM', 'CM', 61, 51),
    createSlot('rw', 'RW', 'RW', 82, 47),
    createSlot('st1', 'ST', 'ST', 42, 20),
    createSlot('st2', 'ST', 'ST', 58, 20),
  ],
  '4-3-3': [
    createSlot('gk', 'GK', 'GK', 50, 92),
    createSlot('lb', 'LB', 'LB', 18, 73),
    createSlot('cb1', 'CB', 'CB', 39, 76),
    createSlot('cb2', 'CB', 'CB', 61, 76),
    createSlot('rb', 'RB', 'RB', 82, 73),
    createSlot('cdm', 'CDM', 'CDM', 50, 58),
    createSlot('cm', 'CM', 'CM', 35, 47),
    createSlot('cam', 'CAM', 'CAM', 65, 47),
    createSlot('lw', 'LW', 'LW', 22, 22),
    createSlot('st', 'ST', 'ST', 50, 16),
    createSlot('rw', 'RW', 'RW', 78, 22),
  ],
  '4-2-3-1': [
    createSlot('gk', 'GK', 'GK', 50, 92),
    createSlot('lb', 'LB', 'LB', 18, 73),
    createSlot('cb1', 'CB', 'CB', 39, 76),
    createSlot('cb2', 'CB', 'CB', 61, 76),
    createSlot('rb', 'RB', 'RB', 82, 73),
    createSlot('cdm1', 'CDM', 'CDM', 40, 58),
    createSlot('cdm2', 'CDM', 'CDM', 60, 58),
    createSlot('lw', 'LW', 'LW', 23, 36),
    createSlot('cam', 'CAM', 'CAM', 50, 34),
    createSlot('rw', 'RW', 'RW', 77, 36),
    createSlot('st', 'ST', 'ST', 50, 16),
  ],
  '3-5-2': [
    createSlot('gk', 'GK', 'GK', 50, 92),
    createSlot('cb1', 'CB', 'CB', 30, 75),
    createSlot('cb2', 'CB', 'CB', 50, 78),
    createSlot('cb3', 'CB', 'CB', 70, 75),
    createSlot('lwb', 'LB', 'LB', 16, 50),
    createSlot('cm1', 'CM', 'CM', 37, 52),
    createSlot('cdm', 'CDM', 'CDM', 50, 58),
    createSlot('cm2', 'CM', 'CM', 63, 52),
    createSlot('rwb', 'RB', 'RB', 84, 50),
    createSlot('st1', 'ST', 'ST', 42, 20),
    createSlot('st2', 'ST', 'ST', 58, 20),
  ],
  '4-5-1': [
    createSlot('gk', 'GK', 'GK', 50, 92),
    createSlot('lb', 'LB', 'LB', 18, 73),
    createSlot('cb1', 'CB', 'CB', 39, 76),
    createSlot('cb2', 'CB', 'CB', 61, 76),
    createSlot('rb', 'RB', 'RB', 82, 73),
    createSlot('cdm', 'CDM', 'CDM', 50, 59),
    createSlot('cm1', 'CM', 'CM', 35, 47),
    createSlot('cm2', 'CM', 'CM', 65, 47),
    createSlot('lw', 'LW', 'LW', 22, 31),
    createSlot('rw', 'RW', 'RW', 78, 31),
    createSlot('st', 'ST', 'ST', 50, 15),
  ],
}

const adjacentPositions: Record<PlayerPosition, PlayerPosition[]> = {
  GK: [],
  LB: ['CB', 'RB', 'CDM'],
  CB: ['LB', 'RB', 'CDM'],
  RB: ['CB', 'LB', 'CDM'],
  CDM: ['CM', 'CB', 'LB', 'RB'],
  CM: ['CDM', 'CAM', 'LW', 'RW'],
  CAM: ['CM', 'ST', 'LW', 'RW'],
  LW: ['RW', 'CAM', 'CM', 'ST'],
  RW: ['LW', 'CAM', 'CM', 'ST'],
  ST: ['CAM', 'LW', 'RW'],
}

const starterIds = (lineup: ClubLineup): string[] => {
  return Object.values(lineup.starters).filter((playerId): playerId is string => typeof playerId === 'string')
}

export const formations = Object.keys(formationSlots) as Formation[]

export const tacticalStyles: TacticalStyle[] = ['defensive', 'balanced', 'attacking']

export const getFormationSlots = (formation: Formation): FormationSlot[] => formationSlots[formation]

export const createEmptyLineup = (
  formation: Formation = '4-4-2',
  tacticalStyle: TacticalStyle = 'balanced',
): ClubLineup => {
  const starters = getFormationSlots(formation).reduce<Record<string, string | null>>((result, slot) => {
    result[slot.id] = null
    return result
  }, {})

  return {
    formation,
    tacticalStyle,
    starters,
    substitutes: [],
  }
}

export const getPlayersByIds = (club: Club, playerIds: readonly string[]): Player[] => {
  const playersById = new Map(club.squad.map((player) => [player.id, player]))
  return playerIds.map((playerId) => playersById.get(playerId)).filter((player): player is Player => Boolean(player))
}

export const getStarterIds = starterIds

export const validateLineup = (club: Club, lineup: ClubLineup): LineupValidationResult => {
  const errors: string[] = []
  const ids = starterIds(lineup)
  const uniqueIds = new Set(ids)
  const players = getPlayersByIds(club, ids)

  if (ids.length !== 11) {
    errors.push('В стартовом составе должно быть ровно 11 игроков.')
  }

  if (uniqueIds.size !== ids.length) {
    errors.push('Один игрок выбран на несколько позиций.')
  }

  if (players.length !== ids.length) {
    errors.push('В составе есть игрок, которого уже нет в клубе.')
  }

  if (!players.some((player) => player.position === 'GK')) {
    errors.push('В стартовом составе должен быть вратарь.')
  }

  if (players.some((player) => player.isInjured)) {
    errors.push('Травмированный игрок не может выйти в стартовом составе.')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

const positionPenalty = (slotPosition: PlayerPosition, playerPosition: PlayerPosition): number => {
  if (slotPosition === playerPosition) {
    return 0
  }
  return adjacentPositions[slotPosition].includes(playerPosition) ? 6 : 18
}

const pickBestPlayerForSlot = (
  squad: readonly Player[],
  usedPlayerIds: ReadonlySet<string>,
  slotPosition: PlayerPosition,
): Player => {
  const available = squad.filter((player) => !usedPlayerIds.has(player.id) && !player.isInjured)
  const candidates = available.length > 0 ? available : squad.filter((player) => !usedPlayerIds.has(player.id))

  const sorted = [...candidates].sort((left, right) => {
    const leftScore = left.rating + left.form * 0.08 + left.fitness * 0.05 - positionPenalty(slotPosition, left.position)
    const rightScore = right.rating + right.form * 0.08 + right.fitness * 0.05 - positionPenalty(slotPosition, right.position)
    return rightScore - leftScore
  })

  const selected = sorted[0]
  if (!selected) {
    throw new Error('Cannot auto-select a lineup without enough players')
  }
  return selected
}

export const autoSelectLineup = (
  club: Club,
  formation: Formation = '4-4-2',
  tacticalStyle: TacticalStyle = 'balanced',
): ClubLineup => {
  const lineup = createEmptyLineup(formation, tacticalStyle)
  const usedPlayerIds = new Set<string>()

  for (const slot of getFormationSlots(formation)) {
    const player = pickBestPlayerForSlot(club.squad, usedPlayerIds, slot.position)
    lineup.starters[slot.id] = player.id
    usedPlayerIds.add(player.id)
  }

  lineup.substitutes = [...club.squad]
    .filter((player) => !usedPlayerIds.has(player.id) && !player.isInjured)
    .sort((left, right) => right.rating - left.rating)
    .slice(0, 7)
    .map((player) => player.id)

  return lineup
}
