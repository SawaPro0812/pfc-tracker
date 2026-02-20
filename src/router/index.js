import { createRouter, createWebHistory } from 'vue-router'
import { getSettings } from '../db/index.js'

const routes = [
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('../views/Setup.vue'),
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
  },
  {
    path: '/record',
    name: 'Record',
    component: () => import('../views/Record.vue'),
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('../views/Calendar.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 初回起動時にセットアップ画面へリダイレクト
router.beforeEach(async (to) => {
  if (to.name === 'Setup') return true
  const settings = await getSettings()
  if (!settings) return { name: 'Setup' }
  return true
})

export default router
