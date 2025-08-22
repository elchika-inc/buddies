import { Context } from 'hono';
import { validatePetType, validateImageFormat, extractPetIdFromFilename } from '../utils/validation';
import { handleError, ServiceUnavailableError } from '../utils/error-handler';
import { CONFIG } from '../utils/constants';
import type { Env } from '../types/env';

export class ImageController {
  async proxyToImageWorker(c: Context<{ Bindings: Env }>) {
    try {
      const petType = c.req.param('type');
      const filename = c.req.param('filename');
      const format = c.req.query('format') || 'auto';

      // バリデーション
      if (petType !== 'dog' && petType !== 'cat') {
        throw new Error('Invalid pet type');
      }
      
      const petId = extractPetIdFromFilename(filename);
      const fileMatch = filename.match(/\.(jpg|jpeg|png|webp)$/);
      const requestedFormat = fileMatch ? fileMatch[1] : format;

      // 画像変換Workerへリクエストをプロキシ
      const imageWorkerUrl = `https://image-worker.internal/convert/pets/${petType}s/${petId}/${requestedFormat}`;
      
      // Service Bindingを使用して内部通信
      if (!c.env?.IMAGE_WORKER) {
        throw new ServiceUnavailableError('Image service not available');
      }

      const imageResponse = await c.env.IMAGE_WORKER.fetch(
        new Request(imageWorkerUrl, {
          method: 'GET',
          headers: c.req.raw.headers,
        })
      );

      if (!imageResponse.ok) {
        if (imageResponse.status === 404) {
          return c.notFound();
        }
        throw new ServiceUnavailableError(`Image service error: ${imageResponse.status}`);
      }

      // レスポンスを転送
      return new Response(imageResponse.body, {
        status: imageResponse.status,
        headers: {
          ...Object.fromEntries(imageResponse.headers.entries()),
          'X-Served-By': 'PawMatch-API',
        },
      });

    } catch (error) {
      return handleError(c, error);
    }
  }
}