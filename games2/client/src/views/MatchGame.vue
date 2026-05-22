<template>
  <div class="game-app">
    <!-- 顶部导航栏 -->
    <header class="top-bar">
      <div class="title-area">
        <button class="icon-btn" @click="$router.push('/')">←</button>
        <h1 class="game-title">消消乐</h1>
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
      <div class="board-wrapper">
        <MatchBoard />
      </div>
      <ControlBar />
    </div>

    <!-- 结算弹窗 -->
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
              <!-- ★ 修改：动态显示门票金额，不再写死-100 -->
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
import { onMounted, onUnmounted } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import { useMatch } from '../composables/useMatch.js'
import { useMatchSound } from '../composables/useMatchSound.js'
import MatchBoard from '../components/match/MatchBoard.vue'
import ControlBar from '../components/match/ControlBar.vue'

// ★ 修改：解构出 refreshUser 和 fetchBalance
const { displayBalance, refreshUser, fetchBalance } = useAuth()
const { gameState, lastResult, closeResult } = useMatch()
const { soundEnabled, initBGM, stopBGM, toggleSound } = useMatchSound()

onMounted(() => {
  initBGM()
  // ★ 新增：像巨人一样，进入页面刷新余额，解决刷新页面积分不更新问题
  refreshUser()
  fetchBalance()
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
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
  position: sticky; top: 0; z-index: 10;
}
.title-area { display: flex; align-items: center; gap: 8px; }
.game-title { font-size: 17px; font-weight: 800; color: #d4af37; margin: 0; }
.icon-btn { 
  background: rgba(255,255,255,0.1); border: none; color: white; 
  border-radius: 50%; width: 28px; height: 28px; font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.user-area { display: flex; align-items: center; gap: 8px; }
.sound-btn { font-size: 14px; }
.balance-area {
  display: flex; align-items: center; gap: 4px;
  background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 12px;
}
.balance-label { font-size: 10px; color: rgba(255,255,255,0.6); }
.balance-value { font-size: 16px; font-weight: 900; color: #d4af37; }

.game-content {
  flex: 1; display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  padding: 15px; box-sizing: border-box; gap: 15px;
}
.board-wrapper {
  width: 90vw; max-width: 400px; aspect-ratio: 1 / 1; 
  background: rgba(0, 0, 0, 0.4); border-radius: 12px; padding: 10px; 
  box-sizing: border-box; border: 2px solid rgba(255, 255, 255, 0.1);
}

/* ===== 结算弹窗 ===== */
.result-modal {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.result-content {
  background: #1e1e2e; padding: 28px 24px; border-radius: 16px; text-align: center;
  border: 2px solid rgba(255,255,255,0.1); width: 300px; max-width: 90vw;
}
.title-win { color: #4ade80; margin: 0 0 20px; font-size: 22px; }
.title-lose { color: #f87171; margin: 0 0 20px; font-size: 22px; }

.result-rows { margin-bottom: 20px; }
.result-row {
  display: flex; justify-content: space-between;
  padding: 8px 0; font-size: 14px; color: #94a3b8;
}
.result-row .val { font-weight: 600; color: #e2e8f0; }
.text-green { color: #4ade80 !important; }
.text-red { color: #f87171 !important; }
.text-orange { color: #fb923c !important; }

.fee-row { font-size: 12px; color: #fb923c; }
.fee-row .val { color: #fb923c; }

.result-divider { border-top: 1px solid #334155; margin: 8px 0; }

.result-final { font-size: 18px; font-weight: 700; }
.result-final .val { font-size: 22px; }

.result-hint { font-size: 11px; color: #64748b; margin-top: 6px; }

.result-btn {
  width: 100%; padding: 12px; border: none; border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white; font-size: 16px; font-weight: 600; cursor: pointer;
}
.result-btn:active { opacity: 0.85; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
