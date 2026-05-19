/**
 * 巨人赛跑 - 路由配置
 * [安全修复] 3.2 前端管理员路由守卫可绕过：改为从 JWT 解析角色，不从 localStorage 读取明文
 */
import { createRouter, createWebHistory } from 'vue-router'

const Login = () => import('../views/LoginView.vue')
const GameLobby = () => import('../views/GameLobby.vue')
const GiantGame = () => import('../views/GiantGame.vue')
const PointingGame = () => import('../views/PointingGame.vue')
const AdminPanel = () => import('../views/AdminPanel.vue')
const AdminChat = () => import('../views/AdminChat.vue')   // ← 新增

const routes = [
  { path: '/login', name: 'Login', component: Login, meta: { requiresAuth: false } },
  { path: '/', name: 'GameLobby', component: GameLobby, meta: { requiresAuth: true } },
  { path: '/game/giant', name: 'GiantRunner', component: GiantGame, meta: { requiresAuth: true } },
  { path: '/game/pointing', name: 'PointingGame', component: PointingGame, meta: { requiresAuth: true } },
  { path: '/admin', name: 'Admin', component: AdminPanel, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/chat', name: 'AdminChat', component: AdminChat, meta: { requiresAuth: true, requiresAdmin: true } },  // ← 新增
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 从 JWT Token 中解析用户角色，避免前端伪造
function getUserRoleFromToken() {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(jsonPayload)
    return payload.role
  } catch (e) {
    return null
  }
}

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userRole = getUserRoleFromToken()

  console.log(`[路由] ${from.path} -> ${to.path}, token=${!!token}, role=${userRole}`)

  if (to.meta.requiresAuth && !token) return next('/login')
  if (to.path === '/login' && token) {
    return next(userRole === 'admin' ? '/admin' : '/')
  }
  if (to.meta.requiresAdmin && userRole !== 'admin') return next('/')
  next()
})

export default router
