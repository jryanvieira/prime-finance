import { api } from '../client'
import type { User } from '../types'

export const usersService = {
  async getMe(): Promise<User> {
    return api.get<User>('/v1/users/me')
  },

  async completeOnboarding(): Promise<void> {
    return api.patch('/v1/users/me/onboarding')
  },
}
