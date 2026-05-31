/**
 * 认证与用户资产组合函数 V4（全局单例版 + 晶石支持）
 * [V4] 修复晶石状态不更新问题，统一余额和晶石的动画与存储逻辑
 */
import { ref, computed } from 'vue'
import { request } from './request.js'

// ========== 全局单例状态 ==========
const currentUser = ref(null)
const token = ref(localStorage.getItem('token') || '')
const isLoggedIn = computed(() => !!token.value)
const isAdmin = computed(() => currentUser.value?.role === 'admin')

// 余额（全局唯一，存放大后的整数）
const balance = ref(0)
const displayBalance = ref(0)
const balanceAnimating = ref(false)

// ★ 晶石（全局唯一，存放大1000倍后的整数，与后端一致）
const crystal = ref(0)
const displayCrystal = ref(0)
const crystalAnimating = ref(false)

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
  if (diff === 0) { displayBalance.value = target; return }
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
      balanceTimer = null
      balanceAnimating.value = false
    }
  }, 30)
}

function stopBalanceAnimation() {
  if (balanceTimer) { clearInterval(balanceTimer); balanceTimer = null }
  balanceAnimating.value = false
}

function updateBalance(newBalance) {
  if (newBalance !== undefined && newBalance !== null) {
    balance.value = newBalance
    animateBalance(newBalance)
  }
}

// ========== ★ 晶石动画与更新 (与余额逻辑完全统一) ==========
let crystalTimer = null
function animateCrystal(target) {
  const start = displayCrystal.value
  const diff = target - start
  if (diff === 0) { displayCrystal.value = target; return }
  crystalAnimating.value = true
  const steps = 20
  const stepVal = diff / steps
  let step = 0
  if (crystalTimer) clearInterval(crystalTimer)
  crystalTimer = setInterval(() => {
    step++
    displayCrystal.value = Math.round(start + stepVal * step)
    if (step >= steps) {
      displayCrystal.value = target
      clearInterval(crystalTimer)
      crystalTimer = null
      crystalAnimating.value = false
    }
  }, 30)
}

function stopCrystalAnimation() {
  if (crystalTimer) { clearInterval(crystalTimer); crystalTimer = null }
  crystalAnimating.value = false
}

function updateCrystal(newCrystal) {
  if (newCrystal !== undefined && newCrystal !== null) {
    crystal.value = newCrystal
    animateCrystal(newCrystal)
  }
}

// ========== 数据拉取 ==========
async function fetchBalance() {
  try {
    const res = await authFetch('/api/balance')
    const data = await res.json()
    if (res.ok) {
      updateBalance(data.balance ?? data?.data?.balance)
    }
  } catch (e) {
    console.warn('[全局余额] /api/balance 获取失败', e.message)
  }
}

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

// ========== 本地缓存读写 ==========
function saveUserCache(user) {
  localStorage.setItem('userRole', user.role || 'user')
  localStorage.setItem('userPhone', user.phone || '')
  localStorage.setItem('userUid', user.uid || '')
  localStorage.setItem('userNickname', user.nickname || '')
  localStorage.setItem('userAvatar', String(user.avatar || 1))
}

// ========== 认证逻辑 ==========
async function login(phone, password) {
  const res = await request('/api/login', { method: 'POST', body: JSON.stringify({ phone, password }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '登录失败')

  token.value = data.token
  currentUser.value = data.user
  localStorage.setItem('token', data.token)
  saveUserCache(data.user)

  if (data.user?.balance !== undefined) {
    updateBalance(data.user.balance)
  } else {
    await fetchBalance()
  }
  
  // ★ 修复：登录时更新晶石
  if (data.user?.crystal !== undefined) {
    updateCrystal(data.user.crystal)
  }

  return data
}

async function register(phone, password) {
  const res = await request('/api/register', { method: 'POST', body: JSON.stringify({ phone, password }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '注册失败')

  token.value = data.token
  currentUser.value = data.user
  localStorage.setItem('token', data.token)
  saveUserCache(data.user)

  if (data.user?.balance !== undefined) {
    updateBalance(data.user.balance)
  } else {
    await fetchBalance()
  }
  
  // ★ 修复：注册时更新晶石
  if (data.user?.crystal !== undefined) {
    updateCrystal(data.user.crystal)
  }

  return data
}

function logout() {
  token.value = ''
  currentUser.value = null
  balance.value = 0
  displayBalance.value = 0
  stopBalanceAnimation()
  
  crystal.value = 0
  displayCrystal.value = 0
  stopCrystalAnimation()

  localStorage.removeItem('token')
  localStorage.removeItem('userRole')
  localStorage.removeItem('userPhone')
  localStorage.removeItem('userUid')
  localStorage.removeItem('userNickname')
  localStorage.removeItem('userAvatar')
}

function restoreUser() {
  const phone = localStorage.getItem('userPhone')
  const role = localStorage.getItem('userRole')
  const uid = localStorage.getItem('userUid')
  const nickname = localStorage.getItem('userNickname')
  const avatar = localStorage.getItem('userAvatar')
  if (token.value && phone) {
    currentUser.value = {
      phone,
      role: role || 'user',
      uid: uid || '',
      nickname: nickname || '',
      avatar: avatar ? Number(avatar) : 1
    }
  }
}

async function refreshUser() {
  if (!token.value) return
  try {
    const res = await authFetch('/api/me')
    const data = await res.json()
    if (res.ok && data.user) {
      currentUser.value = data.user
      saveUserCache(data.user)

      if (data.user.balance !== undefined) {
        updateBalance(data.user.balance)
      } else {
        await fetchBalance()
      }
      
      // ★ 修复：刷新用户信息时更新晶石
      if (data.user.crystal !== undefined) {
        updateCrystal(data.user.crystal)
      } else {
        updateCrystal(0) // 兼容老数据没有crystal字段
      }
    }
  } catch (e) {
    console.error('[认证] 刷新用户信息失败', e)
  }
}

// ========== ★ 新增：修改昵称 ==========
async function updateNickname(nickname) {
  const res = await authFetch('/api/profile/nickname', { method: 'PUT', body: JSON.stringify({ nickname }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '修改失败')
  if (currentUser.value) {
    currentUser.value.nickname = data.nickname
    currentUser.value.nameChangedAt = data.nameChangedAt
    localStorage.setItem('userNickname', data.nickname)
  }
  return data
}

// ========== ★ 新增：修改头像 ==========
async function updateAvatar(avatar) {
  const res = await authFetch('/api/profile/avatar', { method: 'PUT', body: JSON.stringify({ avatar }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '修改失败')
  if (currentUser.value) {
    currentUser.value.avatar = data.avatar
    localStorage.setItem('userAvatar', String(data.avatar))
  }
  return data
}

// ========== ★ 新增：昵称冷却期计算 ==========
function getNicknameCooldownDays() {
  if (!currentUser.value?.nameChangedAt) return 0
  const lastChange = new Date(currentUser.value.nameChangedAt)
  const daysSince = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, 30 - daysSince)
}

// 初始化恢复
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
    // 余额相关
    balance,
    displayBalance,
    balanceAnimating,
    fetchBalance,
    updateBalance,
    stopBalanceAnimation,
    // ★ 晶石相关
    crystal,
    displayCrystal,
    crystalAnimating,
    updateCrystal,
    stopCrystalAnimation,
    // 历史 & 明细
    history,
    transactions,
    fetchHistory,
    fetchTransactions,
    // ★ 新增
    updateNickname,
    updateAvatar,
    getNicknameCooldownDays
  }
}
