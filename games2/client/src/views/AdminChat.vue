<template>
  <div class="admin-chat">
    <!-- ====== 顶部栏 ====== -->
    <div class="top-bar">
      <button class="tb-btn" @click="showList = !showList">
        <span v-if="!showList">📋</span>
        <span v-else>✕</span>
        <span v-if="!showList && waitingCount > 0" class="tb-badge">{{ waitingCount }}</span>
      </button>
      <div class="tb-center">
        <span v-if="!currentSessionId">💬 客服工作台</span>
        <span v-else>{{ currentSession?.userName || '用户' }}
          <span v-if="targetUser" class="tb-balance">💰{{ targetUser.balance?.toLocaleString() }}</span>
        </span>
      </div>
      <button class="tb-btn" @click="$router.push('/')">🏠</button>
    </div>

    <!-- ====== 会话列表（可折叠抽屉） ====== -->
    <Transition name="drawer">
      <div v-if="showList" class="drawer-overlay" @click.self="showList = false">
        <div class="drawer-panel">
          <!-- Tab切换 -->
          <div class="drawer-tabs">
            <button :class="{ active: listTab === 'waiting' }" @click="listTab = 'waiting'">
              等待
              <span v-if="waitingSessions.length" class="tab-count">{{ waitingSessions.length }}</span>
            </button>
            <button :class="{ active: listTab === 'active' }" @click="listTab = 'active'">
              进行中
              <span v-if="activeSessions.length" class="tab-count">{{ activeSessions.length }}</span>
            </button>
            <button :class="{ active: listTab === 'closed' }" @click="listTab = 'closed'">已结束</button>
          </div>

          <!-- 列表 -->
          <div class="drawer-list">
            <div v-for="s in currentListSessions" :key="s.id" class="s-card" :class="{ active: currentSessionId === s.id }" @click="selectSession(s)">
              <div class="sc-left">
                <div class="sc-dot" :class="s.status"></div>
                <div class="sc-info">
                  <div class="sc-name">{{ s.userName || '用户' }}</div>
                  <div class="sc-preview">{{ s.lastMessage || '新会话' }}</div>
                </div>
              </div>
              <div class="sc-right">
                <span v-if="s.adminUnread > 0" class="sc-badge">{{ s.adminUnread }}</span>
                <span class="sc-time">{{ shortTime(s.lastMessageTime) }}</span>
              </div>
            </div>
            <div v-if="currentListSessions.length === 0" class="sc-empty">暂无会话</div>
          </div>
          <button class="drawer-refresh" @click="loadSessionList">🔄 刷新列表</button>
        </div>
      </div>
    </Transition>

    <!-- ====== 未选择会话 ====== -->
    <div v-if="!currentSessionId" class="empty-state">
      <div class="es-icon">💬</div>
      <div class="es-text">点击左上角 📋 选择会话</div>
      <div class="es-hint" v-if="waitingCount > 0">有 {{ waitingCount }} 个用户等待接入</div>
    </div>

    <!-- ====== 聊天主区域 ====== -->
    <div v-else class="chat-main">
      <!-- 用户信息条 -->
      <div class="user-strip">
        <div class="us-info">
          <span class="us-name">{{ currentSession?.userName || '用户' }}</span>
          <span v-if="targetUser" class="us-balance">💰 {{ targetUser.balance?.toLocaleString() }}</span>
          <span v-if="targetUser?.isHighRisk" class="us-risk">⚫高危</span>
          <span v-if="targetUser?.isWhitelisted" class="us-white">⚪白名单</span>
          <span v-if="targetUser?.isInternal" class="us-internal">🛡️内部</span>
        </div>
        <div class="us-actions">
          <button v-if="currentSession?.status === 'waiting'" class="us-btn accept" @click="acceptCurrentSession">接入</button>
          <template v-if="currentSession?.status === 'active'">
            <button class="us-btn adjust" @click="showAdjust = !showAdjust">⚡上下分</button>
            <button class="us-btn end" @click="closeCurrentSession">结束</button>
          </template>
        </div>
      </div>

      <!-- 上下分面板 -->
      <Transition name="slide">
        <div v-if="showAdjust && currentSession?.status === 'active'" class="adjust-panel">
          <div class="ap-row">
            <select v-model="adjustType">
              <option value="add">➕上分</option>
              <option value="sub">➖下分</option>
            </select>
            <input v-model.number="adjustAmount" type="number" placeholder="金额" />
          </div>
          <div class="ap-quick">
            <button @click="adjustAmount = 100">100</button>
            <button @click="adjustAmount = 500">500</button>
            <button @click="adjustAmount = 1000">1K</button>
            <button @click="adjustAmount = 5000">5K</button>
            <button @click="adjustAmount = 10000">1W</button>
          </div>
          <div class="ap-btns">
            <button class="ap-cancel" @click="showAdjust = false">取消</button>
            <button class="ap-confirm" @click="submitAdjust" :disabled="!adjustAmount || adjustAmount <= 0">确认</button>
          </div>
        </div>
      </Transition>

      <!-- 消息列表 -->
      <div class="msg-area" ref="msgEl">
        <div v-for="msg in messages" :key="msg.id" class="m-row" :class="{ 'm-self': msg.sender === 'admin', 'm-other': msg.sender === 'user' || msg.sender === 'bot', 'm-sys': msg.sender === 'system' }">
          <div v-if="msg.sender === 'system'" class="m-sys-text">{{ msg.content }}</div>
          <template v-else>
            <div class="m-av" :class="msg.sender">
              {{ msg.sender === 'bot' ? '🤖' : msg.sender === 'admin' ? '🧑‍💼' : '👤' }}
            </div>
            <div class="m-body">
              <div class="m-name">{{ msg.senderName || (msg.sender === 'bot' ? '智能助手' : msg.sender === 'admin' ? '客服' : '用户') }}</div>
              <div class="m-bubble" :class="msg.sender">{{ msg.content }}</div>
              <div class="m-time">{{ formatTime(msg.createdAt) }}</div>
            </div>
          </template>
        </div>
        <div v-if="messages.length === 0" class="m-empty">暂无消息</div>
      </div>

      <!-- 输入栏 -->
      <div class="input-bar" v-if="currentSession?.status === 'active'">
        <input v-model="inputText" @keydown.enter="send" placeholder="输入回复..." />
        <button @click="send">发送</button>
      </div>
      <div class="input-bar disabled" v-else-if="currentSession?.status === 'waiting'">
        <input disabled placeholder="请先接入会话" />
      </div>
      <div class="input-bar disabled" v-else>
        <input disabled placeholder="会话已结束" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useChat } from '../composables/useChat.js'
import { useAuth } from '../composables/useAuth.js'

const { authFetch } = useAuth()
const { connected, messages, connect, sendMessage, markRead, loadHistory, acceptSession: wsAccept, closeSession: wsClose, fetchSessions } = useChat()

const sessions = ref([])
const currentSessionId = ref(null)
const currentSession = ref(null)
const inputText = ref('')
const msgEl = ref(null)
const targetUser = ref(null)

const showList = ref(false)
const listTab = ref('waiting')

// 上下分
const showAdjust = ref(false)
const adjustType = ref('add')
const adjustAmount = ref(0)

// 分组
const waitingSessions = computed(() => sessions.value.filter(s => s.status === 'waiting'))
const activeSessions = computed(() => sessions.value.filter(s => s.status === 'active'))
const closedSessions = computed(() => sessions.value.filter(s => s.status === 'closed'))
const waitingCount = computed(() => waitingSessions.value.length)

const currentListSessions = computed(() => {
  if (listTab.value === 'waiting') return waitingSessions.value
  if (listTab.value === 'active') return activeSessions.value
  return closedSessions.value
})

async function loadSessionList() {
  const list = await fetchSessions()
  sessions.value = list
}

function selectSession(s) {
  const sid = s.id
  if (!sid) return
  currentSessionId.value = sid
  currentSession.value = s
  showAdjust.value = false
  showList.value = false // 选择后自动收起列表
  markRead(sid)
  loadHistory(sid)
  fetchTargetUser(s.userId)
}

async function fetchTargetUser(userId) {
  if (!userId) return
  try {
    const res = await authFetch(`/api/chat/user/${userId}`)
    const data = await res.json()
    if (res.ok) targetUser.value = data.user
  } catch {
    targetUser.value = null
  }
}

function acceptCurrentSession() {
  if (!currentSessionId.value) return
  wsAccept(currentSessionId.value)
  if (currentSession.value) currentSession.value.status = 'active'
  setTimeout(loadSessionList, 500)
}

function closeCurrentSession() {
  if (!currentSessionId.value) return
  wsClose(currentSessionId.value)
  if (currentSession.value) currentSession.value.status = 'closed'
  showAdjust.value = false
  setTimeout(loadSessionList, 500)
}

function send() {
  const text = inputText.value.trim()
  if (!text || !currentSessionId.value) return
  sendMessage(text, 'text', currentSessionId.value)
  inputText.value = ''
}

async function submitAdjust() {
  if (!adjustAmount.value || adjustAmount.value <= 0 || !currentSession.value?.userId) return
  try {
    const res = await authFetch('/api/admin/adjust-balance', {
      method: 'POST',
      body: JSON.stringify({
        userId: currentSession.value.userId,
        type: adjustType.value,
        amount: adjustAmount.value,
        remark: `客服${adjustType.value === 'add' ? '上分' : '下分'}`
      })
    })
    const data = await res.json()
    if (res.ok) {
      fetchTargetUser(currentSession.value.userId)
      sendMessage(`[系统] 已为您${adjustType.value === 'add' ? '增加' : '扣除'} ${adjustAmount.value} 积分`, 'text', currentSessionId.value)
      adjustAmount.value = 0
      showAdjust.value = false
    } else {
      alert(data.error || '操作失败')
    }
  } catch {
    alert('网络错误')
  }
}

function shortTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  return `${(d.getMonth() + 1)}/${d.getDate()}`
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

watch(messages, () => {
  nextTick(() => {
    if (msgEl.value) msgEl.value.scrollTop = msgEl.value.scrollHeight
  })
}, { deep: true })

onMounted(() => {
  connect()
  loadSessionList()
  setInterval(loadSessionList, 10000)
})
</script>

<style scoped>
.admin-chat {
  height: 100vh;
  background: #0f1923;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ==================== 顶部栏 ==================== */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #162231;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
  z-index: 10;
}
.tb-btn {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: none;
  background: rgba(255,255,255,0.06);
  color: #ccc;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tb-btn:active {
  background: rgba(255,255,255,0.12);
}
.tb-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #e74c3c;
  color: #fff;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.tb-center {
  font-size: 15px;
  font-weight: 600;
  color: #f0f0f0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tb-balance {
  font-size: 12px;
  color: #f0c040;
}

/* ==================== 抽屉（会话列表） ==================== */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 50;
  display: flex;
}
.drawer-panel {
  width: 85%;
  max-width: 360px;
  background: #131d2a;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255,255,255,0.05);
  overflow: hidden;
}

/* Tab */
.drawer-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
}
.drawer-tabs button {
  flex: 1;
  padding: 12px 0;
  border: none;
  background: transparent;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}
.drawer-tabs button.active {
  color: #f0c040;
}
.drawer-tabs button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: #f0c040;
  border-radius: 1px;
}
.tab-count {
  background: rgba(240,192,64,0.15);
  color: #f0c040;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 6px;
  margin-left: 3px;
}

/* 列表 */
.drawer-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.s-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.12s;
  margin-bottom: 2px;
}
.s-card:active {
  background: rgba(255,255,255,0.04);
}
.s-card.active {
  background: rgba(240,192,64,0.1);
}
.sc-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.sc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sc-dot.waiting { background: #f39c12; box-shadow: 0 0 6px rgba(243,156,18,0.4); }
.sc-dot.active { background: #1bb069; }
.sc-dot.closed { background: #555; }
.sc-info { min-width: 0; }
.sc-name { font-size: 14px; font-weight: 600; color: #ddd; }
.sc-preview { font-size: 11px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; margin-top: 2px; }
.sc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.sc-badge { background: #e74c3c; color: #fff; font-size: 10px; min-width: 16px; height: 16px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.sc-time { font-size: 10px; color: #555; }
.sc-empty { text-align: center; color: #555; padding: 30px; font-size: 13px; }
.drawer-refresh { padding: 12px; border: none; background: rgba(255,255,255,0.04); color: #888; font-size: 13px; cursor: pointer; flex-shrink: 0; }
.drawer-refresh:active { background: rgba(255,255,255,0.08); }

/* 抽屉动画 */
.drawer-enter-active { animation: drawerIn 0.25s ease; }
.drawer-leave-active { animation: drawerOut 0.2s ease; }
@keyframes drawerIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes drawerOut { from { opacity: 1; } to { opacity: 0; } }

/* ==================== 空状态 ==================== */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #444;
}
.es-icon { font-size: 52px; }
.es-text { font-size: 14px; }
.es-hint { font-size: 13px; color: #f39c12; font-weight: 600; }

/* ==================== 聊天主区域 ==================== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 用户信息条 */
.user-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: #162231;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  flex-shrink: 0;
}
.us-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.us-name { font-size: 14px; font-weight: 600; color: #f0f0f0; }
.us-balance { font-size: 12px; color: #f0c040; background: rgba(240,192,64,0.08); padding: 2px 8px; border-radius: 6px; }
.us-risk { font-size: 11px; color: #e74c3c; background: rgba(231,76,60,0.1); padding: 1px 6px; border-radius: 4px; }
.us-white { font-size: 11px; color: #3498db; background: rgba(52,152,219,0.1); padding: 1px 6px; border-radius: 4px; }
.us-internal { font-size: 11px; color: #f0c040; background: rgba(240,192,64,0.15); padding: 1px 6px; border-radius: 4px; font-weight: bold; }
.us-actions { display: flex; gap: 6px; flex-shrink: 0; }
.us-btn { padding: 6px 14px; border-radius: 8px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; }
.us-btn.accept { background: #1bb069; color: #fff; }
.us-btn.accept:active { background: #17a05c; }
.us-btn.adjust { background: #f0c040; color: #000; }
.us-btn.adjust:active { background: #d4a830; }
.us-btn.end { background: rgba(231,76,60,0.1); color: #e74c3c; border: 1px solid rgba(231,76,60,0.25); }
.us-btn.end:active { background: rgba(231,76,60,0.2); }

/* 上下分面板 */
.adjust-panel {
  padding: 12px 14px;
  background: #1a2836;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  flex-shrink: 0;
}
.ap-row { display: flex; gap: 8px; margin-bottom: 8px; }
.ap-row select, .ap-row input { background: #0f1923; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; color: #eee; font-size: 14px; outline: none; }
.ap-row select { min-width: 90px; }
.ap-row input { flex: 1; }
.ap-quick { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
.ap-quick button { padding: 5px 12px; border-radius: 6px; border: none; background: rgba(255,255,255,0.06); color: #aaa; font-size: 12px; cursor: pointer; }
.ap-quick button:active { background: rgba(255,255,255,0.12); }
.ap-btns { display: flex; gap: 8px; }
.ap-cancel { flex: 1; padding: 8px; border-radius: 8px; border: none; background: rgba(255,255,255,0.06); color: #aaa; font-size: 13px; cursor: pointer; }
.ap-confirm { flex: 1; padding: 8px; border-radius: 8px; border: none; background: #f0c040; color: #000; font-size: 13px; font-weight: 600; cursor: pointer; }
.ap-confirm:disabled { opacity: 0.4; cursor: not-allowed; }

.slide-enter-active, .slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { max-height: 0; opacity: 0; padding: 0 14px; overflow: hidden; }

/* 消息区 */
.msg-area {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.m-row { display: flex; align-items: flex-start; gap: 8px; }
.m-row.m-self { flex-direction: row-reverse; }
.m-row.m-sys { justify-content: center; }
.m-av { width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.m-av.user { background: rgba(255,255,255,0.06); }
.m-av.admin { background: rgba(27,176,105,0.15); }
.m-av.bot { background: rgba(52,152,219,0.15); }
.m-body { max-width: 72%; }
.m-name { font-size: 10px; color: #555; margin-bottom: 2px; }
.m-bubble { padding: 9px 13px; border-radius: 10px; font-size: 14px; line-height: 1.5; word-break: break-word; white-space: pre-line; }
.m-bubble.user { background: #1e2d3d; color: #ddd; border-top-left-radius: 2px; }
.m-bubble.admin { background: #1bb069; color: #fff; border-top-right-radius: 2px; }
.m-bubble.bot { background: #1a2d4a; color: #7eb8e8; border-top-left-radius: 2px; font-size: 13px; }
.m-time { font-size: 9px; color: #444; margin-top: 3px; }
.m-sys-text { font-size: 11px; color: #555; padding: 3px 10px; background: rgba(255,255,255,0.02); border-radius: 10px; }
.m-empty { text-align: center; color: #444; padding: 40px; font-size: 13px; }

/* 输入栏 */
.input-bar {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  background: #162231;
  border-top: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
}
.input-bar input { flex: 1; background: #0f1923; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 10px 16px; color: #eee; font-size: 14px; outline: none; }
.input-bar input:focus { border-color: #1bb069; }
.input-bar input::placeholder { color: #444; }
.input-bar button { padding: 0 22px; border-radius: 20px; border: none; background: #1bb069; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; flex-shrink: 0; }
.input-bar button:active { background: #17a05c; }
.input-bar.disabled input { opacity: 0.35; }
.input-bar.disabled button { display: none; }

/* 滚动条 */
.msg-area::-webkit-scrollbar, .drawer-list::-webkit-scrollbar { width: 3px; }
.msg-area::-webkit-scrollbar-thumb, .drawer-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 2px; }

/* ==================== 桌面端适配 ==================== */
@media (min-width: 768px) {
  .drawer-panel { max-width: 320px; }
  .m-body { max-width: 60%; }
}
</style>
