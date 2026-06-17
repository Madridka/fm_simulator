import { describe, expect, it } from 'vitest'
import { buyPlayer } from '@/domain/transfer/transferService'
import { clubs } from '@/data/clubs'

describe('transferService', () => {
  it('does not allow buying a player without enough budget', () => {
    const buyer = {
      ...clubs[0]!,
      budget: 0,
      squad: clubs[0]!.squad.map((player) => ({ ...player })),
    }
    const seller = { ...clubs[1]!, squad: clubs[1]!.squad.map((player) => ({ ...player })) }
    const player = seller.squad[0]!

    const result = buyPlayer([buyer, seller], buyer.id, player.id)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Недостаточно бюджета для покупки.')
  })
})
