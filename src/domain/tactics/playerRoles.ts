import type { PlayerPosition, PlayerRoleId } from '@/types/football'

export interface PlayerRoleDefinition {
  id: PlayerRoleId
  label: string
  shortLabel: string
  description: string
  positions: PlayerPosition[]
  effects: {
    attack: number
    control: number
    defense: number
    pressing: number
    width: number
    risk: number
    fatigue: number
  }
}

export const playerRoles: PlayerRoleDefinition[] = [
  {
    id: 'keeper',
    label: 'Вратарь',
    shortLabel: 'ВР',
    description: 'Надёжная игра на линии без лишнего риска.',
    positions: ['GK'],
    effects: { attack: 0, control: 0, defense: 9, pressing: 0, width: 0, risk: -3, fatigue: 0 },
  },
  {
    id: 'sweeperKeeper',
    label: 'Вратарь-либеро',
    shortLabel: 'ЛИБ',
    description: 'Выше встречает мячи за спину, полезен при высокой линии.',
    positions: ['GK'],
    effects: { attack: 1, control: 3, defense: 5, pressing: 2, width: 0, risk: 5, fatigue: 1 },
  },
  {
    id: 'fullBack',
    label: 'Фулбек',
    shortLabel: 'ФБ',
    description: 'Балансирует между поддержкой атаки и защитой фланга.',
    positions: ['LB', 'RB'],
    effects: { attack: 3, control: 2, defense: 6, pressing: 2, width: 5, risk: 1, fatigue: 2 },
  },
  {
    id: 'wingBack',
    label: 'Латераль',
    shortLabel: 'ЛАТ',
    description: 'Активно поднимается по флангу и перегружает край.',
    positions: ['LB', 'RB'],
    effects: { attack: 7, control: 2, defense: 3, pressing: 3, width: 9, risk: 6, fatigue: 7 },
  },
  {
    id: 'defensiveCenterBack',
    label: 'Стоппер',
    shortLabel: 'СТП',
    description: 'Простая и надёжная оборонительная роль.',
    positions: ['CB'],
    effects: { attack: 0, control: 0, defense: 9, pressing: 1, width: 0, risk: -4, fatigue: 1 },
  },
  {
    id: 'ballPlayingCenterBack',
    label: 'Разыгрывающий ЦЗ',
    shortLabel: 'РЦЗ',
    description: 'Начинает атаки передачами, но чаще рискует мячом.',
    positions: ['CB'],
    effects: { attack: 2, control: 6, defense: 6, pressing: 1, width: 1, risk: 4, fatigue: 1 },
  },
  {
    id: 'anchor',
    label: 'Якорь',
    shortLabel: 'ЯК',
    description: 'Держит опорную зону и страхует защитников.',
    positions: ['CDM', 'CM'],
    effects: { attack: 0, control: 3, defense: 9, pressing: 2, width: 0, risk: -5, fatigue: 2 },
  },
  {
    id: 'ballWinner',
    label: 'Разрушитель',
    shortLabel: 'РЗР',
    description: 'Агрессивно вступает в отбор и ускоряет возврат мяча.',
    positions: ['CDM', 'CM'],
    effects: { attack: 1, control: 1, defense: 7, pressing: 8, width: 0, risk: 4, fatigue: 7 },
  },
  {
    id: 'boxToBox',
    label: 'Box-to-box',
    shortLabel: 'B2B',
    description: 'Покрывает много пространства от штрафной до штрафной.',
    positions: ['CM', 'CDM', 'CAM'],
    effects: { attack: 5, control: 4, defense: 5, pressing: 5, width: 1, risk: 3, fatigue: 8 },
  },
  {
    id: 'deepPlaymaker',
    label: 'Глубинный плеймейкер',
    shortLabel: 'ГП',
    description: 'Управляет темпом из глубины и помогает владению.',
    positions: ['CDM', 'CM'],
    effects: { attack: 3, control: 9, defense: 4, pressing: 1, width: 1, risk: 2, fatigue: 2 },
  },
  {
    id: 'advancedPlaymaker',
    label: 'Плеймейкер',
    shortLabel: 'АП',
    description: 'Ищет передачи между линиями и создаёт моменты.',
    positions: ['CAM', 'CM', 'LW', 'RW'],
    effects: { attack: 7, control: 7, defense: 1, pressing: 1, width: 1, risk: 5, fatigue: 3 },
  },
  {
    id: 'insideForward',
    label: 'Инсайд',
    shortLabel: 'ИНС',
    description: 'Смещается в штрафную и чаще завершает атаки.',
    positions: ['LW', 'RW'],
    effects: { attack: 9, control: 2, defense: 1, pressing: 3, width: -2, risk: 5, fatigue: 5 },
  },
  {
    id: 'wideWinger',
    label: 'Вингер',
    shortLabel: 'ВНГ',
    description: 'Держит ширину, растягивает оборону и навешивает.',
    positions: ['LW', 'RW', 'LB', 'RB'],
    effects: { attack: 6, control: 2, defense: 2, pressing: 3, width: 9, risk: 3, fatigue: 5 },
  },
  {
    id: 'pressingForward',
    label: 'Прессинг-форвард',
    shortLabel: 'ПФ',
    description: 'Давит защитников и провоцирует ошибки при розыгрыше.',
    positions: ['ST', 'LW', 'RW'],
    effects: { attack: 6, control: 1, defense: 2, pressing: 9, width: 0, risk: 4, fatigue: 8 },
  },
  {
    id: 'targetForward',
    label: 'Таргетмен',
    shortLabel: 'ТМ',
    description: 'Цепляется за длинные передачи и выигрывает верх.',
    positions: ['ST'],
    effects: { attack: 7, control: 1, defense: 1, pressing: 1, width: 0, risk: 2, fatigue: 4 },
  },
  {
    id: 'poacher',
    label: 'Наконечник',
    shortLabel: 'НАК',
    description: 'Меньше участвует в прессинге, но лучше открывается под удар.',
    positions: ['ST'],
    effects: { attack: 9, control: 0, defense: 0, pressing: -2, width: 0, risk: 3, fatigue: 2 },
  },
]

const rolesById = new Map(playerRoles.map((role) => [role.id, role]))

export const getPlayerRole = (roleId: PlayerRoleId | undefined): PlayerRoleDefinition =>
  rolesById.get(roleId ?? 'keeper') ?? playerRoles[0]!

export const rolesForPosition = (position: PlayerPosition): PlayerRoleDefinition[] =>
  playerRoles.filter((role) => role.positions.includes(position))
