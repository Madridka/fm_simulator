import type { WorldCupGroupId } from '@/stores/worldCup2026/enums'

export type NationalTeamPlayerPosition = 'GK' | 'DF' | 'MF' | 'FW'

export interface NationalTeamPlayer {
  id: string
  firstName: string
  lastName: string
  nameOnShirt: string
  originalFirstName: string
  originalLastName: string
  originalNameOnShirt: string
  dateOfBirth: string
  age: number
  shirtNumber: number
  position: NationalTeamPlayerPosition
  club: string
  height: number
  caps: number
  goals: number
  rating: number
  potential: number
  fitness: number
  form: number
  value: number
  salary: number
  isInjured: boolean
}

export interface NationalTeamProfile {
  id: string
  name: string
  shortName: string
  fifaCode: string
  groupId: WorldCupGroupId
  flag: string
  flagCode?: string
  rating: number
  attackRating: number
  midfieldRating: number
  defenseRating: number
  primaryColor: string
  secondaryColor: string
  squad?: NationalTeamPlayer[]
}
