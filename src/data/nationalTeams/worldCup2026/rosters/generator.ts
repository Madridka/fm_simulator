import { worldCup2026TeamProfiles } from '@/data/nationalTeams/worldCup2026/ratings'
import type { NationalTeamProfile, NationalTeam } from '@/data/nationalTeams/worldCup2026/teams'
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

const hashString = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2_147_483_647
  }
  return hash || 1
}

const buildPlayer = (
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
  return POSITION_SLOTS.map((position, index) => buildPlayer(profile, index, position, random))
}

export const buildNationalTeam = (profile: NationalTeamProfile, seed?: number): NationalTeam => ({
  ...profile,
  players: generateNationalTeamRoster(profile, seed),
})

export const buildAllNationalTeams = (seed = 2026): NationalTeam[] =>
  worldCup2026TeamProfiles.map((profile, index) =>
    buildNationalTeam(profile, seed + index * 97),
  )
