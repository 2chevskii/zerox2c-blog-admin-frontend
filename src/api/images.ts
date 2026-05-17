import { apiRequest } from '@/api/http'
import type { ImagePurpose, ImageResponse, PostMarkdownImageResponse } from '@/types/api'

export function getImageUrl(id: string): string {
  return `/api/images/${id}`
}

export function uploadImage(file: File, purpose: ImagePurpose): Promise<ImageResponse> {
  const formData = new FormData()
  formData.set('file', file)
  formData.set('purpose', purpose)

  return apiRequest<ImageResponse>('/api/admin/images', {
    method: 'POST',
    body: formData,
  })
}

export function listPostMarkdownImages(postId: string): Promise<PostMarkdownImageResponse[]> {
  return apiRequest<PostMarkdownImageResponse[]>(`/api/admin/posts/${postId}/markdown/images`)
}

export function uploadPostMarkdownImage(
  postId: string,
  file: File,
): Promise<PostMarkdownImageResponse> {
  const formData = new FormData()
  formData.set('file', file)

  return apiRequest<PostMarkdownImageResponse>(`/api/admin/posts/${postId}/markdown/images`, {
    method: 'POST',
    body: formData,
  })
}
