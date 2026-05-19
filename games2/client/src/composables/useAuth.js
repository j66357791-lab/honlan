/**
 * 认证与用户资产组合函数（全局单例版）
 * - 所有页面共享同一份 balance / displayBalance
 * - /api/me 有 balance 就用它，没有再调 /api/balance
 */
import { ref, computed } from 'vue'
import { request } from './request.js'

// ========== 全局单例状态 ==========
const currentUser = ref(null)
const token = ref(localStorage.getItem('token') || '')
const isLoggedIn = computed(() => !!token.value)
const isAdmin = computed(() => currentUser.value?.role === 'admin')

// 余额（全局唯一）
const balance = ref(0)
const displayBalance = ref(0)
const balanceAnimating = ref(false)

// 历史 & 明细
const history = ref([])
const transactions = ref([])

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token.value}`
  }
}

async function authFetch(url, options = {}) {
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) }
  console.log(`[API] ${options.method || 'GET'} ${url}`)
  try {
    const res = await request(url, { ...options, headers })
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

// ========== 余额动画与更新 ==========
let balanceTimer = null

function animateBalance(target) {
  const start = displayBalance.value
  const diff = target - start
  if (diff === 0) {
    displayBalance.value = target
    return
  }

  balanceAnimating.value = true
  const steps = 20
  const stepVal = diff / steps
  let step = 0

  if (balanceTimer) clearInterval(balanceTimer)

  balanceTimer = setInterval(() => {
    step++
    displayBalance.value = Math.round(start + stepVal * step)
    if (step >= steps) {
      displayBalance.value = target
      clearInterval(balanceTimer)
      balanceAnimating.value = false
    }
  }, 30)
}

// 核心更新余额方法，供页面实时操作余额使用
function updateBalance(newBalance) {
  if (newBalance !== undefined && newBalance !== null) {
    balance.value = newBalance
    animateBalance(newBalance)
    console.log('[全局余额] 更新为:', newBalance)
  }
}

// 获取余额（/api/balance）
async function fetchBalance() {
  try {
    const res = await authFetch('/api/balance')
    const data = await res.json()
    if (res.ok) {
      // 根据你们后端实际返回结构调整这里：
      // 如果是 { balance: 874084 } 就用 data.balance
      // 如果是 { code: 200, data: { balance: 874084 } } 就用 data.data.balance
      updateBalance(data.balance ?? data?.data?.balance)
    }
  } catch (e) {
    console.warn('[全局余额] /api/balance 获取失败', e.message)
  }
}

// 获取历史记录
async function fetchHistory() {
  try {
    const res = await authFetch('/api/history?limit=50')
    const data = await res.json()
    if (res.ok) {
      history.value = data.list ?? data?.data?.list ?? []
    }
  } catch (e) {
    console.error('[全局历史] 获取失败', e)
  }
}

// 获取积分明细
async function fetchTransactions() {
  try {
    const res = await authFetch('/api/transactions?limit=50')
    const data = await res.json()
    if (res.ok) {
      transactions.value = data.list ?? data?.data?.list ?? []
    }
  } catch (e) {
    console.error('[全局明细] 获取失败', e)
  }
}

// ========== 认证逻辑 ==========
async function login(phone, password) {
  console.log(`[认证] 登录请求: phone=${phone}`)
  const res = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password })
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || '登录失败')
  }

  token.value = data.token
  currentUser.value = data.user
  localStorage.setItem('token', data.token)
  localStorage.setItem('userRole', data.user.role)
  localStorage.setItem('userPhone', data.user.phone)

  // 登录成功后，优先从 user 里拿余额
  if (data.user?.balance !== undefined) {
    updateBalance(data.user.balance)
  } else {
    await fetchBalance()
  }

  return data
}

async function register(phone, password) {
  console.log(`[认证] 注册请求: phone=${phone}`)
  const res = await request('/api/register', {
    method: 'POST',
    body: JSON.stringify({ phone, password })
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || '注册失败')
  }

  token.value = data.token
  currentUser.value = data.user
  localStorage.setItem('token', data.token)
  localStorage.setItem('userRole', data.user.role)
  localStorage.setItem('userPhone', data.user.phone)

  if (data.user?.balance !== undefined) {
    updateBalance(data.user.balance)
  } else {
    await fetchBalance()
  }

  return data
}

function logout() {
  console.log('[认证] 登出')
  token.value = ''
  currentUser.value = null
  balance.value = 0
  displayBalance.value = 0
  localStorage.removeItem('token')
  localStorage.removeItem('userRole')
  localStorage.removeItem('userPhone')
}

function restoreUser() {
  const phone = localStorage.getItem('userPhone')
  const role = localStorage.getItem('userRole')
  if (token.value && phone) {
    currentUser.value = { phone, role: role || 'user' }
  }
}

async function refreshUser() {
  if (!token.value) return
  try {
    const res = await authFetch('/api/me')
    const data = await res.json()
    if (res.ok && data.user) {
      currentUser.value = data.user
      localStorage.setItem('userRole', data.user.role)

      // 关键：/api/me 里有 balance 就用它
      if (data.user.balance !== undefined) {
        updateBalance(data.user.balance)
      } else {
        await fetchBalance()
      }
    }
  } catch (e) {
    console.error('[认证] 刷新用户信息失败', e)
  }
}

restoreUser()

export function useAuth() {
  return {
    currentUser,
    token,
    isLoggedIn,
    isAdmin,
    getAuthHeaders,
    authFetch,
    login,
    register,
    logout,
    refreshUser,

    // 余额相关（全局唯一）
    balance,
    displayBalance,
    balanceAnimating,
    fetchBalance,
    updateBalance, // 暴露给页面实时修改余额用

    // 历史 & 明细
    history,
    transactions,
    fetchHistory,
    fetchTransactions
  }
}
