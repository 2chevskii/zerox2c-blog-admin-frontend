import type { AdminUserResponse, UserRole } from '@/types/api'
import { apiRequest, jsonRequest } from './http'

export function listUsers(): Promise<AdminUserResponse[]> {
  return apiRequest<AdminUserResponse[]>('/api/admin/users')
}

export function updateUserRole(id: string, role: UserRole): Promise<AdminUserResponse> {
  return jsonRequest<AdminUserResponse>(`/api/admin/users/${id}/role`, 'PUT', { role })
}

export function blockUser(id: string, reason: string | null): Promise<AdminUserResponse> {
  return jsonRequest<AdminUserResponse>(`/api/admin/users/${id}/block`, 'POST', { reason })
}

export function unblockUser(id: string): Promise<AdminUserResponse> {
  return apiRequest<AdminUserResponse>(`/api/admin/users/${id}/unblock`, { method: 'POST' })
}

export function updateUserPassword(id: string, password: string): Promise<AdminUserResponse> {
  return jsonRequest<AdminUserResponse>(`/api/admin/users/${id}/password`, 'PUT', { password })
}
