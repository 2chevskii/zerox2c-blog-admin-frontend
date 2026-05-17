export type UserRole = 'User' | 'Admin' | 'SuperAdmin'

export type PostStatus = 'Draft' | 'Published'

export type ImagePurpose = 'Cover' | 'Banner' | 'Embedded'

export interface AuthResponse {
  userId: string
  username: string
  email: string
  accessToken: string
  expiresAt: string
  role: UserRole
}

export interface CurrentUserResponse {
  userId: string
  username: string
  email: string
  isBlocked: boolean
  role: UserRole
}

export interface LoginRequest {
  login: string
  password: string
}

export interface AdminUserResponse {
  id: string
  username: string
  email: string
  isBlocked: boolean
  createdAt: string
  role: UserRole
  isKnownUser: boolean
  canChangePassword: boolean
}

export interface TagResponse {
  id: string
  name: string
  description: string | null
}

export interface AdminTagResponse extends TagResponse {
  createdBy: string
  createdAt: string
  updatedBy: string | null
  updatedAt: string | null
  deletedBy: string | null
  deletedAt: string | null
}

export interface CreateTagRequest {
  name: string
  description?: string | null
}

export type UpdateTagRequest = CreateTagRequest

export interface AdminPostResponse {
  id: string
  slug: string | null
  title: string
  subtitle: string | null
  bodyMarkdown: string
  bodyHtml: string
  readingMinutes: number
  status: PostStatus
  likeCount: number
  dislikeCount: number
  commentCount: number
  viewCount: number
  coverImageId: string | null
  bannerImageId: string | null
  tags: TagResponse[]
  createdBy: string
  createdAt: string
  updatedBy: string | null
  updatedAt: string | null
  publishedBy: string | null
  publishedAt: string | null
  deletedBy: string | null
  deletedAt: string | null
}

export interface CreatePostRequest {
  slug?: string | null
  title: string
  subtitle?: string | null
  bodyMarkdown: string
  coverImageId?: string | null
  bannerImageId?: string | null
  tagIds?: string[] | null
}

export type UpdatePostRequest = CreatePostRequest

export interface ImageResponse {
  id: string
  originalFileName: string
  contentType: string
  sizeBytes: number
  purpose: ImagePurpose
  url: string
  createdBy: string
  createdAt: string
}

export interface MarkdownDocumentResponse {
  markdown: string
  html: string
  plainText: string
  readingMinutes: number
}

export interface RenderMarkdownRequest {
  markdown: string
  postId?: string | null
}

export interface PostMarkdownImageResponse {
  id: string
  originalFileName: string
  contentType: string
  sizeBytes: number
  url: string
  localPath: string
  createdAt: string
}

export interface ListQuery {
  offset?: number
  limit?: number
  search?: string
}

export interface PostListQuery extends ListQuery {
  status?: PostStatus | ''
}
