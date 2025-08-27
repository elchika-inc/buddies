/**
 * ペットデータの型定義
 */

export interface ParsedPetData {
  id: string;
  name: string;
  breed: string;
  age: string;
  gender: 'male' | 'female' | 'unknown';
  location: string;
  organization: string;
  description: string;
  thumbnailUrl: string;
  detailUrl: string;
}

export interface DetailedPetData {
  imageUrl: string;
  personality: string[];
  healthNotes: string[];
  requirements: string[];
  goodWith: string[];
  medicalInfo: string;
  adoptionFee: number | null;
  shelterContact: string;
}

export interface NormalizedPet {
  id: string;
  type: 'dog' | 'cat';
  name: string;
  breed: string;
  age: string;
  gender: 'male' | 'female' | 'unknown';
  prefecture: string;
  city: string;
  location: string;
  description: string;
  personality: string[];
  medicalInfo: string;
  careRequirements: string[];
  goodWith: string[];
  healthNotes: string[];
  imageUrl: string;
  shelterName: string;
  shelterContact: string;
  sourceUrl: string;
  adoptionFee: number | null;
  metadata: Record<string, unknown>;
  hasJpeg: boolean;
  hasWebp: boolean;
  imageCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}