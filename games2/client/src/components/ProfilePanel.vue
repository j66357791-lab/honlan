<template>
  <div class="profile-panel">
    <!-- 用户卡片 -->
    <div class="profile-card">
      <div class="profile-avatar">{{ currentUser?.role === 'admin' ? '👑' : '😎' }}</div>
      <div class="profile-main">
        <div class="profile-name">{{ currentUser?.phone || '未登录' }}</div>
        <div class="profile-role">{{ currentUser?.role === 'admin' ? '管理员' : '普通用户' }}</div>
      </div>
    </div>

    <!-- 余额卡片 -->
    <div class="balance-card">
      <div class="balance-label">账户余额</div>
      <div class="balance-value">{{ displayBalance.toLocaleString() }}</div>
      <div class="balance-unit">积分</div>
    </div>

    <!-- 功能菜单 -->
    <div class="menu-group">
      <div class="menu-item" @click="$emit('go-game')">
        <span class="menu-icon">📋</span>
        <span class="menu-text">对局记录</span>
        <span class="menu-arrow">›</span>
      </div>
      <div class="menu-item" @click="$emit('go-game')">
        <span class="menu-icon">💰</span>
        <span class="menu-text">积分明细</span>
        <span class="menu-arrow">›</span>
      </div>
      <div class="menu-item" @click="$emit('go-game')">
        <span class="menu-icon">📈</span>
        <span class="menu-text">走势分析</span>
        <span class="menu-arrow">›</span>
      </div>
    </div>

    <!-- 管理员菜单 -->
    <div class="menu-group" v-if="isAdmin">
      <div class="menu-item" @click="$emit('go-admin')">
        <span class="menu-icon">⚙️</span>
        <span class="menu-text">管理后台</span>
        <span class="menu-arrow">›</span>
      </div>
      <div class="menu-item" @click="$emit('go-chat-admin')">
        <span class="menu-icon">💬</span>
        <span class="menu-text">客服管理</span>
        <span class="menu-arrow">›</span>
      </div>
    </div>

    <!-- 退出登录 -->
    <button class="logout-btn" @click="$emit('logout')">退出登录</button>
  </div>
</template>

<script setup>
defineProps({
  currentUser: { type: Object, default: null },
  isAdmin: { type: Boolean, default: false },
  displayBalance: { type: Number, default: 0 }
})

defineEmits(['logout', 'go-admin', 'go-chat-admin', 'go-game'])
</script>

<style scoped>
.profile-panel {
  padding: 20px 16px;
}

/* 用户卡片 */
.profile-card {
  display: flex; align-items: center; gap: 14px;
  padding: 20px;
  background: rgba(255, 248, 220, 0.75);
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 14px;
  margin-bottom: 14px;
  backdrop-filter: blur(5px);
}
.profile-avatar {
  width: 54px; height: 54px; border-radius: 50%;
  background: rgba(212, 175, 55, 0.12);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
}
.profile-main { flex: 1; }
.profile-name {
  font-size: 17px; font-weight: 700; color: #333;
}
.profile-role {
  font-size: 12px; color: #999; margin-top: 2px;
}

/* 余额卡片 */
.balance-card {
  text-align: center; padding: 22px;
  background: rgba(255, 248, 220, 0.75);
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 14px;
  margin-bottom: 14px;
  backdrop-filter: blur(5px);
}
.balance-label { font-size: 13px; color: #888; }
.balance-value {
  font-size: 36px; font-weight: 900;
  color: #d4af37; margin: 8px 0 2px;
}
.balance-unit { font-size: 12px; color: #999; }

/* 菜单组 */
.menu-group {
  background: rgba(255, 248, 220, 0.75);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 14px;
  backdrop-filter: blur(5px);
}
.menu-item {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.1);
  cursor: pointer;
}
.menu-item:last-child { border-bottom: none; }
.menu-item:active { background: rgba(212, 175, 55, 0.08); }
.menu-icon { font-size: 18px; width: 24px; text-align: center; }
.menu-text { flex: 1; font-size: 14px; color: #444; }
.menu-arrow { font-size: 16px; color: #ccc; }

/* 退出按钮 */
.logout-btn {
  width: 100%; padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(220, 80, 80, 0.3);
  background: rgba(220, 80, 80, 0.06);
  color: #c0392b; font-size: 15px; font-weight: 600;
  cursor: pointer; margin-top: 6px;
}
.logout-btn:active { background: rgba(220, 80, 80, 0.15); }
</style>
