export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class SessionExpiredError extends AuthError {
  constructor(message: string = 'Your session has expired. Please sign in again.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string = 'This account is not authorized to use this BakaTracker instance.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Unable to reach your BakaTracker server.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class BackendUnavailableError extends Error {
  constructor(message: string = 'Unable to reach your BakaTracker server.') {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}

export interface ApiClientConfig {
  baseUrl: string;
}

export class ApiClient {
  private baseUrl: string;
  private getToken: (options?: any) => Promise<string>;

  constructor(apiClientConfig: ApiClientConfig, getToken: (options?: any) => Promise<string>) {
    this.baseUrl = apiClientConfig.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.getToken = getToken;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const makeRequest = async (token: string) => {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const url = `${this.baseUrl}${cleanPath}`;

      const headers = new Headers(options.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');

      try {
        return await fetch(url, {
          ...options,
          headers,
        });
      } catch (err) {
        throw new NetworkError();
      }
    };

    let token = '';
    try {
      token = await this.getToken();
    } catch (err) {
      throw new SessionExpiredError();
    }

    let response: Response;
    try {
      response = await makeRequest(token);
    } catch (err) {
      throw new NetworkError();
    }

    if (response.status === 401) {
      // Retry once after forcing a silent refresh
      try {
        token = await this.getToken({ ignoreCache: true });
        response = await makeRequest(token);
      } catch (err) {
        throw new SessionExpiredError();
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new SessionExpiredError();
      } else if (response.status === 403) {
        throw new ForbiddenError();
      } else {
        throw new BackendUnavailableError();
      }
    }

    if (response.status === 204) {
      return {} as T;
    }

    try {
      return await response.json() as T;
    } catch {
      return {} as T;
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
