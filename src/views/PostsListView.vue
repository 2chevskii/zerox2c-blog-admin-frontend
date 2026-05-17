<script setup lang="ts">
import { Delete, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { deletePost, listPosts, publishPost, unpublishPost } from '@/api/posts'
import type { AdminPostResponse, PostStatus } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const posts = ref<AdminPostResponse[]>([])
const query = reactive({
  offset: 0,
  limit: 50,
  search: '',
  status: '' as PostStatus | '',
})

const hasPrevious = computed(() => query.offset > 0)
const hasNext = computed(() => posts.value.length === query.limit)

onMounted(loadPosts)

async function loadPosts(): Promise<void> {
  loading.value = true

  try {
    posts.value = await listPosts(query)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to load posts.')
  } finally {
    loading.value = false
  }
}

async function searchPosts(): Promise<void> {
  query.offset = 0
  await loadPosts()
}

async function movePage(direction: -1 | 1): Promise<void> {
  query.offset = Math.max(0, query.offset + direction * query.limit)
  await loadPosts()
}

async function togglePublication(post: AdminPostResponse): Promise<void> {
  loading.value = true

  try {
    const updated =
      post.status === 'Published' ? await unpublishPost(post.id) : await publishPost(post.id)
    replacePost(updated)
    ElMessage.success(post.status === 'Published' ? 'Post unpublished.' : 'Post published.')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to update publication state.')
  } finally {
    loading.value = false
  }
}

async function removePost(post: AdminPostResponse): Promise<void> {
  await ElMessageBox.confirm(`Delete "${post.title}"?`, 'Delete post', {
    type: 'warning',
    confirmButtonText: 'Delete',
    confirmButtonClass: 'el-button--danger',
  })

  loading.value = true

  try {
    await deletePost(post.id)
    posts.value = posts.value.filter((item) => item.id !== post.id)
    ElMessage.success('Post deleted.')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to delete post.')
  } finally {
    loading.value = false
  }
}

function replacePost(post: AdminPostResponse): void {
  posts.value = posts.value.map((item) => (item.id === post.id ? post : item))
}
</script>

<template>
  <section class="page">
    <div class="page-header">
      <div>
        <h1>Posts</h1>
        <p>Create drafts, assign tags, and control publication state.</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="router.push('/posts/new')">New post</el-button>
    </div>

    <div class="panel">
      <div class="panel-body toolbar">
        <el-input
          v-model="query.search"
          :prefix-icon="Search"
          clearable
          placeholder="Search posts"
          style="max-width: 320px"
          @keyup.enter="searchPosts"
          @clear="searchPosts"
        />
        <el-select v-model="query.status" clearable placeholder="Any status" style="width: 170px">
          <el-option label="Draft" value="Draft" />
          <el-option label="Published" value="Published" />
        </el-select>
        <el-button :icon="Search" @click="searchPosts">Search</el-button>
        <el-button :icon="Refresh" @click="loadPosts">Refresh</el-button>
      </div>

      <el-table v-loading="loading" :data="posts" empty-text="No posts found">
        <el-table-column label="Title" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <strong>{{ row.title }}</strong>
            <div v-if="row.subtitle" class="muted">{{ row.subtitle }}</div>
          </template>
        </el-table-column>
        <el-table-column label="Slug" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="mono">{{ row.slug }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Status" width="130">
          <template #default="{ row }">
            <el-tag :type="row.status === 'Published' ? 'success' : 'info'" effect="plain">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Tags" min-width="180">
          <template #default="{ row }">
            <el-space wrap>
              <el-tag v-for="tag in row.tags" :key="tag.id" size="small" effect="plain">
                {{ tag.name }}
              </el-tag>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column label="Updated" width="180">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt ?? row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="290" fixed="right">
          <template #default="{ row }">
            <span class="table-actions">
              <el-button size="small" :icon="Edit" @click="router.push(`/posts/${row.id}`)">
                Edit
              </el-button>
              <el-button size="small" @click="togglePublication(row)">
                {{ row.status === 'Published' ? 'Unpublish' : 'Publish' }}
              </el-button>
              <el-button size="small" type="danger" :icon="Delete" @click="removePost(row)">
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
  </section>
</template>
