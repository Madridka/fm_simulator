import type { Club, ClubLineup, PlayedLineup } from '@/types/football'

type Lineup = ClubLineup | PlayedLineup

// ВОЗВРАЩАЕТ ИДЕНТИФИКАТОРЫ ИГРОКОВ СТАРТОВОГО СОСТАВА
const getStarterIds = (lineup: Lineup): string[] => {
  if (Array.isArray(lineup.starters)) {
    return lineup.starters
  }

  return Object.values(lineup.starters).filter(
    (playerId): playerId is string => typeof playerId === 'string',
  )
}

// ОКРУГЛЯЕТ РЕЙТИНГ КОМАНДЫ ДО ОДНОГО ЗНАКА ДЛЯ ВИДИМОГО ЭФФЕКТА ЗАМЕН
const roundTeamRating = (rating: number): number => Number(rating.toFixed(1))

// РАССЧИТЫВАЕТ РЕЙТИНГ ПО ФАКТИЧЕСКОМУ СТАРТОВОМУ СОСТАВУ
export const calculateLineupRating = (club: Club, lineup: Lineup): number => {
  const playersById = new Map(club.squad.map((player) => [player.id, player]))
  const starters = getStarterIds(lineup)
    .map((playerId) => playersById.get(playerId))
    .filter((player) => player !== undefined)

  if (starters.length === 0) {
    return calculateSquadRating(club)
  }

  return roundTeamRating(
    starters.reduce((sum, player) => sum + player.rating, 0) / starters.length,
  )
}

// РАССЧИТЫВАЕТ РЕЙТИНГ ЛУЧШИХ ОДИННАДЦАТИ ИГРОКОВ, КОГДА СОСТАВ НЕ ПЕРЕДАН
export const calculateSquadRating = (club: Club): number => {
  const strongestPlayers = [...club.squad]
    .sort((left, right) => right.rating - left.rating)
    .slice(0, 11)

  if (strongestPlayers.length === 0) {
    return 1
  }

  return roundTeamRating(
    strongestPlayers.reduce((sum, player) => sum + player.rating, 0) /
      strongestPlayers.length,
  )
}

// ВЫБИРАЕТ РАСЧЁТ ПО ОСНОВЕ ИЛИ ПО ЛУЧШИМ ИГРОКАМ КЛУБА
export const calculateClubRating = (club: Club, lineup?: Lineup): number =>
  lineup ? calculateLineupRating(club, lineup) : calculateSquadRating(club)
