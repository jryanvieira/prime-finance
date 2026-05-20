/**
 * Cliente HTTP base para comunicação com a API Go
 * 
 * Configure a variável de ambiente NEXT_PUBLIC_API_URL para apontar para sua API
 * Exemplo: NEXT_PUBLIC_API_URL=http://localhost:8080
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

interface ApiError {
  message: string
  code?: string
  status: number
}

class ApiClient {
  private baseUrl: string
  private refreshPromise: Promise<boolean> | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('prime-finance-token')
  }

  private async tryRefresh(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = (async () => {
      try {
        const refreshToken = localStorage.getItem('prime-finance-refresh-token')
        if (!refreshToken) return false

        const response = await fetch(`${this.baseUrl}/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        if (!response.ok) return false

        const data = await response.json()
        localStorage.setItem('prime-finance-token', data.access_token)
        if (data.refresh_token) {
          localStorage.setItem('prime-finance-refresh-token', data.refresh_token)
        }
        return true
      } catch {
        return false
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  private clearSession() {
    localStorage.removeItem('prime-finance-token')
    localStorage.removeItem('prime-finance-refresh-token')
    localStorage.removeItem('prime-finance-auth')
    window.location.href = '/login'
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    isRetry = false
  ): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    }

    if (!skipAuth) {
      const token = this.getToken()
      if (token) {
        ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    })

    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    if (!response.ok) {
      const isAuthEndpoint = ['login', 'signup', 'refresh'].some(e => endpoint.includes(e))

      if (response.status === 401 && !isAuthEndpoint && !isRetry) {
        const refreshed = await this.tryRefresh()
        if (refreshed) return this.request<T>(endpoint, options, true)
        this.clearSession()
      } else if (response.status === 401 && !isAuthEndpoint) {
        this.clearSession()
      }

      const error: ApiError = {
        message: 'Erro ao processar requisição',
        status: response.status,
      }

      if (isJson) {
        const data = await response.json()
        if (data.error && typeof data.error === 'object') {
          error.message = data.error.message || error.message
          error.code = data.error.code
        } else {
          error.message = data.message || error.message
          error.code = data.code
        }
      }

      throw error
    }

    if (isJson) {
      return response.json()
    }
    return {} as T
  }

  // Métodos HTTP
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const api = new ApiClient(API_URL)
export type { ApiError }
