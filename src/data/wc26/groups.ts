import type { WorldCupGroupId } from '@/stores/worldCup2026/enums'

export const worldCup2026Groups = [
  { id: 'A' as const, teams: ['mexico', 'south-africa', 'south-korea', 'czechia'] as const },
  { id: 'B' as const, teams: ['canada', 'switzerland', 'qatar', 'bosnia-and-herzegovina'] as const },
  { id: 'C' as const, teams: ['brazil', 'morocco', 'haiti', 'scotland'] as const },
  { id: 'D' as const, teams: ['usa', 'paraguay', 'australia', 'turkey'] as const },
  { id: 'E' as const, teams: ['germany', 'ecuador', 'ivory-coast', 'curacao'] as const },
  { id: 'F' as const, teams: ['netherlands', 'japan', 'tunisia', 'sweden'] as const },
  { id: 'G' as const, teams: ['belgium', 'egypt', 'iran', 'new-zealand'] as const },
  { id: 'H' as const, teams: ['spain', 'uruguay', 'saudi-arabia', 'cape-verde'] as const },
  { id: 'I' as const, teams: ['france', 'senegal', 'iraq', 'norway'] as const },
  { id: 'J' as const, teams: ['argentina', 'algeria', 'austria', 'jordan'] as const },
  { id: 'K' as const, teams: ['portugal', 'colombia', 'uzbekistan', 'dr-congo'] as const },
  { id: 'L' as const, teams: ['england', 'croatia', 'ghana', 'panama'] as const },
] as const

export type WorldCup2026TeamId = (typeof worldCup2026Groups)[number]['teams'][number]

export const getGroupIdForTeam = (teamId: string): WorldCupGroupId | undefined => {
  for (const group of worldCup2026Groups) {
    if ((group.teams as readonly string[]).includes(teamId)) {
      return group.id
    }
  }
  return undefined
}
