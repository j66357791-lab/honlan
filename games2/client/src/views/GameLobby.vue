<template>
  <Suspense>
    <template #default>
      <div class="lobby-container" :style="backgroundStyle">

        <!-- 顶部用户信息栏 -->
        <header class="lobby-header">
          <div class="user-info">
            <img v-if="currentUser?.avatar" :src="AVATAR_MAP[currentUser.avatar]" class="header-avatar" />
            <span v-else>{{ isAdmin ? '👑' : '👤' }}</span>
            <span class="user-name">{{ displayName }}</span>
            <span class="balance">💰 {{ displayBalance.toLocaleString() }}</span>
          </div>
          <!-- 公告 + 设置 按钮 -->
          <div class="header-actions">
            <div class="action-btn" :class="{ 'has-badge': !!activeAnnouncement }" @click="openAnnouncement">
              📢 <span v-if="activeAnnouncement" class="action-dot"></span>
            </div>
            <div class="action-btn" @click="showSettings = true">⚙️</div>
          </div>
        </header>

        <!-- Tab 内容区 -->
        <div class="tab-content">

          <!-- ====== 游戏 (主大厅入口) ====== -->
          <div v-show="activeTab === 'game'" class="tab-panel">
            <h2>🎮 游戏大厅</h2>
            <div class="lobby-entry-grid">
              <!-- 休闲中心入口 -->
              <div class="lobby-entry-card" @click="goToLeisure">
                <div class="entry-icon">🎲</div>
                <div class="entry-info">
                  <h3>休闲中心</h3>
                  <p>轻松娱乐，经典玩法</p>
                </div>
                <div class="entry-arrow">›</div>
              </div>
              <!-- 养成大厅入口 -->
              <div class="lobby-entry-card" @click="goToRaising">
                <div class="entry-icon">🌱</div>
                <div class="entry-info">
                  <h3>养成大厅</h3>
                  <p>角色成长，策略养成</p>
                </div>
                <div class="entry-arrow">›</div>
              </div>
              <!-- 轮回游戏入口 -->
<div class="lobby-entry-card" @click="goToReincarnation">
  <div class="entry-icon">🔄</div>
  <div class="entry-info">
    <h3>百世轮回</h3>
    <p>文字模拟，体验不同人生</p>
  </div>
  <div class="entry-arrow">›</div>
</div>

            </div>
          </div>

          <!-- ====== 用户：消息 ====== -->
          <div v-if="!isAdmin" v-show="activeTab === 'message'" class="tab-panel">
            <h2>💬 消息中心</h2>
            <div class="msg-card service-card" @click="openChat">
              <div class="msg-avatar service-avatar">🧑‍💼</div>
              <div class="msg-info">
                <div class="msg-name">在线客服</div>
                <div class="msg-desc">7×24小时为您服务</div>
              </div>
              <div class="msg-right">
                <span v-if="unreadCount > 0" class="msg-badge">{{ unreadCount }}</span>
                <span class="msg-arrow">›</span>
              </div>
            </div>
            <div class="msg-card room-card" @click="chatRoomTip">
              <div class="msg-avatar room-avatar">👥</div>
              <div class="msg-info">
                <div class="msg-name">游戏聊天室</div>
                <div class="msg-desc">和大家一起交流</div>
              </div>
              <div class="msg-right">
                <span class="coming-tag">开发中</span>
                <span class="msg-arrow">›</span>
              </div>
            </div>
            <div v-if="unreadCount === 0" class="msg-empty">
              <div>📭</div>
              <span>暂无新消息</span>
            </div>
          </div>

          <!-- ====== 管理员：接待台 ====== -->
          <div v-if="isAdmin" v-show="activeTab === 'reception'" class="tab-panel">
            <h2>📋 接待台</h2>
            <div class="reception-stats">
              <div class="stat-card waiting-card">
                <div class="stat-num">{{ receptionWaiting }}</div>
                <div class="stat-label">等待接入</div>
              </div>
              <div class="stat-card active-card">
                <div class="stat-num">{{ receptionActive }}</div>
                <div class="stat-label">进行中</div>
              </div>
            </div>
            <div v-if="receptionWaitingList.length" class="reception-list">
              <div class="reception-list-title">🕐 等待接入</div>
              <div v-for="s in receptionWaitingList" :key="s.id" class="reception-item">
                <div class="ri-left">
                  <span class="ri-dot"></span>
                  <span class="ri-name">{{ s.userName || '用户' }}</span>
                </div>
                <span class="ri-time">{{ shortTime(s.createdAt) }}</span>
              </div>
            </div>
            <div v-else class="reception-empty">
              <div>✅</div>
              <span>暂无等待接入的用户</span>
            </div>
            <button class="reception-enter" @click="router.push('/admin/chat')">
              进入工作台 ›
            </button>
          </div>

          <!-- ★ 活动Tab已移除内部组件，改为跳转独立视图 -->

          <!-- ====== 用户：我的 ====== -->
          <ProfilePanel v-if="!isAdmin" v-show="activeTab === 'profile'" :current-user="currentUser"
            :is-admin="isAdmin" :display-balance="displayBalance" @logout="handleLogout" @go-admin="goToAdmin"
            @go-chat-admin="goToChatAdmin" />

          <!-- ====== 管理员：后台 ====== -->
          <div v-if="isAdmin" v-show="activeTab === 'admin'" class="tab-panel">
            <h2>⚙️ 管理后台</h2>
            <div class="admin-menu">
              <div class="admin-item" @click="router.push('/admin')">
                <span class="ai-icon">👥</span>
                <span class="ai-text">用户管理</span>
                <span class="ai-arrow">›</span>
              </div>
              <div class="admin-item" @click="router.push('/admin')">
                <span class="ai-icon">🎮</span>
                <span class="ai-text">游戏设置</span>
                <span class="ai-arrow">›</span>
              </div>
              <div class="admin-item" @click="router.push('/admin/chat')">
                <span class="ai-icon">💬</span>
                <span class="ai-text">客服管理</span>
                <span class="ai-arrow">›</span>
              </div>
            </div>
            <button class="admin-enter" @click="router.push('/admin')">
              进入后台 ›
            </button>
            <button class="logout-btn" @click="handleLogout">退出登录</button>
          </div>
        </div>

        <!-- 底部导航栏 -->
        <nav class="bottom-nav">
          <div v-for="tab in displayTabs" :key="tab.key" class="nav-item" :class="{ active: activeTab === tab.key }"
            @click="onTabClick(tab.key)">
            <span class="nav-icon">{{ activeTab === tab.key ? tab.activeIcon : tab.icon }}</span>
            <span class="nav-label">{{ tab.label }}</span>
            <!-- 用户：消息红点 -->
            <span v-if="tab.key === 'message' && !isAdmin && unreadCount > 0" class="nav-badge">{{ unreadCount
            }}</span>
            <!-- 管理员：接待台红点 -->
            <span v-if="tab.key === 'reception' && isAdmin && (receptionWaiting > 0 || unreadCount > 0)"
              class="nav-badge" :class="{ 'dot-only': receptionWaiting === 0 && unreadCount > 0 }">{{
                receptionWaiting > 0 ? receptionWaiting : '' }}</span>
          </div>
        </nav>

        <!-- 客服对话界面（仅用户） -->
        <ChatWidget v-if="!isAdmin && showChat" @close="showChat = false" />
        <!-- 设置面板 -->
        <SettingsPanel :show="showSettings" @close="showSettings = false" />
        <!-- 公告弹窗 -->
        <AnnouncementModal :visible="showAnnouncement" :announcement="activeAnnouncement" @close="onAnnouncementClose"
          @action="onAnnouncementAction" />

      </div>
    </template>
    <template #fallback>
      <Skeleton />
    </template>
  </Suspense>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useChat } from '../composables/useChat.js'
import { useAnnouncement } from '../composables/useAnnouncement.js'
import ChatWidget from '../components/ChatWidget.vue'
import ProfilePanel from '../components/ProfilePanel.vue'
// ★ 移除旧的 ActivityCenter 引入
import SettingsPanel from '../components/SettingsPanel.vue'
import AnnouncementModal from '../components/AnnouncementModal.vue'
import Skeleton from '../components/Skeleton.vue'
import { AVATAR_MAP } from '../config.js'

const router = useRouter()
const { currentUser, isAdmin, logout, refreshUser, displayBalance } = useAuth()
const { unreadCount, connect: connectChat, fetchSessions, clearUnread } = useChat()
const { activeAnnouncement, fetchAnnouncements, dismissToday } = useAnnouncement()

const displayName = computed(() => currentUser.value?.nickname || '未登录')
const backgroundStyle = computed(() => ({ backgroundImage: `url('/assets/images/lobby_bg.png')` }))

// ========== 设置面板状态 ==========
const showSettings = ref(false)

// ========== 公告弹窗状态 ==========
const showAnnouncement = ref(false)

// ========== Tab 配置 ==========
const activeTab = ref('game')
const userTabs = [
  { key: 'game', label: '游戏', icon: '🎮', activeIcon: '🎮' },
  { key: 'message', label: '消息', icon: '💬', activeIcon: '💬' },
  { key: 'activity', label: '活动', icon: '🎉', activeIcon: '🎉' },
  { key: 'profile', label: '我的', icon: '👤', activeIcon: '👤' }
]
const adminTabs = [
  { key: 'game', label: '游戏', icon: '🎮', activeIcon: '🎮' },
  { key: 'reception', label: '接待台', icon: '📋', activeIcon: '📋' },
  { key: 'activity', label: '活动', icon: '🎉', activeIcon: '🎉' },
  { key: 'admin', label: '后台', icon: '⚙️', activeIcon: '⚙️' }
]
const displayTabs = computed(() => (isAdmin.value ? adminTabs : userTabs))

function onTabClick(key) {
  // ★ 修改：点击活动Tab直接跳转独立页面
  if (key === 'activity') {
    router.push('/activity')
    return
  }
  
  activeTab.value = key
  if (key === 'reception' && isAdmin.value) {
    loadReceptionData()
    clearUnread()
  }
}

// ========== 接待台数据 ==========
const receptionSessions = ref([])
const receptionWaiting = computed(() => receptionSessions.value.filter((s) => s.status === 'waiting').length)
const receptionActive = computed(() => receptionSessions.value.filter((s) => s.status === 'active').length)
const receptionWaitingList = computed(() => receptionSessions.value.filter((s) => s.status === 'waiting'))

async function loadReceptionData() {
  if (!isAdmin.value) return
  receptionSessions.value = await fetchSessions()
}
function shortTime(t) {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// ========== 用户消息 ==========
const showChat = ref(false)
function openChat() { showChat.value = true }
function chatRoomTip() { alert('聊天室功能开发中，敬请期待！') }

// ========== 路由跳转 (主大厅 -> 副大厅) ==========
const goToLeisure = () => router.push('/leisure')
const goToRaising = () => router.push('/raising')
const goToReincarnation = () => router.push('/game/reincarnation')

// ========== 其他跳转 ==========
const goToAdmin = () => router.push('/admin')
const goToChatAdmin = () => router.push('/admin/chat')
function handleLogout() {
  logout()
  router.push('/login')
}

// ========== 公告 ==========
function openAnnouncement() { showAnnouncement.value = true }
function onAnnouncementClose({ noRemindToday }) {
  showAnnouncement.value = false
  if (noRemindToday && activeAnnouncement.value) { dismissToday(activeAnnouncement.value._id) }
}
function onAnnouncementAction(announcement) {
  if (announcement?.linkAction === 'activity') {
    // ★ 修改：如果公告跳转活动，直接去活动路由
    router.push('/activity')
  } else if (announcement?.linkAction?.startsWith('/')) {
    router.push(announcement.linkAction)
  }
}

// ========== 定时刷新与预加载 ==========
let refreshTimer = null
onMounted(async () => {
  const bgImage = new Image()
  bgImage.src = '/assets/images/lobby_bg.png'
  const heroes = ['赵云', '关羽', '张飞', '穆桂英']
  heroes.forEach((name) => { const img = new Image(); img.src = `/assets/images/games2/${name}.png` })

  await refreshUser()
  connectChat()
  if (isAdmin.value) loadReceptionData()
  refreshTimer = setInterval(() => { if (isAdmin.value) loadReceptionData() }, 10000)

  await fetchAnnouncements()
  if (activeAnnouncement.value) { setTimeout(() => { showAnnouncement.value = true }, 600) }
})
onUnmounted(() => { if (refreshTimer) clearInterval(refreshTimer) })
</script>

<style scoped>
/* 你的原有样式无需修改，这里省略以节省篇幅，请保留你原本的 <style scoped> 内容 */
/* 如果你是整体替换，请把你原文件的 <style scoped> 完整复制过来即可 */
.lobby-container { min-height: 100vh; min-height: 100dvh; color: #333; padding: 0; display: flex; flex-direction: column; position: relative; overflow: hidden; padding-top: env(safe-area-inset-top, 0px); }
.lobby-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255, 248, 220, 0.7); backdrop-filter: blur(10px); border-radius: 0 0 12px 12px; z-index: 10; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); flex-shrink: 0; }
.user-info { display: flex; gap: 20px; font-size: 14px; color: #555; }
.user-info span { display: flex; align-items: center; gap: 5px; }
.balance { color: #d4af37; font-weight: bold; }
.header-actions { display: flex; flex-direction: row; align-items: center; gap: 4px; }
.action-btn { font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: background 0.2s; position: relative; }
.action-btn:active { background: rgba(212, 175, 55, 0.2); }
.action-dot { position: absolute; top: 2px; right: 4px; width: 7px; height: 7px; border-radius: 50%; background: #e74c3c; animation: pulse 1.5s infinite; }
.tab-content { flex: 1; overflow-y: auto; padding-bottom: calc(58px + env(safe-area-inset-bottom, 0px) + 10px); -webkit-overflow-scrolling: touch; }
.tab-panel { padding: 20px 16px; }
.tab-panel.no-padding { padding: 0; }
.tab-panel h2 { font-size: 20px; color: #d4af37; margin-bottom: 16px; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.lobby-entry-grid { display: flex; flex-direction: column; gap: 16px; }
.lobby-entry-card { width: 100%; background: rgba(255, 248, 220, 0.85); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 20px; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); transition: all 0.2s; backdrop-filter: blur(5px); }
.lobby-entry-card:active { transform: scale(0.98); background: rgba(255, 248, 220, 0.95); border-color: #d4af37; }
.entry-icon { font-size: 42px; width: 60px; height: 60px; background: rgba(255, 255, 255, 0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(212, 175, 55, 0.15); }
.entry-info { flex: 1; }
.entry-info h3 { margin: 0 0 6px; font-size: 18px; color: #333; font-weight: 800; }
.entry-info p { margin: 0; font-size: 13px; color: #888; }
.entry-arrow { font-size: 32px; color: #d4af37; font-weight: bold; }
.msg-card { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 12px; background: rgba(255, 248, 220, 0.75); border: 1px solid rgba(212, 175, 55, 0.2); margin-bottom: 12px; cursor: pointer; transition: all 0.15s; backdrop-filter: blur(5px); }
.msg-card:active { transform: scale(0.98); border-color: #d4af37; }
.msg-avatar { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.service-avatar { background: rgba(27, 176, 105, 0.12); }
.room-avatar { background: rgba(52, 152, 219, 0.12); }
.msg-info { flex: 1; }
.msg-name { font-size: 15px; font-weight: 600; color: #333; }
.msg-desc { font-size: 12px; color: #888; margin-top: 2px; }
.msg-right { display: flex; align-items: center; gap: 8px; }
.msg-badge { background: #e74c3c; color: #fff; font-size: 11px; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-weight: 700; padding: 0 4px; }
.coming-tag { font-size: 10px; color: #999; background: rgba(0, 0, 0, 0.05); padding: 2px 8px; border-radius: 4px; }
.msg-arrow { color: #aaa; font-size: 20px; }
.msg-empty { text-align: center; padding: 40px 0; color: #999; font-size: 14px; }
.msg-empty div { font-size: 40px; margin-bottom: 8px; }
.reception-stats { display: flex; gap: 12px; margin-bottom: 20px; }
.stat-card { flex: 1; text-align: center; padding: 20px 12px; border-radius: 12px; background: rgba(255, 248, 220, 0.75); border: 1px solid rgba(212, 175, 55, 0.2); backdrop-filter: blur(5px); }
.stat-num { font-size: 32px; font-weight: 900; }
.waiting-card .stat-num { color: #e67e22; }
.active-card .stat-num { color: #1bb069; }
.stat-label { font-size: 12px; color: #888; margin-top: 4px; }
.reception-list { background: rgba(255, 248, 220, 0.75); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden; margin-bottom: 16px; backdrop-filter: blur(5px); }
.reception-list-title { padding: 10px 14px; font-size: 13px; color: #888; border-bottom: 1px solid rgba(212, 175, 55, 0.1); }
.reception-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-bottom: 1px solid rgba(212, 175, 55, 0.06); }
.reception-item:last-child { border-bottom: none; }
.ri-left { display: flex; align-items: center; gap: 10px; }
.ri-dot { width: 8px; height: 8px; border-radius: 50%; background: #e67e22; box-shadow: 0 0 6px rgba(230, 126, 34, 0.4); animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.ri-name { font-size: 14px; font-weight: 600; color: #333; }
.ri-time { font-size: 11px; color: #999; }
.reception-empty { text-align: center; padding: 30px 0; color: #999; font-size: 14px; }
.reception-empty div { font-size: 36px; margin-bottom: 8px; }
.reception-enter { width: 100%; padding: 14px; border-radius: 12px; border: none; background: #1bb069; color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 8px; }
.reception-enter:active { background: #17a05c; }
.admin-menu { background: rgba(255, 248, 220, 0.75); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden; margin-bottom: 16px; backdrop-filter: blur(5px); }
.admin-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid rgba(212, 175, 55, 0.1); cursor: pointer; }
.admin-item:last-child { border-bottom: none; }
.admin-item:active { background: rgba(212, 175, 55, 0.08); }
.ai-icon { font-size: 18px; width: 24px; text-align: center; }
.ai-text { flex: 1; font-size: 14px; color: #444; }
.ai-arrow { font-size: 16px; color: #ccc; }
.admin-enter { width: 100%; padding: 14px; border-radius: 12px; border: none; background: #d4af37; color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; }
.admin-enter:active { background: #b8972e; }
.logout-btn { width: 100%; padding: 14px; border-radius: 12px; margin-top: 12px; border: 1px solid rgba(220, 80, 80, 0.3); background: rgba(220, 80, 80, 0.06); color: #c0392b; font-size: 15px; font-weight: 600; cursor: pointer; }
.logout-btn:active { background: rgba(220, 80, 80, 0.15); }
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; display: flex; height: auto; min-height: 58px; background: rgba(255, 248, 220, 0.92); backdrop-filter: blur(12px); border-top: 1px solid rgba(212, 175, 55, 0.2); z-index: 100; padding-bottom: env(safe-area-inset-bottom, 0px); box-sizing: border-box; }
.nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; position: relative; padding: 8px 0; }
.nav-icon { font-size: 20px; transition: transform 0.2s; }
.nav-label { font-size: 10px; color: #888; }
.nav-item.active .nav-label { color: #d4af37; font-weight: 600; }
.nav-item.active .nav-icon { transform: scale(1.15); }
.nav-badge { position: absolute; top: 3px; right: calc(50% - 18px); background: #e74c3c; color: #fff; font-size: 10px; min-width: 16px; height: 16px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; padding: 0 3px; animation: badgePop 0.3s ease; }
.nav-badge.dot-only { min-width: 8px; height: 8px; padding: 0; font-size: 0; right: calc(50% - 4px); top: 6px; }
@keyframes badgePop { 0% { transform: scale(0); } 60% { transform: scale(1.3); } 100% { transform: scale(1); } }
@media (max-width: 480px) { .lobby-header { padding: 10px 12px; } .user-info { gap: 12px; font-size: 13px; } }
.header-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(212, 175, 55, 0.4); }
.user-name { font-weight: 600; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@supports (padding: max(0px)) { .bottom-nav { padding-bottom: max(8px, env(safe-area-inset-bottom)); } .tab-content { padding-bottom: calc(58px + max(8px, env(safe-area-inset-bottom)) + 10px); } }
</style>
