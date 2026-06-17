import { gameConfig } from '@/config/gameConfig'
import type { Club, Player } from '@/types/football'

export interface TransferResult {
  success: boolean
  message: string
  clubs: Club[]
}

const cloneClub = (club: Club): Club => ({
  ...club,
  squad: club.squad.map((player) => ({ ...player })),
})

const replaceClub = (clubs: readonly Club[], updatedClub: Club): Club[] => {
  return clubs.map((club) => (club.id === updatedClub.id ? updatedClub : cloneClub(club)))
}

const findClub = (clubs: readonly Club[], clubId: string): Club | undefined =>
  clubs.find((club) => club.id === clubId)

const findPlayerOwner = (
  clubs: readonly Club[],
  playerId: string,
): { club: Club; player: Player } | undefined => {
  for (const club of clubs) {
    const player = club.squad.find((candidate) => candidate.id === playerId)
    if (player) {
      return { club, player }
    }
  }
  return undefined
}

export const buyPlayer = (
  clubs: readonly Club[],
  buyerClubId: string,
  playerId: string,
): TransferResult => {
  const playerOwner = findPlayerOwner(clubs, playerId)
  const buyerSource = findClub(clubs, buyerClubId)

  if (!playerOwner || !buyerSource) {
    return { success: false, message: 'Игрок или клуб не найден.', clubs: clubs.map(cloneClub) }
  }

  if (playerOwner.club.id === buyerClubId) {
    return {
      success: false,
      message: 'Игрок уже находится в вашем клубе.',
      clubs: clubs.map(cloneClub),
    }
  }

  if (buyerSource.squad.length >= gameConfig.maximumSquadSize) {
    return {
      success: false,
      message: 'В составе уже максимальное количество игроков.',
      clubs: clubs.map(cloneClub),
    }
  }

  if (buyerSource.budget < playerOwner.player.value) {
    return {
      success: false,
      message: 'Недостаточно бюджета для покупки.',
      clubs: clubs.map(cloneClub),
    }
  }

  const buyer = cloneClub(buyerSource)
  const seller = cloneClub(playerOwner.club)
  const player = { ...playerOwner.player }

  buyer.budget -= player.value
  seller.budget += player.value
  buyer.squad.push(player)
  seller.squad = seller.squad.filter((candidate) => candidate.id !== player.id)

  return {
    success: true,
    message: `${player.firstName} ${player.lastName} куплен.`,
    clubs: clubs.map((club) => {
      if (club.id === buyer.id) {
        return buyer
      }
      if (club.id === seller.id) {
        return seller
      }
      return cloneClub(club)
    }),
  }
}

const canSellPlayer = (club: Club, player: Player): string | undefined => {
  if (club.squad.length <= gameConfig.minimumSquadSize) {
    return 'Нельзя оставить в составе менее 16 игроков.'
  }

  const goalkeepers = club.squad.filter((candidate) => candidate.position === 'GK')
  if (player.position === 'GK' && goalkeepers.length <= 1) {
    return 'Нельзя продать последнего вратаря.'
  }

  return undefined
}

const findMarketBuyer = (
  clubs: readonly Club[],
  sellerClubId: string,
  price: number,
): Club | undefined => {
  return [...clubs]
    .filter(
      (club) =>
        club.id !== sellerClubId &&
        club.squad.length < gameConfig.maximumSquadSize &&
        club.budget >= price,
    )
    .sort((left, right) => right.budget - left.budget)[0]
}

export const sellPlayer = (
  clubs: readonly Club[],
  sellerClubId: string,
  playerId: string,
): TransferResult => {
  const sellerSource = findClub(clubs, sellerClubId)
  const player = sellerSource?.squad.find((candidate) => candidate.id === playerId)

  if (!sellerSource || !player) {
    return { success: false, message: 'Игрок или клуб не найден.', clubs: clubs.map(cloneClub) }
  }

  const validationError = canSellPlayer(sellerSource, player)
  if (validationError) {
    return { success: false, message: validationError, clubs: clubs.map(cloneClub) }
  }

  const price = Math.round(player.value * gameConfig.transferSaleCoefficient)
  const buyerSource = findMarketBuyer(clubs, sellerClubId, price)

  if (!buyerSource) {
    return {
      success: false,
      message: 'На рынке нет клуба с бюджетом для покупки.',
      clubs: clubs.map(cloneClub),
    }
  }

  const seller = cloneClub(sellerSource)
  const buyer = cloneClub(buyerSource)

  seller.budget += price
  buyer.budget -= price
  seller.squad = seller.squad.filter((candidate) => candidate.id !== player.id)
  buyer.squad.push({ ...player })

  return {
    success: true,
    message: `${player.firstName} ${player.lastName} продан за ${price}.`,
    clubs: clubs.map((club) => {
      if (club.id === seller.id) {
        return seller
      }
      if (club.id === buyer.id) {
        return buyer
      }
      return cloneClub(club)
    }),
  }
}
