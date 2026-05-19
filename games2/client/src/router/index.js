/**
 * 巨人赛跑 - 路由配置
 * 登录页、游戏大厅、游戏房间、管理员后台
 */
import { createRouter, createWebHistory } from 'vue-router'

const Login = () => import('../views/LoginView.vue')
const GameLobby = () => import('../views/GameLobby.vue') // 这里作为真正的大厅过渡页
const GiantGame = () => import('../views/GiantGame.vue') // 巨人赛跑游戏
const PointingGame = () => import('../views/PointingGame.vue') // 点兵点将游戏
const AdminPanel = () => import('../views/AdminPanel.vue')

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/', 
    name: 'GameLobby',
    component: GameLobby,
    meta: { requiresAuth: true }
  },
  // 巨人赛跑游戏页面路由
  {
    path: '/game/giant',
    name: 'GiantRunner',
    component: GiantGame,
    meta: { requiresAuth: true }
  },
  // 点兵点将游戏页面路由
  {
    path: '/game/pointing',
    name: 'PointingGame',
    component: PointingGame,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminPanel,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userRole = localStorage.getItem('userRole')
  console.log(`[路由] ${from.path} -> ${to.path}, token=${!!token}, role=${userRole}`)

  if (to.meta.requiresAuth && !token) return next('/login')
  if (to.path === '/login' && token) {
    // 已登录根据角色跳转（普通用户去大厅 '/'，管理员去后台 '/admin'）
    return next(userRole === 'admin' ? '/admin' : '/')
  }
  if (to.meta.requiresAdmin && userRole !== 'admin') return next('/')
  next()
})

export default router
