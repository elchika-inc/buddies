/**
 * Cloudflare Worker - 画像変換専用サービス（DB状態連携版）
 * 
 * petsテーブルのhas_jpeg/has_webpカラムを参照して効率的な画像処理
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // パスから画像情報を取得 /convert/pets/{type}s/{petId}/{format}
    const pathMatch = url.pathname.match(/^\/convert\/pets\/(dog|cat)s\/([^\/]+)\/(webp|jpeg|jpg|auto)$/);
    
    if (!pathMatch) {
      return new Response('Invalid path format', { status: 400 });
    }
    
    const [, petType, petId, requestedFormat] = pathMatch;
    
    try {
      // フォーマットの決定
      let format = requestedFormat;
      if (format === 'auto') {
        const acceptHeader = request.headers.get('Accept') || '';
        format = acceptHeader.includes('image/webp') ? 'webp' : 'jpeg';
      }
      
      // データベースでペット情報と画像状態を確認
      const pet = await env.DB
        .prepare('SELECT id, type, name, has_jpeg, has_webp, source_url FROM pets WHERE id = ?')
        .bind(petId)
        .first();
      
      if (!pet) {
        return new Response('Pet not found in database', { status: 404 });
      }
      
      // JPEGフォーマットの場合
      if (format === 'jpeg' || format === 'jpg') {
        // DB状態でJPEGの存在をチェック
        if (!pet.has_jpeg) {
          // JPEGがない場合、スクリーンショットをリクエスト
          await this.requestScreenshot(env, pet);
          return new Response('Image not available, screenshot requested', { 
            status: 202,
            headers: { 'Retry-After': '30' }
          });
        }
        
        const jpegKey = `pets/${petType}s/${petId}/original.jpg`;
        const jpegObject = await env.R2_BUCKET.get(jpegKey);
        
        if (!jpegObject) {
          // R2にないがDBにはある場合、DBを更新
          await this.updatePetImageStatus(env, petId, false, pet.has_webp);
          return new Response('Image file missing', { status: 404 });
        }
        
        return new Response(jpegObject.body, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
            'ETag': jpegObject.etag || `"${petId}-jpeg"`,
            'X-Image-Source': 'original'
          }
        });
      }
      
      // WebP変換が必要な場合
      if (format === 'webp') {
        const webpKey = `pets/${petType}s/${petId}/optimized.webp`;
        
        // DB状態でWebPの存在をチェック
        if (pet.has_webp) {
          // DBにWebPありと記録されている場合、R2から取得
          const webpObject = await env.R2_BUCKET.get(webpKey);
          if (webpObject) {
            return new Response(webpObject.body, {
              headers: {
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=604800',
                'ETag': webpObject.etag,
                'X-Image-Source': 'cached'
              }
            });
          } else {
            // R2にないがDBにはある場合、DBを更新
            await this.updatePetImageStatus(env, petId, pet.has_jpeg, false);
          }
        }
        
        // WebPがない場合、JPEGから変換を試みる
        if (!pet.has_jpeg) {
          // JPEGもない場合、スクリーンショットをリクエスト
          await this.requestScreenshot(env, pet);
          return new Response('Image not available, screenshot requested', { 
            status: 202,
            headers: { 'Retry-After': '30' }
          });
        }
        
        const jpegKey = `pets/${petType}s/${petId}/original.jpg`;
        const jpegObject = await env.R2_BUCKET.get(jpegKey);
        
        if (!jpegObject) {
          // JPEGがない場合、DBを更新してスクリーンショットをリクエスト
          await this.updatePetImageStatus(env, petId, false, false);
          await this.requestScreenshot(env, pet);
          return new Response('Image file missing, screenshot requested', { 
            status: 202,
            headers: { 'Retry-After': '30' }
          });
        }
        
        // JPEG → WebP変換
        console.log(`Converting ${petId} to WebP`);
        const jpegBuffer = await jpegObject.arrayBuffer();
        const webpBuffer = await this.convertToWebP(jpegBuffer, env);
        
        // 変換した画像をR2に保存
        await env.R2_BUCKET.put(webpKey, webpBuffer, {
          httpMetadata: {
            contentType: 'image/webp'
          },
          customMetadata: {
            sourceKey: jpegKey,
            convertedAt: new Date().toISOString(),
            petId: petId,
            compressionRatio: `${(webpBuffer.byteLength / jpegBuffer.byteLength * 100).toFixed(1)}%`
          }
        });
        
        // DBのWebPステータスを更新
        await this.updatePetImageStatus(env, petId, true, true);
        
        return new Response(webpBuffer, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=604800',
            'ETag': `"${petId}-webp-${Date.now()}"`,
            'X-Image-Source': 'converted'
          }
        });
      }
      
      return new Response('Unsupported format', { status: 400 });
      
    } catch (error) {
      console.error(`Error processing image for ${petId}:`, error);
      return new Response(JSON.stringify({ 
        error: 'Image processing failed',
        message: error.message 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
  
  /**
   * ペットの画像ステータスを更新
   */
  async updatePetImageStatus(env, petId, hasJpeg, hasWebp) {
    try {
      await env.DB.prepare(`
        UPDATE pets SET 
          has_jpeg = ?,
          has_webp = ?,
          image_checked_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(hasJpeg, hasWebp, petId).run();
      console.log(`Updated image status for ${petId}: JPEG=${hasJpeg}, WebP=${hasWebp}`);
    } catch (error) {
      console.error(`Failed to update image status for ${petId}:`, error);
    }
  },
  
  /**
   * スクリーンショットをリクエスト
   */
  async requestScreenshot(env, pet) {
    try {
      // DBにスクリーンショットリクエストを記録
      await env.DB.prepare(`
        UPDATE pets SET 
          screenshot_requested_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(pet.id).run();
      
      // GitHub Actionsをトリガー
      await this.triggerScreenshotCapture(env, pet);
      console.log(`Screenshot requested for ${pet.id}`);
    } catch (error) {
      console.error(`Failed to request screenshot for ${pet.id}:`, error);
    }
  },
  
  /**
   * WebP変換処理
   */
  async convertToWebP(jpegBuffer, env) {
    // Cloudflare Image Resizing APIを使用する場合
    if (env.CF_IMAGE_RESIZING_URL) {
      try {
        const response = await fetch(env.CF_IMAGE_RESIZING_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'image/jpeg',
            'CF-Polished': 'format=webp,quality=85,fit=scale-down,width=1200'
          },
          body: jpegBuffer
        });
        
        if (response.ok) {
          return await response.arrayBuffer();
        }
      } catch (error) {
        console.warn('Image Resizing API failed:', error);
      }
    }
    
    // Workers内での簡易変換（フォールバック）
    console.warn('Using fallback: returning original JPEG (WebP conversion not available)');
    return jpegBuffer;
  },
  
  /**
   * GitHub Actionsトリガー
   */
  async triggerScreenshotCapture(env, pet) {
    if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
      console.log('GitHub Actions not configured');
      return;
    }
    
    try {
      const response = await fetch(
        `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/pet-screenshot.yml/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ref: 'main',
            inputs: {
              pets_batch: JSON.stringify([{
                id: pet.id,
                petId: pet.id.replace('pethome_', ''),
                type: pet.type,
                name: pet.name,
                sourceUrl: pet.source_url || `https://www.pet-home.jp/${pet.type}s/pn${pet.id.replace('pethome_', '')}/`
              }]),
              batch_id: `single-${pet.id}-${Date.now()}`
            }
          })
        }
      );
      
      if (response.status === 204) {
        console.log(`Screenshot capture triggered for ${pet.id}`);
      }
    } catch (error) {
      console.error('Failed to trigger screenshot:', error);
    }
  }
};

/**
 * 画像ステータス確認用のScheduledイベントハンドラー
 */
export async function scheduled(event, env, ctx) {
  console.log('Running DB-based image status check...');
  
  try {
    // DBから画像が不足しているペットを取得
    const missingPets = await env.DB.prepare(`
      SELECT id, type, name, source_url, has_jpeg, has_webp
      FROM pets 
      WHERE has_jpeg = FALSE OR has_jpeg IS NULL
      ORDER BY created_at DESC 
      LIMIT 50
    `).all();
    
    console.log(`Found ${missingPets.results?.length || 0} pets missing images`);
    
    // 定期的な整合性チェック（サンプル）
    const samplePets = await env.DB.prepare(`
      SELECT id, type, has_jpeg, has_webp
      FROM pets 
      ORDER BY RANDOM() 
      LIMIT 10
    `).all();
    
    let correctedCount = 0;
    for (const pet of samplePets.results || []) {
      const jpegKey = `pets/${pet.type}s/${pet.id}/original.jpg`;
      const webpKey = `pets/${pet.type}s/${pet.id}/optimized.webp`;
      
      const [jpegExists, webpExists] = await Promise.all([
        env.R2_BUCKET.head(jpegKey),
        env.R2_BUCKET.head(webpKey)
      ]);
      
      const actualHasJpeg = !!jpegExists;
      const actualHasWebp = !!webpExists;
      
      if (pet.has_jpeg !== actualHasJpeg || pet.has_webp !== actualHasWebp) {
        await env.DB.prepare(`
          UPDATE pets SET 
            has_jpeg = ?,
            has_webp = ?,
            image_checked_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(actualHasJpeg, actualHasWebp, pet.id).run();
        correctedCount++;
      }
    }
    
    console.log(`Status check completed: ${correctedCount} records corrected`);
    
  } catch (error) {
    console.error('Scheduled status check failed:', error);
  }
}