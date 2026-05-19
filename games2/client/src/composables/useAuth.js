/**
 * 巨人赛跑 - 认证组合函数
 * 管理用户登录状态、Token、API请求
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const currentUser = ref(null)
const token = ref(localStorage.getItem('token') || '')
const isLoggedIn = computed(() => !!token.value)
const isAdmin = computed(() => currentUser.value?.role === 'admin')

function getAuthHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token.value}` }
}

async function authFetch(url, options = {}) {
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) }
  console.log(`[API] ${options.method || 'GET'} ${url}`)
  try {
    const res = await fetch(url, { ...options, headers })
    if (res.status === 401) {
      console.log('[API] Token过期，自动登出')
      logout()
      throw new Error('登录已过期，请重新登录')
    }
    return res
  } catch (err) {
    console.error(`[API] 请求失败: ${url}`, err)
    throw err
  }
}

async function login(phone, password) {
  console.log(`[认证] 登录请求: phone=${phone}`)
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password })
  })
  const data = await res.json()
  if (!res.ok) {
    console.error(`[认证] 登录失败: ${data.error}`)
    throw new Error(data.error || '登录失败')
  }
  token.value = data.token
  currentUser.value = data.user
  localStorage.setItem('token', data.token)
  localStorage.setItem('userRole', data.user.role)
  localStorage.setItem('userPhone', data.user.phone)
  console.log(`[认证] 登录成功: ${data.user.phone}, role=${data.user.role}`)
  return data
}

async function register(phone, password) {
  console.log(`[认证] 注册请求: phone=${phone}`)
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password })
  })
  const data = await res.json()
  if (!res.ok) {
    console.error(`[认证] 注册失败: ${data.error}`)
    throw new Error(data.error || '注册失败')
  }
  token.value = data.token
  currentUser.value = data.user
  localStorage.setItem('token', data.token)
  localStorage.setItem('userRole', data.user.role)
  localStorage.setItem('userPhone', data.user.phone)
  console.log(`[认证] 注册成功: ${data.user.phone}`)
  return data
}

function logout() {
  console.log('[认证] 登出')
  token.value = ''
  currentUser.value = null
  localStorage.removeItem('token')
  localStorage.removeItem('userRole')
  localStorage.removeItem('userPhone')
}

function restoreUser() {
  const phone = localStorage.getItem('userPhone')
  const role = localStorage.getItem('userRole')
  if (token.value && phone) {
    currentUser.value = { phone, role: role || 'user' }
    console.log(`[认证] 恢复用户: ${phone}, role=${role}`)
  }
}

async function refreshUser() {
  if (!token.value) return
  try {
    const res = await authFetch('/api/me')
    const data = await res.json()
    if (res.ok) {
      currentUser.value = data.user
      localStorage.setItem('userRole', data.user.role)
    }
  } catch (e) {
    console.error('[认证] 刷新用户信息失败', e)
  }
}

restoreUser()

export function useAuth() {
  return { currentUser, token, isLoggedIn, isAdmin, getAuthHeaders, authFetch, login, register, logout, refreshUser }
}
