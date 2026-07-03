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
const ActivityCenter = () => import('../views/ActivityCenter.vue')
const ClimbWallGame = () => import('../views/ClimbWallGame.vue')
const TransferRecords = () => import('../views/TransferRecords.vue')
const MembershipCenter = () => import('../views/MembershipCenter.vue')

// 👇 新增：轮回游戏组件引入
const ReincarnationGame = () => import('../modules/reincarnation/views/ReincarnationGame.vue')

const routes = [
  { path: '/login', name: 'Login', component: Login, meta: { requiresAuth: false } },
  { path: '/', name: 'GameLobby', component: GameLobby, meta: { requiresAuth: true } },
  { path: '/leisure', name: 'LeisureCenter', component: LeisureCenter, meta: { requiresAuth: true } },
  { path: '/raising', name: 'RaisingHall', component: RaisingHall, meta: { requiresAuth: true } },
  { path: '/game/xingmeng', name: 'StarDreamTown', component: StarDreamTown, meta: { requiresAuth: true } },
  { path: '/activity', name: 'ActivityCenter', component: ActivityCenter, meta: { requiresAuth: true } },
  { path: '/activity/climbwall', name: 'ClimbWallGame', component: ClimbWallGame, meta: { requiresAuth: true } },
  { path: '/transfer-records', name: 'TransferRecords', component: TransferRecords, meta: { requiresAuth: true } },
  { path: '/membership', name: 'MembershipCenter', component: MembershipCenter, meta: { requiresAuth: true } },
  { path: '/game/giant', name: 'GiantRunner', component: GiantGame, meta: { requiresAuth: true } },
  { path: '/game/pointing', name: 'PointingGame', component: PointingGame, meta: { requiresAuth: true } },
  { path: '/game/match', name: 'MatchGame', component: MatchGame, meta: { requiresAuth: true } },
  
  // 👇 新增：轮回游戏路由
  {
    path: '/game/reincarnation',
    name: 'ReincarnationGame',
    component: ReincarnationGame,
    meta: { requiresAuth: true }
  },

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

router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('token')
  const userRole = getUserRoleFromToken()

  // 1. 需要登录但没token，去登录页
  if (to.meta.requiresAuth && !token) return next('/login')
  
  // 2. 已登录访问登录页，按角色跳转
  if (to.path === '/login' && token) {
    return next(userRole === 'admin' ? '/admin' : '/')
  }
  
  // 3. 非管理员想进后台，弹回大厅
  if (to.meta.requiresAdmin && userRole !== 'admin') return next('/')
  
  // 4. 特殊页面直接放行
  if (to.path === '/transfer-records' && token) return next()

  // ★★★ 5. 新增：维护模式防停留拦截（第三道防线） ★★★
  // 如果已登录，且不是管理员，且不是去登录页，顺手查一下系统状态
  if (token && userRole !== 'admin' && to.path !== '/login') {
    try {
      // 用原生 fetch 探针请求，不走路由守卫死循环
      const res = await fetch('/api/health', { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.status === 503) {
        // 清理本地状态
        localStorage.removeItem('token')
        localStorage.removeItem('userRole')
        localStorage.removeItem('userPhone')
        localStorage.removeItem('userUid')
        localStorage.removeItem('userNickname')
        localStorage.removeItem('userAvatar')
        // 提示并踢回登录页
        alert('系统升级维护中，请稍后再试')
        return next('/login')
      }
    } catch (e) {
      // 网络波动忽略，不影响用户正常跳转
    }
  }

  next()
})

export default router
