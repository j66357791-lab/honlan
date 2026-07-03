<template>
  <div class="match-lobby">
    <!-- 大厅主界面 -->
    <div v-if="currentView === 'lobby'" class="lobby-content">
      <!-- 顶部 -->
      <header class="lobby-header">
        <button class="back-btn" @click="$router.push('/')">←</button>
        <h1 class="lobby-title">🧩 消消乐</h1>
        <button class="sound-toggle" @click="toggleSound">
          {{ soundEnabled ? '🔊' : '🔇' }}
        </button>
      </header>

      <!-- 余额条 -->
      <div class="balance-bar">
        <span class="bb-label">当前积分</span>
        <span class="bb-value">💰 {{ displayBalance.toLocaleString() }}</span>
      </div>

      <!-- 玩法选择 -->
      <div class="mode-list">
        <!-- 糖果屋 -->
        <div class="mode-card" @click="enterGame1">
          <div class="mc-left">
            <div class="mc-icon candy-icon">🍬</div>
            <div class="mc-info">
              <h3 class="mc-name">糖果屋</h3>
              <p class="mc-desc">经典三消，轻松解压</p>
            </div>
          </div>
          <div class="mc-right">
            <span class="mc-arrow">›</span>
          </div>
        </div>

        <!-- ★ 新增：糖果连连看占位 -->
        <div class="mode-card" @click="enterGame2">
          <div class="mc-left">
            <div class="mc-icon link-icon">🔗</div>
            <div class="mc-info">
              <h3 class="mc-name">糖果连连看</h3>
              <p class="mc-desc">眼疾手快，消除连线</p>
            </div>
          </div>
          <div class="mc-right">
            <span class="mc-arrow">›</span>
          </div>
        </div>
      </div>

      <!-- 底部提示 -->
      <div class="lobby-footer">
        <p>选择玩法开始游戏</p>
      </div>
    </div>

    <!-- 游戏界面入口 -->
    <MatchGame1 v-if="currentView === 'game1'" @back="backToLobby" />
    <!-- ★ 新增：连连看占位组件 -->
    <MatchGame2 v-if="currentView === 'game2'" @back="backToLobby" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import { useMatchSound } from '../composables/useMatchSound.js'
import MatchGame1 from '../components/match/MatchGame1.vue'
import MatchGame2 from '../components/match/MatchGame2.vue' // 引入占位组件

const { displayBalance, refreshUser, fetchBalance } = useAuth()
const { soundEnabled, initBGM, stopBGM, toggleSound } = useMatchSound()

const currentView = ref('lobby')

function enterGame1() {
  currentView.value = 'game1'
  window.scrollTo(0, 0)
}

// ★ 新增：进入连连看
function enterGame2() {
  currentView.value = 'game2'
  window.scrollTo(0, 0)
}

function backToLobby() {
  currentView.value = 'lobby'
}

onMounted(async () => {
  initBGM()
  refreshUser()
  fetchBalance()
})

onUnmounted(() => {
  stopBGM()
})
</script>

<style scoped>
.match-lobby {
  min-height: 100vh;
  min-height: 100dvh;
  color: #340909;
  background: url('/assets/images/match/ui/jiazaiye-bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #ffffff;
  border-bottom: 2px solid #000000;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  background: #f0f0f0;
  border: 1px solid #000000;
  color: #000000;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.lobby-title {
  font-size: 20px;
  font-weight: 900;
  color: #000000;
  margin: 0;
}

.sound-toggle {
  background: #f0f0f0;
  border: 1px solid #000000;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
}

.balance-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  margin: 16px 16px 0;
  background: #ffffff;
  border: 2px solid #000000;
  border-radius: 12px;
}

.bb-label { font-size: 14px; color: #000000; font-weight: 700; }
.bb-value { font-size: 22px; font-weight: 900; color: #000000; }

.mode-list {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mode-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  border-radius: 12px;
  border: 2px solid #000000;
  background: #ffffff;
  cursor: pointer;
  transition: transform 0.1s;
}
.mode-card:active { transform: scale(0.98); background: #f5f5f5; }

.mc-left { display: flex; align-items: center; gap: 14px; }
.mc-icon {
  width: 52px; height: 52px; border-radius: 12px; border: 1px solid #000000;
  display: flex; align-items: center; justify-content: center; font-size: 26px;
  flex-shrink: 0; background: #ffffff;
}
.mc-info h3 { margin: 0 0 4px; font-size: 18px; font-weight: 800; color: #000000; }
.mc-info p { margin: 0; font-size: 14px; color: #000000; font-weight: 600; }
.mc-right { display: flex; align-items: center; }
.mc-arrow { font-size: 28px; color: #000000; font-weight: bold; }

.lobby-footer { text-align: center; padding: 20px; }
.lobby-footer p { margin: 0; font-size: 14px; color: #000000; font-weight: 800; }
</style>
