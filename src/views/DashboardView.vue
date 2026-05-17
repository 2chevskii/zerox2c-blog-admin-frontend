<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
import { computed, onMounted, reactive, ref } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import { listPosts } from '@/api/posts'
import { listTags } from '@/api/tags'
import { listUsers } from '@/api/users'
import { useToast } from '@/composables/useToast'
import type { AdminPostResponse } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const toast = useToast()
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
    toast.error(error instanceof Error ? error.message : 'Failed to load dashboard.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1 class="admin-title">Dashboard</h1>
        <p class="admin-subtitle">Current content and account state from the admin API.</p>
      </div>
      <button type="button" class="button" :disabled="loading" @click="loadDashboard">
        <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
        Refresh
      </button>
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

    <div class="metric-grid xl:grid-cols-4">
      <div class="metric-card">
        <div class="metric-label">Tags</div>
        <div class="metric-value">{{ metrics.tags }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Users</div>
        <div class="metric-value">{{ metrics.users }}</div>
      </div>
    </div>

    <div class="admin-panel">
      <div class="admin-panel-body flex items-center justify-between gap-3">
        <h2 class="font-display text-2xl font-bold leading-none text-mist-50">Recent posts</h2>
      </div>

      <div v-if="loading" class="admin-panel-body border-t border-mist-50/8">
        <LoadingState />
      </div>
      <EmptyState
        v-else-if="latestPosts.length === 0"
        title="No posts"
        message="Create a draft to see recent content here."
      />
      <div v-else class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th class="w-36">Status</th>
              <th class="w-52">Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="post in latestPosts" :key="post.id">
              <td>
                <strong class="block max-w-xl truncate text-mist-50">{{ post.title }}</strong>
              </td>
              <td>
                <span class="badge" :class="post.status === 'Published' ? 'badge-success' : 'badge-muted'">
                  {{ post.status }}
                </span>
              </td>
              <td class="text-mist-300">{{ formatDateTime(post.updatedAt ?? post.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
