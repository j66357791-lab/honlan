<template>
  <div class="game-app" :class="{ shaking: screenShaking }">
    <ConfettiEffect v-if="showConfetti" />
    <ToastContainer />

    <!-- 顶部栏 -->
    <header class="top-bar">
      <div class="title-area">
        <h1 class="game-title">巨人赛跑</h1>
        <button class="sound-btn" @click="toggleSound">{{ soundEnabled ? '🔊' : '🔇' }}</button>
      </div>
      <div class="user-area">
        <span class="username">{{ currentUser?.phone }}</span>
        <div class="balance-area">
          <span class="balance-label">积分</span>
          <span class="balance-value" :class="{ animating: balanceAnimating }">{{ displayBalance.toLocaleString() }}</span>
        </div>
        <button class="logout-btn" @click="handleLogout">退出</button>
      </div>
    </header>

    <!-- 赛道 -->
    <GameTrack :red-progress="redProgress" :blue-progress="blueProgress" :red-mood="redMood" :blue-mood="blueMood" :show-wine-red="showWineRed" :show-wine-blue="showWineBlue" />

    <!-- 比赛中提示 -->
    <div v-if="gamePhase === 'racing'" class="racing-hint"><div class="racing-text">比赛进行中...</div></div>

    <!-- 下注面板 -->
    <BetPanel v-if="gamePhase !== 'racing'" :choice="choice" :bet-amount="betAmount" :balance="balance" :is-insufficient="isInsufficient" :game-phase="gamePhase" :can-bet="canBet" @select="selectChoice" @set-amount="setBetAmount" @quick-bet="quickBet" @place-bet="placeBet" />

    <!-- 底部按钮 -->
    <div v-if="gamePhase !== 'racing'" class="bottom-actions">
      <button class="action-btn" @click="showHistory = true; fetchHistory()">📋 对局记录</button>
      <button class="action-btn" @click="showTransactions = true; fetchTransactions()">💰 积分明细</button>
      <button v-if="isAdmin" class="action-btn admin-btn" @click="$router.push('/admin')">⚙️ 管理后台</button>
    </div>

    <!-- 结果弹窗 -->
    <ResultModal v-if="showResult" :result="raceResult" :choice="choice" @close="closeResult" />

    <!-- 对局记录 -->
    <RecordModal :visible="showHistory" title="对局记录（近50局）" :items="history" mode="history" @close="showHistory = false" />

    <!-- 积分明细 -->
    <RecordModal :visible="showTransactions" title="积分明细" :items="transactions" mode="transactions" @close="showTransactions = false" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useGame, useToast } from '../composables/useGame.js'
import GameTrack from '../components/GameTrack.vue'
import BetPanel from '../components/BetPanel.vue'
import ResultModal from '../components/ResultModal.vue'
import RecordModal from '../components/RecordModal.vue'
import ConfettiEffect from '../components/ConfettiEffect.vue'
import ToastContainer from '../components/ToastContainer.vue'

const router = useRouter()
const { currentUser, isAdmin, logout, refreshUser } = useAuth()
const game = useGame()

const { balance, displayBalance, balanceAnimating, choice, betAmount, gamePhase, raceResult, history, transactions, showResult, showHistory, showTransactions, isInsufficient, redProgress, blueProgress, redMood, blueMood, showWineRed, showWineBlue, screenShaking, showConfetti, soundEnabled, canBet, fetchBalance, placeBet, fetchHistory, fetchTransactions, closeResult, setBetAmount, quickBet, selectChoice, toggleSound, playTapSound } = game

function handleLogout() {
  logout()
  router.push('/login')
}

onMounted(() => {
  console.log('[游戏大厅] 初始化')
  fetchBalance()
  fetchHistory()
  fetchTransactions()
  refreshUser()
})
</script>

<style scoped>
/* 只改了一处：background 用渐变叠暗遮罩，其他全部保持原样 */
.game-app {
  min-height: 100vh;
  background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.75)), url('/assets/images/bg.01.png');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  position: relative;
  padding-bottom: 20px;
}
.game-app.shaking { animation: shake 0.4s ease; }
.top-bar { display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:rgba(0,0,0,0.5); backdrop-filter:blur(10px); position:sticky; top:0; z-index:10; }
.title-area { display:flex; align-items:center; gap:8px; }
.game-title { font-size:18px; font-weight:800; color:var(--color-gold); }
.sound-btn { width:32px; height:32px; border-radius:50%; border:none; background:rgba(255,255,255,0.1); color:white; font-size:16px; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.user-area { display:flex; align-items:center; gap:8px; }
.username { font-size:12px; color:var(--color-text-dim); }
.balance-area { display:flex; align-items:center; gap:4px; }
.balance-label { font-size:11px; color:var(--color-text-dim); }
.balance-value { font-size:18px; font-weight:900; color:var(--color-gold); text-shadow:0 0 8px var(--color-gold-glow); transition:transform 0.2s; }
.balance-value.animating { transform:scale(1.1); }
.logout-btn { padding:3px 8px; border-radius:4px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.05); color:var(--color-text-dim); font-size:11px; cursor:pointer; }
.racing-hint { padding:12px; text-align:center; }
.racing-text { font-size:16px; font-weight:700; color:var(--color-gold); animation:pulse 1s ease infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
@keyframes shake { 0%,100%{transform:translateX(0)} 10%,30%,50%,70%,90%{transform:translateX(-4px)} 20%,40%,60%,80%{transform:translateX(4px)} }
.bottom-actions { display:flex; gap:8px; padding:8px 12px; }
.action-btn { flex:1; height:40px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:var(--color-text-dim); font-size:13px; font-weight:600; cursor:pointer; }
.action-btn:active { background:rgba(255,255,255,0.1); }
.admin-btn { color:var(--color-gold); border-color:rgba(255,215,0,0.3); }
</style>
