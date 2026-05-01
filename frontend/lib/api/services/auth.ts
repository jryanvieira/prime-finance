import { api } from '../client'
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from '../types'

const USE_MOCK = false

// Mock data para desenvolvimento
const mockUser: User = {
  id: '1',
  email: 'joao@email.com',
  name: 'João Silva',
}

export const authService = {
  /**
   * Fazer login e obter token JWT
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 800))
      if (data.email && data.password.length >= 6) {
        const token = 'mock-jwt-token-' + Date.now()
        return { token, user: { ...mockUser, email: data.email } }
      }
      throw { message: 'Credenciais inválidas', status: 401 }
    }

    const response = await api.post<{ access_token: string; refresh_token: string }>('/v1/auth/login', data, {
      skipAuth: true,
    })

    const user: User = {
      id: '',
      email: data.email,
      name: data.email.split('@')[0],
    }
    localStorage.setItem('prime-finance-token', response.access_token)
    localStorage.setItem('prime-finance-refresh-token', response.refresh_token)
    localStorage.setItem('prime-finance-auth', JSON.stringify(user))

    return { ...response, user }
  },

  /**
   * Registrar novo usuário
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 800))
      if (data.name && data.email && data.password.length >= 6) {
        const token = 'mock-jwt-token-' + Date.now()
        return {
          token,
          user: { id: Date.now().toString(), email: data.email, name: data.name },
        }
      }
      throw { message: 'Dados inválidos', status: 400 }
    }

    const payload = {
      name: data.name,
      email: data.email,
      password: data.password,
    }
    const response = await api.post<{ access_token: string; refresh_token: string }>('/v1/auth/signup', payload, {
      skipAuth: true,
    })

    const user: User = {
      id: '',
      email: data.email,
      name: data.name || data.email.split('@')[0],
    }
    localStorage.setItem('prime-finance-token', response.access_token)
    localStorage.setItem('prime-finance-refresh-token', response.refresh_token)
    localStorage.setItem('prime-finance-auth', JSON.stringify(user))

    return { ...response, user }
  },

  /**
   * Obter dados do usuário atual
   */
  async me(): Promise<User> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      const saved = localStorage.getItem('prime-finance-auth')
      if (saved) return JSON.parse(saved)
      throw { message: 'Não autenticado', status: 401 }
    }

    const saved = localStorage.getItem('prime-finance-auth')
    if (saved) {
      return JSON.parse(saved) as User
    }
    throw { message: 'Não autenticado', status: 401 }
  },

  /**
   * Fazer logout
   */
  logout(): void {
    localStorage.removeItem('prime-finance-refresh-token')
    localStorage.removeItem('prime-finance-token')
    localStorage.removeItem('prime-finance-auth')
    window.location.href = '/login'
  },

  /**
   * Verificar se há token salvo
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('prime-finance-token') || 
           !!localStorage.getItem('prime-finance-auth')
  },

  /**
   * Solicitar recuperação de senha
   */
  async forgotPassword(email: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 800))
      return
    }

    void email
  },

  /**
   * Resetar senha com token
   */
  async resetPassword(token: string, password: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 800))
      return
    }

    void token
    void password
  },
}
