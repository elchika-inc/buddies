/**
 * Queue関連の型定義
 */

import type { ConvertMessage } from '../queue-handler';

export interface DLQMessage extends ConvertMessage {
  error: string;
  failedAt: string;
  originalMessage?: ConvertMessage;
}

export interface ConversionResult {
  success: boolean;
  petId: string;
  format: 'webp' | 'jpeg' | 'thumbnail';
  url?: string;
  size?: number;
  processingTime?: number;
  error?: string;
}