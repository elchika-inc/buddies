/**
 * 画像処理サービス
 * 画像フォーマットの変換と最適化を担当
 */
export class ImageProcessingService {
  /**
   * JPEGからWebPへの変換（プレースホルダー）
   * 実際の変換はCloudflare Image Resizingや外部サービスで実施
   */
  async convertToWebP(jpegData: ArrayBuffer): Promise<ArrayBuffer> {
    // Cloudflare Workersでは直接画像変換できないため、
    // 実際の変換は外部サービスまたはCloudflare Image Resizingを使用
    console.log('[ImageProcessingService] WebP conversion requested');
    
    // 現在はJPEGデータをそのまま返す（実装は外部サービスに依存）
    return jpegData;
  }

  /**
   * 画像のメタデータを取得
   */
  getImageMetadata(data: ArrayBuffer): { 
    size: number; 
    format?: string;
  } {
    const size = data.byteLength;
    
    // 簡易的なフォーマット判定
    const header = new Uint8Array(data.slice(0, 4));
    let format: string | undefined;
    
    // JPEG判定
    if (header[0] === 0xFF && header[1] === 0xD8) {
      format = 'jpeg';
    }
    // WebP判定
    else if (header[0] === 0x52 && header[1] === 0x49 && 
             header[2] === 0x46 && header[3] === 0x46) {
      format = 'webp';
    }
    // PNG判定
    else if (header[0] === 0x89 && header[1] === 0x50 && 
             header[2] === 0x4E && header[3] === 0x47) {
      format = 'png';
    }
    
    return { size, format };
  }

  /**
   * 画像のContent-Typeを判定
   */
  detectContentType(data: ArrayBuffer): string {
    const metadata = this.getImageMetadata(data);
    
    switch (metadata.format) {
      case 'jpeg':
        return 'image/jpeg';
      case 'webp':
        return 'image/webp';
      case 'png':
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * 画像の検証
   */
  validateImage(data: ArrayBuffer): boolean {
    // サイズチェック（最大10MB）
    const maxSize = 10 * 1024 * 1024;
    if (data.byteLength > maxSize) {
      console.error('[ImageProcessingService] Image too large');
      return false;
    }
    
    // フォーマットチェック
    const metadata = this.getImageMetadata(data);
    if (!metadata.format) {
      console.error('[ImageProcessingService] Unknown image format');
      return false;
    }
    
    return true;
  }
}