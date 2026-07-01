import { t } from '@/plugins/i18n/i18n'

// ФОРМАТИРУЕТ БЮДЖЕТ И СТОИМОСТЬ В МИЛЛИОНАХ
export const formatMoney = (value: number): string => {
  const millions = value / 1_000_000
  return t('common.moneyMillions', {
    value: millions.toFixed(millions >= 10 ? 0 : 1),
  })
}

// ОБЪЕДИНЯЕТ ИМЯ И ФАМИЛИЮ ИГРОКА ДЛЯ ОТОБРАЖЕНИЯ
export const formatPlayerName = (firstName: string, lastName: string): string =>
  `${firstName} ${lastName}`.trim()

// ПРЕОБРАЗУЕТ ISO-ДАТУ В ПРИВЫЧНЫЙ ФОРМАТ ДД.ММ.ГГГГ
export const formatDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-')

  if (!year || !month || !day) {
    return isoDate
  }

  return `${day}.${month}.${year}`
}
