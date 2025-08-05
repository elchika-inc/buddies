import { gql } from '@apollo/client';

// 動物の基本フラグメント
export const ANIMAL_FRAGMENT = gql`
  fragment AnimalFragment on Animal {
    id
    name
    species
    breed
    age
    gender
    size
    images {
      id
      url
      alt
      width
      height
    }
    description
    personality
    specialNeeds
    healthStatus
    location {
      prefecture
      city
      latitude
      longitude
    }
    organization {
      id
      name
      type
      contact {
        email
        phone
        website
      }
      location {
        prefecture
        city
        latitude
        longitude
      }
      verified
      createdAt
    }
    isActive
    featured
    viewCount
    likeCount
    adoptionStatus
    createdAt
    updatedAt
  }
`;

// 犬の詳細フラグメント
export const DOG_FRAGMENT = gql`
  fragment DogFragment on Dog {
    ...AnimalFragment
    dogInfo {
      breed
      isMixed
      exerciseNeeds
      walkFrequency
      walkDuration
      playfulness
      energyLevel
      trainingLevel
      housebroken
      leashTrained
      commands
      behaviorIssues
      goodWithChildren
      goodWithDogs
      goodWithCats
      goodWithStrangers
      apartmentSuitable
      yardRequired
      climatePreference
      guardDog
      huntingInstinct
      swimmingAbility
      noiseLevel
    }
  }
  ${ANIMAL_FRAGMENT}
`;

// 猫の詳細フラグメント
export const CAT_FRAGMENT = gql`
  fragment CatFragment on Cat {
    ...AnimalFragment
    catInfo {
      breed
      isMixed
      coatLength
      coatPattern
      eyeColor
      activityLevel
      affectionLevel
      socialLevel
      playfulness
      indoorOutdoor
      apartmentSuitable
      climatePreference
      goodWithChildren
      goodWithCats
      goodWithDogs
      goodWithStrangers
      litterBoxTrained
      scratchingPostUse
      vocalization
      nightActivity
      groomingNeeds
      specialDiet
      allergies
      declawed
      multiCatCompatible
      preferredCompanionType
    }
  }
  ${ANIMAL_FRAGMENT}
`;

// ページネーション情報フラグメント
export const PAGINATION_FRAGMENT = gql`
  fragment PaginationFragment on PaginationInfo {
    currentPage
    totalPages
    totalItems
    itemsPerPage
    hasNext
    hasPrevious
  }
`;

// クエリ定義
export const GET_ANIMALS = gql`
  query GetAnimals($filter: AnimalFilter, $page: Int, $limit: Int) {
    animals(filter: $filter, page: $page, limit: $limit) {
      animals {
        ...AnimalFragment
        ... on Dog {
          ...DogFragment
        }
        ... on Cat {
          ...CatFragment
        }
      }
      pagination {
        ...PaginationFragment
      }
    }
  }
  ${ANIMAL_FRAGMENT}
  ${DOG_FRAGMENT}
  ${CAT_FRAGMENT}
  ${PAGINATION_FRAGMENT}
`;

export const GET_ANIMAL = gql`
  query GetAnimal($id: ID!) {
    animal(id: $id) {
      ...AnimalFragment
      ... on Dog {
        ...DogFragment
      }
      ... on Cat {
        ...CatFragment
      }
    }
  }
  ${ANIMAL_FRAGMENT}
  ${DOG_FRAGMENT}
  ${CAT_FRAGMENT}
`;

export const GET_DOGS = gql`
  query GetDogs($page: Int, $limit: Int) {
    dogs(page: $page, limit: $limit) {
      animals {
        ...DogFragment
      }
      pagination {
        ...PaginationFragment
      }
    }
  }
  ${DOG_FRAGMENT}
  ${PAGINATION_FRAGMENT}
`;

export const GET_CATS = gql`
  query GetCats($page: Int, $limit: Int) {
    cats(page: $page, limit: $limit) {
      animals {
        ...CatFragment
      }
      pagination {
        ...PaginationFragment
      }
    }
  }
  ${CAT_FRAGMENT}
  ${PAGINATION_FRAGMENT}
`;

export const SEARCH_ANIMALS = gql`
  query SearchAnimals($query: String!, $species: Species, $page: Int, $limit: Int) {
    searchAnimals(query: $query, species: $species, page: $page, limit: $limit) {
      animals {
        ...AnimalFragment
        ... on Dog {
          ...DogFragment
        }
        ... on Cat {
          ...CatFragment
        }
      }
      pagination {
        ...PaginationFragment
      }
    }
  }
  ${ANIMAL_FRAGMENT}
  ${DOG_FRAGMENT}
  ${CAT_FRAGMENT}
  ${PAGINATION_FRAGMENT}
`;

export const GET_FEATURED_ANIMALS = gql`
  query GetFeaturedAnimals($species: Species, $limit: Int) {
    featuredAnimals(species: $species, limit: $limit) {
      ...AnimalFragment
      ... on Dog {
        ...DogFragment
      }
      ... on Cat {
        ...CatFragment
      }
    }
  }
  ${ANIMAL_FRAGMENT}
  ${DOG_FRAGMENT}
  ${CAT_FRAGMENT}
`;

export const GET_RECENT_ANIMALS = gql`
  query GetRecentAnimals($species: Species, $limit: Int) {
    recentAnimals(species: $species, limit: $limit) {
      ...AnimalFragment
      ... on Dog {
        ...DogFragment
      }
      ... on Cat {
        ...CatFragment
      }
    }
  }
  ${ANIMAL_FRAGMENT}
  ${DOG_FRAGMENT}
  ${CAT_FRAGMENT}
`;

// ミューテーション定義
export const RECORD_SWIPE = gql`
  mutation RecordSwipe($animalId: ID!, $action: String!) {
    recordSwipe(animalId: $animalId, action: $action) {
      id
      animalId
      userId
      action
      timestamp
    }
  }
`;

export const TOGGLE_FAVORITE = gql`
  mutation ToggleFavorite($animalId: ID!) {
    toggleFavorite(animalId: $animalId)
  }
`;