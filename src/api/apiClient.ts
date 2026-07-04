export interface ApiClientConfig {
  baseUrl: string;
  version: string;
}


export class ApiClient {
  private baseUrl: string;
  private version: string;
  private getToken: () => Promise<string>;

  constructor(apiClientConfig: ApiClientConfig, getToken: () => Promise<string>) {
    this.baseUrl = apiClientConfig.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.version = apiClientConfig.version;
    this.getToken = getToken;
  }

  private get apiRoot(): string {
    return `${this.baseUrl}/api/${this.version}`;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    try {
      const token = await this.getToken();
      
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const url = `${this.apiRoot}${cleanPath}`;

      const headers = new Headers(options.headers || {});
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('Content-Type', 'application/json');

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorMessage = `API Error ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorMessage = typeof errData.detail === 'string' 
              ? errData.detail 
              : JSON.stringify(errData.detail);
          }
        } catch {
          // Response body was not JSON
        }
        throw new Error(errorMessage);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json() as T;
    } catch (error) {
      console.error(`Request to ${path} failed:`, error);
      throw error;
    }
  }

  async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T>(path: string, body: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(path: string, body: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}
