import { careerConfig } from '@/data/gameConfig/career'
import { t } from '@/plugins/i18n/i18n'
import type { Club, Player } from '@/types/football'

export interface TransferResult {
  success: boolean
  message: string
  clubs: Club[]
}

// КЛОНИРУЕТ КЛУБ И СОСТАВ ПЕРЕД БЕЗОПАСНЫМ ИЗМЕНЕНИЕМ ТРАНСФЕРОВ
const cloneClub = (club: Club): Club => ({
  ...club,
  squad: club.squad.map((player) => ({ ...player })),
})

// ЗАМЕНЯЕТ ОДИН КЛУБ В ОБЩЕМ СПИСКЕ ЕГО ОБНОВЛЁННОЙ ВЕРСИЕЙ
const replaceClub = (clubs: readonly Club[], updatedClub: Club): Club[] => {
  return clubs.map((club) => (club.id === updatedClub.id ? updatedClub : cloneClub(club)))
}

// НАХОДИТ КЛУБ ПО ИДЕНТИФИКАТОРУ
const findClub = (clubs: readonly Club[], clubId: string): Club | undefined =>
  clubs.find((club) => club.id === clubId)

// ОПРЕДЕЛЯЕТ КЛУБ, КОТОРОМУ ПРИНАДЛЕЖИТ ИГРОК
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

// ПРОВОДИТ ПОКУПКУ И ОБНОВЛЯЕТ БЮДЖЕТЫ И СОСТАВЫ ОБОИХ КЛУБОВ
export const buyPlayer = (
  clubs: readonly Club[],
  buyerClubId: string,
  playerId: string,
): TransferResult => {
  const playerOwner = findPlayerOwner(clubs, playerId)
  const buyerSource = findClub(clubs, buyerClubId)

  if (!playerOwner || !buyerSource) {
    return { success: false, message: t('transfers.messages.notFound'), clubs: clubs.map(cloneClub) }
  }

  if (playerOwner.club.id === buyerClubId) {
    return {
      success: false,
      message: t('transfers.messages.alreadyInClub'),
      clubs: clubs.map(cloneClub),
    }
  }

  if (buyerSource.squad.length >= careerConfig.maximumSquadSize) {
    return {
      success: false,
      message: t('transfers.messages.squadFull'),
      clubs: clubs.map(cloneClub),
    }
  }

  if (buyerSource.budget < playerOwner.player.value) {
    return {
      success: false,
      message: t('transfers.messages.insufficientBudget'),
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
    message: t('transfers.messages.bought', {
      player: `${player.firstName} ${player.lastName}`,
    }),
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

// ПРОВЕРЯЕТ, МОЖНО ЛИ ПРОДАТЬ ИГРОКА БЕЗ НАРУШЕНИЯ ОГРАНИЧЕНИЙ СОСТАВА
const canSellPlayer = (club: Club, player: Player): string | undefined => {
  if (club.squad.length <= careerConfig.minimumSquadSize) {
    return t('transfers.messages.minimumSquad')
  }

  const goalkeepers = club.squad.filter((candidate) => candidate.position === 'GK')
  if (player.position === 'GK' && goalkeepers.length <= 1) {
    return t('transfers.messages.lastGoalkeeper')
  }

  return undefined
}

// ПОДБИРАЕТ ПЛАТЁЖЕСПОСОБНЫЙ КЛУБ-ПОКУПАТЕЛЬ
const findMarketBuyer = (
  clubs: readonly Club[],
  sellerClubId: string,
  price: number,
): Club | undefined => {
  return [...clubs]
    .filter(
      (club) =>
        club.id !== sellerClubId &&
        club.squad.length < careerConfig.maximumSquadSize &&
        club.budget >= price,
    )
    .sort((left, right) => right.budget - left.budget)[0]
}

// ПРОВОДИТ ПРОДАЖУ ИГРОКА И ЗАЧИСЛЯЕТ ДОХОД КЛУБУ
export const sellPlayer = (
  clubs: readonly Club[],
  sellerClubId: string,
  playerId: string,
): TransferResult => {
  const sellerSource = findClub(clubs, sellerClubId)
  const player = sellerSource?.squad.find((candidate) => candidate.id === playerId)

  if (!sellerSource || !player) {
    return { success: false, message: t('transfers.messages.notFound'), clubs: clubs.map(cloneClub) }
  }

  const validationError = canSellPlayer(sellerSource, player)
  if (validationError) {
    return { success: false, message: validationError, clubs: clubs.map(cloneClub) }
  }

  const price = Math.round(player.value * careerConfig.transferSaleCoefficient)
  const buyerSource = findMarketBuyer(clubs, sellerClubId, price)

  if (!buyerSource) {
    return {
      success: false,
      message: t('transfers.messages.noBuyer'),
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
    message: t('transfers.messages.sold', {
      player: `${player.firstName} ${player.lastName}`,
      price,
    }),
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
