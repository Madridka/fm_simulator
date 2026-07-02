// Явные связи исключают ложные совпадения по суффиксам «-2», «B» и «М».
export const reserveParentByClubId: Readonly<Record<string, string>> = {
  'akron-2': 'akron',
  'arsenal-2': 'arsenal-tula',
  'baltika-2': 'baltika',
  'chelyabinsk-2': 'chelyabinsk',
  'dinamo-2-makhachkala': 'dinamo-makhachkala',
  'dinamo-moscow-2': 'dinamo-moscow',
  'enisey-2': 'enisey',
  'krylia-2': 'krylia-sovetov',
  'orenburg-2': 'orenburg',
  'real-sociedad-b': 'real-sociedad',
  'rodina-2': 'rodina',
  'rodina-m': 'rodina',
  'rostov-2': 'rostov',
  'rotor-2': 'rotor',
  'rubin-2': 'rubin',
  'ska-khabarovsk-2': 'ska-khabarovsk',
  'sochi-2': 'sochi',
  'spartak-2': 'spartak',
  'ural-2': 'ural',
  'zenit-2': 'zenit',
}

// Если у организации несколько молодёжных команд, эта таблица выбирает основной фарм.
export const preferredReserveClubByParentId: Readonly<Record<string, string>> = {
  akron: 'akron-2',
  'arsenal-tula': 'arsenal-2',
  baltika: 'baltika-2',
  chelyabinsk: 'chelyabinsk-2',
  'dinamo-makhachkala': 'dinamo-2-makhachkala',
  'dinamo-moscow': 'dinamo-moscow-2',
  enisey: 'enisey-2',
  'krylia-sovetov': 'krylia-2',
  orenburg: 'orenburg-2',
  'real-sociedad': 'real-sociedad-b',
  rodina: 'rodina-2',
  rostov: 'rostov-2',
  rotor: 'rotor-2',
  rubin: 'rubin-2',
  'ska-khabarovsk': 'ska-khabarovsk-2',
  sochi: 'sochi-2',
  spartak: 'spartak-2',
  ural: 'ural-2',
  zenit: 'zenit-2',
}

export const getOrganizationClubId = (clubId: string): string =>
  reserveParentByClubId[clubId] ?? clubId

export const isReserveClubId = (clubId: string): boolean =>
  Boolean(reserveParentByClubId[clubId])
