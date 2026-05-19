<template>
  <div class="lobby-container" :style="backgroundStyle">
    <!-- 顶部用户信息栏（保留原风格） -->
    <header class="lobby-header">
      <div class="user-info">
        <span>👤 {{ userPhone }}</span>
        <span class="balance">💰 {{ displayBalance.toLocaleString() }}</span>
      </div>
      <div class="header-actions">
        <button v-if="isAdmin" class="admin-btn" @click="goToAdmin">⚙️ 后台</button>
      </div>
    </header>

    <!-- Tab 内容区 -->
    <div class="tab-content">
      <!-- ====== 游戏 ====== -->
      <div v-show="activeTab === 'game'" class="tab-panel">
        <h2>🎮 选择游戏</h2>
        <div class="game-card" @click="enterGiantRunner">
          <div class="game-icon">🏇</div>
          <div class="game-info">
            <h3>巨人赛跑</h3>
            <p>红蓝对决，平局高赔率！</p>
          </div>
        </div>
        <div class="game-card" @click="enterPointingGame">
          <div class="game-icon">🎲</div>
          <div class="game-info">
            <h3>点兵点将</h3>
            <p>策略与运气的考验</p>
          </div>
        </div>
      </div>

      <!-- ====== 消息 ====== -->
      <div v-show="activeTab === 'message'" class="tab-panel">
        <h2>💬 消息中心</h2>
        <!-- 联系客服 -->
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
        <!-- 聊天室 -->
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

      <!-- ====== 活动 ====== -->
      <div v-show="activeTab === 'activity'" class="tab-panel">
        <h2>🎉 活动中心</h2>
        <div class="activity-placeholder">
          <div class="activity-icon">🎊</div>
          <div class="activity-text">精彩活动即将上线</div>
          <div class="activity-sub">敬请期待...</div>
        </div>
      </div>

      <!-- ====== 我的 ====== -->
      <ProfilePanel
        v-show="activeTab === 'profile'"
        :current-user="currentUser"
        :is-admin="isAdmin"
        :display-balance="displayBalance"
        @logout="handleLogout"
        @go-admin="goToAdmin"
        @go-chat-admin="goToChatAdmin"
      />
    </div>

    <!-- 底部导航栏 -->
    <nav class="bottom-nav">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="nav-item"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <span class="nav-icon">{{ activeTab === tab.key ? tab.activeIcon : tab.icon }}</span>
        <span class="nav-label">{{ tab.label }}</span>
        <span v-if="tab.key === 'message' && unreadCount > 0" class="nav-badge">{{ unreadCount }}</span>
      </div>
    </nav>

    <!-- 客服对话界面（全屏覆盖） -->
    <ChatWidget v-if="showChat" @close="showChat = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useChat } from '../composables/useChat.js'
import ChatWidget from '../components/ChatWidget.vue'
import ProfilePanel from '../components/ProfilePanel.vue'

const router = useRouter()
const {
  currentUser, isAdmin, logout, refreshUser,
  balance, displayBalance
} = useAuth()

const { unreadCount, connect: connectChat } = useChat()

const userPhone = computed(() => currentUser.value?.phone || '未登录')

const backgroundStyle = computed(() => ({
  backgroundImage: `url('https://t1.chatglm.cn/file/6a0c13cb6bd5e5d2b3b9a11c.png?expired_at=1779608488&sign=5eee1da0856a15bf73eac639576ff037&ext=png')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  minHeight: '100vh'
}))

// Tab
const activeTab = ref('game')
const tabs = [
  { key: 'game',     label: '游戏', icon: '🎮', activeIcon: '🎮' },
  { key: 'message',  label: '消息', icon: '💬', activeIcon: '💬' },
  { key: 'activity', label: '活动', icon: '🎉', activeIcon: '🎉' },
  { key: 'profile',  label: '我的', icon: '👤', activeIcon: '👤' },
]

// 客服
const showChat = ref(false)
function openChat() {
  showChat.value = true
}

function chatRoomTip() {
  alert('聊天室功能开发中，敬请期待！')
}

// 跳转
const enterGiantRunner = () => router.push('/game/giant')
const enterPointingGame = () => router.push('/game/pointing')
const goToAdmin = () => router.push('/admin')
const goToChatAdmin = () => router.push('/admin/chat')

function handleLogout() {
  logout()
  router.push('/login')
}

onMounted(async () => {
  await refreshUser()
  connectChat()
})
</script>

<style scoped>
.lobby-container {
  min-height: 100vh;
  color: #333;
  padding: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* ========== 顶部栏（保留原风格） ========== */
.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 248, 220, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 0 0 12px 12px;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
.user-info {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #555;
}
.user-info span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.balance {
  color: #d4af37;
  font-weight: bold;
}
.header-actions { display: flex; gap: 10px; }
.admin-btn {
  background: rgba(212, 175, 55, 0.2);
  border: 1px solid #d4af37;
  color: #d4af37;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

/* ========== Tab 内容区 ========== */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 68px;
}
.tab-panel {
  padding: 20px 16px;
}
.tab-panel h2 {
  font-size: 20px;
  color: #d4af37;
  margin-bottom: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* ====== 游戏卡片（保留原风格） ====== */
.game-card {
  width: 100%;
  max-width: 400px;
  margin: 0 auto 16px;
  background: rgba(255, 248, 220, 0.8);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(5px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.game-card:active {
  transform: scale(0.98);
  border-color: #d4af37;
}
.game-icon { font-size: 40px; color: #d4af37; }
.game-info h3 { margin: 0 0 5px 0; font-size: 18px; color: #333; }
.game-info p { margin: 0; font-size: 12px; color: #666; }

/* ====== 消息页 ====== */
.msg-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 248, 220, 0.75);
  border: 1px solid rgba(212, 175, 55, 0.2);
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.15s;
  backdrop-filter: blur(5px);
}
.msg-card:active {
  transform: scale(0.98);
  border-color: #d4af37;
}
.msg-avatar {
  width: 46px; height: 46px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
}
.service-avatar { background: rgba(27, 176, 105, 0.12); }
.room-avatar { background: rgba(52, 152, 219, 0.12); }
.msg-info { flex: 1; }
.msg-name { font-size: 15px; font-weight: 600; color: #333; }
.msg-desc { font-size: 12px; color: #888; margin-top: 2px; }
.msg-right { display: flex; align-items: center; gap: 8px; }
.msg-badge {
  background: #e74c3c; color: #fff; font-size: 11px;
  min-width: 18px; height: 18px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; padding: 0 4px;
}
.coming-tag {
  font-size: 10px; color: #999; background: rgba(0,0,0,0.05);
  padding: 2px 8px; border-radius: 4px;
}
.msg-arrow { color: #aaa; font-size: 20px; }
.msg-empty {
  text-align: center; padding: 40px 0; color: #999;
  font-size: 14px;
}
.msg-empty div { font-size: 40px; margin-bottom: 8px; }

/* ====== 活动占位 ====== */
.activity-placeholder { text-align: center; padding: 60px 0; }
.activity-icon { font-size: 56px; margin-bottom: 12px; }
.activity-text { font-size: 17px; color: #d4af37; font-weight: 600; }
.activity-sub { font-size: 13px; color: #999; margin-top: 6px; }

/* ========== 底部导航栏 ========== */
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; height: 58px;
  background: rgba(255, 248, 220, 0.92);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(212, 175, 55, 0.2);
  z-index: 100;
}
.nav-item {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 2px;
  cursor: pointer; position: relative;
}
.nav-icon { font-size: 20px; transition: transform 0.2s; }
.nav-label { font-size: 10px; color: #888; }
.nav-item.active .nav-label { color: #d4af37; font-weight: 600; }
.nav-item.active .nav-icon { transform: scale(1.15); }
.nav-badge {
  position: absolute; top: 3px; right: calc(50% - 18px);
  background: #e74c3c; color: #fff; font-size: 10px;
  min-width: 16px; height: 16px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; padding: 0 3px;
}

/* ========== 响应式 ========== */
@media (max-width: 480px) {
  .lobby-header { padding: 10px 12px; }
  .user-info { gap: 12px; font-size: 13px; }
}
</style>
