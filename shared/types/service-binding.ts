/**
 * Service Binding 抽象化レイヤー
 *
 * Cloudflare Workers間のService Bindingを型安全に扱うための
 * 抽象化レイヤーを提供します。
 */

import { Result, Ok, Err } from './result'

/**
 * Service Bindingのベースインターフェース
 */
export interface ServiceBinding {
  fetch(request: Request): Promise<Response>
}

/**
 * Service Bindingのレスポンス型
 */
export interface ServiceResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: unknown
}

/**
 * Service Bindingクライアントのベースクラス
 */
export abstract class ServiceClient {
  constructor(protected readonly binding: ServiceBinding | undefined) {}

  /**
   * サービスが利用可能かどうかをチェック
   */
  isAvailable(): boolean {
    return this.binding !== undefined
  }

  /**
   * サービスへのリクエストを送信
   */
  protected async request<T>(path: string, options: RequestInit = {}): Promise<Result<T, Error>> {
    if (!this.binding) {
      return Err(new Error('Service binding not configured'))
    }

    try {
      const url = `https://api.internal${path}`
      const request = new Request(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      const response = await this.binding.fetch(request)

      if (!response.ok) {
        const errorData = await response.text()
        return Err(new Error(`Service request failed: ${response.status} - ${errorData}`))
      }

      const result = (await response.json()) as ServiceResponse<T>

      if (!result.success) {
        return Err(new Error(result.error || 'Service request failed'))
      }

      return Ok(result.data as T)
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Unknown error'))
    }
  }

  /**
   * GET リクエストを送信
   */
  protected async get<T>(path: string): Promise<Result<T, Error>> {
    return this.request<T>(path, { method: 'GET' })
  }

  /**
   * POST リクエストを送信
   */
  protected async post<T>(path: string, body?: unknown): Promise<Result<T, Error>> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : null,
    })
  }

  /**
   * PUT リクエストを送信
   */
  protected async put<T>(path: string, body?: unknown): Promise<Result<T, Error>> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : null,
    })
  }

  /**
   * DELETE リクエストを送信
   */
  protected async delete<T>(path: string): Promise<Result<T, Error>> {
    return this.request<T>(path, { method: 'DELETE' })
  }
}

/**
 * Service Binding型ガード
 */
export function isServiceBinding(value: unknown): value is ServiceBinding {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'fetch' in value &&
    typeof (value as ServiceBinding).fetch === 'function'
  )
}

/**
 * 複数のService Bindingを管理するレジストリ
 */
export class ServiceRegistry {
  private readonly services = new Map<string, ServiceBinding>()

  /**
   * サービスを登録
   */
  register(name: string, binding: ServiceBinding | undefined): void {
    if (binding && isServiceBinding(binding)) {
      this.services.set(name, binding)
    }
  }

  /**
   * サービスを取得
   */
  get(name: string): ServiceBinding | undefined {
    return this.services.get(name)
  }

  /**
   * サービスが登録されているかチェック
   */
  has(name: string): boolean {
    return this.services.has(name)
  }

  /**
   * 登録されている全サービス名を取得
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys())
  }
}

/**
 * Service Bindingのモック（テスト用）
 */
export class MockServiceBinding implements ServiceBinding {
  private responses = new Map<string, Response>()

  /**
   * モックレスポンスを設定
   */
  setResponse(path: string, response: Response): void {
    this.responses.set(path, response)
  }

  /**
   * モックレスポンスをJSONで設定
   */
  setJsonResponse<T>(path: string, data: T, status = 200): void {
    const response = new Response(JSON.stringify({ success: status < 400, data }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
    this.responses.set(path, response)
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const response = this.responses.get(url.pathname)

    if (!response) {
      return new Response('Not found', { status: 404 })
    }

    return response.clone()
  }
}
