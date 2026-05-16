import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: 'Login' },
  },
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'posts',
        name: 'posts',
        component: () => import('@/views/PostsListView.vue'),
        meta: { title: 'Posts' },
      },
      {
        path: 'posts/new',
        name: 'post-create',
        component: () => import('@/views/PostEditorView.vue'),
        meta: { title: 'New post' },
      },
      {
        path: 'posts/:id',
        name: 'post-edit',
        component: () => import('@/views/PostEditorView.vue'),
        meta: { title: 'Edit post' },
      },
      {
        path: 'tags',
        name: 'tags',
        component: () => import('@/views/TagsView.vue'),
        meta: { title: 'Tags' },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/views/UsersView.vue'),
        meta: { title: 'Users' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return undefined
})

router.afterEach((to) => {
  document.title = `${to.meta.title ?? 'Admin'} | 0x2c.dev`
})

export default router
