<template>
  <div class="game-app">
    <!-- 顶部导航栏 -->
    <header class="top-bar">
      <div class="title-area">
        <button class="icon-btn" @click="$emit('back')">←</button>
        <h1 class="game-title">🍬 糖果屋</h1>
      </div>
      <div class="user-area">
        <button class="icon-btn sound-btn" @click="toggleSound">
          {{ soundEnabled ? '🔊' : '🔇' }}
        </button>
        <div class="balance-area">
          <span class="balance-label">积分</span>
          <span class="balance-value">{{ displayBalance.toLocaleString() }}</span>
        </div>
      </div>
    </header>

    <!-- 游戏主体 -->
    <div class="game-content">
      <!-- 错误提示 -->
      <div v-if="errorMessage" class="error-toast">{{ errorMessage }}</div>

      <div class="board-wrapper">
        <MatchBoard />

        <!-- ★★★ 连击飘字容器 ★★★ -->
        <div class="float-container">
          <div
            v-for="item in floatingTexts"
            :key="item.id"
            class="float-item"
            :style="{ '--random-x': item.x + 'px' }"
          >
            <span class="combo-text">x{{ item.wave }} 连击</span>
            <span class="score-text">+{{ item.score }}</span>
          </div>
        </div>
      </div>

      <ControlBar />
    </div>

    <!-- ★★★ 结算弹窗 ★★★ -->
    <Transition name="fade">
      <div v-if="gameState === 'result' && lastResult" class="result-modal" @click.self="closeResult">
        <div class="result-content">
          <h2 :class="lastResult.netProfit >= 0 ? 'title-win' : 'title-lose'">
            {{ lastResult.netProfit >= 0 ? '🎉 恭喜获胜！' : '😔 再接再厉' }}
          </h2>
          <div class="result-rows">
            <div class="result-row">
              <span>消除总分</span>
              <span class="val">{{ lastResult.totalScore }}</span>
            </div>
            <div class="result-row">
              <span>门票</span>
              <span class="val text-red">-{{ lastResult.ticketPrice || 100 }}</span>
            </div>
            <div v-if="lastResult.fee > 0" class="result-row fee-row">
              <span>手续费 (10%)</span>
              <span class="val text-orange">-{{ lastResult.fee }}</span>
            </div>
            <div class="result-divider"></div>
            <div class="result-row result-final">
              <span>{{ lastResult.netProfit >= 0 ? '净赚' : '净亏' }}</span>
              <span class="val" :class="lastResult.netProfit >= 0 ? 'text-green' : 'text-red'">
                {{ lastResult.netProfit >= 0 ? '+' : '' }}{{ lastResult.netProfit }}
              </span>
            </div>
            <div v-if="lastResult.fee > 0" class="result-hint">
              实际到账 {{ lastResult.payout }} 积分（已扣手续费 {{ lastResult.fee }}）
            </div>
            <div v-else class="result-hint">
              到账 {{ lastResult.payout }} 积分
            </div>
          </div>
          <button class="result-btn" @click="closeResult">确定</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAuth } from '../../composables/useAuth.js'
import { useMatchSound } from '../../composables/useMatchSound.js'
import { useMatch } from '../../composables/useMatch.js'
import MatchBoard from './MatchBoard.vue'
import ControlBar from './ControlBar.vue'

defineEmits(['back'])

const { displayBalance } = useAuth()
const { soundEnabled, initBGM, stopBGM, toggleSound } = useMatchSound()
const { gameState, lastResult, waveInfo, errorMessage, closeResult } = useMatch()

// ★★★ 连击飘字逻辑 ★★★
const floatingTexts = ref([])
let textId = 0

watch(() => waveInfo.value.wave, (newWave) => {
  // 连击数大于等于3时触发飘字
  if (newWave >= 3) {
    const id = textId++
    // 生成一个随机水平偏移量，让多次飘字不完全重叠
    const randomX = Math.random() * 80 - 40 // -40px 到 +40px 之间
    floatingTexts.value.push({ id, wave: newWave, score: waveInfo.value.waveScore, x: randomX })
    // 动画持续时间（1.5秒）后从数组中移除
    setTimeout(() => {
      floatingTexts.value = floatingTexts.value.filter(item => item.id !== id)
    }, 1500)
  }
})

onMounted(() => {
  initBGM()
})

onUnmounted(() => {
  stopBGM()
})
</script>

<style scoped>
.game-app {
  min-height: 100vh;
  background: linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.3)), url('/assets/images/match/ui/night_main_bg.png');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  position: relative;
  display: flex;
  flex-direction: column;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.game-title {
  font-size: 17px;
  font-weight: 800;
  color: #d4af37;
  margin: 0;
}

.icon-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sound-btn {
  font-size: 14px;
}

.balance-area {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0,0,0,0.3);
  padding: 2px 8px;
  border-radius: 12px;
}

.balance-label {
  font-size: 10px;
  color: rgba(255,255,255,0.6);
}

.balance-value {
  font-size: 16px;
  font-weight: 900;
  color: #d4af37;
}

.game-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 15px;
  box-sizing: border-box;
  gap: 15px;
}

.error-toast {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(239, 68, 68, 0.9);
  color: white;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  z-index: 200;
  white-space: nowrap;
}

.board-wrapper {
  width: 90vw;
  max-width: 400px;
  aspect-ratio: 1 / 1;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  padding: 10px;
  box-sizing: border-box;
  border: 2px solid rgba(255, 255, 255, 0.1);
  position: relative; /* 确保相对定位，让飘字基于棋盘飘动 */
  overflow: hidden; /* 防止飘字溢出棋盘外太难看 */
}

/* ★★★ 连击飘字样式与动画 ★★★ */
.float-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 绝对不能挡住棋盘的点击事件 */
  z-index: 20;
  display: flex;
  justify-content: center;
}

.float-item {
  position: absolute;
  top: 25%; /* 从画面上方一点开始飘 */
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 水平方向随机偏移 */
  transform: translateX(var(--random-x));
  /* 调用飘动动画 */
  animation: comboFloat 1.5s ease-out forwards;
}

.combo-text {
  font-size: 22px;
  font-weight: 900;
  font-style: italic;
  color: #ffd700; /* 纯金色 */
  text-shadow: 0 0 5px #ffd700, 0 0 10px #ffaa00, 0 2px 2px rgba(0, 0, 0, 0.8); /* 强烈发光+暗边，艺术字感 */
  letter-spacing: 2px;
}

.score-text {
  font-size: 32px;
  font-weight: 900;
  font-style: italic;
  color: #fff5cc; /* 亮金色 */
  text-shadow: 0 0 8px #ffd700, 0 0 20px #ff8c00, 0 2px 3px rgba(0, 0, 0, 0.9); /* 更强烈的发光 */
  margin-top: -5px;
}

/* 飘动动画关键帧 */
@keyframes comboFloat {
  0% {
    opacity: 0;
    transform: translateX(var(--random-x)) translateY(20px) scale(0.5); /* 初始下方，缩小，透明 */
  }
  15% {
    opacity: 1;
    transform: translateX(var(--random-x)) translateY(0) scale(1.2); /* 弹出并放大一点，爆点感 */
  }
  30% {
    transform: translateX(var(--random-x)) translateY(-5px) scale(1); /* 稍微回缩正常大小 */
  }
  100% {
    opacity: 0;
    transform: translateX(var(--random-x)) translateY(-80px) scale(0.8); /* 上飘，淡出，稍微缩小 */
  }
}

/* ★★★ 结算弹窗样式 ★★★ */
.result-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.result-content {
  background: #1e1e2e;
  padding: 28px 24px;
  border-radius: 16px;
  text-align: center;
  border: 2px solid rgba(255,255,255,0.1);
  width: 300px;
  max-width: 90vw;
}

.title-win {
  color: #4ade80;
  margin: 0 0 20px;
  font-size: 22px;
}

.title-lose {
  color: #f87171;
  margin: 0 0 20px;
  font-size: 22px;
}

.result-rows {
  margin-bottom: 20px;
}

.result-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #94a3b8;
}

.result-row .val {
  font-weight: 600;
  color: #e2e8f0;
}

.text-green { color: #4ade80 !important; }
.text-red { color: #f87171 !important; }
.text-orange { color: #fb923c !important; }

.fee-row {
  font-size: 12px;
  color: #fb923c;
}
.fee-row .val {
  color: #fb923c;
}

.result-divider {
  border-top: 1px solid #334155;
  margin: 8px 0;
}

.result-final {
  font-size: 18px;
  font-weight: 700;
}
.result-final .val {
  font-size: 22px;
}

.result-hint {
  font-size: 11px;
  color: #64748b;
  margin-top: 6px;
}

.result-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.result-btn:active {
  opacity: 0.85;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
