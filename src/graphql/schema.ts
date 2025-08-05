import { gql } from '@apollo/client';

export const typeDefs = gql`
  enum Species {
    dog
    cat
  }

  enum Gender {
    male
    female
  }

  enum Size {
    small
    medium
    large
  }

  enum AdoptionStatus {
    available
    pending
    adopted
    unavailable
  }

  enum HealthStatus {
    healthy
    special_needs
    medical_attention
  }

  enum ExerciseNeeds {
    low
    moderate
    high
  }

  enum TrainingLevel {
    basic
    intermediate
    advanced
  }

  enum SocialLevel {
    shy
    moderate
    friendly
    very_friendly
  }

  enum CoatLength {
    short
    long
  }

  enum IndoorOutdoor {
    indoor_only
    outdoor_only
    both
  }

  enum Vocalization {
    quiet
    moderate
    vocal
  }

  type AnimalImage {
    id: ID!
    url: String!
    alt: String!
    width: Int!
    height: Int!
  }

  type Location {
    prefecture: String!
    city: String!
    latitude: Float
    longitude: Float
  }

  type Organization {
    id: ID!
    name: String!
    type: String!
    contact: Contact!
    location: Location!
    verified: Boolean!
    createdAt: String!
  }

  type Contact {
    email: String
    phone: String
    website: String
  }

  interface Animal {
    id: ID!
    name: String!
    species: Species!
    breed: String!
    age: Int!
    gender: Gender!
    size: Size!
    images: [AnimalImage!]!
    description: String!
    personality: [String!]!
    specialNeeds: [String!]!
    healthStatus: HealthStatus!
    location: Location!
    organization: Organization!
    isActive: Boolean!
    featured: Boolean!
    viewCount: Int!
    likeCount: Int!
    adoptionStatus: AdoptionStatus!
    adoptionFee: Int!
    createdAt: String!
    updatedAt: String!
  }

  type DogInfo {
    breed: String!
    isMixed: Boolean!
    exerciseNeeds: ExerciseNeeds!
    walkFrequency: Int!
    walkDuration: Int!
    playfulness: Int!
    energyLevel: Int!
    trainingLevel: TrainingLevel!
    housebroken: Boolean!
    leashTrained: Boolean!
    commands: [String!]!
    behaviorIssues: [String!]!
    goodWithChildren: Boolean!
    goodWithDogs: Boolean!
    goodWithCats: Boolean!
    goodWithStrangers: Boolean!
    apartmentSuitable: Boolean!
    yardRequired: Boolean!
    climatePreference: [String!]!
    guardDog: Boolean!
    huntingInstinct: Boolean!
    swimmingAbility: Boolean!
    noiseLevel: String!
  }

  type CatInfo {
    breed: String!
    isMixed: Boolean!
    coatLength: CoatLength!
    coatPattern: [String!]!
    eyeColor: String!
    activityLevel: Int!
    affectionLevel: Int!
    socialLevel: SocialLevel!
    playfulness: Int!
    indoorOutdoor: IndoorOutdoor!
    apartmentSuitable: Boolean!
    climatePreference: [String!]!
    goodWithChildren: Boolean!
    goodWithCats: Boolean!
    goodWithDogs: Boolean!
    goodWithStrangers: Boolean!
    litterBoxTrained: Boolean!
    scratchingPostUse: Boolean!
    vocalization: Vocalization!
    nightActivity: Boolean!
    groomingNeeds: String!
    specialDiet: [String!]!
    allergies: [String!]!
    declawed: Boolean!
    multiCatCompatible: Boolean!
    preferredCompanionType: String!
  }

  type Dog implements Animal {
    id: ID!
    name: String!
    species: Species!
    breed: String!
    age: Int!
    gender: Gender!
    size: Size!
    images: [AnimalImage!]!
    description: String!
    personality: [String!]!
    specialNeeds: [String!]!
    healthStatus: HealthStatus!
    location: Location!
    organization: Organization!
    isActive: Boolean!
    featured: Boolean!
    viewCount: Int!
    likeCount: Int!
    adoptionStatus: AdoptionStatus!
    adoptionFee: Int!
    createdAt: String!
    updatedAt: String!
    dogInfo: DogInfo!
  }

  type Cat implements Animal {
    id: ID!
    name: String!
    species: Species!
    breed: String!
    age: Int!
    gender: Gender!
    size: Size!
    images: [AnimalImage!]!
    description: String!
    personality: [String!]!
    specialNeeds: [String!]!
    healthStatus: HealthStatus!
    location: Location!
    organization: Organization!
    isActive: Boolean!
    featured: Boolean!
    viewCount: Int!
    likeCount: Int!
    adoptionStatus: AdoptionStatus!
    adoptionFee: Int!
    createdAt: String!
    updatedAt: String!
    catInfo: CatInfo!
  }

  input AnimalFilter {
    species: Species
    breed: String
    ageMin: Int
    ageMax: Int
    gender: Gender
    size: Size
    location: String
    healthStatus: HealthStatus
  }

  type PaginationInfo {
    currentPage: Int!
    totalPages: Int!
    totalItems: Int!
    itemsPerPage: Int!
    hasNext: Boolean!
    hasPrevious: Boolean!
  }

  type AnimalConnection {
    animals: [Animal!]!
    pagination: PaginationInfo!
  }

  type SwipeAction {
    id: ID!
    animalId: ID!
    userId: ID!
    action: String!
    timestamp: String!
  }

  type Query {
    # 動物関連
    animals(
      filter: AnimalFilter
      page: Int = 1
      limit: Int = 20
    ): AnimalConnection!
    
    animal(id: ID!): Animal
    
    dogs(
      page: Int = 1
      limit: Int = 20
    ): AnimalConnection!
    
    cats(
      page: Int = 1
      limit: Int = 20
    ): AnimalConnection!
    
    # 検索
    searchAnimals(
      query: String!
      species: Species
      page: Int = 1
      limit: Int = 20
    ): AnimalConnection!
    
    # 人気・新着
    featuredAnimals(
      species: Species
      limit: Int = 10
    ): [Animal!]!
    
    recentAnimals(
      species: Species
      limit: Int = 10
    ): [Animal!]!
  }

  type Mutation {
    # スワイプアクション
    recordSwipe(
      animalId: ID!
      action: String!
    ): SwipeAction!
    
    # お気に入り
    toggleFavorite(animalId: ID!): Boolean!
  }
`;