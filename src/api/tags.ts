import type { AdminTagResponse, CreateTagRequest, ListQuery, UpdateTagRequest } from '@/types/api'
import { apiRequest, jsonRequest, toQueryString } from './http'

export function listTags(query: ListQuery = {}): Promise<AdminTagResponse[]> {
  return apiRequest<AdminTagResponse[]>(
    `/api/admin/tags${toQueryString({
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
      search: query.search,
    })}`,
  )
}

export function getTag(id: string): Promise<AdminTagResponse> {
  return apiRequest<AdminTagResponse>(`/api/admin/tags/${id}`)
}

export function createTag(request: CreateTagRequest): Promise<AdminTagResponse> {
  return jsonRequest<AdminTagResponse>('/api/admin/tags', 'POST', request)
}

export function updateTag(id: string, request: UpdateTagRequest): Promise<AdminTagResponse> {
  return jsonRequest<AdminTagResponse>(`/api/admin/tags/${id}`, 'PUT', request)
}

export function deleteTag(id: string): Promise<void> {
  return apiRequest<void>(`/api/admin/tags/${id}`, { method: 'DELETE' })
}
