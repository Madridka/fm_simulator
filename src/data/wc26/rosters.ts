import { worldCup2026TeamProfiles } from '@/data/wc26/teams/index'
import type { NationalTeam } from '@/data/wc26/nationalTeam'
import type { NationalTeamProfile } from '@/data/wc26/types'
import type { NationalTeamPlayer, NationalTeamPlayerPosition } from '@/data/wc26/types'
import type { Player, PlayerPosition } from '@/types/football'
import { createSeededRandom } from '@/utils/random'

const POSITION_SLOTS: PlayerPosition[] = [
  'GK', 'GK', 'GK',
  'LB', 'CB', 'CB', 'CB', 'RB',
  'CDM', 'CDM', 'CM', 'CM', 'CM', 'CAM',
  'LW', 'RW', 'ST', 'ST', 'ST',
  'LB', 'CM', 'ST',
  'CB', 'CM',
]

const FIRST_NAMES = [
  'Алекс', 'Марко', 'Луис', 'Карлос', 'Диего', 'Пабло', 'Андрес', 'Серхио',
  'Томас', 'Нико', 'Лука', 'Маттео', 'Юлиан', 'Кевин', 'Мохамед', 'Ахмед',
  'Юссеф', 'Кенджи', 'Такэси', 'Мин', 'Сон', 'Виктор', 'Иван', 'Николай',
]

const LAST_NAMES = [
  'Силва', 'Сантос', 'Гарсия', 'Родригес', 'Мартинес', 'Лопес', 'Мюллер',
  'Шмидт', 'Росси', 'Бьянки', 'Дюбуа', 'Мартен', 'Смит', 'Джонсон', 'Ким',
  'Парк', 'Танака', 'Иванов', 'Петров', 'Хансен', 'Эрикссон', 'Али', 'Хасан',
]

const positionRatingOffset: Record<PlayerPosition, number> = {
  GK: -2,
  LB: -1,
  RB: -1,
  CB: 0,
  CDM: 1,
  CM: 1,
  CAM: 2,
  LW: 2,
  RW: 2,
  ST: 3,
}

const DEFENSIVE_POSITIONS: PlayerPosition[] = ['LB', 'CB', 'CB', 'CB', 'RB', 'CB', 'LB']
const MIDFIELD_POSITIONS: PlayerPosition[] = ['CDM', 'CDM', 'CM', 'CM', 'CM', 'CAM', 'CM']
const ATTACK_POSITIONS: PlayerPosition[] = ['LW', 'RW', 'ST', 'ST', 'ST', 'ST', 'ST']

const positionCounters = (): Record<NationalTeamPlayerPosition, number> => ({
  GK: 0,
  DF: 0,
  MF: 0,
  FW: 0,
})

const mapNationalPosition = (
  position: NationalTeamPlayerPosition,
  counters: Record<NationalTeamPlayerPosition, number>,
): PlayerPosition => {
  switch (position) {
    case 'GK':
      return 'GK'
    case 'DF': {
      const index = counters.DF
      counters.DF += 1
      return DEFENSIVE_POSITIONS[index % DEFENSIVE_POSITIONS.length] ?? 'CB'
    }
    case 'MF': {
      const index = counters.MF
      counters.MF += 1
      return MIDFIELD_POSITIONS[index % MIDFIELD_POSITIONS.length] ?? 'CM'
    }
    case 'FW': {
      const index = counters.FW
      counters.FW += 1
      return ATTACK_POSITIONS[index % ATTACK_POSITIONS.length] ?? 'ST'
    }
    default:
      return 'CM'
  }
}

const hashString = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2_147_483_647
  }
  return hash || 1
}

const convertSquadPlayer = (
  player: NationalTeamPlayer,
  teamId: string,
  counters: Record<NationalTeamPlayerPosition, number>,
): Player => ({
  id: `${teamId}:${player.id}`,
  firstName: player.firstName,
  lastName: player.lastName,
  age: player.age,
  position: mapNationalPosition(player.position, counters),
  rating: player.rating,
  potential: player.potential,
  fitness: player.fitness,
  form: player.form,
  value: player.value,
  salary: player.salary,
  isInjured: player.isInjured,
  suspensionMatchesRemaining: 0,
})

const squadToPlayers = (profile: NationalTeamProfile): Player[] => {
  const counters = positionCounters()
  return (profile.squad ?? []).map((player) => convertSquadPlayer(player, profile.id, counters))
}

const buildGeneratedPlayer = (
  profile: NationalTeamProfile,
  index: number,
  position: PlayerPosition,
  random: ReturnType<typeof createSeededRandom>,
): Player => {
  const offset = positionRatingOffset[position]
  const baseRating = profile.rating + offset
  const spread = random.int(-4, 6)
  const rating = Math.max(55, Math.min(94, baseRating + spread))

  return {
    id: `${profile.id}-p${index + 1}`,
    firstName: random.pick(FIRST_NAMES),
    lastName: random.pick(LAST_NAMES),
    age: random.int(20, 34),
    position,
    rating,
    potential: Math.min(99, rating + random.int(0, 8)),
    fitness: random.int(88, 100),
    form: random.int(55, 85),
    value: rating * 100_000,
    salary: rating * 5_000,
    isInjured: false,
    suspensionMatchesRemaining: 0,
  }
}

export const generateNationalTeamRoster = (profile: NationalTeamProfile, seed?: number): Player[] => {
  const random = createSeededRandom(seed ?? hashString(profile.id))
  return POSITION_SLOTS.map((position, index) => buildGeneratedPlayer(profile, index, position, random))
}

export const buildNationalTeam = (profile: NationalTeamProfile, seed?: number): NationalTeam => {
  const { squad: _squad, ...teamMeta } = profile
  const players = profile.squad?.length
    ? squadToPlayers(profile)
    : generateNationalTeamRoster(profile, seed)

  return {
    ...teamMeta,
    players,
  }
}

export const buildAllNationalTeams = (seed = 2026): NationalTeam[] =>
  worldCup2026TeamProfiles.map((profile, index) =>
    buildNationalTeam(profile, seed + index * 97),
  )
