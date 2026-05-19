/**
 * 巨人赛跑 - 路由配置
 * 登录页、游戏大厅、管理员后台
 */
import { createRouter, createWebHistory } from 'vue-router'

const Login = () => import('../views/LoginView.vue')
const GameLobby = () => import('../views/GameLobby.vue')
const AdminPanel = () => import('../views/AdminPanel.vue')

const routes = [
  { path: '/login', name: 'Login', component: Login, meta: { requiresAuth: false } },
  { path: '/', name: 'GameLobby', component: GameLobby, meta: { requiresAuth: true } },
  { path: '/admin', name: 'Admin', component: AdminPanel, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userRole = localStorage.getItem('userRole')
  console.log(`[路由] ${from.path} -> ${to.path}, token=${!!token}, role=${userRole}`)

  if (to.meta.requiresAuth && !token) return next('/login')
  if (to.path === '/login' && token) {
    // 已登录根据角色跳转
    return next(userRole === 'admin' ? '/admin' : '/')
  }
  if (to.meta.requiresAdmin && userRole !== 'admin') return next('/')
  next()
})

export default router
