import { Hono } from 'hono';
import { cors } from 'hono/cors';

interface Env {
  DB: D1Database;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  WORKFLOW_FILE: string;
  API_URL: string;
}

class RetryableDispatcher {
  constructor(private env: Env) {}

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: {
      maxAttempts?: number;
      delayMs?: number;
      backoffMultiplier?: number;
    } = {}
  ): Promise<T> {
    const { 
      maxAttempts = 3, 
      delayMs = 1000, 
      backoffMultiplier = 2 
    } = config;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxAttempts) {
          await this.logFailure(lastError, attempt);
          throw lastError;
        }

        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, {
          error: lastError.message,
          attempt,
          maxAttempts
        });
        
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async logFailure(error: Error, attempts: number): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT INTO dispatch_failures (
          error_message, 
          attempts, 
          failed_at
        ) VALUES (?, ?, CURRENT_TIMESTAMP)
      `).bind(error.message, attempts).run();
    } catch (logError) {
      console.error('Failed to log failure:', logError);
    }
  }

  async triggerGitHubWorkflow(pets: any[], batchId: string): Promise<void> {
    return this.executeWithRetry(
      async () => {
        const response = await fetch(
          `https://api.github.com/repos/${this.env.GITHUB_OWNER}/${this.env.GITHUB_REPO}/actions/workflows/${this.env.WORKFLOW_FILE}/dispatches`,
          {
            method: 'POST',
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'Authorization': `token ${this.env.GITHUB_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ref: 'main',
              inputs: {
                pets_batch: JSON.stringify(pets),
                batch_id: batchId
              }
            })
          }
        );

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
          await this.sleep(delay);
          throw new Error('Rate limited');
        }

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }
      },
      {
        maxAttempts: 3,
        delayMs: 5000,
        backoffMultiplier: 2
      }
    );
  }

  async dispatchBatch(limit: number = 10): Promise<any> {
    const pets = await this.env.DB.prepare(`
      SELECT id, type, name, source_url, has_jpeg, has_webp
      FROM pets
      WHERE has_jpeg = 0 OR has_webp = 0
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all();

    if (!pets.results || pets.results.length === 0) {
      return {
        success: true,
        message: 'No pets without images found',
        count: 0
      };
    }

    const batchId = `dispatch-${Date.now()}`;
    
    await this.triggerGitHubWorkflow(
      pets.results.map((p: any) => ({
        id: p.id,
        name: p.name,
        sourceUrl: p.source_url,
        type: p.type
      })),
      batchId
    );

    await this.env.DB.prepare(`
      INSERT INTO dispatch_history (batch_id, pet_count, status, created_at)
      VALUES (?, ?, 'dispatched', CURRENT_TIMESTAMP)
    `).bind(batchId, pets.results.length).run();

    return {
      success: true,
      message: 'Workflow dispatched successfully',
      batchId,
      count: pets.results.length,
      pets: pets.results.map((p: any) => ({ id: p.id, name: p.name }))
    };
  }
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/', (c) => {
  return c.json({ 
    service: 'PawMatch Dispatcher with Retry',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.post('/dispatch', async (c) => {
  const { limit = 10 } = await c.req.json().catch(() => ({}));
  
  try {
    const dispatcher = new RetryableDispatcher(c.env);
    const result = await dispatcher.dispatchBatch(limit);
    return c.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dispatch error:', error);
    return c.json({
      success: false,
      error: errorMessage
    }, 500);
  }
});

app.post('/scheduled', async (c) => {
  console.log('Scheduled dispatch triggered');
  
  try {
    const dispatcher = new RetryableDispatcher(c.env);
    const result = await dispatcher.dispatchBatch(20);
    console.log(`Scheduled dispatch completed: ${result.count} pets`);
    return c.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Scheduled dispatch error:', error);
    return c.json({
      success: false,
      error: errorMessage
    }, 500);
  }
});

export default {
  fetch: app.fetch,
  
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    try {
      const dispatcher = new RetryableDispatcher(env);
      const result = await dispatcher.dispatchBatch(20);
      console.log('Scheduled execution result:', result);
    } catch (error) {
      console.error('Scheduled execution error:', error);
    }
  }
};