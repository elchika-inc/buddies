
/**
 * 画像ダウンロードとWebP変換のユーティリティクラス
 */
export class ImageDownloader {
  /**
   * 画像をダウンロードして両方の形式で保存
   */
  static async downloadAndSave(
    imageUrl: string,
    petId: string,
    petType: 'dog' | 'cat',
    baseImageDir: string
  ): Promise<{ originalPath: string; webpPath: string } | null> {
    // Cloudflare Workers環境では利用不可
    if (typeof window !== 'undefined' || typeof importScripts !== 'undefined') {
      console.warn('ImageDownloader is not available in Cloudflare Workers environment');
      return null;
    }
    if (!imageUrl) {
      console.log(`    ⚠ No image URL for ${petId}`);
      return null;
    }

    try {
      // 完全なURLに変換
      const fullUrl = imageUrl.startsWith('http') 
        ? imageUrl 
        : `https://www.pet-home.jp${imageUrl}`;

      const response = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PawMatch-Bot/1.0)',
          'Referer': 'https://www.pet-home.jp/'
        },
        signal: AbortSignal.timeout(15000) // 15秒タイムアウト
      });

      if (!response.ok) {
        console.log(`    ⚠ Failed to download image: HTTP ${response.status}`);
        return null;
      }

      // Node.js環境でのみBuffer利用可能
      let buffer: Buffer;
      try {
        const NodeBuffer = (await import('buffer')).Buffer;
        buffer = NodeBuffer.from(await response.arrayBuffer());
      } catch {
        console.warn('Buffer not available in this environment');
        return null;
      }

      // Node.js modules の動的インポート
      const { promises: fs } = await import('fs');
      const path = await import('path');

      // ディレクトリ作成
      const imageDir = path.join(baseImageDir, `${petType}s`);
      const originalDir = path.join(imageDir, 'originals');
      const webpDir = path.join(imageDir, 'webp');

      await fs.mkdir(originalDir, { recursive: true });
      await fs.mkdir(webpDir, { recursive: true });

      // ファイルパス
      const originalPath = path.join(originalDir, `${petId}.jpg`);
      const webpPath = path.join(webpDir, `${petId}.webp`);

      // オリジナル画像を保存
      await fs.writeFile(originalPath, buffer);

      // WebP形式に変換して保存
      try {
        // 動的にSharpをインポート（Node.js環境でのみ利用可能）
        const sharp = (await import('sharp')).default;
        const webpBuffer = await sharp(buffer)
          .webp({ quality: 80 })
          .toBuffer();
        
        await fs.writeFile(webpPath, webpBuffer);
        
        console.log(`    ✓ Image saved: Original ${(buffer.length / 1024).toFixed(1)}KB → WebP ${(webpBuffer.length / 1024).toFixed(1)}KB`);
      } catch (sharpError) {
        // Sharp.jsが利用できない場合は元のJPEGをコピー
        const errorMessage = sharpError && typeof sharpError === 'object' && 'message' in sharpError 
          ? String(sharpError.message) 
          : String(sharpError);
        console.log(`    ⚠ WebP conversion failed, copying original: ${errorMessage}`);
        await fs.writeFile(webpPath, buffer);
      }

      return {
        originalPath,
        webpPath
      };

    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? String(error.message) 
        : String(error);
      console.log(`    ⚠ Error downloading image for ${petId}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * ローカル画像パスを生成（APIレスポンス用）
   */
  static getLocalImagePath(petId: string, petType: 'dog' | 'cat', format: 'original' | 'webp' = 'original'): string {
    const extension = format === 'webp' ? 'webp' : 'jpg';
    const subDir = format === 'webp' ? 'webp' : 'originals';
    return `/images/${petType}s/${subDir}/${petId}.${extension}`;
  }
}