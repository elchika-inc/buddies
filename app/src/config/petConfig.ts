export type PetType = 'dog' | 'cat'

export const getPetType = (): PetType => {
  const petType = process.env.NEXT_PUBLIC_PET_TYPE || 'dog'
  if (petType !== 'dog' && petType !== 'cat') {
    console.warn(`Invalid PET_TYPE: ${petType}, defaulting to 'dog'`)
    return 'dog'
  }
  return petType as PetType
}

export const petConfig = {
  dog: {
    title: 'DogMatch',
    description: '保護犬と新しい家族をマッチング',
    primaryColor: 'orange',
    primaryColorHex: '#FFA500',
    storageKey: 'dogSwipeState',
    detailRoute: 'dog-detail'
  },
  cat: {
    title: 'CatMatch',
    description: '保護猫と新しい家族をマッチング',
    primaryColor: 'purple',
    primaryColorHex: '#9333EA',
    storageKey: 'catSwipeState',
    detailRoute: 'cat-detail'
  }
}

export const getCurrentPetConfig = () => {
  const petType = getPetType()
  return petConfig[petType]
}