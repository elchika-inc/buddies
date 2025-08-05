import { mockAnimals } from '../data/animals';
import { mockDogs } from '../data/dogs';
import { mockCats } from '../data/cats';
import { DataStorageFactory, D1DataStorage } from '../services/dataStorage';
import { D1Database } from '../services/d1Storage';
import type { Dog } from '../types/dog';
import type { Cat } from '../types/cat';
import type { BaseAnimal } from '../types/common';
import type { AnimalFilter, AnimalConnection, PaginationInfo, GraphQLContext } from '../types/graphql';

// データストレージインスタンス（環境に応じて切り替え）
let storageInstance: D1DataStorage | null = null;
console.log('🔧 GraphQLリゾルバー初期化');
console.log('📊 初期ストレージインスタンス:', storageInstance?.constructor.name || 'null');

// D1データベースを使用するための設定関数
export const configureDataStorage = (db?: D1Database) => {
  console.log('⚙️ configureDataStorage() 呼び出し');
  console.log('🗄️ D1Database パラメータ:', db ? 'あり' : 'なし');
  
  storageInstance = db ? DataStorageFactory.createD1(db) : null;
  console.log('✅ ストレージインスタンス更新:', storageInstance?.constructor.name || 'null');
};

// データ変換ヘルパー関数
const transformDogToGraphQL = (dog: Dog | any) => ({
  id: dog.id,
  name: dog.name,
  species: dog.species === '犬' ? 'dog' : 'dog', // デフォルトでdog
  breed: dog.breed,
  age: dog.age,
  gender: dog.gender === '男の子' ? 'male' : 'female',
  size: dog.size === '小型犬' ? 'small' : dog.size === '中型犬' ? 'medium' : 'large',
  images: [{
    id: '1',
    url: dog.imageUrl,
    alt: dog.name,
    width: 400,
    height: 300
  }],
  description: dog.description,
  personality: dog.personality || [],
  specialNeeds: [],
  healthStatus: 'healthy',
  adoptionFee: dog.adoptionFee || 0,
  location: {
    prefecture: typeof dog.location === 'string' ? dog.location : dog.location?.prefecture || '',
    city: typeof dog.location === 'string' ? '' : dog.location?.city || ''
  },
  organization: {
    id: '1',
    name: dog.shelterName || '保護団体',
    type: 'shelter',
    contact: {
      phone: dog.shelterContact
    },
    location: {
      prefecture: typeof dog.location === 'string' ? dog.location : dog.location?.prefecture || '',
      city: typeof dog.location === 'string' ? '' : dog.location?.city || ''
    },
    verified: true,
    createdAt: dog.createdAt || new Date().toISOString()
  },
  isActive: true,
  featured: false,
  viewCount: 0,
  likeCount: 0,
  adoptionStatus: 'available',
  createdAt: dog.createdAt || new Date().toISOString(),
  updatedAt: dog.createdAt || new Date().toISOString(),
  dogInfo: {
    breed: dog.breed,
    isMixed: dog.breed.includes('MIX') || dog.breed.includes('雑種'),
    exerciseNeeds: dog.exerciseLevel === '高' ? 'high' : dog.exerciseLevel === '中' ? 'moderate' : 'low',
    walkFrequency: parseInt(dog.walkFrequency?.match(/\d+/)?.[0] || '2'),
    walkDuration: 30,
    playfulness: 3,
    energyLevel: dog.exerciseLevel === '高' ? 4 : dog.exerciseLevel === '中' ? 3 : 2,
    trainingLevel: dog.trainingLevel === '基本済み' ? 'basic' : 'basic',
    housebroken: true,
    leashTrained: true,
    commands: ['sit', 'stay'],
    behaviorIssues: [],
    goodWithChildren: dog.goodWithKids || false,
    goodWithDogs: dog.goodWithOtherDogs || false,
    goodWithCats: false,
    goodWithStrangers: true,
    apartmentSuitable: dog.apartmentFriendly || false,
    yardRequired: dog.needsYard || false,
    climatePreference: ['temperate'],
    guardDog: false,
    huntingInstinct: false,
    swimmingAbility: false,
    noiseLevel: 'moderate'
  }
});

const transformCatToGraphQL = (cat: Cat | any) => ({
  id: cat.id,
  name: cat.name,
  species: cat.species === '猫' ? 'cat' : 'cat',
  breed: cat.breed,
  age: cat.age,
  gender: cat.gender === '男の子' ? 'male' : 'female',
  size: cat.size === '小型' ? 'small' : cat.size === '中型' ? 'medium' : 'large',
  images: [{
    id: '1',
    url: cat.imageUrl,
    alt: cat.name,
    width: 400,
    height: 300
  }],
  description: cat.description,
  personality: cat.personality || [],
  specialNeeds: [],
  healthStatus: 'healthy',
  adoptionFee: cat.adoptionFee || 0,
  location: {
    prefecture: typeof cat.location === 'string' ? cat.location : cat.location?.prefecture || '',
    city: typeof cat.location === 'string' ? '' : cat.location?.city || ''
  },
  organization: {
    id: '1',
    name: cat.shelterName || '保護団体',
    type: 'shelter',
    contact: {
      phone: cat.shelterContact
    },
    location: {
      prefecture: typeof cat.location === 'string' ? cat.location : cat.location?.prefecture || '',
      city: typeof cat.location === 'string' ? '' : cat.location?.city || ''
    },
    verified: true,
    createdAt: cat.createdAt || new Date().toISOString()
  },
  isActive: true,
  featured: false,
  viewCount: 0,
  likeCount: 0,
  adoptionStatus: 'available',
  createdAt: cat.createdAt || new Date().toISOString(),
  updatedAt: cat.createdAt || new Date().toISOString(),
  catInfo: {
    breed: cat.breed,
    isMixed: cat.breed.includes('MIX') || cat.breed.includes('雑種'),
    coatLength: 'short',
    coatPattern: ['solid'],
    eyeColor: 'green',
    activityLevel: 3,
    affectionLevel: 3,
    socialLevel: cat.socialLevel === '人懐っこい' ? 'friendly' : 'moderate',
    playfulness: 3,
    indoorOutdoor: cat.indoorOutdoor === '完全室内' ? 'indoor_only' : 'both',
    apartmentSuitable: true,
    climatePreference: ['temperate'],
    goodWithChildren: cat.goodWithKids || false,
    goodWithCats: cat.goodWithMultipleCats || false,
    goodWithDogs: false,
    goodWithStrangers: false,
    litterBoxTrained: true,
    scratchingPostUse: true,
    vocalization: cat.vocalizationLevel === '静か' ? 'quiet' : 'moderate',
    nightActivity: false,
    groomingNeeds: 'low',
    specialDiet: [],
    allergies: [],
    declawed: false,
    multiCatCompatible: cat.goodWithMultipleCats || false,
    preferredCompanionType: 'alone'
  }
});

// GraphQLリゾルバーの実装
export const resolvers = {
  Query: {
    // 全動物取得
    animals: async (
      _: any,
      { filter, page = 1, limit = 20 }: { filter?: AnimalFilter; page?: number; limit?: number }
    ): Promise<AnimalConnection> => {
      try {
        // クローラーデータを優先的に使用
        const crawledAnimals = await storageInstance.getAllAnimals();
        let animals = crawledAnimals.length > 0 ? crawledAnimals : [...mockAnimals];

      // フィルタリング
      if (filter) {
        if (filter.species) {
          animals = animals.filter(animal => animal.species === filter.species);
        }
        if (filter.breed) {
          animals = animals.filter(animal => 
            animal.breed?.toLowerCase().includes(filter.breed.toLowerCase())
          );
        }
        if (filter.ageMin) {
          animals = animals.filter(animal => animal.age >= filter.ageMin);
        }
        if (filter.ageMax) {
          animals = animals.filter(animal => animal.age <= filter.ageMax);
        }
        if (filter.gender) {
          animals = animals.filter(animal => animal.gender === filter.gender);
        }
        if (filter.size) {
          animals = animals.filter(animal => animal.size === filter.size);
        }
        if (filter.location) {
          animals = animals.filter(animal => {
            const loc = animal.location;
            return typeof loc === 'string' 
              ? loc.includes(filter.location!)
              : ((loc as any)?.prefecture?.includes(filter.location) ||
                 (loc as any)?.city?.includes(filter.location));
          });
        }
      }

        // ページネーション
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedAnimals = animals.slice(startIndex, endIndex);

        return {
          animals: paginatedAnimals,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(animals.length / limit),
            totalItems: animals.length,
            itemsPerPage: limit,
            hasNext: endIndex < animals.length,
            hasPrevious: page > 1
          }
        };
      } catch (error) {
        // エラー時はモックデータにフォールバック
        console.error('全動物データ取得エラー:', error);
        let animals = [...mockAnimals];

        // フィルタリング
        if (filter) {
          if (filter.species) {
            animals = animals.filter(animal => animal.species === filter.species);
          }
          if (filter.breed) {
            animals = animals.filter(animal => 
              animal.breed?.toLowerCase().includes(filter.breed.toLowerCase())
            );
          }
          if (filter.ageMin) {
            animals = animals.filter(animal => animal.age >= filter.ageMin);
          }
          if (filter.ageMax) {
            animals = animals.filter(animal => animal.age <= filter.ageMax);
          }
          if (filter.gender) {
            animals = animals.filter(animal => animal.gender === filter.gender);
          }
          if (filter.size) {
            animals = animals.filter(animal => animal.size === filter.size);
          }
          if (filter.location) {
            animals = animals.filter(animal => {
              const loc = animal.location as any;
              return typeof loc === 'string' 
                ? loc.includes(filter.location)
                : (loc?.prefecture?.includes(filter.location) ||
                   loc?.city?.includes(filter.location));
            });
          }
        }

        // ページネーション
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedAnimals = animals.slice(startIndex, endIndex);

        return {
          animals: paginatedAnimals,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(animals.length / limit),
            totalItems: animals.length,
            itemsPerPage: limit,
            hasNext: endIndex < animals.length,
            hasPrevious: page > 1
          }
        };
      }
    },

    // 個別動物取得
    animal: async (_: any, { id }: { id: string }): Promise<Dog | Cat | BaseAnimal | null> => {
      try {
        // クローラーデータから検索
        const crawledAnimal = await storageInstance.getAnimalById(id);
        if (crawledAnimal) {
          return crawledAnimal;
        }
        // フォールバック：モックデータから検索
        return mockAnimals.find(animal => animal.id === id) || null;
      } catch (error) {
        console.error('個別動物取得エラー:', error);
        return mockAnimals.find(animal => animal.id === id) || null;
      }
    },

    // 犬一覧
    dogs: async (_: any, { page = 1, limit = 20 }: { page?: number; limit?: number }): Promise<AnimalConnection> => {
      try {
        console.log('🐕 犬一覧クエリ開始');
        console.log('📊 ストレージインスタンス:', storageInstance.constructor.name);
        
        // クローラーデータを優先的に使用
        const crawledDogs = await storageInstance.getDogs();
        console.log(`📦 取得した犬のデータ数: ${crawledDogs.length}`);
        
        const dogsData = crawledDogs.length > 0 ? crawledDogs : mockDogs;
        console.log(`📋 使用するデータソース: ${crawledDogs.length > 0 ? 'クローラーデータ' : 'モックデータ'}`);
        console.log(`🔢 最終的なデータ数: ${dogsData.length}`);
        
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedDogs = dogsData.slice(startIndex, endIndex);

        return {
          animals: paginatedDogs.map(transformDogToGraphQL),
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(dogsData.length / limit),
            totalItems: dogsData.length,
            itemsPerPage: limit,
            hasNext: endIndex < dogsData.length,
            hasPrevious: page > 1
          }
        };
      } catch (error) {
        // エラー時はモックデータにフォールバック
        console.error('犬のデータ取得エラー:', error);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedDogs = mockDogs.slice(startIndex, endIndex);

        return {
          animals: paginatedDogs.map(transformDogToGraphQL),
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(mockDogs.length / limit),
            totalItems: mockDogs.length,
            itemsPerPage: limit,
            hasNext: endIndex < mockDogs.length,
            hasPrevious: page > 1
          }
        };
      }
    },

    // 猫一覧
    cats: async (_: any, { page = 1, limit = 20 }: { page?: number; limit?: number }): Promise<AnimalConnection> => {
      try {
        console.log('🐱 猫一覧クエリ開始');
        console.log('📊 ストレージインスタンス:', storageInstance.constructor.name);
        
        // クローラーデータを優先的に使用
        const crawledCats = await storageInstance.getCats();
        console.log(`📦 取得した猫のデータ数: ${crawledCats.length}`);
        
        const catsData = crawledCats.length > 0 ? crawledCats : mockCats;
        console.log(`📋 使用するデータソース: ${crawledCats.length > 0 ? 'クローラーデータ' : 'モックデータ'}`);
        console.log(`🔢 最終的なデータ数: ${catsData.length}`);
        
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedCats = catsData.slice(startIndex, endIndex);

        return {
          animals: paginatedCats.map(transformCatToGraphQL),
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(catsData.length / limit),
            totalItems: catsData.length,
            itemsPerPage: limit,
            hasNext: endIndex < catsData.length,
            hasPrevious: page > 1
          }
        };
      } catch (error) {
        // エラー時はモックデータにフォールバック
        console.error('猫のデータ取得エラー:', error);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedCats = mockCats.slice(startIndex, endIndex);

        return {
          animals: paginatedCats.map(transformCatToGraphQL),
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(mockCats.length / limit),
            totalItems: mockCats.length,
            itemsPerPage: limit,
            hasNext: endIndex < mockCats.length,
            hasPrevious: page > 1
          }
        };
      }
    },

    // 動物検索
    searchAnimals: async (
      _: any,
      { query, species, page = 1, limit = 20 }: { 
        query: string; 
        species?: 'dog' | 'cat'; 
        page?: number; 
        limit?: number;
      }
    ): Promise<AnimalConnection> => {
      let animals = [...mockAnimals];

      // 動物種でフィルタリング
      if (species) {
        animals = animals.filter(animal => {
          // 日本語から英語への変換
          const animalSpecies = animal.species === '犬' ? 'dog' : animal.species === '猫' ? 'cat' : animal.species;
          return animalSpecies === species;
        });
      }

      // テキスト検索
      const searchQuery = query.toLowerCase();
      animals = animals.filter(animal =>
        animal.name.toLowerCase().includes(searchQuery) ||
        animal.breed.toLowerCase().includes(searchQuery) ||
        animal.description.toLowerCase().includes(searchQuery) ||
        animal.personality.some(trait => trait.toLowerCase().includes(searchQuery))
      );

      // ページネーション
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedAnimals = animals.slice(startIndex, endIndex);

      return {
        animals: paginatedAnimals,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(animals.length / limit),
          totalItems: animals.length,
          itemsPerPage: limit,
          hasNext: endIndex < animals.length,
          hasPrevious: page > 1
        }
      };
    },

    // 注目動物
    featuredAnimals: async (
      _: any,
      { species, limit = 10 }: { species?: 'dog' | 'cat'; limit?: number }
    ): Promise<(Dog | Cat | BaseAnimal)[]> => {
      let animals = [...mockAnimals];

      if (species) {
        animals = animals.filter(animal => {
          const animalSpecies = animal.species === '犬' ? 'dog' : animal.species === '猫' ? 'cat' : animal.species;
          return animalSpecies === species;
        });
      }

      return animals
        .filter(animal => (animal as any).featured || false)
        .sort((a, b) => ((b as any).likeCount || 0) - ((a as any).likeCount || 0))
        .slice(0, limit);
    },

    // 新着動物
    recentAnimals: async (
      _: any,
      { species, limit = 10 }: { species?: 'dog' | 'cat'; limit?: number }
    ): Promise<(Dog | Cat | BaseAnimal)[]> => {
      let animals = [...mockAnimals];

      if (species) {
        animals = animals.filter(animal => {
          const animalSpecies = animal.species === '犬' ? 'dog' : animal.species === '猫' ? 'cat' : animal.species;
          return animalSpecies === species;
        });
      }

      return animals
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    }
  },

  Mutation: {
    // スワイプアクションの記録
    recordSwipe: async (
      _: any,
      { animalId, action }: { animalId: string; action: string }
    ): Promise<{ id: string; animalId: string; userId: string; action: string; timestamp: string }> => {
      // 実際のアプリケーションでは、ここでデータベースに保存
      const swipeAction = {
        id: `swipe_${Date.now()}`,
        animalId,
        userId: 'current_user', // 実際のユーザーIDを使用
        action,
        timestamp: new Date().toISOString()
      };

      // LocalStorageに保存（デモ用）
      const existingSwipes = JSON.parse(localStorage.getItem('userSwipes') || '[]');
      existingSwipes.push(swipeAction);
      localStorage.setItem('userSwipes', JSON.stringify(existingSwipes));

      return swipeAction;
    },

    // お気に入りの切り替え
    toggleFavorite: async (_: any, { animalId }: { animalId: string }): Promise<boolean> => {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const index = favorites.indexOf(animalId);
      
      if (index > -1) {
        favorites.splice(index, 1);
      } else {
        favorites.push(animalId);
      }
      
      localStorage.setItem('favorites', JSON.stringify(favorites));
      return index === -1; // 追加されたかどうか
    }
  },

  // インターフェース解決
  Animal: {
    __resolveType(animal: Dog | Cat | BaseAnimal): string {
      const species = animal.species === '犬' ? 'dog' : animal.species === '猫' ? 'cat' : animal.species;
      return species === 'dog' ? 'Dog' : 'Cat';
    }
  }
};