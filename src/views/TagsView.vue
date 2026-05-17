<script setup lang="ts">
import { FilePenLine, Plus, RefreshCw, Search, Trash2 } from '@lucide/vue'
import { computed, onMounted, reactive, ref } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import { createTag, deleteTag, listTags, updateTag } from '@/api/tags'
import { confirmAction } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import type { AdminTagResponse, CreateTagRequest } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const tags = ref<AdminTagResponse[]>([])
const editingTag = ref<AdminTagResponse | null>(null)
const query = reactive({
  offset: 0,
  limit: 50,
  search: '',
})
const form = reactive({
  name: '',
  description: '',
})
const errors = reactive({
  name: '',
  description: '',
})

const hasPrevious = computed(() => query.offset > 0)
const hasNext = computed(() => tags.value.length === query.limit)

onMounted(loadTags)

async function loadTags(): Promise<void> {
  loading.value = true

  try {
    tags.value = await listTags(query)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to load tags.')
  } finally {
    loading.value = false
  }
}

async function searchTags(): Promise<void> {
  query.offset = 0
  await loadTags()
}

async function movePage(direction: -1 | 1): Promise<void> {
  query.offset = Math.max(0, query.offset + direction * query.limit)
  await loadTags()
}

function openCreateDialog(): void {
  editingTag.value = null
  form.name = ''
  form.description = ''
  clearErrors()
  dialogVisible.value = true
}

function openEditDialog(tag: AdminTagResponse): void {
  editingTag.value = tag
  form.name = tag.name
  form.description = tag.description ?? ''
  clearErrors()
  dialogVisible.value = true
}

async function saveTag(): Promise<void> {
  if (!validateTag()) {
    return
  }

  saving.value = true

  try {
    const request = buildRequest()
    const saved = editingTag.value
      ? await updateTag(editingTag.value.id, request)
      : await createTag(request)

    if (editingTag.value) {
      tags.value = tags.value.map((tag) => (tag.id === saved.id ? saved : tag))
    } else {
      tags.value = [saved, ...tags.value]
    }

    dialogVisible.value = false
    toast.success('Tag saved.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to save tag.')
  } finally {
    saving.value = false
  }
}

async function removeTag(tag: AdminTagResponse): Promise<void> {
  const confirmed = await confirmAction({
    title: 'Delete tag',
    message: `Delete "${tag.name}"?`,
    confirmLabel: 'Delete',
    tone: 'danger',
  })

  if (!confirmed) {
    return
  }

  loading.value = true

  try {
    await deleteTag(tag.id)
    tags.value = tags.value.filter((item) => item.id !== tag.id)
    toast.success('Tag deleted.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to delete tag.')
  } finally {
    loading.value = false
  }
}

function buildRequest(): CreateTagRequest {
  return {
    name: form.name,
    description: normalizeOptional(form.description),
  }
}

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function validateTag(): boolean {
  clearErrors()

  if (!form.name.trim()) {
    errors.name = 'Name is required.'
  } else if (form.name.length > 20) {
    errors.name = 'Name must be at most 20 characters.'
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.name)) {
    errors.name = 'Use lowercase letters, numbers, and hyphen-separated segments.'
  }

  if (form.description.length > 512) {
    errors.description = 'Description must be at most 512 characters.'
  }

  return !errors.name && !errors.description
}

function clearErrors(): void {
  errors.name = ''
  errors.description = ''
}
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1 class="admin-title">Tags</h1>
        <p class="admin-subtitle">Manage kebab-case tag names and descriptions used by posts.</p>
      </div>
      <button type="button" class="button button-primary" @click="openCreateDialog">
        <Plus class="h-4 w-4" />
        New tag
      </button>
    </div>

    <div class="admin-panel">
      <form class="admin-panel-body toolbar" @submit.prevent="searchTags">
        <label class="relative block w-full max-w-sm">
          <span class="sr-only">Search tags</span>
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-300" />
          <input v-model="query.search" class="control pl-10" placeholder="Search tags">
        </label>
        <button type="submit" class="button">
          <Search class="h-4 w-4" />
          Search
        </button>
        <button type="button" class="button" :disabled="loading" @click="loadTags">
          <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
          Refresh
        </button>
      </form>

      <div v-if="loading && tags.length === 0" class="admin-panel-body border-t border-mist-50/8">
        <LoadingState />
      </div>
      <EmptyState
        v-else-if="tags.length === 0"
        title="No tags"
        message="No tags match the current filters."
      />
      <div v-else class="admin-table-wrap" :class="loading ? 'opacity-70' : ''">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="w-56">Name</th>
              <th>Description</th>
              <th class="w-52">Updated</th>
              <th class="w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tag in tags" :key="tag.id">
              <td>
                <span class="badge badge-accent">{{ tag.name }}</span>
              </td>
              <td>
                <span class="block max-w-2xl truncate text-mist-200">{{ tag.description }}</span>
              </td>
              <td class="text-mist-300">{{ formatDateTime(tag.updatedAt ?? tag.createdAt) }}</td>
              <td>
                <span class="table-actions">
                  <button type="button" class="button min-h-9 px-3 py-1.5" @click="openEditDialog(tag)">
                    <FilePenLine class="h-4 w-4" />
                    Edit
                  </button>
                  <button type="button" class="button button-danger min-h-9 px-3 py-1.5" :disabled="loading" @click="removeTag(tag)">
                    <Trash2 class="h-4 w-4" />
                    Delete
                  </button>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-footer">
        <button type="button" class="button" :disabled="!hasPrevious || loading" @click="movePage(-1)">
          Previous
        </button>
        <button type="button" class="button" :disabled="!hasNext || loading" @click="movePage(1)">
          Next
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="dialogVisible" class="fixed inset-0 z-[60] grid place-items-center bg-[#1d1d1d]/70 p-4 backdrop-blur-[6px]">
        <section
          class="grid w-[min(100%,35rem)] gap-5 rounded-xl border border-mist-50/12 bg-[#252525] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tag-dialog-title"
        >
          <h2 id="tag-dialog-title" class="font-display text-2xl font-bold leading-none text-mist-50">
            {{ editingTag ? 'Edit tag' : 'New tag' }}
          </h2>

          <form class="grid gap-4" @submit.prevent="saveTag">
            <label class="block">
              <span class="field-label">Name</span>
              <input
                v-model="form.name"
                class="control"
                maxlength="20"
                placeholder="kebab-case"
                :aria-invalid="Boolean(errors.name)"
                @blur="validateTag"
              >
              <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
            </label>

            <label class="block">
              <span class="field-label">Description</span>
              <textarea
                v-model="form.description"
                class="control textarea-control"
                maxlength="512"
                :aria-invalid="Boolean(errors.description)"
                @blur="validateTag"
              />
              <span v-if="errors.description" class="field-error">{{ errors.description }}</span>
            </label>

            <div class="flex flex-wrap justify-end gap-2">
              <button type="button" class="button" @click="dialogVisible = false">Cancel</button>
              <button type="submit" class="button button-primary" :disabled="saving">
                <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-brass-100/70 border-t-transparent" />
                Save
              </button>
            </div>
          </form>
        </section>
      </div>
    </Teleport>
  </section>
</template>
