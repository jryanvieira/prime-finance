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

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('prime-finance-token')
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    }

    // Adicionar token JWT se disponível e não for rota pública
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

    // Verificar se a resposta é JSON
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    if (!response.ok) {
      const error: ApiError = {
        message: 'Erro ao processar requisição',
        status: response.status,
      }

      if (isJson) {
        const data = await response.json()
        // O backend retorna { error: { code, message } } ou { message, code }
        if (data.error && typeof data.error === 'object') {
          error.message = data.error.message || error.message
          error.code = data.error.code
        } else {
          error.message = data.message || error.message
          error.code = data.code
        }
      }

      // Token expirado — redirecionar para login apenas fora das rotas de auth
      const isAuthEndpoint = ['login', 'signup', 'refresh'].some(e => endpoint.includes(e))
      if (response.status === 401 && !isAuthEndpoint) {
        localStorage.removeItem('prime-finance-token')
        localStorage.removeItem('prime-finance-auth')
        window.location.href = '/login'
      }

      throw error
    }

    // Retornar dados se for JSON, caso contrário retornar vazio
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
