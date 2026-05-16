import { apiRequest } from '@/api/http'
import type { ImagePurpose, ImageResponse } from '@/types/api'

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
