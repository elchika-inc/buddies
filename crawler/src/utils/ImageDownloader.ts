import { promises as fs } from 'fs';
import path from 'path';

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

      const buffer = Buffer.from(await response.arrayBuffer());

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
        const sharp = require('sharp');
        const webpBuffer = await sharp(buffer)
          .webp({ quality: 80 })
          .toBuffer();
        
        await fs.writeFile(webpPath, webpBuffer);
        
        console.log(`    ✓ Image saved: Original ${(buffer.length / 1024).toFixed(1)}KB → WebP ${(webpBuffer.length / 1024).toFixed(1)}KB`);
      } catch (sharpError) {
        // Sharp.jsが利用できない場合は元のJPEGをコピー
        console.log(`    ⚠ WebP conversion failed, copying original: ${sharpError.message}`);
        await fs.writeFile(webpPath, buffer);
      }

      return {
        originalPath,
        webpPath
      };

    } catch (error) {
      console.log(`    ⚠ Error downloading image for ${petId}: ${error.message}`);
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