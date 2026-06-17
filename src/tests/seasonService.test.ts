import { describe, expect, it } from 'vitest'
import { getNextDivisionId } from '@/domain/season/seasonService'

describe('seasonService', () => {
  it('promotes top two and relegates bottom two with top and bottom division limits', () => {
    expect(getNextDivisionId(2, 1)).toBe(1)
    expect(getNextDivisionId(2, 2)).toBe(1)
    expect(getNextDivisionId(1, 1)).toBe(1)
    expect(getNextDivisionId(1, 9)).toBe(2)
    expect(getNextDivisionId(3, 10)).toBe(4)
    expect(getNextDivisionId(4, 10)).toBe(4)
  })
})
