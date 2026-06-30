import type { PositionSelector, TableZoneType } from '@/data/gameConfig/types'
import type { LeagueTableRow } from '@/types/football'

export const resolvePositionIndexes = (
  selector: PositionSelector,
  participantsCount: number,
): number[] => {
  const positions = (() => {
    switch (selector.type) {
      case 'top':
        return Array.from({ length: selector.count }, (_, index) => index + 1)
      case 'positions':
        return selector.positions
      case 'bottom':
        return Array.from(
          { length: selector.count },
          (_, index) => participantsCount - selector.count + index + 1,
        )
      case 'from-bottom':
        return selector.offsets.map((offset) => participantsCount - offset + 1)
      case 'range':
        return Array.from({ length: selector.to - selector.from + 1 }, (_, index) => selector.from + index)
    }
  })()

  return [...new Set(positions)]
    .filter((position) => position >= 1 && position <= participantsCount)
    .sort((left, right) => left - right)
}

export const selectTableRows = (
  rows: readonly LeagueTableRow[],
  selector: PositionSelector,
): LeagueTableRow[] => {
  const positions = new Set(resolvePositionIndexes(selector, rows.length))
  return [...rows]
    .filter((row) => positions.has(row.position))
    .sort((left, right) => left.position - right.position)
}

export const getTableZoneType = (
  position: number,
  participantsCount: number,
  zones: readonly { type: TableZoneType; selector: PositionSelector }[],
): TableZoneType | undefined =>
  zones.find((zone) => resolvePositionIndexes(zone.selector, participantsCount).includes(position))?.type
