<script setup lang="ts">
import { autocompletion, type CompletionContext } from '@codemirror/autocomplete'
import { markdown } from '@codemirror/lang-markdown'
import { ArrowLeft, Check, ImagePlus, RefreshCw } from '@lucide/vue'
import { basicSetup, EditorView } from 'codemirror'
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { useRoute, useRouter } from 'vue-router'
import { createPost, getPost, publishPost, renderMarkdown, unpublishPost, updatePost } from '@/api/posts'
import ImageUploadCropper from '@/components/ImageUploadCropper.vue'
import { listPostMarkdownImages, uploadPostMarkdownImage } from '@/api/images'
import { listTags } from '@/api/tags'
import { useToast } from '@/composables/useToast'
import type {
  AdminPostResponse,
  CreatePostRequest,
  PostMarkdownImageResponse,
  TagResponse,
} from '@/types/api'
import { formatDateTime } from '@/utils/format'

interface PostForm {
  slug: string
  title: string
  subtitle: string
  bodyMarkdown: string
  coverImageId: string | null
  bannerImageId: string | null
  tagIds: string[]
}

type EditorMode = 'edit' | 'split' | 'preview'
type PostFormField = keyof Pick<PostForm, 'slug' | 'title' | 'subtitle' | 'bodyMarkdown'>

const route = useRoute()
const router = useRouter()
const toast = useToast()
const markdownFileInput = ref<HTMLInputElement>()
const loading = ref(false)
const saving = ref(false)
const previewLoading = ref(false)
const post = ref<AdminPostResponse | null>(null)
const tags = ref<TagResponse[]>([])
const markdownImages = ref<PostMarkdownImageResponse[]>([])
const editorMode = ref<EditorMode>('edit')
const editorView = shallowRef<EditorView | null>(null)
const renderedBody = ref('')
const tagSearch = ref('')
const postId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const isEditing = computed(() => !!postId.value)
const showBodyEditor = computed(() => editorMode.value !== 'preview')
const showBodyPreview = computed(() => editorMode.value !== 'edit')
const bodyWorkspaceClass = computed(() => ({
  'is-split': editorMode.value === 'split',
}))
const filteredTags = computed(() => {
  const search = tagSearch.value.trim().toLowerCase()
  if (!search) {
    return tags.value
  }

  return tags.value.filter((tag) => tag.name.includes(search))
})

const editorModeOptions: { value: EditorMode; label: string }[] = [
  { value: 'edit', label: 'Edit' },
  { value: 'split', label: 'Edit + preview' },
  { value: 'preview', label: 'Preview' },
]

const form = reactive<PostForm>({
  slug: '',
  title: '',
  subtitle: '',
  bodyMarkdown: '',
  coverImageId: null,
  bannerImageId: null,
  tagIds: [],
})

const errors = reactive<Record<PostFormField, string>>({
  slug: '',
  title: '',
  subtitle: '',
  bodyMarkdown: '',
})

const markdownImagePasteDropExtension = EditorView.domEventHandlers({
  paste(event, view) {
    const files = getImageFiles(event.clipboardData?.files)
    if (files.length === 0) {
      return false
    }

    event.preventDefault()
    void uploadAndInsertMarkdownImages(files, view)
    return true
  },
  drop(event, view) {
    const files = getImageFiles(event.dataTransfer?.files)
    if (files.length === 0) {
      return false
    }

    event.preventDefault()
    const position = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (position !== null) {
      view.dispatch({ selection: { anchor: position } })
    }

    void uploadAndInsertMarkdownImages(files, view)
    return true
  },
})

const editorExtensions = [
  basicSetup,
  markdown(),
  autocompletion({ override: [completeMarkdownImages] }),
  markdownImagePasteDropExtension,
  EditorView.lineWrapping,
  EditorView.theme({
    '&': {
      minHeight: '560px',
      fontSize: '14px',
      backgroundColor: '#252525',
      color: '#f4ead9',
    },
    '.cm-scroller': {
      fontFamily: '"IBM Plex Mono", "Cascadia Code", Consolas, monospace',
    },
    '.cm-content': {
      padding: '14px 0',
    },
    '.cm-line': {
      padding: '0 14px',
    },
    '.cm-gutters': {
      backgroundColor: '#303030',
      borderRightColor: 'rgba(255, 249, 238, 0.1)',
      color: '#bba98f',
    },
    '.cm-activeLine, .cm-activeLineGutter': {
      backgroundColor: 'rgba(255, 249, 238, 0.045)',
    },
    '.cm-cursor': {
      borderLeftColor: '#ffe7ad',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(240, 201, 120, 0.28)',
    },
  }),
]

let previewRenderTimer: ReturnType<typeof setTimeout> | null = null
let previewRenderRequestId = 0

watch(() => form.bodyMarkdown, schedulePreviewRender)

onMounted(loadEditor)
onBeforeUnmount(() => {
  clearPreviewRenderTimer()
})

async function loadEditor(): Promise<void> {
  loading.value = true

  try {
    const [tagList, loadedPost, loadedImages] = await Promise.all([
      listTags({ limit: 100 }),
      isEditing.value ? getPost(postId.value) : Promise.resolve(null),
      isEditing.value ? listPostMarkdownImages(postId.value) : Promise.resolve([]),
    ])

    tags.value = tagList
    markdownImages.value = loadedImages
    if (loadedPost) {
      post.value = loadedPost
      applyPost(loadedPost)
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to load editor.')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!validateForm()) {
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
    toast.success('Post saved.')

    if (!isEditing.value) {
      await router.replace(`/posts/${saved.id}`)
    }

    markdownImages.value = await listPostMarkdownImages(saved.id)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to save post.')
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
    toast.success(updated.status === 'Published' ? 'Post published.' : 'Post unpublished.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to update publication state.')
  } finally {
    saving.value = false
  }
}

function applyPost(value: AdminPostResponse): void {
  form.slug = value.slug ?? ''
  form.title = value.title
  form.subtitle = value.subtitle ?? ''
  form.bodyMarkdown = value.bodyMarkdown
  form.coverImageId = value.coverImageId
  form.bannerImageId = value.bannerImageId
  form.tagIds = value.tags.map((tag) => tag.id)
  renderedBody.value = value.bodyHtml
  clearErrors()
}

function buildRequest(): CreatePostRequest {
  return {
    slug: normalizeOptional(form.slug),
    title: form.title,
    subtitle: normalizeOptional(form.subtitle),
    bodyMarkdown: form.bodyMarkdown,
    coverImageId: form.coverImageId,
    bannerImageId: form.bannerImageId,
    tagIds: form.tagIds,
  }
}

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function validateForm(): boolean {
  validateField('title')
  validateField('slug')
  validateField('subtitle')
  validateField('bodyMarkdown')

  return !errors.title && !errors.slug && !errors.subtitle && !errors.bodyMarkdown
}

function validateField(field: PostFormField): void {
  if (field === 'title') {
    errors.title = !form.title.trim()
      ? 'Title is required.'
      : form.title.length > 256
        ? 'Title must be at most 256 characters.'
        : ''
  }

  if (field === 'slug') {
    errors.slug = form.slug.length > 160
      ? 'Slug must be at most 160 characters.'
      : form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)
        ? 'Use lowercase letters, numbers, and hyphen-separated segments.'
        : ''
  }

  if (field === 'subtitle') {
    errors.subtitle = form.subtitle.length > 512 ? 'Subtitle must be at most 512 characters.' : ''
  }

  if (field === 'bodyMarkdown') {
    errors.bodyMarkdown = form.bodyMarkdown.trim() ? '' : 'Body is required.'
  }
}

function clearErrors(): void {
  errors.slug = ''
  errors.title = ''
  errors.subtitle = ''
  errors.bodyMarkdown = ''
}

function validateBody(): void {
  validateField('bodyMarkdown')
}

function handleEditorReady(payload: { view: EditorView }): void {
  editorView.value = payload.view
}

function openMarkdownImagePicker(): void {
  if (!isEditing.value) {
    toast.warning('Save the post before inserting images.')
    return
  }

  markdownFileInput.value?.click()
}

function handleMarkdownImageFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = getImageFiles(input.files)
  input.value = ''
  void uploadAndInsertMarkdownImages(files, editorView.value)
}

async function uploadAndInsertMarkdownImages(
  files: File[],
  view: EditorView | null = editorView.value,
): Promise<void> {
  if (!isEditing.value) {
    toast.warning('Save the post before inserting images.')
    return
  }

  const imageFiles = files.filter((file) => file.type.startsWith('image/'))
  if (imageFiles.length === 0) {
    toast.error('Select an image file.')
    return
  }

  saving.value = true

  try {
    const uploadedImages: PostMarkdownImageResponse[] = []
    for (const file of imageFiles) {
      const image = await uploadPostMarkdownImage(postId.value, file)
      upsertMarkdownImage(image)
      uploadedImages.push(image)
    }

    insertMarkdownAtSelection(`${uploadedImages.map(buildMarkdownImage).join('\n')}\n`, view)
    validateBody()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to upload image.')
  } finally {
    saving.value = false
  }
}

function upsertMarkdownImage(image: PostMarkdownImageResponse): void {
  const existingIndex = markdownImages.value.findIndex((existing) => existing.id === image.id)
  if (existingIndex >= 0) {
    markdownImages.value[existingIndex] = image
    return
  }

  markdownImages.value = [image, ...markdownImages.value]
}

function insertMarkdownAtSelection(markdownText: string, view: EditorView | null): void {
  if (view) {
    view.dispatch(view.state.replaceSelection(markdownText))
    view.focus()
    return
  }

  form.bodyMarkdown = form.bodyMarkdown.trimEnd()
    ? `${form.bodyMarkdown.trimEnd()}\n\n${markdownText}`
    : markdownText
}

function buildMarkdownImage(image: PostMarkdownImageResponse): string {
  const label = image.originalFileName.replace(/\.[^.]+$/, '').trim() || 'image'
  return `![${escapeMarkdownLabel(label)}](${image.localPath})`
}

function completeMarkdownImages(context: CompletionContext) {
  if (markdownImages.value.length === 0) {
    return null
  }

  const match = context.matchBefore(/(?:\.\/)?images\/[\w-]*/)
  if (!match && !context.explicit) {
    return null
  }

  return {
    from: match?.from ?? context.pos,
    options: markdownImages.value.map((image) => ({
      label: image.originalFileName,
      type: 'file',
      detail: image.localPath,
      apply: image.localPath,
    })),
    validFor: /^(?:\.\/)?images\/[\w-]*$/,
  }
}

function getImageFiles(fileList: FileList | null | undefined): File[] {
  return Array.from(fileList ?? []).filter((file) => file.type.startsWith('image/'))
}

function schedulePreviewRender(): void {
  clearPreviewRenderTimer()

  if (!form.bodyMarkdown.trim()) {
    renderedBody.value = ''
    previewLoading.value = false
    return
  }

  previewRenderTimer = setTimeout(() => {
    void renderPreview()
  }, 350)
}

async function renderPreview(): Promise<void> {
  const requestId = ++previewRenderRequestId
  previewLoading.value = true

  try {
    const rendered = await renderMarkdown({
      markdown: form.bodyMarkdown,
      postId: isEditing.value ? postId.value : null,
    })

    if (requestId === previewRenderRequestId) {
      renderedBody.value = rendered.html
    }
  } catch {
    if (requestId === previewRenderRequestId) {
      renderedBody.value = ''
    }
  } finally {
    if (requestId === previewRenderRequestId) {
      previewLoading.value = false
    }
  }
}

function clearPreviewRenderTimer(): void {
  if (previewRenderTimer) {
    clearTimeout(previewRenderTimer)
    previewRenderTimer = null
  }
}

function escapeMarkdownLabel(value: string): string {
  return value.replace(/[[\]\\]/g, '\\$&')
}
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1 class="admin-title">{{ isEditing ? 'Edit post' : 'New post' }}</h1>
        <p v-if="post" class="admin-subtitle">
          {{ post.status }}. Created {{ formatDateTime(post.createdAt) }}.
          <span v-if="post.publishedAt"> Published {{ formatDateTime(post.publishedAt) }}.</span>
        </p>
        <p v-else class="admin-subtitle">Create a draft post and publish it when ready.</p>
      </div>
      <div class="toolbar">
        <button type="button" class="button" @click="router.push('/posts')">
          <ArrowLeft class="h-4 w-4" />
          Back
        </button>
        <button v-if="post" type="button" class="button" :disabled="saving" @click="togglePublication">
          <RefreshCw class="h-4 w-4" :class="saving ? 'animate-spin' : ''" />
          {{ post.status === 'Published' ? 'Unpublish' : 'Publish' }}
        </button>
        <button type="button" class="button button-primary" :disabled="saving" @click="save">
          <Check class="h-4 w-4" />
          Save
        </button>
      </div>
    </div>

    <div v-if="loading" class="admin-panel admin-panel-body">
      <div class="grid gap-3">
        <div class="h-14 animate-pulse rounded-xl bg-mist-50/7" />
        <div class="h-14 animate-pulse rounded-xl bg-mist-50/7" />
        <div class="h-96 animate-pulse rounded-xl bg-mist-50/7" />
      </div>
    </div>

    <form v-else class="admin-panel admin-panel-body" novalidate @submit.prevent="save">
      <div class="form-grid">
        <label class="wide mb-5 block">
          <span class="field-label">Title</span>
          <input
            v-model="form.title"
            class="control"
            maxlength="256"
            :aria-invalid="Boolean(errors.title)"
            @blur="validateField('title')"
          >
          <span v-if="errors.title" class="field-error">{{ errors.title }}</span>
        </label>

        <label class="mb-5 block">
          <span class="field-label">Slug</span>
          <input
            v-model="form.slug"
            class="control"
            maxlength="160"
            placeholder="Leave empty to generate"
            :aria-invalid="Boolean(errors.slug)"
            @blur="validateField('slug')"
          >
          <span v-if="errors.slug" class="field-error">{{ errors.slug }}</span>
        </label>

        <div class="mb-5">
          <span class="field-label">Tags</span>
          <input v-model="tagSearch" class="control mb-2" placeholder="Filter tags">
          <div class="max-h-44 overflow-y-auto rounded-xl border border-mist-50/10 bg-[#303030] p-2">
            <label
              v-for="tag in filteredTags"
              :key="tag.id"
              class="flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-mist-200 transition hover:bg-mist-50/7"
            >
              <input v-model="form.tagIds" type="checkbox" :value="tag.id" class="h-4 w-4 accent-brass-200">
              <span>{{ tag.name }}</span>
            </label>
            <p v-if="filteredTags.length === 0" class="px-2 py-3 text-sm font-semibold text-mist-300">
              No matching tags.
            </p>
          </div>
        </div>

        <label class="wide mb-5 block">
          <span class="field-label">Subtitle</span>
          <input
            v-model="form.subtitle"
            class="control"
            maxlength="512"
            :aria-invalid="Boolean(errors.subtitle)"
            @blur="validateField('subtitle')"
          >
          <span v-if="errors.subtitle" class="field-error">{{ errors.subtitle }}</span>
        </label>

        <label class="mb-5 block">
          <span class="field-label">Cover image</span>
          <ImageUploadCropper
            v-model="form.coverImageId"
            label="Cover image"
            purpose="Cover"
            :aspect-ratio="16 / 9"
            :output-width="1200"
            :output-height="675"
          />
        </label>

        <label class="mb-5 block">
          <span class="field-label">Banner image</span>
          <ImageUploadCropper
            v-model="form.bannerImageId"
            label="Banner image"
            purpose="Banner"
            :aspect-ratio="3"
            :output-width="1800"
            :output-height="600"
          />
        </label>

        <div class="wide">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span class="field-label mb-0">Body</span>
            <div class="toolbar">
              <input
                ref="markdownFileInput"
                class="hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                @change="handleMarkdownImageFileChange"
              >
              <button type="button" class="button" :disabled="!isEditing" @click="openMarkdownImagePicker">
                <ImagePlus class="h-4 w-4" />
                Insert image
              </button>
              <div class="inline-flex overflow-hidden rounded-lg bg-[#303030] p-1">
                <button
                  v-for="mode in editorModeOptions"
                  :key="mode.value"
                  type="button"
                  class="min-h-9 rounded-md px-3 text-sm font-bold transition"
                  :class="editorMode === mode.value ? 'bg-brass-200/16 text-brass-100' : 'text-mist-300 hover:bg-mist-50/7 hover:text-mist-50'"
                  :aria-pressed="editorMode === mode.value"
                  @click="editorMode = mode.value"
                >
                  {{ mode.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="body-workspace" :class="bodyWorkspaceClass">
            <div v-if="showBodyEditor" class="editor-pane">
              <Codemirror
                v-model="form.bodyMarkdown"
                class="post-body-editor"
                placeholder="Write the post body in Markdown..."
                :autofocus="false"
                :indent-with-tab="true"
                :tab-size="2"
                :extensions="editorExtensions"
                @ready="handleEditorReady"
                @blur="validateBody"
              />
            </div>

            <div v-if="showBodyPreview" class="preview-pane" :class="previewLoading ? 'opacity-70' : ''">
              <article v-if="form.bodyMarkdown.trim()" class="article-body" v-html="renderedBody" />
              <div v-else class="grid min-h-[32rem] place-items-center text-sm font-semibold text-mist-300">
                Nothing to preview.
              </div>
            </div>
          </div>
          <span v-if="errors.bodyMarkdown" class="field-error">{{ errors.bodyMarkdown }}</span>
        </div>
      </div>
    </form>
  </section>
</template>

<style scoped>
.body-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  min-height: 560px;
  overflow: hidden;
  border: 1px solid rgba(255, 249, 238, 0.1);
  border-radius: 0.75rem;
  background: #252525;
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
  border-right: 1px solid rgba(255, 249, 238, 0.1);
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
  outline: 2px solid rgba(240, 201, 120, 0.52);
  outline-offset: -2px;
}

.preview-pane {
  overflow: auto;
  padding: 1.4rem 1.5rem;
  background: #252525;
}

@media (max-width: 980px) {
  .body-workspace.is-split {
    grid-template-columns: 1fr;
  }

  .body-workspace.is-split .editor-pane {
    border-right: 0;
    border-bottom: 1px solid rgba(255, 249, 238, 0.1);
  }
}
</style>
