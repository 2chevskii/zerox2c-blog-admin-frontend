import type {
  AdminPostResponse,
  CreatePostRequest,
  MarkdownDocumentResponse,
  PostListQuery,
  RenderMarkdownRequest,
  UpdatePostRequest,
} from '@/types/api'
import { apiRequest, jsonRequest, toQueryString } from './http'

export function listPosts(query: PostListQuery = {}): Promise<AdminPostResponse[]> {
  return apiRequest<AdminPostResponse[]>(
    `/api/admin/posts${toQueryString({
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
      status: query.status,
      search: query.search,
    })}`,
  )
}

export function getPost(id: string): Promise<AdminPostResponse> {
  return apiRequest<AdminPostResponse>(`/api/admin/posts/${id}`)
}

export function createPost(request: CreatePostRequest): Promise<AdminPostResponse> {
  return jsonRequest<AdminPostResponse>('/api/admin/posts', 'POST', request)
}

export function updatePost(id: string, request: UpdatePostRequest): Promise<AdminPostResponse> {
  return jsonRequest<AdminPostResponse>(`/api/admin/posts/${id}`, 'PUT', request)
}

export function publishPost(id: string): Promise<AdminPostResponse> {
  return apiRequest<AdminPostResponse>(`/api/admin/posts/${id}/publish`, { method: 'POST' })
}

export function unpublishPost(id: string): Promise<AdminPostResponse> {
  return apiRequest<AdminPostResponse>(`/api/admin/posts/${id}/unpublish`, { method: 'POST' })
}

export function deletePost(id: string): Promise<void> {
  return apiRequest<void>(`/api/admin/posts/${id}`, { method: 'DELETE' })
}

export function renderMarkdown(request: RenderMarkdownRequest): Promise<MarkdownDocumentResponse> {
  return jsonRequest<MarkdownDocumentResponse>('/api/admin/markdown/render', 'POST', request)
}
