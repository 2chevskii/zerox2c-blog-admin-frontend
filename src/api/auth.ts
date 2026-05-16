import type { AuthResponse, CurrentUserResponse, LoginRequest } from '@/types/api'
import { apiRequest, jsonRequest } from './http'

export function login(request: LoginRequest): Promise<AuthResponse> {
  return jsonRequest<AuthResponse>('/api/auth/login', 'POST', request)
}

export function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiRequest<CurrentUserResponse>('/api/me')
}
