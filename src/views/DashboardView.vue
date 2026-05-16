<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { listPosts } from '@/api/posts'
import { listTags } from '@/api/tags'
import { listUsers } from '@/api/users'
import type { AdminPostResponse } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const loading = ref(false)
const latestPosts = ref<AdminPostResponse[]>([])
const metrics = reactive({
  posts: 0,
  published: 0,
  drafts: 0,
  tags: 0,
  users: 0,
})

const publicationRate = computed(() => {
  if (metrics.posts === 0) {
    return '0%'
  }

  return `${Math.round((metrics.published / metrics.posts) * 100)}%`
})

onMounted(loadDashboard)

async function loadDashboard(): Promise<void> {
  loading.value = true

  try {
    const [posts, tags, users] = await Promise.all([
      listPosts({ limit: 100 }),
      listTags({ limit: 100 }),
      listUsers(),
    ])

    metrics.posts = posts.length
    metrics.published = posts.filter((post) => post.status === 'Published').length
    metrics.drafts = posts.filter((post) => post.status === 'Draft').length
    metrics.tags = tags.length
    metrics.users = users.length
    latestPosts.value = posts.slice(0, 8)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to load dashboard.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="page" v-loading="loading">
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p>Current content and account state from the admin API.</p>
      </div>
      <el-button @click="loadDashboard">Refresh</el-button>
    </div>

    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Posts</div>
        <div class="metric-value">{{ metrics.posts }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Published</div>
        <div class="metric-value">{{ metrics.published }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Drafts</div>
        <div class="metric-value">{{ metrics.drafts }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Publication rate</div>
        <div class="metric-value">{{ publicationRate }}</div>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Tags</div>
        <div class="metric-value">{{ metrics.tags }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Users</div>
        <div class="metric-value">{{ metrics.users }}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-body">
        <h2>Recent posts</h2>
      </div>
      <el-table :data="latestPosts" empty-text="No posts yet">
        <el-table-column prop="title" label="Title" min-width="220" show-overflow-tooltip />
        <el-table-column prop="status" label="Status" width="130">
          <template #default="{ row }">
            <el-tag :type="row.status === 'Published' ? 'success' : 'info'" effect="plain">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Updated" width="190">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt ?? row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </section>
</template>

<style scoped>
h2 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0;
}
</style>
