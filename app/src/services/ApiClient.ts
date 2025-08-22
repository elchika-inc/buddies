// HTTP通信を担当するクライアント

export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// HTTPクライアントの抽象化
export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 5000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<HttpResponse<T>> {
    const url = this.buildUrl(endpoint, params);
    
    return this.request<T>('GET', url);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    const url = this.buildUrl(endpoint);
    
    return this.request<T>('POST', url, data);
  }

  async put<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    const url = this.buildUrl(endpoint);
    
    return this.request<T>('PUT', url, data);
  }

  async delete<T>(endpoint: string): Promise<HttpResponse<T>> {
    const url = this.buildUrl(endpoint);
    
    return this.request<T>('DELETE', url);
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = `${this.baseUrl}${endpoint}`;
    
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      return `${url}?${queryString}`;
    }
    
    return url;
  }

  private async request<T>(
    method: string, 
    url: string, 
    data?: unknown
  ): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.defaultHeaders,
        body: data ? JSON.stringify(data) : undefined,
        mode: 'cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      throw error;
    }
  }
}