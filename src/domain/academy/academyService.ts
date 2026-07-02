import { clubProfilesById } from '@/data/clubDatabase'
import { careerConfig } from '@/data/gameConfig/career'
import {
  isReserveClubId,
  preferredReserveClubByParentId,
} from '@/data/reserveClubRelations'
import { t } from '@/plugins/i18n/i18n'
import type {
  AcademyState,
  ChampionshipId,
  Club,
  GameState,
  Player,
  PlayerPosition,
} from '@/types/football'
import { clamp, createSeededRandom } from '@/utils/random'

const reserveMaximumSquadSize = 28
const reserveMaximumAge = 23

interface YouthIdentityPool {
  firstNames: readonly string[]
  lastNames: readonly string[]
}

const identityPools: Record<ChampionshipId, YouthIdentityPool> = {
  russia: {
    firstNames: ['Александр', 'Алексей', 'Андрей', 'Артём', 'Владимир', 'Даниил', 'Денис', 'Егор', 'Иван', 'Илья', 'Кирилл', 'Максим', 'Матвей', 'Михаил', 'Никита', 'Павел', 'Роман', 'Сергей', 'Тимофей', 'Фёдор'],
    lastNames: ['Андреев', 'Белов', 'Васильев', 'Волков', 'Громов', 'Данилов', 'Егоров', 'Зайцев', 'Иванов', 'Ковалёв', 'Козлов', 'Крылов', 'Макаров', 'Мельников', 'Морозов', 'Николаев', 'Орлов', 'Павлов', 'Петров', 'Попов', 'Семёнов', 'Соколов', 'Фёдоров'],
  },
  spain: {
    firstNames: ['Alejandro', 'Álvaro', 'Antonio', 'Carlos', 'Daniel', 'Diego', 'Hugo', 'Javier', 'José', 'Lucas', 'Manuel', 'Marcos', 'Mateo', 'Miguel', 'Pablo', 'Sergio'],
    lastNames: ['García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso'],
  },
  england: {
    firstNames: ['Alfie', 'Archie', 'Ben', 'Callum', 'Charlie', 'Daniel', 'Ethan', 'Finley', 'George', 'Harry', 'Jack', 'James', 'Jamie', 'Lewis', 'Liam', 'Mason', 'Oliver', 'Oscar', 'Thomas', 'William'],
    lastNames: ['Adams', 'Baker', 'Brown', 'Clarke', 'Cook', 'Cooper', 'Davies', 'Evans', 'Green', 'Hall', 'Harris', 'Jackson', 'Johnson', 'Jones', 'King', 'Roberts', 'Smith', 'Taylor', 'Walker', 'Wilson'],
  },
  germany: {
    firstNames: ['Alexander', 'Anton', 'Ben', 'Emil', 'Felix', 'Finn', 'Florian', 'Jan', 'Jonas', 'Julian', 'Leon', 'Lukas', 'Maximilian', 'Moritz', 'Niklas', 'Noah', 'Paul', 'Tim'],
    lastNames: ['Bauer', 'Becker', 'Fischer', 'Hoffmann', 'Klein', 'Koch', 'Krüger', 'Lange', 'Meyer', 'Müller', 'Neumann', 'Richter', 'Schmidt', 'Schneider', 'Schröder', 'Schulz', 'Wagner', 'Weber', 'Wolf'],
  },
  france: {
    firstNames: ['Adam', 'Alexandre', 'Antoine', 'Baptiste', 'Clément', 'Enzo', 'Gabriel', 'Hugo', 'Jules', 'Léo', 'Lucas', 'Mathis', 'Nathan', 'Noah', 'Raphaël', 'Théo', 'Thomas'],
    lastNames: ['Bernard', 'Bertrand', 'Blanc', 'Bonnet', 'David', 'Dubois', 'Durand', 'Fontaine', 'Fournier', 'Garcia', 'Girard', 'Lefèvre', 'Leroy', 'Martin', 'Mercier', 'Moreau', 'Petit', 'Richard', 'Robert', 'Roux'],
  },
  italy: {
    firstNames: ['Alessandro', 'Andrea', 'Davide', 'Edoardo', 'Federico', 'Filippo', 'Francesco', 'Gabriele', 'Giacomo', 'Giovanni', 'Lorenzo', 'Luca', 'Marco', 'Matteo', 'Niccolò', 'Pietro', 'Riccardo', 'Tommaso'],
    lastNames: ['Bianchi', 'Bruno', 'Colombo', 'Conti', 'Costa', 'De Luca', 'Esposito', 'Ferrari', 'Fontana', 'Galli', 'Giordano', 'Greco', 'Lombardi', 'Mancini', 'Marino', 'Moretti', 'Ricci', 'Rizzo', 'Romano', 'Rossi'],
  },
}

const getClubCountry = (club: Club): ChampionshipId => {
  const competitionId = club.competitionId ?? ''
  const country = (Object.keys(identityPools) as ChampionshipId[]).find((id) =>
    competitionId.startsWith(`${id}-`),
  )
  return country ?? 'russia'
}

const identityForSeed = (seed: string, nationality: ChampionshipId) => {
  const random = createSeededRandom(hashString(seed))
  const pool = identityPools[nationality]
  return {
    firstName: random.pick(pool.firstNames),
    lastName: random.pick(pool.lastNames),
    nationality,
  }
}

const normalizeGeneratedPlayerIdentity = (player: Player, originClub: Club): Player => {
  if (!player.id.startsWith('academy:')) return player
  const nationality = getClubCountry(originClub)
  if (player.nationality === nationality) return player
  return { ...player, ...identityForSeed(`${player.id}:identity`, nationality) }
}

export const normalizeGeneratedAcademyPlayers = (sourceClubs: readonly Club[]): Club[] => {
  const clubsById = new Map(sourceClubs.map((club) => [club.id, club]))
  return sourceClubs.map((club) => ({
    ...club,
    squad: club.squad.map((player) => {
      const originClub = player.academyClubId ? clubsById.get(player.academyClubId) : undefined
      return normalizeGeneratedPlayerIdentity(player, originClub ?? club)
    }),
  }))
}

const intakePositions: PlayerPosition[] = [
  'GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'ST',
]

const hashString = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) % 2_147_483_647
  }
  return hash || 1
}

const playerName = (player: Player): string =>
  `${player.firstName} ${player.lastName}`.trim()

const defaultAcademyLevel = (club: Club): number =>
  clamp(Math.round((club.rating - 34) / 3), 1, 20)

const createYouthPlayer = (
  club: Club,
  academy: Pick<AcademyState, 'level' | 'recruitment' | 'coaching'>,
  season: number,
  index: number,
): Player => {
  const random = createSeededRandom(hashString(`${club.id}:${season}:${index}`))
  const age = random.int(16, 18)
  const quality = Math.round((academy.level + academy.recruitment + academy.coaching) / 3)
  const rating = clamp(34 + quality + random.int(-7, 7), 32, 72)
  const potential = clamp(rating + 8 + Math.round(quality / 2) + random.int(-4, 10), rating, 94)
  const value = Math.round((rating * rating * 650 + potential * 9_000) / 10_000) * 10_000
  const nationality = getClubCountry(club)
  const identity = identityForSeed(`${club.id}:${season}:${index}:identity`, nationality)

  return {
    id: `academy:${club.id}:s${season}:p${index + 1}`,
    firstName: identity.firstName,
    lastName: identity.lastName,
    age,
    position: intakePositions[index % intakePositions.length]!,
    rating,
    potential,
    fitness: random.int(88, 100),
    form: random.int(48, 72),
    value,
    salary: Math.max(10_000, Math.round(value * 0.012)),
    isInjured: false,
    academyClubId: club.id,
    intakeSeason: season,
    homegrown: true,
    nationality: identity.nationality,
  }
}

const createIntake = (club: Club, academy: AcademyState, season: number, size?: number): Player[] => {
  const random = createSeededRandom(hashString(`${club.id}:intake:${season}`))
  const count = size ?? random.int(academy.intakeSize.min, academy.intakeSize.max)
  return Array.from({ length: count }, (_, index) => createYouthPlayer(club, academy, season, index))
}

const createAcademy = (club: Club, clubs: readonly Club[], season: number, materialize: boolean): AcademyState => {
  const profile = clubProfilesById[club.id]?.development
  const level = profile?.academy?.level ?? defaultAcademyLevel(club)
  const linkedClubId = profile?.reserveTeam?.linkedClubId ?? preferredReserveClubByParentId[club.id]
  const linkedClub = linkedClubId ? clubs.find((candidate) => candidate.id === linkedClubId) : undefined
  const name = profile?.reserveTeam?.name ?? linkedClub?.name ?? `${club.name}-2`
  const shortName = profile?.reserveTeam?.shortName ?? linkedClub?.shortName ?? `${club.shortName}-2`
  const academy: AcademyState = {
    clubId: club.id,
    level,
    recruitment: profile?.academy?.recruitment ?? clamp(level + 1, 1, 20),
    coaching: profile?.academy?.coaching ?? level,
    facilities: profile?.academy?.facilities ?? level,
    annualBudget: profile?.academy?.annualBudget ?? Math.max(500_000, Math.round(club.budget * 0.04)),
    intakeSize: profile?.academy?.intakeSize ?? { min: 5, max: 8 },
    nextIntakeSeason: season + 1,
    reserveTeam: {
      id: linkedClub?.id ?? `${club.id}-2`,
      parentClubId: club.id,
      name,
      shortName,
      mode: linkedClub ? 'competition' : 'virtual',
      linkedClubId: linkedClub?.id,
      squad: [],
    },
  }

  if (materialize && !linkedClub) {
    const initialSquad = createIntake(club, academy, season, 18).map((player, index) => ({
      ...player,
      age: 16 + (index % 6),
    }))
    academy.reserveTeam.squad = initialSquad
  }

  return academy
}

export const createAcademies = (
  clubs: readonly Club[],
  season: number,
  selectedClubId: string,
): Record<string, AcademyState> =>
  Object.fromEntries(
    clubs
      .filter((club) => !isReserveClubId(club.id))
      .map((club) => [club.id, createAcademy(club, clubs, season, club.id === selectedClubId)]),
  )

export const ensureAcademies = (
  clubs: readonly Club[],
  source: Record<string, AcademyState> | undefined,
  season: number,
  selectedClubId: string,
): Record<string, AcademyState> => {
  const defaults = createAcademies(clubs, season, selectedClubId)
  return Object.fromEntries(
    Object.entries(defaults).map(([clubId, fallback]) => {
      const existing = source?.[clubId]
      if (!existing) return [clubId, fallback]
      const { history: _history, ...existingWithoutHistory } = existing as AcademyState & { history?: unknown }
      return [clubId, {
        ...fallback,
        ...existingWithoutHistory,
        intakeSize: { ...fallback.intakeSize, ...existing.intakeSize },
        reserveTeam: {
          ...fallback.reserveTeam,
          ...existing.reserveTeam,
          squad: existing.reserveTeam?.squad?.map((player) =>
            normalizeGeneratedPlayerIdentity(player, clubs.find((club) => club.id === clubId) ?? clubs[0]!),
          ) ?? [],
        },
      }]
    }),
  )
}

export const getReservePlayers = (academy: AcademyState, clubs: readonly Club[]): Player[] => {
  if (academy.reserveTeam.linkedClubId) {
    return clubs.find((club) => club.id === academy.reserveTeam.linkedClubId)?.squad ?? []
  }
  return academy.reserveTeam.squad
}

const progressReservePlayer = (player: Player, academy: AcademyState, season: number): Player => {
  const random = createSeededRandom(hashString(`${player.id}:progress:${season}`))
  const potentialGap = Math.max(0, player.potential - player.rating)
  const growthCeiling = player.age <= 18 ? 4 : player.age <= 21 ? 3 : 2
  const infrastructureBonus = academy.coaching + academy.facilities >= 28 ? 1 : 0
  const growth = potentialGap > 0 ? random.int(0, growthCeiling) + infrastructureBonus : 0
  const rating = clamp(player.rating + growth, 1, player.potential)

  return {
    ...player,
    age: player.age + 1,
    rating,
    value: Math.max(player.value, Math.round((rating * rating * 650 + player.potential * 9_000) / 10_000) * 10_000),
    fitness: 100,
    form: clamp(player.form + random.int(-4, 7), 1, 100),
    isInjured: false,
    injuryUntilOrder: undefined,
    suspensionMatchesRemaining: undefined,
    suspensionReason: undefined,
  }
}

export const progressAcademiesForNewSeason = (
  sourceClubs: readonly Club[],
  sourceAcademies: Record<string, AcademyState>,
  season: number,
  selectedClubId: string,
): { clubs: Club[]; academies: Record<string, AcademyState> } => {
  let clubs = sourceClubs.map((club) => ({ ...club, squad: club.squad.map((player) => ({ ...player })) }))
  const academies = ensureAcademies(clubs, sourceAcademies, season - 1, selectedClubId)

  for (const academy of Object.values(academies)) {
    const parent = clubs.find((club) => club.id === academy.clubId)
    if (!parent) continue

    const shouldMaterialize = academy.clubId === selectedClubId || Boolean(academy.reserveTeam.linkedClubId)
    if (!shouldMaterialize) {
      if (parent.squad.length < careerConfig.maximumSquadSize) {
        const prospect = createIntake(parent, academy, season, 3)
          .sort((left, right) => right.potential - left.potential)[0]
        if (prospect) {
          clubs = clubs.map((club) =>
            club.id === parent.id ? { ...club, squad: [...club.squad, prospect] } : club,
          )
        }
      }
      academy.nextIntakeSeason = season + 1
      continue
    }

    const intake = createIntake(parent, academy, season)
    const linkedClubId = academy.reserveTeam.linkedClubId
    if (linkedClubId) {
      clubs = clubs.map((club) =>
        club.id === linkedClubId
          ? { ...club, squad: [...club.squad, ...intake].slice(-reserveMaximumSquadSize) }
          : club,
      )
      if (academy.clubId !== selectedClubId && parent.squad.length < careerConfig.maximumSquadSize) {
        const linked = clubs.find((club) => club.id === linkedClubId)
        const prospect = linked?.squad
          .filter((player) => player.age <= reserveMaximumAge)
          .sort((left, right) => right.rating - left.rating || right.potential - left.potential)[0]
        if (prospect) {
          clubs = clubs.map((club) => {
            if (club.id === parent.id) return { ...club, squad: [...club.squad, { ...prospect }] }
            if (club.id === linkedClubId) {
              return { ...club, squad: club.squad.filter((player) => player.id !== prospect.id) }
            }
            return club
          })
        }
      }
    } else {
      const progressed = academy.reserveTeam.squad
        .map((player) => progressReservePlayer(player, academy, season))
        .filter((player) => player.age <= reserveMaximumAge)
      academy.reserveTeam.squad = [...progressed, ...intake].slice(-reserveMaximumSquadSize)
    }
    academy.nextIntakeSeason = season + 1
  }

  return { clubs, academies }
}

export interface AcademyMutationResult {
  success: boolean
  message: string
  state: GameState
}

const unchanged = (state: GameState, message: string): AcademyMutationResult => ({
  success: false,
  message,
  state,
})

export const promoteToFirstTeam = (state: GameState, playerId: string): AcademyMutationResult => {
  const academy = state.academies[state.selectedClubId]
  const firstTeam = state.clubs.find((club) => club.id === state.selectedClubId)
  if (!academy || !firstTeam) return unchanged(state, t('academy.messages.notFound'))
  if (firstTeam.squad.length >= careerConfig.maximumSquadSize) {
    return unchanged(state, t('academy.messages.firstTeamFull'))
  }

  const reservePlayers = getReservePlayers(academy, state.clubs)
  const player = reservePlayers.find((candidate) => candidate.id === playerId)
  if (!player) return unchanged(state, t('academy.messages.notFound'))

  const clubs = state.clubs.map((club) => {
    if (club.id === firstTeam.id) return { ...club, squad: [...club.squad, { ...player }] }
    if (club.id === academy.reserveTeam.linkedClubId) {
      return { ...club, squad: club.squad.filter((candidate) => candidate.id !== playerId) }
    }
    return club
  })
  const nextAcademy: AcademyState = {
    ...academy,
    reserveTeam: academy.reserveTeam.linkedClubId
      ? academy.reserveTeam
      : {
          ...academy.reserveTeam,
          squad: academy.reserveTeam.squad.filter((candidate) => candidate.id !== playerId),
        },
  }

  return {
    success: true,
    message: t('academy.messages.promoted', { player: playerName(player) }),
    state: {
      ...state,
      clubs,
      academies: { ...state.academies, [academy.clubId]: nextAcademy },
      playerStats: {
        ...state.playerStats,
        [player.id]: state.playerStats[player.id] ?? {
          appearances: 0, goals: 0, yellowCards: 0, averageRating: 0, matchesRated: 0,
        },
      },
    },
  }
}

export const moveToReserveTeam = (state: GameState, playerId: string): AcademyMutationResult => {
  const academy = state.academies[state.selectedClubId]
  const firstTeam = state.clubs.find((club) => club.id === state.selectedClubId)
  const player = firstTeam?.squad.find((candidate) => candidate.id === playerId)
  if (!academy || !firstTeam || !player) return unchanged(state, t('academy.messages.notFound'))
  if (player.age > reserveMaximumAge) return unchanged(state, t('academy.messages.tooOld'))
  if (firstTeam.squad.length <= careerConfig.minimumSquadSize) {
    return unchanged(state, t('academy.messages.minimumFirstTeam'))
  }
  if (getReservePlayers(academy, state.clubs).length >= reserveMaximumSquadSize) {
    return unchanged(state, t('academy.messages.reserveFull'))
  }

  const clubs = state.clubs.map((club) => {
    if (club.id === firstTeam.id) {
      return { ...club, squad: club.squad.filter((candidate) => candidate.id !== playerId) }
    }
    if (club.id === academy.reserveTeam.linkedClubId) {
      return { ...club, squad: [...club.squad, { ...player }] }
    }
    return club
  })
  const nextAcademy: AcademyState = {
    ...academy,
    reserveTeam: academy.reserveTeam.linkedClubId
      ? academy.reserveTeam
      : { ...academy.reserveTeam, squad: [...academy.reserveTeam.squad, { ...player }] },
  }

  return {
    success: true,
    message: t('academy.messages.movedToReserve', { player: playerName(player) }),
    state: { ...state, clubs, academies: { ...state.academies, [academy.clubId]: nextAcademy } },
  }
}

export const releaseReservePlayer = (state: GameState, playerId: string): AcademyMutationResult => {
  const academy = state.academies[state.selectedClubId]
  if (!academy) return unchanged(state, t('academy.messages.notFound'))
  const player = getReservePlayers(academy, state.clubs).find((candidate) => candidate.id === playerId)
  if (!player) return unchanged(state, t('academy.messages.notFound'))

  const clubs = state.clubs.map((club) =>
    club.id === academy.reserveTeam.linkedClubId
      ? { ...club, squad: club.squad.filter((candidate) => candidate.id !== playerId) }
      : club,
  )
  const nextAcademy: AcademyState = {
    ...academy,
    reserveTeam: academy.reserveTeam.linkedClubId
      ? academy.reserveTeam
      : {
          ...academy.reserveTeam,
          squad: academy.reserveTeam.squad.filter((candidate) => candidate.id !== playerId),
        },
  }

  return {
    success: true,
    message: t('academy.messages.released', { player: playerName(player) }),
    state: { ...state, clubs, academies: { ...state.academies, [academy.clubId]: nextAcademy } },
  }
}

export const academyLimits = {
  reserveMaximumAge,
  reserveMaximumSquadSize,
}
