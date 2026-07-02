import { careerConfig } from '@/data/gameConfig/career'
import { t } from '@/plugins/i18n/i18n'
import type { AcademyState, Club, Player } from '@/types/football'
import { getOrganizationClubId, isReserveClubId } from '@/data/reserveClubRelations'

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

  if (getOrganizationClubId(playerOwner.club.id) === getOrganizationClubId(buyerClubId)) {
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
  const sellerBudgetSource =
    findClub(clubs, getOrganizationClubId(playerOwner.club.id)) ?? playerOwner.club
  const sellerBudgetClub = cloneClub(sellerBudgetSource)
  const player = { ...playerOwner.player }

  buyer.budget -= player.value
  sellerBudgetClub.budget += player.value
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
        return seller.id === sellerBudgetClub.id
          ? { ...seller, budget: sellerBudgetClub.budget }
          : seller
      }
      if (club.id === sellerBudgetClub.id) {
        return sellerBudgetClub
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
        getOrganizationClubId(club.id) !== getOrganizationClubId(sellerClubId) &&
        !isReserveClubId(club.id) &&
        club.squad.length < careerConfig.maximumSquadSize &&
        club.budget >= price,
    )
    .sort((left, right) => right.budget - left.budget)[0]
}

export interface ReserveTransferResult extends TransferResult {
  academy: AcademyState
}

// ПОКУПАЕТ ИГРОКА ВИРТУАЛЬНОГО ФАРМА И ЗАЧИСЛЯЕТ ДЕНЬГИ ГОЛОВНОМУ КЛУБУ
export const buyReservePlayer = (
  clubs: readonly Club[],
  academy: AcademyState,
  buyerClubId: string,
  playerId: string,
): ReserveTransferResult => {
  const player = academy.reserveTeam.squad.find((candidate) => candidate.id === playerId)
  const buyer = findClub(clubs, buyerClubId)
  const parent = findClub(clubs, academy.clubId)
  if (!player || !buyer || !parent) {
    return { success: false, message: t('transfers.messages.notFound'), clubs: clubs.map(cloneClub), academy }
  }
  if (getOrganizationClubId(buyer.id) === academy.clubId) {
    return { success: false, message: t('transfers.messages.alreadyInClub'), clubs: clubs.map(cloneClub), academy }
  }
  if (buyer.squad.length >= careerConfig.maximumSquadSize) {
    return { success: false, message: t('transfers.messages.squadFull'), clubs: clubs.map(cloneClub), academy }
  }
  if (buyer.budget < player.value) {
    return { success: false, message: t('transfers.messages.insufficientBudget'), clubs: clubs.map(cloneClub), academy }
  }

  const nextClubs = clubs.map((club) => {
    if (club.id === buyer.id) {
      return { ...cloneClub(club), budget: club.budget - player.value, squad: [...club.squad, { ...player }] }
    }
    if (club.id === parent.id) return { ...cloneClub(club), budget: club.budget + player.value }
    return cloneClub(club)
  })
  return {
    success: true,
    message: t('transfers.messages.bought', { player: `${player.firstName} ${player.lastName}` }),
    clubs: nextClubs,
    academy: {
      ...academy,
      reserveTeam: {
        ...academy.reserveTeam,
        squad: academy.reserveTeam.squad.filter((candidate) => candidate.id !== playerId),
      },
    },
  }
}

// ПРОДАЁТ ИГРОКА ФАРМА ОТ ИМЕНИ ГОЛОВНОГО КЛУБА
export const sellReservePlayer = (
  clubs: readonly Club[],
  academy: AcademyState,
  playerId: string,
): ReserveTransferResult => {
  const linkedClub = academy.reserveTeam.linkedClubId
    ? findClub(clubs, academy.reserveTeam.linkedClubId)
    : undefined
  const reserveSquad = linkedClub?.squad ?? academy.reserveTeam.squad
  const player = reserveSquad.find((candidate) => candidate.id === playerId)
  const parent = findClub(clubs, academy.clubId)
  if (!player || !parent) {
    return {
      success: false,
      message: t('transfers.messages.notFound'),
      clubs: clubs.map(cloneClub),
      academy,
    }
  }

  const price = Math.round(player.value * careerConfig.transferSaleCoefficient)
  const buyerSource = findMarketBuyer(clubs, academy.clubId, price)
  if (!buyerSource) {
    return {
      success: false,
      message: t('transfers.messages.noBuyer'),
      clubs: clubs.map(cloneClub),
      academy,
    }
  }

  const nextClubs = clubs.map((club) => {
    if (club.id === parent.id) return { ...cloneClub(club), budget: club.budget + price }
    if (club.id === buyerSource.id) {
      return { ...cloneClub(club), budget: club.budget - price, squad: [...club.squad, { ...player }] }
    }
    if (club.id === linkedClub?.id) {
      return { ...cloneClub(club), squad: club.squad.filter((candidate) => candidate.id !== playerId) }
    }
    return cloneClub(club)
  })
  const nextAcademy = {
    ...academy,
    reserveTeam: linkedClub
      ? academy.reserveTeam
      : {
          ...academy.reserveTeam,
          squad: academy.reserveTeam.squad.filter((candidate) => candidate.id !== playerId),
        },
    history: [{
      id: `transfer:${academy.clubId}:${player.id}:${academy.history.length}`,
      season: academy.nextIntakeSeason - 1,
      type: 'transfer' as const,
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`.trim(),
    }, ...academy.history].slice(0, 80),
  }

  return {
    success: true,
    message: t('transfers.messages.sold', { player: `${player.firstName} ${player.lastName}`, price }),
    clubs: nextClubs,
    academy: nextAcademy,
  }
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
