<template>
  <div class="admin-page" style="background-image: url('/assets/images/bg.01.png')">
    <header class="admin-header">
      <button class="back-btn" @click="$router.push('/')">← 返回</button>
      <h1 class="admin-title">管理后台</h1>
      <span class="admin-badge">ADMIN</span>
    </header>

    <div class="tab-bar">
      <div class="tab-item" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">用户管理</div>
      <div class="tab-item" :class="{ active: activeTab === 'bets' }" @click="activeTab = 'bets'">下注流水</div>
    </div>

    <!-- 用户管理 -->
    <div v-if="activeTab === 'users'" class="tab-content">
      <div class="section-header">
        <h2>用户列表</h2>
        <button class="btn btn-sm btn-outline" @click="fetchUsers">刷新</button>
      </div>
      <div v-if="loading" class="loading-text">加载中...</div>
      <div v-else class="user-list">
        <div v-for="user in users" :key="user._id" class="user-card">
          <div class="user-info">
            <span class="user-name">{{ user.phone }}</span>
            <span v-if="user.role === 'admin'" class="role-badge admin">管理员</span>
            <span v-else-if="user.banned" class="role-badge banned">已封禁</span>
            <span v-else-if="user.isHighRisk" class="role-badge high-risk">黑名单</span>
            <span v-else-if="user.isWhitelisted" class="role-badge whitelist">白名单</span>
            <span v-else class="role-badge user">正常</span>
          </div>
          
          <div class="user-balance">
            <span class="balance-num">{{ user.balance.toLocaleString() }}</span>
            <span class="balance-unit">积分</span>
          </div>

          <!-- 新增：风控数据展示 -->
          <div class="user-risk" v-if="user.role !== 'admin'">
            <span>今盈: <span :class="user.todayProfit >= 0 ? 'text-win' : 'text-lose'">{{ user.todayProfit || 0 }}</span></span>
            <span>总盈: <span :class="user.historyProfit >= 0 ? 'text-win' : 'text-lose'">{{ user.historyProfit || 0 }}</span></span>
            <span>风险: {{ user.riskIndex || 0 }}%</span>
          </div>

          <div v-if="user.role !== 'admin'" class="user-actions">
            <button v-if="!user.banned" class="btn btn-sm btn-danger" @click="banUser(user._id)">封禁</button>
            <button v-else class="btn btn-sm btn-success" @click="unbanUser(user._id)">解封</button>
            <button class="btn btn-sm btn-success" @click="openAdjust(user._id, 'add')">加积分</button>
            <button class="btn btn-sm btn-danger" @click="openAdjust(user._id, 'sub')">扣积分</button>
            
            <!-- 新增：风控黑白名单操作 -->
            <button class="btn btn-sm" :class="user.isHighRisk ? 'btn-success' : 'btn-danger'" @click="toggleRisk(user._id, user.isHighRisk)">
              {{ user.isHighRisk ? '取消黑名单' : '加黑名单' }}
            </button>
            <button class="btn btn-sm" :class="user.isWhitelisted ? 'btn-success' : 'btn-danger'" @click="toggleWhitelist(user._id, user.isWhitelisted)">
              {{ user.isWhitelisted ? '取消白名单' : '加白名单' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 下注流水 -->
    <div v-if="activeTab === 'bets'" class="tab-content">
      <div class="section-header">
        <h2>下注流水</h2>
        <button class="btn btn-sm btn-outline" @click="fetchBets">刷新</button>
      </div>
      <div v-if="loading" class="loading-text">加载中...</div>
      <div v-else class="bet-list">
        <div v-for="bet in bets" :key="bet._id" class="bet-card">
          <div class="bet-main">
            <span class="bet-user">{{ bet.userId?.phone || '未知' }}</span>
            <span class="bet-choice">{{ {red:'红巨人',blue:'蓝巨人',draw:'平局'}[bet.choice] }}</span>
            <span class="bet-arrow">→</span>
            <span class="bet-result" :class="'text-' + bet.result">{{ {red:'红胜',blue:'蓝胜',draw:'平局'}[bet.result] }}</span>
          </div>
          <div class="bet-meta">
            <span>下注 {{ bet.amount }}</span>
            <span :class="bet.netChange >= 0 ? 'text-win' : 'text-lose'">{{ bet.netChange >= 0 ? '+' : '' }}{{ bet.netChange }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 调整积分弹窗 -->
    <div v-if="adjustModal" class="modal-overlay" @click.self="adjustModal = false">
      <div class="modal-card">
        <h3>{{ adjustType === 'add' ? '增加' : '扣除' }}积分</h3>
        <input v-model.number="adjustAmount" type="number" class="adjust-input" placeholder="输入金额" min="1" />
        <input v-model="adjustRemark" type="text" class="adjust-input" placeholder="备注（可选）" />
        <div class="modal-actions">
          <button class="btn btn-outline" @click="adjustModal = false">取消</button>
          <button class="btn btn-gold" @click="doAdjust">确认</button>
        </div>
      </div>
    </div>

    <!-- 封禁弹窗 -->
    <div v-if="banModal" class="modal-overlay" @click.self="banModal = false">
      <div class="modal-card">
        <h3>封禁用户</h3>
        <input v-model="banReason" type="text" class="adjust-input" placeholder="封禁原因" />
        <div class="modal-actions">
          <button class="btn btn-outline" @click="banModal = false">取消</button>
          <button class="btn btn-danger" @click="doBan">确认封禁</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth.js'

const { authFetch } = useAuth()
const activeTab = ref('users')
const loading = ref(false)
const users = ref([])
const bets = ref([])

// 调整积分
const adjustModal = ref(false)
const adjustUserId = ref('')
const adjustType = ref('add')
const adjustAmount = ref(100)
const adjustRemark = ref('')

// 封禁
const banModal = ref(false)
const banUserId = ref('')
const banReason = ref('')

async function fetchUsers() {
  loading.value = true
  try {
    const res = await authFetch('/api/admin/users')
    const data = await res.json()
    if (res.ok) users.value = data.users
    console.log(`[管理员] 用户列表: ${users.value.length}个`)
  } catch (e) { console.error('[管理员] 获取用户失败', e) }
  loading.value = false
}

async function fetchBets() {
  loading.value = true
  try {
    const res = await authFetch('/api/admin/bets')
    const data = await res.json()
    if (res.ok) bets.value = data.bets
    console.log(`[管理员] 下注流水: ${bets.value.length}条`)
  } catch (e) { console.error('[管理员] 获取流水失败', e) }
  loading.value = false
}

function openAdjust(userId, type) {
  adjustUserId.value = userId
  adjustType.value = type
  adjustAmount.value = 100
  adjustRemark.value = ''
  adjustModal.value = true
}

// 【安全修复 4.2】余额调整增加二次确认
async function doAdjust() {
  if (!adjustAmount.value || adjustAmount.value <= 0) return
  
  const actionText = adjustType.value === 'add' ? '增加' : '扣除'
  if (!window.confirm(`⚠️ 资金操作确认：确定为该用户${actionText} ${adjustAmount.value} 积分吗？`)) {
    return // 用户点击取消，阻止操作
  }

  try {
    const res = await authFetch('/api/admin/adjust-balance', {
      method: 'POST',
      body: JSON.stringify({ userId: adjustUserId.value, amount: adjustAmount.value, type: adjustType.value, remark: adjustRemark.value })
    })
    const data = await res.json()
    if (res.ok) {
      adjustModal.value = false
      fetchUsers()
      console.log(`[管理员] 积分调整成功`)
    } else { alert(data.error) }
  } catch (e) { console.error('[管理员] 调整失败', e) }
}

function banUser(userId) {
  banUserId.value = userId
  banReason.value = ''
  banModal.value = true
}

async function doBan() {
  try {
    const res = await authFetch('/api/admin/ban', {
      method: 'POST',
      body: JSON.stringify({ userId: banUserId.value, reason: banReason.value })
    })
    const data = await res.json()
    if (res.ok) { banModal.value = false; fetchUsers() }
    else { alert(data.error) }
  } catch (e) { console.error('[管理员] 封禁失败', e) }
}

async function unbanUser(userId) {
  try {
    const res = await authFetch('/api/admin/unban', {
      method: 'POST',
      body: JSON.stringify({ userId })
    })
    const data = await res.json()
    if (res.ok) fetchUsers()
    else { alert(data.error) }
  } catch (e) { console.error('[管理员] 解封失败', e) }
}

// ================= 新增：风控黑白名单操作 =================
async function toggleRisk(userId, currentStatus) {
  const actionText = currentStatus ? '取消黑名单' : '加入黑名单'
  if (!window.confirm(`确认${actionText}吗？黑名单用户将被风控系统极端针对。`)) return
  
  try {
    const res = await authFetch('/api/admin/toggle-risk', {
      method: 'POST',
      body: JSON.stringify({ userId })
    })
    const data = await res.json()
    if (res.ok) fetchUsers()
    else { alert(data.error) }
  } catch (e) { console.error('[管理员] 风控操作失败', e) }
}

async function toggleWhitelist(userId, currentStatus) {
  const actionText = currentStatus ? '取消白名单' : '加入白名单'
  if (!window.confirm(`确认${actionText}吗？白名单用户将豁免风控系统拦截。`)) return
  
  try {
    const res = await authFetch('/api/admin/toggle-whitelist', {
      method: 'POST',
      body: JSON.stringify({ userId })
    })
    const data = await res.json()
    if (res.ok) fetchUsers()
    else { alert(data.error) }
  } catch (e) { console.error('[管理员] 风控操作失败', e) }
}

onMounted(() => { fetchUsers(); fetchBets() })
</script>

<style scoped>
.admin-page { min-height:100vh; background-size:cover; background-position:center; }
.admin-header { display:flex; align-items:center; gap:12px; padding:12px 16px; background:rgba(0,0,0,0.6); backdrop-filter:blur(10px); position:sticky; top:0; z-index:10; }
.back-btn { padding:6px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.05); color:var(--color-text); cursor:pointer; font-size:14px; }
.admin-title { flex:1; font-size:18px; font-weight:700; color:var(--color-gold); }
.admin-badge { background:linear-gradient(135deg,#ffd700,#ff8c00); color:#000; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:800; }
.tab-bar { display:flex; gap:4px; padding:8px 12px; background:rgba(0,0,0,0.3); }
.tab-item { flex:1; text-align:center; padding:8px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; color:var(--color-text-dim); transition:all 0.2s; }
.tab-item.active { background:linear-gradient(135deg,#ff6b35,#ff3b3b); color:white; }
.tab-content { padding:12px; }
.section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.section-header h2 { font-size:16px; }
.loading-text { text-align:center; padding:40px; color:var(--color-text-dim); }
.user-card { background:var(--color-panel); border-radius:10px; padding:12px; margin-bottom:8px; }
.user-info { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
.user-name { font-size:15px; font-weight:600; }
.role-badge { font-size:11px; padding:2px 8px; border-radius:10px; font-weight:600; }
.role-badge.admin { background:rgba(255,215,0,0.15); color:var(--color-gold); }
.role-badge.user { background:rgba(0,230,118,0.15); color:var(--color-success); }
.role-badge.banned { background:rgba(255,23,68,0.15); color:var(--color-danger); }
/* 新增风控徽章样式 */
.role-badge.high-risk { background:rgba(255,0,0,0.2); color:#ff4d4f; border:1px solid #ff4d4f; }
.role-badge.whitelist { background:rgba(0,230,118,0.2); color:#00e676; border:1px solid #00e676; }

.user-balance { font-size:14px; color:var(--color-text-dim); margin-bottom:4px; }
.balance-num { font-size:20px; font-weight:800; color:var(--color-gold); }

/* 新增风控数据样式 */
.user-risk { display:flex; gap:12px; font-size:12px; color:var(--color-text-dim); margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.05); }

.user-actions { display:flex; gap:6px; flex-wrap:wrap; }
.bet-card { background:var(--color-panel); border-radius:8px; padding:10px 12px; margin-bottom:6px; }
.bet-main { display:flex; align-items:center; gap:6px; margin-bottom:4px; }
.bet-user { font-weight:600; }
.bet-choice { font-size:13px; color:var(--color-text-dim); }
.bet-arrow { color:var(--color-text-dim); font-size:12px; }
.bet-result { font-weight:700; }
.text-red { color:var(--color-red); }
.text-blue { color:var(--color-blue); }
.text-draw { color:var(--color-draw); }
.text-win { color:var(--color-success); }
.text-lose { color:var(--color-danger); }
.bet-meta { display:flex; justify-content:space-between; font-size:13px; color:var(--color-text-dim); }
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:100; padding:20px; }
.modal-card { background:var(--color-panel); border-radius:16px; padding:24px; width:100%; max-width:320px; }
.modal-card h3 { font-size:18px; margin-bottom:16px; text-align:center; }
.adjust-input { width:100%; height:44px; padding:0 12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:var(--color-text); font-size:15px; outline:none; margin-bottom:12px; }
.adjust-input:focus { border-color:var(--color-gold); }
.modal-actions { display:flex; gap:10px; }
.modal-actions .btn { flex:1; }
</style>
