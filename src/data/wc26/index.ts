export { worldCup2026Config, WORLD_CUP_SAVE_VERSION } from '@/data/wc26/config'
export { worldCup2026Groups, getGroupIdForTeam } from '@/data/wc26/groups'
export type { WorldCup2026TeamId } from '@/data/wc26/groups'

export {
  worldCup2026ProfilesById,
  worldCup2026RatingByTeamId,
  worldCup2026TeamProfiles,
} from '@/data/wc26/teams/index'

export type {
  NationalTeamPlayer,
  NationalTeamPlayerPosition,
  NationalTeamProfile,
} from '@/data/wc26/types'

export type { NationalTeam } from '@/data/wc26/nationalTeam'
export { flagEmoji } from '@/data/wc26/nationalTeam'

export {
  buildAllNationalTeams,
  buildNationalTeam,
  generateNationalTeamRoster,
} from '@/data/wc26/rosters'
