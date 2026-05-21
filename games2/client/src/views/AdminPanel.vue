<template>
  <div class="admin-panel">
    <!-- 顶部栏 -->
    <header class="top-bar">
      <div class="title-area">
        <h1 class="page-title">运营管理后台</h1>
      </div>
      <div class="user-area">
        <span class="username">{{ currentUser?.phone }}</span>
        <button class="back-btn" @click="$router.push('/')">返回大厅</button>
        <button class="logout-btn" @click="handleLogout">退出</button>
      </div>
    </header>

    <!-- 功能卡片区 -->
    <div class="card-grid">
      <!-- 数据大盘 -->
      <div class="admin-card">
        <div class="card-icon">📊</div>
        <h3>数据大盘</h3>
        <p>系统盈亏、玩家总余额、充提差统计</p>
        <div class="card-actions">
          <button @click="showDashboard = true">查看大盘</button>
        </div>
      </div>

      <!-- 用户管理 -->
      <div class="admin-card">
        <div class="card-icon">👥</div>
        <h3>用户管理</h3>
        <p>余额调整、封禁、风控标签、资料修改</p>
        <div class="card-actions">
          <button @click="openUserManager">进入管理</button>
        </div>
      </div>

      <!-- 流水查询 -->
      <div class="admin-card">
        <div class="card-icon">📜</div>
        <h3>流水查询</h3>
        <p>巨人赛跑与点兵点将对局记录追踪</p>
        <div class="card-actions">
          <button @click="openBetHistory">查看流水</button>
        </div>
      </div>

      <!-- 奖池微调 -->
      <div class="admin-card">
        <div class="card-icon">🎰</div>
        <h3>奖池微调</h3>
        <p>查看系统净收益、手动调整奖池数值</p>
        <div class="card-actions">
          <button @click="showPoolManager = true">进入管理</button>
        </div>
      </div>

      <!-- 系统维护 (危险区) -->
      <div class="admin-card danger-card">
        <div class="card-icon">☢️</div>
        <h3>系统维护</h3>
        <p>数据库容量监控、一键清理对局与重置</p>
        <div class="card-actions">
          <button class="danger-btn" @click="openMaintenance">进入维护</button>
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
    </div>

    <!-- ========== 数据大盘弹窗 ========== -->
    <div v-if="showDashboard" class="modal-overlay" @click.self="showDashboard = false">
      <div class="modal-content large-modal">
        <div class="modal-header">
          <h2>📊 数据大盘</h2>
          <button class="close-btn" @click="showDashboard = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">系统净收益</div>
              <div class="stat-value" :class="{ positive: systemProfit > 0, negative: systemProfit < 0 }">
                {{ systemProfit >= 0 ? '+' : '' }}{{ systemProfit?.toLocaleString() }}
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">玩家总余额</div>
              <div class="stat-value text-gold">{{ stats.totalPlayerBalance?.toLocaleString() }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">管理员加币</div>
              <div class="stat-value text-blue">{{ stats.totalAdminAdd?.toLocaleString() }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">管理员扣币</div>
              <div class="stat-value text-red">{{ stats.totalAdminSub?.toLocaleString() }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">总投注额</div>
              <div class="stat-value">{{ stats.totalSystemBet?.toLocaleString() }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">总派彩额</div>
              <div class="stat-value">{{ stats.totalSystemPayout?.toLocaleString() }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 用户管理弹窗 ========== -->
    <div v-if="showUserManager" class="modal-overlay" @click.self="showUserManager = false">
      <div class="modal-content large-modal">
        <div class="modal-header">
          <h2>👥 用户管理</h2>
          <button class="close-btn" @click="showUserManager = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="search-bar">
            <input v-model="searchPhone" placeholder="搜索手机号..." />
          </div>
          <div class="user-list">
            <div v-for="user in filteredUsers" :key="user._id" class="user-row">
              <div class="user-info">
                <span class="user-phone">{{ user.phone }}</span>
                <span class="user-nickname">({{ user.nickname || '未设置' }})</span>
                <span class="user-balance">💰{{ user.balance?.toLocaleString() }}</span>
                <span class="user-profit" :class="{ positive: user.todayProfit > 0, negative: user.todayProfit < 0 }">
                  今日: {{ user.todayProfit >= 0 ? '+' : '' }}{{ user.todayProfit }}
                </span>
                <span class="tag tag-risk" v-if="user.isHighRisk">高危</span>
                <span class="tag tag-white" v-if="user.isWhitelisted">白名单</span>
                <span class="tag tag-internal" v-if="user.isInternal">内部号</span>
                <span class="tag tag-banned" v-if="user.banned">封禁</span>
              </div>
              <div class="user-actions">
                <button class="sm-btn adjust-btn" @click="openAdjustBalance(user)">余额</button>
                <button class="sm-btn profile-btn" @click="openEditProfile(user)">资料</button>
                <button class="sm-btn internal-btn" @click="toggleInternal(user)">{{ user.isInternal ? '取消内部' : '内部' }}</button>
                <button class="sm-btn risk-btn" @click="toggleRisk(user)">{{ user.isHighRisk ? '取消高危' : '高危' }}</button>
                <button class="sm-btn white-btn" @click="toggleWhitelist(user)">{{ user.isWhitelisted ? '取消白名单' : '白名单' }}</button>
                <button class="sm-btn" :class="user.banned ? 'unban-btn' : 'ban-btn'" @click="toggleBan(user)">{{ user.banned ? '解封' : '封禁' }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 流水查询弹窗 ========== -->
    <div v-if="showBetHistory" class="modal-overlay" @click.self="showBetHistory = false">
      <div class="modal-content large-modal">
        <div class="modal-header">
          <h2>📜 下注流水</h2>
          <button class="close-btn" @click="showBetHistory = false">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="bets.length === 0" class="empty-tip">暂无流水数据</div>
          <div v-else class="bet-list">
            <div v-for="bet in bets" :key="bet._id" class="bet-row">
              <div class="bet-info">
                <span class="bet-game">{{ bet.gameType || 'game' }}</span>
                <span class="bet-user">👤{{ bet.userId?.phone || '未知' }}</span>
                <span class="bet-amount">下注: {{ bet.totalAmount || bet.amount }}</span>
                <span class="bet-payout" :class="{ positive: (bet.totalPayout || bet.payout) > 0 }">
                  派彩: {{ bet.totalPayout || bet.payout }}
                </span>
              </div>
              <div class="bet-time">{{ new Date(bet.createdAt).toLocaleString() }}</div>
            </div>
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
            <select v-model="adjustType"><option value="add">增加</option><option value="sub">扣除</option></select>
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

    <!-- ========== 修改资料弹窗 ========== -->
    <div v-if="showEditProfile" class="modal-overlay" @click.self="showEditProfile = false">
      <div class="modal-content small-modal">
        <div class="modal-header">
          <h2>修改资料 - {{ editProfileTarget?.phone }}</h2>
          <button class="close-btn" @click="showEditProfile = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="edit-profile-form">
            <label>昵称（2-12个字符）</label>
            <input v-model="editProfileForm.nickname" placeholder="2-12个字符" maxlength="12" />
            <label>头像</label>
            <div class="avatar-grid">
              <div v-for="n in 5" :key="n" class="avatar-option" :class="{ active: editProfileForm.avatar === n }" @click="editProfileForm.avatar = n">
                <img :src="AVATAR_MAP[n]" />
                <div v-if="editProfileForm.avatar === n" class="avatar-check">✓</div>
              </div>
            </div>
            <div class="form-actions" style="margin-top: 16px;">
              <button class="cancel-btn" @click="showEditProfile = false">取消</button>
              <button class="confirm-btn" @click="submitEditProfile" :disabled="submittingProfile">{{ submittingProfile ? '提交中...' : '确认修改' }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 奖池微调弹窗 ========== -->
    <div v-if="showPoolManager" class="modal-overlay" @click.self="showPoolManager = false">
      <div class="modal-content small-modal">
        <div class="modal-header">
          <h2>🎰 奖池微调</h2>
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
            <select v-model="poolAdjustType"><option value="add">增加收益</option><option value="sub">扣除收益</option></select>
            <input v-model.number="poolAdjustAmount" type="number" placeholder="金额" min="1" />
          </div>
          <div class="form-actions">
            <button class="cancel-btn" @click="showPoolManager = false">取消</button>
            <button class="confirm-btn" @click="submitPoolAdjust">确认调整</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 系统维护弹窗 (含数据库容量) ========== -->
    <div v-if="showMaintenance" class="modal-overlay" @click.self="showMaintenance = false">
      <div class="modal-content small-modal danger-modal">
        <div class="modal-header danger-header">
          <h2>☢️ 系统维护</h2>
          <button class="close-btn" @click="showMaintenance = false">✕</button>
        </div>
        <div class="modal-body">
          <!-- 🚀 新增：数据库容量监控 -->
          <div class="db-stats-card">
            <h4>🗄️ 数据库状态</h4>
            <div class="db-size-row">
              <span>数据大小: <strong>{{ dbStats.dbSizeMB }} MB</strong></span>
              <span>磁盘占用: <strong>{{ dbStats.storageSizeMB }} MB</strong></span>
              <span>索引大小: <strong>{{ dbStats.indexSizeMB }} MB</strong></span>
            </div>
            <div class="db-collections">
              <div v-for="col in dbStats.collections" :key="col.name" class="col-item">
                <span>{{ col.name }}</span>
                <span class="col-count">{{ col.count?.toLocaleString() }} 条</span>
              </div>
            </div>
          </div>

          <div class="maint-divider"></div>

          <div class="warn-text">⚠️ 以下操作不可撤销，请谨慎！</div>
          
          <div class="maint-item">
            <h4>🧹 清空对局与流水</h4>
            <p>清空巨人/点兵记录和流水。不影响余额和风控。</p>
            <button class="action-btn warn-btn" @click="resetBets">清空对局</button>
          </div>
          
          <div class="maint-item">
            <h4>🧼 清空盈亏与风控</h4>
            <p>余额归零、重置风控特征、奖池归零。对局保留。</p>
            <button class="action-btn error-btn" @click="resetProfits">清空盈亏</button>
          </div>
          
          <div class="maint-item">
            <h4>☢️ 恢复出厂设置</h4>
            <p>清空一切数据，数据库恢复到刚部署状态。</p>
            <button class="action-btn nuclear-btn" @click="resetData">全部重置</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast-item" :class="t.type">{{ t.message }}</div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useChat } from '../composables/useChat.js'
import { AVATAR_MAP, DEFAULT_AVATAR } from '../config.js'

const router = useRouter()
const { currentUser, logout, authFetch } = useAuth()
const { unreadCount: chatUnread, connect: connectChat } = useChat()

// ========== 弹窗状态 ==========
const showDashboard = ref(false)
const showUserManager = ref(false)
const showBetHistory = ref(false)
const showPoolManager = ref(false)
const showMaintenance = ref(false)
const showAdjustBalance = ref(false)
const showEditProfile = ref(false)

// ========== 数据大盘 ==========
const stats = ref({})
const systemProfit = ref(0)

async function fetchStats() {
  try {
    const res = await authFetch('/api/admin/stats')
    const data = await res.json()
    if (res.ok) stats.value = data
  } catch (e) { console.error(e) }
}

async function fetchSystemProfit() {
  try {
    const res = await authFetch('/api/admin/pool')
    const data = await res.json()
    if (res.ok) systemProfit.value = data.currentProfit ?? 0
  } catch (e) { console.error(e) }
}

// ========== 数据库容量 ==========
const dbStats = ref({ dbSizeMB: '0.00', storageSizeMB: '0.00', indexSizeMB: '0.00', collections: [] })

async function fetchDbStats() {
  try {
    const res = await authFetch('/api/admin/db-stats')
    const data = await res.json()
    if (res.ok) dbStats.value = data
  } catch (e) { console.error(e) }
}

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
    if (res.ok) users.value = data.users || []
  } catch (e) { console.error(e) }
}

function openUserManager() {
  fetchUsers()
  showUserManager.value = true
}

// 余额调整
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
  if (!adjustAmount.value || adjustAmount.value <= 0) return toast('输入有效金额', 'error')
  const res = await authFetch('/api/admin/adjust-balance', { method: 'POST', body: JSON.stringify({ userId: adjustTarget.value._id, type: adjustType.value, amount: adjustAmount.value, remark: adjustRemark.value }) })
  const data = await res.json()
  if (res.ok) { toast('调整成功', 'success'); showAdjustBalance.value = false; fetchUsers() } else toast(data.error, 'error')
}

// 资料修改
const editProfileTarget = ref(null)
const editProfileForm = ref({ nickname: '', avatar: 1 })
const submittingProfile = ref(false)

function openEditProfile(user) {
  editProfileTarget.value = user
  editProfileForm.value = { nickname: user.nickname || '', avatar: user.avatar || 1 }
  showEditProfile.value = true
}

async function submitEditProfile() {
  submittingProfile.value = true
  const res = await authFetch('/api/admin/user-profile', { method: 'PUT', body: JSON.stringify({ userId: editProfileTarget.value._id, ...editProfileForm.value }) })
  const data = await res.json()
  if (res.ok) { toast('修改成功', 'success'); showEditProfile.value = false; fetchUsers() } else toast(data.error, 'error')
  submittingProfile.value = false
}

// 风控与状态切换
async function toggleRisk(user) { const res = await authFetch('/api/admin/toggle-risk', { method: 'POST', body: JSON.stringify({ userId: user._id }) }); if(res.ok) { toast('操作成功', 'success'); fetchUsers() } }
async function toggleWhitelist(user) { const res = await authFetch('/api/admin/toggle-whitelist', { method: 'POST', body: JSON.stringify({ userId: user._id }) }); if(res.ok) { toast('操作成功', 'success'); fetchUsers() } }
async function toggleInternal(user) { const res = await authFetch('/api/admin/toggle-internal', { method: 'POST', body: JSON.stringify({ userId: user._id }) }); if(res.ok) { toast('操作成功', 'success'); fetchUsers() } }
async function toggleBan(user) { const url = user.banned ? '/api/admin/unban' : '/api/admin/ban'; const res = await authFetch(url, { method: 'POST', body: JSON.stringify({ userId: user._id, reason: '管理员封禁' }) }); if(res.ok) { toast('操作成功', 'success'); fetchUsers() } }

// ========== 流水查询 ==========
const bets = ref([])

async function openBetHistory() {
  showBetHistory.value = true
  try {
    const res = await authFetch('/api/admin/bets?limit=50')
    const data = await res.json()
    if (res.ok) bets.value = data.bets || []
  } catch(e) { console.error(e) }
}

// ========== 奖池管理 ==========
const poolAdjustType = ref('add')
const poolAdjustAmount = ref(0)

async function submitPoolAdjust() {
  if (!poolAdjustAmount.value || poolAdjustAmount.value <= 0) return toast('输入有效金额', 'error')
  const res = await authFetch('/api/admin/pool/adjust', { method: 'POST', body: JSON.stringify({ type: poolAdjustType.value, amount: poolAdjustAmount.value }) })
  const data = await res.json()
  if (res.ok) { toast('调整成功', 'success'); fetchSystemProfit(); poolAdjustAmount.value = 0 } else toast(data.error, 'error')
}

// ========== 系统维护 ==========
function openMaintenance() {
  fetchDbStats() // 打开时刷新容量数据
  showMaintenance.value = true
}

async function resetBets() { if(!confirm('确定清空对局记录？')) return; const res = await authFetch('/api/admin/reset-bets', { method: 'POST' }); const d = await res.json(); if(res.ok) { toast(d.message, 'success'); fetchDbStats() } else toast(d.error, 'error') }
async function resetProfits() { if(!confirm('确定清空盈亏与风控？')) return; const res = await authFetch('/api/admin/reset-profits', { method: 'POST' }); const d = await res.json(); if(res.ok) { toast(d.message, 'success'); fetchDbStats(); fetchUsers() } else toast(d.error, 'error') }
async function resetData() { if(!confirm('☢️ 终极警告！确定恢复出厂？')) return; const res = await authFetch('/api/admin/reset-data', { method: 'POST' }); const d = await res.json(); if(res.ok) { toast(d.message, 'success'); fetchDbStats(); fetchUsers() } else toast(d.error, 'error') }

// ========== 通用 ==========
function handleLogout() { logout(); router.push('/login') }
const toasts = ref([])
let toastId = 0
function toast(message, type = 'info', duration = 2500) { const id = ++toastId; toasts.value.push({ id, message, type }); setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, duration) }

onMounted(() => { fetchStats(); fetchSystemProfit(); connectChat() })
</script>

<style scoped>
/* 基础布局 */
.admin-panel { min-height: 100vh; background: #0d1117; color: #e0e0e0; padding-bottom: 40px; }
.top-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,0.06); position: sticky; top: 0; z-index: 10; }
.title-area { display: flex; align-items: center; gap: 8px; }
.page-title { font-size: 20px; font-weight: 800; color: #f0c040; margin: 0; }
.user-area { display: flex; align-items: center; gap: 10px; }
.username { font-size: 13px; color: #888; }
.back-btn, .logout-btn { padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; }
.back-btn { background: rgba(255,255,255,0.08); color: #ccc; }
.logout-btn { background: #e74c3c; color: #fff; }

/* 卡片网格 */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; padding: 24px; max-width: 1200px; margin: 0 auto; }
.admin-card { background: #161b22; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; transition: transform 0.2s; }
.admin-card:hover { transform: translateY(-2px); }
.highlight-card { border-color: rgba(231, 76, 60, 0.3); }
.danger-card { border-color: rgba(231, 76, 60, 0.4); }
.card-icon { font-size: 36px; margin-bottom: 12px; }
.admin-card h3 { font-size: 18px; margin: 0 0 8px; }
.admin-card p { font-size: 13px; color: #888; margin: 0 0 16px; }
.card-actions { display: flex; align-items: center; gap: 10px; }
.card-actions button { padding: 8px 20px; border-radius: 10px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; background: rgba(255,255,255,0.08); color: #ccc; }
.chat-btn { background: #e74c3c !important; color: #fff !important; }
.danger-btn { background: rgba(231,76,60,0.2) !important; color: #e74c3c !important; border: 1px solid rgba(231,76,60,0.3) !important; }
.chat-badge { font-size: 12px; color: #e74c3c; background: rgba(231,76,60,0.15); padding: 2px 8px; border-radius: 8px; font-weight: 600; }

/* 弹窗通用 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-content { background: #161b22; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden; width: 100%; max-height: 85vh; display: flex; flex-direction: column; }
.large-modal { max-width: 800px; }
.small-modal { max-width: 480px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.modal-header h2 { font-size: 16px; margin: 0; }
.close-btn { width: 32px; height: 32px; border-radius: 50%; border: none; background: rgba(255,255,255,0.08); color: #888; font-size: 16px; cursor: pointer; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }

/* 统计卡片 */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.stat-card { background: rgba(255,255,255,0.03); border-radius: 10px; padding: 16px; text-align: center; }
.stat-label { font-size: 12px; color: #888; margin-bottom: 8px; }
.stat-value { font-size: 24px; font-weight: 800; }

/* 用户列表 */
.search-bar { margin-bottom: 16px; }
.search-bar input { width: 100%; background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; color: #eee; font-size: 14px; outline: none; }
.user-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.03); flex-wrap: wrap; gap: 8px; }
.user-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; }
.user-balance { color: #f0c040; }
.tag { font-size: 11px; padding: 2px 6px; border-radius: 4px; }
.tag-risk { color: #e74c3c; background: rgba(231,76,60,0.15); }
.tag-white { color: #3498db; background: rgba(52,152,219,0.15); }
.tag-internal { color: #f0c040; background: rgba(240,192,64,0.15); }
.tag-banned { color: #e74c3c; background: rgba(231,76,60,0.1); }
.user-actions { display: flex; gap: 4px; flex-wrap: wrap; }
.sm-btn { padding: 4px 8px; border-radius: 6px; border: none; font-size: 11px; cursor: pointer; font-weight: 600; background: rgba(255,255,255,0.06); color: #aaa; }

/* 表单与按钮 */
.adjust-form { display: flex; gap: 8px; margin: 16px 0; flex-wrap: wrap; }
.adjust-form select, .adjust-form input { background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; color: #eee; font-size: 14px; outline: none; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.cancel-btn { padding: 8px 20px; border-radius: 8px; border: none; background: rgba(255,255,255,0.08); color: #ccc; cursor: pointer; }
.confirm-btn { padding: 8px 20px; border-radius: 8px; border: none; background: #f0c040; color: #000; cursor: pointer; font-weight: 600; }
.edit-profile-form label { font-size: 12px; color: #8b949e; display: block; margin-top: 8px; }
.edit-profile-form input { width: 100%; background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px 10px; color: #eee; outline: none; margin-top: 4px; }
.avatar-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.avatar-option { position: relative; aspect-ratio: 1; border-radius: 50%; overflow: hidden; cursor: pointer; border: 3px solid transparent; }
.avatar-option img { width: 100%; height: 100%; object-fit: cover; }
.avatar-option.active { border-color: #f0c040; }
.avatar-check { position: absolute; bottom: 0; right: 0; width: 18px; height: 18px; background: #f0c040; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }

/* 奖池 */
.pool-stat { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 10px; margin-bottom: 16px; }
.pool-value { font-size: 24px; font-weight: 800; }

/* 🚀 数据库容量监控样式 */
.db-stats-card { background: rgba(52, 152, 219, 0.08); border: 1px solid rgba(52, 152, 219, 0.2); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
.db-stats-card h4 { margin: 0 0 12px; color: #3498db; font-size: 15px; }
.db-size-row { display: flex; gap: 16px; margin-bottom: 12px; font-size: 13px; color: #ccc; flex-wrap: wrap; }
.db-size-row strong { color: #f0c040; }
.db-collections { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.col-item { background: rgba(0,0,0,0.2); padding: 8px 10px; border-radius: 6px; display: flex; justify-content: space-between; font-size: 12px; color: #aaa; }
.col-count { color: #f0f0f0; font-weight: 600; }
.maint-divider { border-top: 1px dashed rgba(255,255,255,0.1); margin: 20px 0; }

/* 危险区 */
.danger-modal { border-color: rgba(231,76,60,0.4); }
.danger-header { background: rgba(231,76,60,0.1); }
.warn-text { background: rgba(243,156,18,0.1); color: #f39c12; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
.maint-item { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.maint-item:last-child { border-bottom: none; margin-bottom: 0; }
.maint-item h4 { margin: 0 0 6px; font-size: 15px; }
.maint-item p { margin: 0 0 12px; font-size: 12px; color: #888; }
.action-btn { padding: 8px 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 13px; }
.warn-btn { background: rgba(243,156,18,0.2); color: #f39c12; }
.error-btn { background: rgba(231,76,60,0.2); color: #e74c3c; }
.nuclear-btn { background: #e74c3c; color: #fff; box-shadow: 0 0 10px rgba(231,76,60,0.3); }

/* 颜色工具 */
.positive { color: #27ae60; }
.negative { color: #e74c3c; }
.text-gold { color: #f0c040; }
.text-blue { color: #3498db; }
.text-red { color: #e74c3c; }
.empty-tip { text-align: center; color: #555; padding: 30px; }

/* 流水查询 */
.bet-row { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 13px; }
.bet-info { display: flex; gap: 12px; color: #ccc; }
.bet-time { font-size: 12px; color: #666; margin-top: 4px; }

/* Toast */
.toast-container { position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; }
.toast-item { padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; color: #fff; }
.toast-item.success { background: #27ae60; }
.toast-item.error { background: #e74c3c; }
.toast-item.info { background: #3498db; }
.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(30px); }
</style>
