import { createRouter, createWebHistory } from 'vue-router'

// 页面组件引入
const Login = () => import('../views/LoginView.vue')
const GameLobby = () => import('../views/GameLobby.vue')
const GiantGame = () => import('../views/GiantGame.vue')
const PointingGame = () => import('../views/PointingGame.vue')
const MatchGame = () => import('../views/MatchGame.vue')
const AdminPanel = () => import('../views/AdminPanel.vue')
const AdminChat = () => import('../views/AdminChat.vue')

const LeisureCenter = () => import('../views/Lobby/LeisureCenter.vue')
const RaisingHall = () => import('../views/Lobby/RaisingHall.vue')
const StarDreamTown = () => import('../views/StarDreamTown.vue')

// ★ 修改：分别引入活动广场和爬墙页面
const ActivityCenter = () => import('../views/ActivityCenter.vue')
const ClimbWallGame = () => import('../views/ClimbWallGame.vue')

const routes = [
  { path: '/login', name: 'Login', component: Login, meta: { requiresAuth: false } },
  { path: '/', name: 'GameLobby', component: GameLobby, meta: { requiresAuth: true } },
  { path: '/leisure', name: 'LeisureCenter', component: LeisureCenter, meta: { requiresAuth: true } },
  { path: '/raising', name: 'RaisingHall', component: RaisingHall, meta: { requiresAuth: true } },
  { path: '/game/xingmeng', name: 'StarDreamTown', component: StarDreamTown, meta: { requiresAuth: true } },
  
  // ★ 修改：拆分为两个路由
  { path: '/activity', name: 'ActivityCenter', component: ActivityCenter, meta: { requiresAuth: true } },
  { path: '/activity/climbwall', name: 'ClimbWallGame', component: ClimbWallGame, meta: { requiresAuth: true } },

  { path: '/game/giant', name: 'GiantRunner', component: GiantGame, meta: { requiresAuth: true } },
  { path: '/game/pointing', name: 'PointingGame', component: PointingGame, meta: { requiresAuth: true } },
  { path: '/game/match', name: 'MatchGame', component: MatchGame, meta: { requiresAuth: true } },
  { path: '/admin', name: 'Admin', component: AdminPanel, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/chat', name: 'AdminChat', component: AdminChat, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL || '/'),
  routes
})

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
