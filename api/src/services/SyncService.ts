/**
 * 統合同期サービス
 * 
 * 既存コードとの互換性のため、ファサードクラスをエクスポート
 */

// ファサードクラスをSyncServiceとしてエクスポート
export { SyncServiceFacade as SyncService } from './sync/SyncServiceFacade';
export type { 
  SyncJob,
  SyncJobConfig,
  SyncProgress,
  IntegrityCheckResult 
} from './sync/types';