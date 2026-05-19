<template>
  <div class="admin-panel">
    <!-- 顶部栏 -->
    <header class="top-bar">
      <div class="title-area">
        <h1 class="page-title">管理后台</h1>
      </div>
      <div class="user-area">
        <span class="username">{{ currentUser?.phone }}</span>
        <button class="back-btn" @click="$router.push('/')">返回大厅</button>
        <button class="logout-btn" @click="handleLogout">退出</button>
      </div>
    </header>

    <!-- 功能卡片区 -->
    <div class="card-grid">
      <!-- 用户管理 -->
      <div class="admin-card">
        <div class="card-icon">👥</div>
        <h3>用户管理</h3>
        <p>查看用户列表、余额调整、封禁管理、风控设置</p>
        <div class="card-actions">
          <button @click="showUserManager = true">进入管理</button>
        </div>
      </div>

      <!-- 奖池管理 -->
      <div class="admin-card">
        <div class="card-icon">🎰</div>
        <h3>奖池管理</h3>
        <p>查看系统盈亏、手动调整奖池</p>
        <div class="card-actions">
          <button @click="showPoolManager = true">进入管理</button>
        </div>
      </div>

      <!-- 客服管理 -->
      <div class="admin-card highlight-card">
        <div class="card-icon">💬</div>
        <h3>客服管理</h3>
        <p>查看用户会话、接入客服聊天、实时回复</p>
        <div class="card-actions">
          <button class="chat-btn" @click="$router.push('/admin/chat')">进入客服</button>
          <span v-if="chatUnread > 0" class="chat-badge">{{ chatUnread }} 条未读</span>
        </div>
      </div>

      <!-- 数据统计 -->
      <div class="admin-card">
        <div class="card-icon">📊</div>
        <h3>数据统计</h3>
        <p>游戏对局统计、盈亏趋势</p>
        <div class="card-actions">
          <button @click="showStats = true">查看统计</button>
        </div>
      </div>
    </div>

    <!-- ========== 用户管理弹窗 ========== -->
    <div v-if="showUserManager" class="modal-overlay" @click.self="showUserManager = false">
      <div class="modal-content large-modal">
        <div class="modal-header">
          <h2>用户管理</h2>
          <button class="close-btn" @click="showUserManager = false">✕</button>
        </div>
        <div class="modal-body">
          <!-- 搜索栏 -->
          <div class="search-bar">
            <input v-model="searchPhone" placeholder="搜索手机号..." @input="filterUsers" />
            <button @click="filterUsers">搜索</button>
          </div>

          <!-- 用户列表 -->
          <div class="user-list">
            <div v-for="user in filteredUsers" :key="user._id" class="user-row">
              <div class="user-info">
                <span class="user-phone">{{ user.phone }}</span>
                <span class="user-balance">余额: {{ user.balance?.toLocaleString() }}</span>
                <span class="user-profit" :class="{ positive: user.todayProfit > 0, negative: user.todayProfit < 0 }">
                  今日: {{ user.todayProfit >= 0 ? '+' : '' }}{{ user.todayProfit }}
                </span>
                <span class="user-risk" v-if="user.isHighRisk">⚫ 高危</span>
                <span class="user-white" v-if="user.isWhitelisted">⚪ 白名单</span>
                <span class="user-banned" v-if="user.banned">🚫 封禁</span>
              </div>
              <div class="user-actions">
                <button class="sm-btn adjust-btn" @click="openAdjustBalance(user)">调整余额</button>
                <button class="sm-btn risk-btn" @click="toggleRisk(user)">{{ user.isHighRisk ? '取消高危' : '标记高危' }}</button>
                <button class="sm-btn white-btn" @click="toggleWhitelist(user)">{{ user.isWhitelisted ? '取消白名单' : '加白名单' }}</button>
                <button class="sm-btn" :class="user.banned ? 'unban-btn' : 'ban-btn'" @click="toggleBan(user)">{{ user.banned ? '解封' : '封禁' }}</button>
              </div>
            </div>
            <div v-if="filteredUsers.length === 0" class="empty-tip">暂无用户数据</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 余额调整弹窗 ========== -->
    <div v-if="showAdjustBalance" class="modal-overlay" @click.self="showAdjustBalance = false">
      <div class="modal-content small-modal">
        <div class="modal-header">
          <h2>调整余额 - {{ adjustTarget?.phone }}</h2>
          <button class="close-btn" @click="showAdjustBalance = false">✕</button>
        </div>
        <div class="modal-body">
          <p>当前余额: <strong>{{ adjustTarget?.balance?.toLocaleString() }}</strong></p>
          <div class="adjust-form">
            <select v-model="adjustType">
              <option value="add">增加</option>
              <option value="sub">扣除</option>
            </select>
            <input v-model.number="adjustAmount" type="number" placeholder="金额" min="1" />
            <input v-model="adjustRemark" placeholder="备注（可选）" />
          </div>
          <div class="form-actions">
            <button class="cancel-btn" @click="showAdjustBalance = false">取消</button>
            <button class="confirm-btn" @click="submitAdjustBalance">确认调整</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 奖池管理弹窗 ========== -->
    <div v-if="showPoolManager" class="modal-overlay" @click.self="showPoolManager = false">
      <div class="modal-content small-modal">
        <div class="modal-header">
          <h2>奖池管理</h2>
          <button class="close-btn" @click="showPoolManager = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="pool-stat">
            <span class="pool-label">系统当前净收益</span>
            <span class="pool-value" :class="{ positive: systemProfit > 0, negative: systemProfit < 0 }">
              {{ systemProfit >= 0 ? '+' : '' }}{{ systemProfit?.toLocaleString() }}
            </span>
          </div>
          <div class="adjust-form">
            <select v-model="poolAdjustType">
              <option value="add">增加收益</option>
              <option value="sub">扣除收益</option>
            </select>
            <input v-model.number="poolAdjustAmount" type="number" placeholder="金额" min="1" />
            <input v-model="poolAdjustRemark" placeholder="备注（可选）" />
          </div>
          <div class="form-actions">
            <button class="cancel-btn" @click="showPoolManager = false">取消</button>
            <button class="confirm-btn" @click="submitPoolAdjust">确认调整</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 统计弹窗 ========== -->
    <div v-if="showStats" class="modal-overlay" @click.self="showStats = false">
      <div class="modal-content large-modal">
        <div class="modal-header">
          <h2>数据统计</h2>
          <button class="close-btn" @click="showStats = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">系统净收益</div>
              <div class="stat-value" :class="{ positive: systemProfit > 0, negative: systemProfit < 0 }">
                {{ systemProfit?.toLocaleString() }}
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">用户总数</div>
              <div class="stat-value">{{ users.length }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">高危用户</div>
              <div class="stat-value">{{ users.filter(u => u.isHighRisk).length }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">白名单用户</div>
              <div class="stat-value">{{ users.filter(u => u.isWhitelisted).length }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">封禁用户</div>
              <div class="stat-value">{{ users.filter(u => u.banned).length }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast-item" :class="t.type">
          {{ t.message }}
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useChat } from '../composables/useChat.js'

const router = useRouter()
const { currentUser, isAdmin, logout, authFetch, refreshUser } = useAuth()
const { unreadCount: chatUnread, connect: connectChat } = useChat()

// ========== 弹窗状态 ==========
const showUserManager = ref(false)
const showPoolManager = ref(false)
const showStats = ref(false)
const showAdjustBalance = ref(false)

// ========== 用户管理 ==========
const users = ref([])
const searchPhone = ref('')
const filteredUsers = computed(() => {
  if (!searchPhone.value) return users.value
  return users.value.filter(u => u.phone.includes(searchPhone.value))
})

async function fetchUsers() {
  try {
    const res = await authFetch('/api/admin/users')
    const data = await res.json()
    if (res.ok) {
      users.value = data.users || data || []
    }
  } catch (e) {
    console.error('[管理] 获取用户列表失败', e)
  }
}

function filterUsers() {
  // computed 自动过滤
}

const adjustTarget = ref(null)
const adjustType = ref('add')
const adjustAmount = ref(0)
const adjustRemark = ref('')

function openAdjustBalance(user) {
  adjustTarget.value = user
  adjustType.value = 'add'
  adjustAmount.value = 0
  adjustRemark.value = ''
  showAdjustBalance.value = true
}

async function submitAdjustBalance() {
  if (!adjustAmount.value || adjustAmount.value <= 0) {
    toast('请输入有效金额', 'error')
    return
  }
  try {
    const res = await authFetch('/api/admin/adjust-balance', {
      method: 'POST',
      body: JSON.stringify({
        userId: adjustTarget.value._id,
        type: adjustType.value,
        amount: adjustAmount.value,
        remark: adjustRemark.value
      })
    })
    const data = await res.json()
    if (res.ok) {
      toast('余额调整成功', 'success')
      showAdjustBalance.value = false
      fetchUsers()
    } else {
      toast(data.error || '调整失败', 'error')
    }
  } catch (e) {
    toast('网络错误', 'error')
  }
}

async function toggleRisk(user) {
  try {
    const res = await authFetch('/api/admin/toggle-risk', {
      method: 'POST',
      body: JSON.stringify({ userId: user._id, isHighRisk: !user.isHighRisk })
    })
    const data = await res.json()
    if (res.ok) {
      toast(user.isHighRisk ? '已取消高危' : '已标记高危', 'success')
      fetchUsers()
    } else {
      toast(data.error || '操作失败', 'error')
    }
  } catch (e) {
    toast('网络错误', 'error')
  }
}

async function toggleWhitelist(user) {
  try {
    const res = await authFetch('/api/admin/toggle-whitelist', {
      method: 'POST',
      body: JSON.stringify({ userId: user._id, isWhitelisted: !user.isWhitelisted })
    })
    const data = await res.json()
    if (res.ok) {
      toast(user.isWhitelisted ? '已取消白名单' : '已加入白名单', 'success')
      fetchUsers()
    } else {
      toast(data.error || '操作失败', 'error')
    }
  } catch (e) {
    toast('网络错误', 'error')
  }
}

async function toggleBan(user) {
  try {
    const res = await authFetch('/api/admin/toggle-ban', {
      method: 'POST',
      body: JSON.stringify({ userId: user._id, banned: !user.banned })
    })
    const data = await res.json()
    if (res.ok) {
      toast(user.banned ? '已解封' : '已封禁', 'success')
      fetchUsers()
    } else {
      toast(data.error || '操作失败', 'error')
    }
  } catch (e) {
    toast('网络错误', 'error')
  }
}

// ========== 奖池管理 ==========
const systemProfit = ref(0)
const poolAdjustType = ref('add')
const poolAdjustAmount = ref(0)
const poolAdjustRemark = ref('')

async function fetchSystemProfit() {
  try {
    const res = await authFetch('/api/admin/system-profit')
    const data = await res.json()
    if (res.ok) {
      systemProfit.value = data.profit ?? data?.data?.profit ?? 0
    }
  } catch (e) {
    console.error('[管理] 获取系统收益失败', e)
  }
}

async function submitPoolAdjust() {
  if (!poolAdjustAmount.value || poolAdjustAmount.value <= 0) {
    toast('请输入有效金额', 'error')
    return
  }
  try {
    const res = await authFetch('/api/admin/adjust-pool', {
      method: 'POST',
      body: JSON.stringify({
        type: poolAdjustType.value,
        amount: poolAdjustAmount.value,
        remark: poolAdjustRemark.value
      })
    })
    const data = await res.json()
    if (res.ok) {
      toast('奖池调整成功', 'success')
      fetchSystemProfit()
      poolAdjustAmount.value = 0
      poolAdjustRemark.value = ''
    } else {
      toast(data.error || '调整失败', 'error')
    }
  } catch (e) {
    toast('网络错误', 'error')
  }
}

// ========== 退出 ==========
function handleLogout() {
  logout()
  router.push('/login')
}

// ========== Toast ==========
const toasts = ref([])
let toastId = 0
function toast(message, type = 'info', duration = 2500) {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

// ========== 初始化 ==========
onMounted(() => {
  console.log('[管理后台] 初始化')
  fetchUsers()
  fetchSystemProfit()
  connectChat()  // 连接客服 WebSocket，获取未读数
})
</script>

<style scoped>
.admin-panel {
  min-height: 100vh;
  background: #0d1117;
  color: #e0e0e0;
  padding-bottom: 40px;
}

/* 顶部栏 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  z-index: 10;
}
.title-area { display: flex; align-items: center; gap: 8px; }
.page-title { font-size: 20px; font-weight: 800; color: #f0c040; margin: 0; }
.user-area { display: flex; align-items: center; gap: 10px; }
.username { font-size: 13px; color: #888; }
.back-btn, .logout-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.back-btn { background: rgba(255,255,255,0.08); color: #ccc; }
.back-btn:hover { background: rgba(255,255,255,0.15); }
.logout-btn { background: #e74c3c; color: #fff; }
.logout-btn:hover { background: #c0392b; }

/* 卡片网格 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}
.admin-card {
  background: #161b22;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 24px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.admin-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
.highlight-card {
  border-color: rgba(231, 76, 60, 0.3);
  background: linear-gradient(135deg, #161b22 0%, #1e1520 100%);
}
.card-icon { font-size: 36px; margin-bottom: 12px; }
.admin-card h3 { font-size: 18px; margin: 0 0 8px; color: #f0f0f0; }
.admin-card p { font-size: 13px; color: #888; margin: 0 0 16px; line-height: 1.5; }
.card-actions { display: flex; align-items: center; gap: 10px; }
.card-actions button {
  padding: 8px 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  background: rgba(255,255,255,0.08);
  color: #ccc;
  transition: background 0.2s;
}
.card-actions button:hover { background: rgba(255,255,255,0.15); }
.chat-btn { background: #e74c3c !important; color: #fff !important; }
.chat-btn:hover { background: #c0392b !important; }
.chat-badge {
  font-size: 12px;
  color: #e74c3c;
  font-weight: 600;
  background: rgba(231, 76, 60, 0.15);
  padding: 2px 8px;
  border-radius: 8px;
}

/* 弹窗通用 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal-content {
  background: #161b22;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.08);
  overflow: hidden;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
.large-modal { max-width: 800px; }
.small-modal { max-width: 480px; }
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.modal-header h2 { font-size: 16px; margin: 0; color: #f0f0f0; }
.close-btn {
  width: 32px; height: 32px; border-radius: 50%;
  border: none; background: rgba(255,255,255,0.08);
  color: #888; font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.close-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }

/* 搜索栏 */
.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.search-bar input {
  flex: 1;
  background: #0d1117;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 8px 12px;
  color: #eee;
  font-size: 14px;
  outline: none;
}
.search-bar input:focus { border-color: #f0c040; }
.search-bar button {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: #f0c040;
  color: #000;
  font-weight: 600;
  cursor: pointer;
}

/* 用户列表 */
.user-list { display: flex; flex-direction: column; gap: 8px; }
.user-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
  gap: 12px;
  flex-wrap: wrap;
}
.user-info { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.user-phone { font-weight: 600; font-size: 14px; }
.user-balance { font-size: 13px; color: #f0c040; }
.user-profit { font-size: 12px; }
.user-profit.positive { color: #27ae60; }
.user-profit.negative { color: #e74c3c; }
.user-risk { font-size: 11px; color: #e74c3c; background: rgba(231,76,60,0.15); padding: 2px 6px; border-radius: 4px; }
.user-white { font-size: 11px; color: #3498db; background: rgba(52,152,219,0.15); padding: 2px 6px; border-radius: 4px; }
.user-banned { font-size: 11px; color: #e74c3c; }
.user-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.sm-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: none;
  font-size: 11px;
  cursor: pointer;
  font-weight: 600;
  background: rgba(255,255,255,0.08);
  color: #ccc;
  transition: background 0.15s;
}
.sm-btn:hover { background: rgba(255,255,255,0.15); }
.adjust-btn { color: #f0c040; }
.risk-btn { color: #e74c3c; }
.white-btn { color: #3498db; }
.ban-btn { color: #e74c3c; background: rgba(231,76,60,0.15); }
.unban-btn { color: #27ae60; background: rgba(39,174,96,0.15); }

/* 余额调整表单 */
.adjust-form {
  display: flex;
  gap: 8px;
  margin: 16px 0;
  flex-wrap: wrap;
}
.adjust-form select,
.adjust-form input {
  background: #0d1117;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 8px 12px;
  color: #eee;
  font-size: 14px;
  outline: none;
}
.adjust-form select { min-width: 80px; }
.adjust-form input[type="number"] { width: 120px; }
.adjust-form input:not([type="number"]) { flex: 1; min-width: 120px; }

/* 表单按钮 */
.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.cancel-btn {
  padding: 8px 20px; border-radius: 8px; border: none;
  background: rgba(255,255,255,0.08); color: #ccc; cursor: pointer; font-weight: 600;
}
.confirm-btn {
  padding: 8px 20px; border-radius: 8px; border: none;
  background: #f0c040; color: #000; cursor: pointer; font-weight: 600;
}
.confirm-btn:hover { background: #d4a830; }

/* 奖池统计 */
.pool-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
  margin-bottom: 16px;
}
.pool-label { font-size: 14px; color: #888; }
.pool-value { font-size: 24px; font-weight: 800; }
.pool-value.positive { color: #27ae60; }
.pool-value.negative { color: #e74c3c; }

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}
.stat-card {
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
}
.stat-label { font-size: 12px; color: #888; margin-bottom: 8px; }
.stat-value { font-size: 24px; font-weight: 800; color: #f0f0f0; }
.stat-value.positive { color: #27ae60; }
.stat-value.negative { color: #e74c3c; }

/* 空状态 */
.empty-tip { text-align: center; color: #555; padding: 30px; }

/* Toast */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.toast-item {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  animation: slideIn 0.3s ease;
}
.toast-item.success { background: #27ae60; color: #fff; }
.toast-item.error { background: #e74c3c; color: #fff; }
.toast-item.info { background: #3498db; color: #fff; }

.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(30px); }
.toast-leave-to { opacity: 0; transform: translateX(30px); }

@keyframes slideIn {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
