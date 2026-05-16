<script setup lang="ts">
import { markdown } from '@codemirror/lang-markdown'
import { ArrowLeft, Check, Refresh } from '@element-plus/icons-vue'
import { basicSetup, EditorView } from 'codemirror'
import { ElMessage } from 'element-plus'
import MarkdownIt from 'markdown-it'
import { computed, onMounted, reactive, ref } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { createPost, getPost, publishPost, unpublishPost, updatePost } from '@/api/posts'
import ImageUploadCropper from '@/components/ImageUploadCropper.vue'
import { listTags } from '@/api/tags'
import type { AdminPostResponse, CreatePostRequest, ImageResponse, TagResponse } from '@/types/api'
import { formatDateTime } from '@/utils/format'

interface PostForm {
  slug: string
  title: string
  subtitle: string
  excerpt: string
  body: string
  coverImageId: string | null
  bannerImageId: string | null
  tagIds: string[]
}

type EditorMode = 'edit' | 'split' | 'preview'

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const post = ref<AdminPostResponse | null>(null)
const tags = ref<TagResponse[]>([])
const editorMode = ref<EditorMode>('edit')
const embeddedImageId = ref<string | null>(null)
const postId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const isEditing = computed(() => !!postId.value)
const showBodyEditor = computed(() => editorMode.value !== 'preview')
const showBodyPreview = computed(() => editorMode.value !== 'edit')
const bodyWorkspaceClass = computed(() => ({
  'is-split': editorMode.value === 'split',
}))

const form = reactive<PostForm>({
  slug: '',
  title: '',
  subtitle: '',
  excerpt: '',
  body: '',
  coverImageId: null,
  bannerImageId: null,
  tagIds: [],
})

const rules: FormRules<PostForm> = {
  title: [
    { required: true, message: 'Title is required.', trigger: 'blur' },
    { max: 256, message: 'Title must be at most 256 characters.', trigger: 'blur' },
  ],
  slug: [
    { max: 160, message: 'Slug must be at most 160 characters.', trigger: 'blur' },
    {
      pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      message: 'Use lowercase letters, numbers, and hyphen-separated segments.',
      trigger: 'blur',
    },
  ],
  subtitle: [{ max: 512, message: 'Subtitle must be at most 512 characters.', trigger: 'blur' }],
  excerpt: [{ max: 1000, message: 'Excerpt must be at most 1000 characters.', trigger: 'blur' }],
  body: [{ required: true, message: 'Body is required.', trigger: 'blur' }],
}

const editorExtensions = [
  basicSetup,
  markdown(),
  EditorView.lineWrapping,
  EditorView.theme({
    '&': {
      minHeight: '560px',
      fontSize: '14px',
      backgroundColor: 'var(--el-bg-color)',
      color: 'var(--el-text-color-primary)',
    },
    '.cm-scroller': {
      fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
    },
    '.cm-content': {
      padding: '14px 0',
    },
    '.cm-line': {
      padding: '0 14px',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--el-fill-color-light)',
      borderRightColor: 'var(--el-border-color)',
      color: 'var(--el-text-color-secondary)',
    },
    '.cm-activeLine, .cm-activeLineGutter': {
      backgroundColor: 'var(--el-fill-color)',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--el-text-color-primary)',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'var(--el-color-primary-light-5)',
    },
  }),
]

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

const renderedBody = computed(() => markdownRenderer.render(form.body))

onMounted(loadEditor)

async function loadEditor(): Promise<void> {
  loading.value = true

  try {
    const [tagList, loadedPost] = await Promise.all([
      listTags({ limit: 100 }),
      isEditing.value ? getPost(postId.value) : Promise.resolve(null),
    ])

    tags.value = tagList
    if (loadedPost) {
      post.value = loadedPost
      applyPost(loadedPost)
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to load editor.')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!formRef.value) {
    return
  }

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  saving.value = true

  try {
    const request = buildRequest()
    const saved = isEditing.value
      ? await updatePost(postId.value, request)
      : await createPost(request)

    post.value = saved
    applyPost(saved)
    ElMessage.success('Post saved.')

    if (!isEditing.value) {
      await router.replace(`/posts/${saved.id}`)
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to save post.')
  } finally {
    saving.value = false
  }
}

async function togglePublication(): Promise<void> {
  if (!post.value) {
    return
  }

  saving.value = true

  try {
    const updated =
      post.value.status === 'Published'
        ? await unpublishPost(post.value.id)
        : await publishPost(post.value.id)

    post.value = updated
    applyPost(updated)
    ElMessage.success(updated.status === 'Published' ? 'Post published.' : 'Post unpublished.')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to update publication state.')
  } finally {
    saving.value = false
  }
}

function applyPost(value: AdminPostResponse): void {
  form.slug = value.slug ?? ''
  form.title = value.title
  form.subtitle = value.subtitle ?? ''
  form.excerpt = value.excerpt ?? ''
  form.body = value.body
  form.coverImageId = value.coverImageId
  form.bannerImageId = value.bannerImageId
  form.tagIds = value.tags.map((tag) => tag.id)
}

function buildRequest(): CreatePostRequest {
  return {
    slug: normalizeOptional(form.slug),
    title: form.title,
    subtitle: normalizeOptional(form.subtitle),
    excerpt: normalizeOptional(form.excerpt),
    body: form.body,
    coverImageId: form.coverImageId,
    bannerImageId: form.bannerImageId,
    tagIds: form.tagIds,
  }
}

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function validateBody(): void {
  const validation = formRef.value?.validateField('body')
  void validation?.catch(() => undefined)
}

function handleEmbeddedImageUploaded(image: ImageResponse): void {
  const label = image.originalFileName.replace(/\.[^.]+$/, '').trim() || 'image'
  const markdownImage = `![${escapeMarkdownLabel(label)}](${image.url})`
  form.body = form.body.trimEnd()
    ? `${form.body.trimEnd()}\n\n${markdownImage}\n`
    : `${markdownImage}\n`
  embeddedImageId.value = null
  validateBody()
}

function escapeMarkdownLabel(value: string): string {
  return value.replace(/[[\]\\]/g, '\\$&')
}
</script>

<template>
  <section class="page" v-loading="loading">
    <div class="page-header">
      <div>
        <h1>{{ isEditing ? 'Edit post' : 'New post' }}</h1>
        <p v-if="post">
          {{ post.status }}. Created {{ formatDateTime(post.createdAt) }}.
          <span v-if="post.publishedAt"> Published {{ formatDateTime(post.publishedAt) }}.</span>
        </p>
        <p v-else>Create a draft post and publish it when ready.</p>
      </div>
      <div class="toolbar">
        <el-button :icon="ArrowLeft" @click="router.push('/posts')">Back</el-button>
        <el-button v-if="post" :icon="Refresh" @click="togglePublication">
          {{ post.status === 'Published' ? 'Unpublish' : 'Publish' }}
        </el-button>
        <el-button type="primary" :icon="Check" :loading="saving" @click="save">Save</el-button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-body">
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <div class="form-grid">
            <el-form-item label="Title" prop="title" class="wide">
              <el-input v-model="form.title" maxlength="256" show-word-limit />
            </el-form-item>

            <el-form-item label="Slug" prop="slug">
              <el-input v-model="form.slug" maxlength="160" placeholder="Leave empty to generate" />
            </el-form-item>

            <el-form-item label="Tags">
              <el-select v-model="form.tagIds" multiple filterable clearable placeholder="Select tags">
                <el-option v-for="tag in tags" :key="tag.id" :label="tag.name" :value="tag.id" />
              </el-select>
            </el-form-item>

            <el-form-item label="Subtitle" prop="subtitle" class="wide">
              <el-input v-model="form.subtitle" maxlength="512" show-word-limit />
            </el-form-item>

            <el-form-item label="Excerpt" prop="excerpt" class="wide">
              <el-input
                v-model="form.excerpt"
                type="textarea"
                maxlength="1000"
                show-word-limit
                :autosize="{ minRows: 3, maxRows: 5 }"
              />
            </el-form-item>

            <el-form-item label="Cover image">
              <ImageUploadCropper
                v-model="form.coverImageId"
                label="Cover image"
                purpose="Cover"
                :aspect-ratio="16 / 9"
                :output-width="1200"
                :output-height="675"
              />
            </el-form-item>

            <el-form-item label="Banner image">
              <ImageUploadCropper
                v-model="form.bannerImageId"
                label="Banner image"
                purpose="Banner"
                :aspect-ratio="3"
                :output-width="1800"
                :output-height="600"
              />
            </el-form-item>

            <el-form-item prop="body" class="wide body-field">
              <template #label>
                <div class="body-label">
                  <span>Body</span>
                  <div class="body-actions">
                    <ImageUploadCropper
                      v-model="embeddedImageId"
                      compact
                      label="Embedded image"
                      purpose="Embedded"
                      button-label="Insert image"
                      @uploaded="handleEmbeddedImageUploaded"
                    />
                    <el-radio-group v-model="editorMode" size="small" class="editor-mode-group">
                      <el-radio-button value="edit">Edit</el-radio-button>
                      <el-radio-button value="split">Edit + preview</el-radio-button>
                      <el-radio-button value="preview">Preview</el-radio-button>
                    </el-radio-group>
                  </div>
                </div>
              </template>

              <div class="body-workspace" :class="bodyWorkspaceClass">
                <div v-if="showBodyEditor" class="editor-pane">
                  <Codemirror
                    v-model="form.body"
                    class="post-body-editor"
                    placeholder="Write the post body in Markdown..."
                    :autofocus="false"
                    :indent-with-tab="true"
                    :tab-size="2"
                    :extensions="editorExtensions"
                    @blur="validateBody"
                  />
                </div>

                <div v-if="showBodyPreview" class="preview-pane">
                  <article v-if="form.body.trim()" class="markdown-preview" v-html="renderedBody" />
                  <div v-else class="preview-empty">Nothing to preview.</div>
                </div>
              </div>
            </el-form-item>
          </div>
        </el-form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.body-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.editor-mode-group {
  flex-shrink: 0;
}

.body-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.body-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  min-height: 560px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.body-workspace.is-split {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.editor-pane,
.preview-pane {
  min-width: 0;
  min-height: 560px;
}

.editor-pane {
  border-right: 1px solid var(--el-border-color);
}

.body-workspace:not(.is-split) .editor-pane {
  border-right: 0;
}

.post-body-editor {
  min-height: 560px;
}

.post-body-editor :deep(.cm-editor) {
  min-height: 560px;
  outline: none;
}

.post-body-editor :deep(.cm-focused) {
  outline: 2px solid var(--el-color-primary-light-3);
  outline-offset: -2px;
}

.preview-pane {
  overflow: auto;
  padding: 22px 24px;
  background: var(--el-bg-color);
}

.markdown-preview {
  max-width: 860px;
  color: var(--el-text-color-primary);
  line-height: 1.7;
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3) {
  margin: 1.25em 0 0.55em;
  color: var(--el-text-color-primary);
  line-height: 1.25;
}

.markdown-preview :deep(h1:first-child),
.markdown-preview :deep(h2:first-child),
.markdown-preview :deep(h3:first-child),
.markdown-preview :deep(p:first-child) {
  margin-top: 0;
}

.markdown-preview :deep(p),
.markdown-preview :deep(ul),
.markdown-preview :deep(ol),
.markdown-preview :deep(blockquote),
.markdown-preview :deep(pre) {
  margin: 0 0 1em;
}

.markdown-preview :deep(a) {
  color: var(--el-color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.markdown-preview :deep(blockquote) {
  padding: 0 0 0 14px;
  border-left: 3px solid var(--el-border-color-darker);
  color: var(--el-text-color-regular);
}

.markdown-preview :deep(code) {
  padding: 2px 5px;
  border-radius: 5px;
  background: var(--el-fill-color-light);
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 0.92em;
}

.markdown-preview :deep(pre) {
  overflow: auto;
  padding: 14px;
  border-radius: 8px;
  background: var(--el-fill-color-darker);
  color: var(--el-text-color-primary);
}

.markdown-preview :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
}

.preview-empty {
  display: grid;
  min-height: 516px;
  place-items: center;
  color: var(--el-text-color-secondary);
}

@media (max-width: 980px) {
  .body-workspace.is-split {
    grid-template-columns: 1fr;
  }

  .body-workspace.is-split .editor-pane {
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color);
  }
}

@media (max-width: 720px) {
  .body-label {
    display: grid;
  }

  .body-actions {
    justify-content: flex-start;
  }

  .editor-mode-group {
    max-width: 100%;
    overflow-x: auto;
  }
}
</style>
