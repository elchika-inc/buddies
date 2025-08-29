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
  breed?: string;  // 詳細ページから取得する犬種・猫種
  age?: string;    // 詳細ページから取得する年齢（例: "成犬 (1歳)"）
  gender?: 'male' | 'female' | 'unknown';  // 詳細ページから取得する性別
  location?: string;  // 詳細ページから取得する所在地（例: "茨城県 常総市"）
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