/**
 * 画像処理ユーティリティクラス
 * 画像の変換、リサイズ、最適化を行う
 */
export class ImageProcessor {
  /**
   * 画像のコンテンツタイプを取得
   */
  static getContentType(buffer: ArrayBuffer): string {
    const arr = new Uint8Array(buffer).subarray(0, 12);
    const header = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // WebP
    if (header.startsWith('52494646') && header.slice(16, 24) === '57454250') {
      return 'image/webp';
    }
    // JPEG
    if (header.startsWith('ffd8ff')) {
      return 'image/jpeg';
    }
    // PNG
    if (header.startsWith('89504e47')) {
      return 'image/png';
    }
    // GIF
    if (header.startsWith('474946')) {
      return 'image/gif';
    }
    
    return 'image/jpeg'; // デフォルト
  }
  
  /**
   * 画像フォーマットから拡張子を取得
   */
  static getExtension(contentType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    return map[contentType] || 'jpg';
  }
  
  /**
   * URLから画像の拡張子を推測
   */
  static getExtensionFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      return match?.[1]?.toLowerCase() || 'jpg';
    } catch {
      return 'jpg';
    }
  }
  
  /**
   * 画像データを WebP に変換（Cloudflare Workers環境用）
   * 注: Cloudflare Workersでは実際の画像変換はImage Resizing APIを使用
   * ここでは元データを返すだけの簡易実装
   */
  static async convertToWebP(
    imageData: ArrayBuffer,
    _quality: number = 85
  ): Promise<ArrayBuffer> {
    // Cloudflare Workers環境では、実際の変換は
    // Image Resizing APIや外部サービスを使用する必要があります
    // ここでは簡易実装として元データを返します
    return imageData;
  }
  
  /**
   * 画像のメタデータを生成
   */
  static generateMetadata(
    petId: string,
    petType: string,
    sourceId: string,
    originalFormat: string
  ): Record<string, string> {
    return {
      petId,
      petType,
      sourceId,
      originalFormat,
      uploadedAt: new Date().toISOString(),
      version: '1.0',
    };
  }
  
  /**
   * 画像サイズの検証（最大サイズチェック）
   */
  static validateImageSize(sizeInBytes: number, maxSizeMB: number = 10): boolean {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return sizeInBytes <= maxBytes;
  }
  
  /**
   * ファイル名の生成
   */
  static generateFileName(
    petId: string,
    format: 'original' | 'webp',
    extension?: string
  ): string {
    const sanitizedId = petId.replace(/[^a-zA-Z0-9_-]/g, '');
    
    if (format === 'webp') {
      return `${sanitizedId}.webp`;
    }
    
    // オリジナル形式
    const ext = extension || 'jpg';
    return `${sanitizedId}.${ext}`;
  }
  
  /**
   * R2オブジェクトのキー生成
   */
  static generateR2Key(
    petType: string,
    petId: string,
    format: 'original' | 'webp',
    extension?: string
  ): string {
    const fileName = this.generateFileName(petId, format, extension);
    const folder = format === 'original' ? 'originals' : 'webp';
    return `${petType}s/${folder}/${fileName}`;
  }
}