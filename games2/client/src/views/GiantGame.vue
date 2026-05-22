<template>
  <div class="game-app" :class="{ shaking: screenShaking }">
    <ConfettiEffect v-if="showConfetti" />
    <ToastContainer />

    <!-- 顶部栏 -->
    <header class="top-bar">
      <div class="title-area">
        <h1 class="game-title">巨人赛跑</h1>
        <button class="icon-btn" @click="toggleSound">{{ soundEnabled ? '🔊' : '🔇' }}</button>
      </div>
      <div class="user-area">
        <span class="username">{{ currentUser?.phone }}</span>
        <div class="balance-area">
          <span class="balance-label">积分</span>
          <span class="balance-value" :class="{ animating: balanceAnimating }">{{ displayBalance.toLocaleString() }}</span>
        </div>
      </div>
    </header>

    <!-- 快捷功能图标栏 -->
    <div class="tool-bar">
      <button class="tool-btn" @click="showTrend = true; fetchHistory()">📈 走势</button>
      <button class="tool-btn" @click="showHistory = true; fetchHistory()">📋 记录</button>
      <button class="tool-btn" @click="showTransactions = true; fetchTransactions()">💰 明细</button>
      <button v-if="isAdmin" class="tool-btn admin-btn" @click="$router.push('/admin')">⚙️ 后台</button>
      <button class="tool-btn" @click="goToLobby">🏠 大厅</button>
    </div>

    <!-- 赛道 -->
    <GameTrack
      :red-progress="redProgress"
      :blue-progress="blueProgress"
      :red-mood="redMood"
      :blue-mood="blueMood"
      :show-wine-red="showWineRed"
      :show-wine-blue="showWineBlue"
    />

    <!-- 比赛中提示 -->
    <div v-if="gamePhase === 'racing'" class="racing-hint">
      <div class="racing-text">比赛进行中...</div>
    </div>

    <!-- 下注面板 -->
    <div class="bet-container" v-if="gamePhase !== 'racing'">
      <BetPanel
        :choice="choice"
        :bet-amount="betAmount"
        :balance="balance"
        :is-insufficient="isInsufficient"
        :game-phase="gamePhase"
        :can-bet="canBet"
        @select="selectChoice"
        @set-amount="setBetAmount"
        @quick-bet="quickBet"
        @place-bet="placeBet"
      />
    </div>

    <!-- 弹窗区 -->
    <GiantResultModal
      :visible="showResult"
      :result="raceResult"
      :choice="choice"
      @close="closeResult"
    />
    <RecordModal
      :visible="showHistory"
      title="对局记录（近50局）"
      :items="history"
      mode="history"
      :config="giantConfig"
      @close="showHistory = false"
    />
    <RecordModal
      :visible="showTransactions"
      title="积分明细"
      :items="transactions"
      mode="transactions"
      @close="showTransactions = false"
    />
    <GiantTrendModal
      :visible="showTrend"
      :history="history"
      @close="showTrend = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue' // 修复：引入 onUnmounted
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useGame, useToast } from '../composables/useGame.js'
import GameTrack from '../components/GameTrack.vue'
import BetPanel from '../components/BetPanel.vue'
import GiantResultModal from '../components/GiantResultModal.vue'
import RecordModal from '../components/RecordModal.vue'
import GiantTrendModal from '../components/GiantTrendModal.vue'
import ConfettiEffect from '../components/ConfettiEffect.vue'
import ToastContainer from '../components/ToastContainer.vue'

const router = useRouter()
const { currentUser, isAdmin, logout, refreshUser } = useAuth()
const game = useGame()

const showTrend = ref(false)

// 修复：解构出 cleanupGame
const { balance, displayBalance, balanceAnimating, choice, betAmount, gamePhase, raceResult, history, transactions, showResult, showHistory, showTransactions, isInsufficient, redProgress, blueProgress, redMood, blueMood, showWineRed, showWineBlue, screenShaking, showConfetti, soundEnabled, canBet, fetchBalance, placeBet, fetchHistory, fetchTransactions, closeResult, setBetAmount, quickBet, selectChoice, toggleSound, playTapSound, cleanupGame } = game

const giantConfig = {
  choiceMap: { red: '红巨人', blue: '蓝巨人', draw: '平局' },
  resultMap: {
    red:  { label: '红', color: '#ff4d4f' },
    blue: { label: '蓝', color: '#1890ff' },
    draw: { label: '和', color: '#faad14' }
  }
}

function goToLobby() {
  router.push('/')
}

onMounted(() => {
  fetchBalance()
  fetchHistory()
  fetchTransactions()
  refreshUser()
})

// 修复 A-05：组件卸载时清理动画和定时器，防止内存泄漏
onUnmounted(() => {
  if (cleanupGame) cleanupGame()
})
</script>

<style scoped>
.game-app {
  min-height: 100vh;
  background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.75)), url('/assets/images/bg.01.png');
  background-size: 140% auto;
  background-position: center;
  background-attachment: fixed;
  position: relative;
  display: flex;
  flex-direction: column;
}
.game-app.shaking { animation: shake 0.4s ease; }

.top-bar { 
  display:flex; justify-content:space-between; align-items:center; 
  padding:8px 12px; background:rgba(0,0,0,0.6); backdrop-filter:blur(10px); 
  position:sticky; top:0; z-index:10; 
}
.title-area { display:flex; align-items:center; gap:6px; }
.game-title { font-size:17px; font-weight:800; color:var(--color-gold); margin:0; }
.icon-btn { 
  width:28px; height:28px; border-radius:50%; border:none; 
  background:rgba(255,255,255,0.1); color:white; font-size:14px; 
  display:flex; align-items:center; justify-content:center; cursor:pointer; 
}
.user-area { display:flex; align-items:center; gap:8px; }
.username { font-size:11px; color:var(--color-text-dim); }
.balance-area { display:flex; align-items:center; gap:4px; background:rgba(0,0,0,0.3); padding:2px 8px; border-radius:12px; }
.balance-label { font-size:10px; color:var(--color-text-dim); }
.balance-value { font-size:16px; font-weight:900; color:var(--color-gold); text-shadow:0 0 8px var(--color-gold-glow); transition:transform 0.2s; }
.balance-value.animating { transform:scale(1.1); }

.tool-bar {
  display:flex; gap:4px; padding:6px 12px; background:rgba(0,0,0,0.3);
  border-bottom:1px solid rgba(255,255,255,0.05);
}
.tool-btn {
  flex:1; height:30px; border-radius:6px; border:none; 
  background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.7); 
  font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;
}
.tool-btn:active { background:rgba(255,255,255,0.15); }
.admin-btn { color:var(--color-gold); }

.racing-hint { padding:12px; text-align:center; }
.racing-text { font-size:16px; font-weight:700; color:var(--color-gold); animation:pulse 1s ease infinite; }

.bet-container {
  padding:0 12px;
  flex:1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
@keyframes shake { 0%,100%{transform:translateX(0)} 10%,30%,50%,70%,90%{transform:translateX(-4px)} 20%,40%,60%,80%{transform:translateX(4px)} }
</style>
