export const formatMoney = (value: number): string => {
  const millions = value / 1_000_000
  return `${millions.toFixed(millions >= 10 ? 0 : 1)} млн`
}

export const formatPlayerName = (firstName: string, lastName: string): string =>
  `${firstName} ${lastName}`

export const formatDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-')

  if (!year || !month || !day) {
    return isoDate
  }

  return `${day}.${month}.${year}`
}
