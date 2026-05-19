<template>
  <div class="lobby-container" :style="backgroundStyle">
    <!-- 顶部用户信息栏 -->
    <header class="lobby-header">
      <div class="user-info">
        <span>👤 {{ userPhone }}</span>
        <span class="balance">💰 余额: {{ balance }}</span>
      </div>
      <div class="header-actions">
        <!-- 管理员后台入口 -->
        <button v-if="isAdmin" class="admin-btn" @click="goToAdmin">⚙️ 后台</button>
        <!-- 退出登录按钮 -->
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </header>

    <!-- 游戏列表区域 -->
    <div class="game-list">
      <h2>🎮 选择游戏</h2>
      
      <!-- 巨人赛跑入口卡片 -->
      <div class="game-card" @click="enterGiantRunner">
        <div class="game-icon">🏇</div>
        <div class="game-info">
          <h3>巨人赛跑</h3>
          <p>红蓝对决，平局高赔率！</p>
        </div>
      </div>

      <!-- 点兵点将入口卡片 -->
      <div class="game-card" @click="enterPointingGame">
        <div class="game-icon">🎲</div>
        <div class="game-info">
          <h3>点兵点将</h3>
          <p>策略与运气的考验</p>
        </div>
      </div>

      <!-- 客服图标 -->
      <div class="game-card" @click="showCustomerServicePlaceholder">
        <div class="game-icon">💬</div>
        <div class="game-info">
          <h3>客服中心</h3>
          <p>在线客服（开发中）</p>
        </div>
      </div>
    </div>

    <!-- 底部客服图标（手机端显示） -->
    <div class="mobile-customer-service" @click="showCustomerServicePlaceholder">
      <span>💬</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { currentUser, isAdmin, logout, refreshUser } = useAuth()

// 用户信息
const userPhone = computed(() => currentUser.value?.phone || '138****8888')
const balance = ref(0)

// 背景图片
const backgroundStyle = computed(() => ({
  backgroundImage: `url('https://t1.chatglm.cn/file/6a0c13cb6bd5e5d2b3b9a11c.png?expired_at=1779608488&sign=5eee1da0856a15bf73eac639576ff037&ext=png')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  minHeight: '100vh'
}))

// 进入巨人赛跑
const enterGiantRunner = () => {
  router.push('/game/giant')
}

// 进入点兵点将
const enterPointingGame = () => {
  router.push('/game/pointing')
}

// 进入管理员后台
const goToAdmin = () => {
  router.push('/admin')
}

// 退出登录
const handleLogout = () => {
  logout()
  router.push('/login')
}

// 显示客服占位
const showCustomerServicePlaceholder = () => {
  alert('客服功能开发中，敬请期待！')
}

// 获取用户信息
onMounted(async () => {
  await refreshUser()
  // 这里可以添加获取余额的API调用
  // const { getBalance } = useGame()
  // balance.value = await getBalance()
})
</script>

<style scoped>
.lobby-container {
  min-height: 100vh;
  color: #333;
  padding: 20px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 顶部用户信息栏 */
.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 248, 220, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  margin-bottom: 20px;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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

.header-actions {
  display: flex;
  gap: 10px;
}

.admin-btn {
  background: rgba(212, 175, 55, 0.2);
  border: 1px solid #d4af37;
  color: #d4af37;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.admin-btn:hover {
  background: rgba(212, 175, 55, 0.3);
}

.logout-btn {
  background: rgba(255, 77, 79, 0.2);
  border: 1px solid rgba(255, 77, 79, 0.5);
  color: #777;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: rgba(255, 77, 79, 0.3);
}

/* 游戏列表区域 */
.game-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
  z-index: 10;
  padding: 0 20px;
}

h2 {
  font-size: 20px;
  color: #d4af37;
  margin-bottom: 10px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 游戏卡片 */
.game-card {
  width: 100%;
  max-width: 350px;
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
  box-shadow: 0 2px 12px rgba(212, 175, 55, 0.2);
}

.game-icon {
  font-size: 40px;
  color: #d4af37;
}

.game-info h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
  color: #333;
}

.game-info p {
  margin: 0;
  font-size: 12px;
  color: #666;
}

/* 手机端客服图标 */
.mobile-customer-service {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: rgba(255, 248, 220, 0.9);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.mobile-customer-service:hover {
  background: rgba(255, 248, 220, 1);
  border-color: #d4af37;
  transform: scale(1.05);
}

.mobile-customer-service span {
  font-size: 24px;
  color: #d4af37;
}

/* 响应式设计 - 手机端优化 */
@media (max-width: 480px) {
  .lobby-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
    padding: 10px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .game-list {
    padding: 0 10px;
  }
  
  .game-card {
    padding: 15px;
  }
  
  .game-icon {
    font-size: 32px;
  }
  
  .game-info h3 {
    font-size: 16px;
  }
  
  .game-info p {
    font-size: 11px;
  }
}
</style>
