<script setup lang="ts">
import { Delete, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { createTag, deleteTag, listTags, updateTag } from '@/api/tags'
import type { AdminTagResponse, CreateTagRequest } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
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

const hasPrevious = computed(() => query.offset > 0)
const hasNext = computed(() => tags.value.length === query.limit)

const rules: FormRules = {
  name: [
    { required: true, message: 'Name is required.', trigger: 'blur' },
    { max: 20, message: 'Name must be at most 20 characters.', trigger: 'blur' },
    {
      pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      message: 'Use lowercase letters, numbers, and hyphen-separated segments.',
      trigger: 'blur',
    },
  ],
  description: [
    { max: 512, message: 'Description must be at most 512 characters.', trigger: 'blur' },
  ],
}

onMounted(loadTags)

async function loadTags(): Promise<void> {
  loading.value = true

  try {
    tags.value = await listTags(query)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to load tags.')
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
  dialogVisible.value = true
}

function openEditDialog(tag: AdminTagResponse): void {
  editingTag.value = tag
  form.name = tag.name
  form.description = tag.description ?? ''
  dialogVisible.value = true
}

async function saveTag(): Promise<void> {
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
    const saved = editingTag.value
      ? await updateTag(editingTag.value.id, request)
      : await createTag(request)

    if (editingTag.value) {
      tags.value = tags.value.map((tag) => (tag.id === saved.id ? saved : tag))
    } else {
      tags.value = [saved, ...tags.value]
    }

    dialogVisible.value = false
    ElMessage.success('Tag saved.')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to save tag.')
  } finally {
    saving.value = false
  }
}

async function removeTag(tag: AdminTagResponse): Promise<void> {
  await ElMessageBox.confirm(`Delete "${tag.name}"?`, 'Delete tag', {
    type: 'warning',
    confirmButtonText: 'Delete',
    confirmButtonClass: 'el-button--danger',
  })

  loading.value = true

  try {
    await deleteTag(tag.id)
    tags.value = tags.value.filter((item) => item.id !== tag.id)
    ElMessage.success('Tag deleted.')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to delete tag.')
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
</script>

<template>
  <section class="page">
    <div class="page-header">
      <div>
        <h1>Tags</h1>
        <p>Manage kebab-case tag names and descriptions used by posts.</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreateDialog">New tag</el-button>
    </div>

    <div class="panel">
      <div class="panel-body toolbar">
        <el-input
          v-model="query.search"
          :prefix-icon="Search"
          clearable
          placeholder="Search tags"
          style="max-width: 320px"
          @keyup.enter="searchTags"
          @clear="searchTags"
        />
        <el-button :icon="Search" @click="searchTags">Search</el-button>
        <el-button :icon="Refresh" @click="loadTags">Refresh</el-button>
      </div>

      <el-table v-loading="loading" :data="tags" empty-text="No tags found">
        <el-table-column prop="name" label="Name" min-width="180" show-overflow-tooltip />
        <el-table-column prop="description" label="Description" min-width="260" show-overflow-tooltip />
        <el-table-column label="Updated" width="180">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt ?? row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="180" fixed="right">
          <template #default="{ row }">
            <span class="table-actions">
              <el-button size="small" :icon="Edit" @click="openEditDialog(row)">Edit</el-button>
              <el-button size="small" type="danger" :icon="Delete" @click="removeTag(row)">
                Delete
              </el-button>
            </span>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <el-button :disabled="!hasPrevious" @click="movePage(-1)">Previous</el-button>
        <el-button :disabled="!hasNext" @click="movePage(1)">Next</el-button>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingTag ? 'Edit tag' : 'New tag'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="Name" prop="name">
          <el-input v-model="form.name" maxlength="20" show-word-limit placeholder="kebab-case" />
        </el-form-item>
        <el-form-item label="Description" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            maxlength="512"
            show-word-limit
            :autosize="{ minRows: 3, maxRows: 5 }"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="saveTag">Save</el-button>
      </template>
    </el-dialog>
  </section>
</template>
