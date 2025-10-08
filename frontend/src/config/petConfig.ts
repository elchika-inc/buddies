export type PetType = 'dog' | 'cat'

// 型ガード関数
function isPetType(value: string): value is PetType {
  return value === 'dog' || value === 'cat'
}

export const getPetType = (): PetType => {
  const petType = process.env['NEXT_PUBLIC_PET_TYPE'] || 'dog'
  if (!isPetType(petType)) {
    console.warn(`Invalid PET_TYPE: ${petType}, defaulting to 'dog'`)
    return 'dog'
  }
  return petType
}

export const petConfig = {
  dog: {
    title: 'Buddies',
    description: '保護犬と新しい家族をマッチング',
    primaryColor: 'orange',
    primaryColorHex: '#FFA500',
    storageKey: 'dogSwipeState',
    detailRoute: 'dog-detail',
  },
  cat: {
    title: 'Buddies',
    description: '保護猫と新しい家族をマッチング',
    primaryColor: 'purple',
    primaryColorHex: '#9333EA',
    storageKey: 'catSwipeState',
    detailRoute: 'cat-detail',
  },
}

export const getCurrentPetConfig = () => {
  const petType = getPetType()
  return petConfig[petType]
}
