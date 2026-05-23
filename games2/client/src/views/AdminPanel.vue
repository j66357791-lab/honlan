<template>
  <div class="admin-panel">
    <header class="top-bar">
      <h1 class="page-title">运营后台</h1>
      <div class="top-actions">
        <button class="top-btn" @click="$router.push('/')">大厅</button>
        <button class="top-btn top-btn-red" @click="handleLogout">退出</button>
      </div>
    </header>

    <div class="block-grid">
      <div class="block" @click="activeModal = 'dashboard'">
        <span class="block-icon">📊</span>
        <span class="block-label">数据大盘</span>
      </div>
      <div class="block" @click="activeModal = 'users'">
        <span class="block-icon">👥</span>
        <span class="block-label">用户管理</span>
      </div>
      <div class="block" @click="activeModal = 'bets'">
        <span class="block-icon">📜</span>
        <span class="block-label">流水查询</span>
      </div>
      <div class="block" @click="activeModal = 'pool'">
        <span class="block-icon">🎰</span>
        <span class="block-label">奖池微调</span>
      </div>
      <!-- ✅ 新增：消消乐监控入口 -->
      <div class="block block-match" @click="activeModal = 'matchStats'">
        <span class="block-icon">🍬</span>
        <span class="block-label">消消乐监控</span>
      </div>
      <div class="block block-announce" @click="activeModal = 'announce'">
        <span class="block-icon">📢</span>
        <span class="block-label">公告管理</span>
      </div>
      <div class="block block-chat" @click="$router.push('/admin/chat')">
        <span class="block-icon">💬</span>
        <span class="block-label">客服管理</span>
        <span v-if="chatUnread > 0" class="block-badge">{{ chatUnread }}</span>
      </div>
      <div class="block block-danger" @click="activeModal = 'maint'">
        <span class="block-icon">☢️</span>
        <span class="block-label">系统维护</span>
      </div>
      <div class="block block-back" @click="$router.push('/')">
        <span class="block-icon">🏠</span>
        <span class="block-label">返回大厅</span>
      </div>
    </div>

    <!-- 弹窗组件 -->
    <DashboardModal v-if="activeModal === 'dashboard'" @close="activeModal = ''" />
    <UserManager v-if="activeModal === 'users'" @close="activeModal = ''" />
    <BetHistory v-if="activeModal === 'bets'" @close="activeModal = ''" />
    <PoolManager v-if="activeModal === 'pool'" @close="activeModal = ''" />
    <!-- ✅ 新增：消消乐监控弹窗 -->
    <MatchStatsManager v-if="activeModal === 'matchStats'" @close="activeModal = ''" />
    <AnnouncementManager v-if="activeModal === 'announce'" @close="activeModal = ''" />
    <MaintenancePanel v-if="activeModal === 'maint'" @close="activeModal = ''" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useChat } from '../composables/useChat.js'
import DashboardModal from '../components/admin/DashboardModal.vue'
import UserManager from '../components/admin/UserManager.vue'
import BetHistory from '../components/admin/BetHistory.vue'
import PoolManager from '../components/admin/PoolManager.vue'
import MatchStatsManager from '../components/admin/MatchStatsManager.vue' // ✅ 引入新组件
import AnnouncementManager from '../components/admin/AnnouncementManager.vue'
import MaintenancePanel from '../components/admin/MaintenancePanel.vue'

const router = useRouter()
const { logout } = useAuth()
const { unreadCount: chatUnread, connect: connectChat } = useChat()

const activeModal = ref('')

function handleLogout() {
  logout()
  router.push('/login')
}

connectChat()
</script>

<style scoped>
.admin-panel {
  min-height: 100vh;
  min-height: 100dvh;
  background: #0d1117;
  color: #e0e0e0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.top-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: rgba(0,0,0,0.6);
  backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky; top: 0; z-index: 10;
}
.page-title { font-size: 17px; font-weight: 800; color: #f0c040; margin: 0; }
.top-actions { display: flex; gap: 6px; }
.top-btn { padding: 5px 12px; border-radius: 6px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: rgba(255,255,255,0.08); color: #ccc; }
.top-btn-red { background: #e74c3c; color: #fff; }

.block-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 10px; padding: 14px; max-width: 600px; margin: 0 auto;
}
.block {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; background: #161b22; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 16px 6px; cursor: pointer;
  transition: all 0.15s; position: relative;
}
.block:active { transform: scale(0.95); background: rgba(255,255,255,0.05); }
.block-icon { font-size: 26px; }
.block-label { font-size: 11px; color: #aaa; font-weight: 600; text-align: center; }
.block-badge {
  position: absolute; top: 4px; right: 4px; background: #e74c3c; color: #fff;
  font-size: 10px; min-width: 16px; height: 16px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; font-weight: 700; padding: 0 4px;
}
.block-match { border-color: rgba(255, 107, 157, 0.4); } /* ✅ 消消乐专属粉色边框 */
.block-announce { border-color: rgba(240,192,64,0.3); }
.block-chat { border-color: rgba(231,76,60,0.3); }
.block-danger { border-color: rgba(231,76,60,0.25); }
.block-danger .block-label { color: #e74c3c; }
.block-back { border-color: rgba(255,255,255,0.1); }

@media (min-width: 500px) {
  .block-grid { gap: 14px; padding: 20px; }
  .block { padding: 20px 8px; }
  .block-icon { font-size: 32px; }
  .block-label { font-size: 12px; }
}
</style>
