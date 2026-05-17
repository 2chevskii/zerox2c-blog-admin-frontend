<script setup lang="ts">
import { FilePenLine, Plus, RefreshCw, Search, Trash2 } from '@lucide/vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import TagPill from '@/components/TagPill.vue'
import { deletePost, listPosts, publishPost, unpublishPost } from '@/api/posts'
import { confirmAction } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import type { AdminPostResponse, PostStatus } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const toast = useToast()
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
    toast.error(error instanceof Error ? error.message : 'Failed to load posts.')
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
    toast.success(post.status === 'Published' ? 'Post unpublished.' : 'Post published.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to update publication state.')
  } finally {
    loading.value = false
  }
}

async function removePost(post: AdminPostResponse): Promise<void> {
  const confirmed = await confirmAction({
    title: 'Delete post',
    message: `Delete "${post.title}"?`,
    confirmLabel: 'Delete',
    tone: 'danger',
  })

  if (!confirmed) {
    return
  }

  loading.value = true

  try {
    await deletePost(post.id)
    posts.value = posts.value.filter((item) => item.id !== post.id)
    toast.success('Post deleted.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to delete post.')
  } finally {
    loading.value = false
  }
}

function replacePost(post: AdminPostResponse): void {
  posts.value = posts.value.map((item) => (item.id === post.id ? post : item))
}
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1 class="admin-title">Posts</h1>
        <p class="admin-subtitle">Create drafts, assign tags, and control publication state.</p>
      </div>
      <button type="button" class="button button-primary" @click="router.push('/posts/new')">
        <Plus class="h-4 w-4" />
        New post
      </button>
    </div>

    <div class="admin-panel">
      <form class="admin-panel-body toolbar" @submit.prevent="searchPosts">
        <label class="relative block w-full max-w-sm">
          <span class="sr-only">Search posts</span>
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-300" />
          <input v-model="query.search" class="control pl-10" placeholder="Search posts">
        </label>
        <label class="block w-full max-w-48">
          <span class="sr-only">Status</span>
          <select v-model="query.status" class="control">
            <option value="">Any status</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
          </select>
        </label>
        <button type="submit" class="button">
          <Search class="h-4 w-4" />
          Search
        </button>
        <button type="button" class="button" :disabled="loading" @click="loadPosts">
          <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
          Refresh
        </button>
      </form>

      <div v-if="loading && posts.length === 0" class="admin-panel-body border-t border-mist-50/8">
        <LoadingState />
      </div>
      <EmptyState
        v-else-if="posts.length === 0"
        title="No posts"
        message="No posts match the current filters."
      />
      <div v-else class="admin-table-wrap" :class="loading ? 'opacity-70' : ''">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th class="w-36">Status</th>
              <th>Tags</th>
              <th class="w-52">Updated</th>
              <th class="w-72">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="post in posts" :key="post.id">
              <td>
                <strong class="block max-w-md truncate text-mist-50">{{ post.title }}</strong>
                <span v-if="post.subtitle" class="mt-1 block max-w-md truncate text-sm text-mist-300">
                  {{ post.subtitle }}
                </span>
              </td>
              <td>
                <span class="font-mono text-sm text-mist-300">{{ post.slug }}</span>
              </td>
              <td>
                <span class="badge" :class="post.status === 'Published' ? 'badge-success' : 'badge-muted'">
                  {{ post.status }}
                </span>
              </td>
              <td>
                <div class="flex flex-wrap gap-2">
                  <TagPill v-for="tag in post.tags" :key="tag.id" :name="tag.name" />
                </div>
              </td>
              <td class="text-mist-300">{{ formatDateTime(post.updatedAt ?? post.createdAt) }}</td>
              <td>
                <span class="table-actions">
                  <button type="button" class="button min-h-9 px-3 py-1.5" @click="router.push(`/posts/${post.id}`)">
                    <FilePenLine class="h-4 w-4" />
                    Edit
                  </button>
                  <button type="button" class="button min-h-9 px-3 py-1.5" :disabled="loading" @click="togglePublication(post)">
                    {{ post.status === 'Published' ? 'Unpublish' : 'Publish' }}
                  </button>
                  <button type="button" class="button button-danger min-h-9 px-3 py-1.5" :disabled="loading" @click="removePost(post)">
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
  </section>
</template>
