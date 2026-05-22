<template>
  <div class="game-app" :class="{ shaking: screenShaking }">
    <ConfettiEffect v-if="showConfetti" />
    <ToastContainer />
    <header class="top-bar">
      <div class="title-area">
        <h1 class="game-title">点兵点将</h1>
        <button class="icon-btn" @click="toggleSound">{{ soundEnabled ? '🔊' : '🔇' }}</button>
      </div>
      <div class="user-area">
        <span class="username">{{ currentUser?.phone }}</span>
        <div class="balance-area">
          <span class="balance-label">积分</span>
          <span class="balance-value">{{ displayBalance.toLocaleString() }}</span>
        </div>
      </div>
    </header>
    <div class="tool-bar">
      <button class="tool-btn" @click="showTrend = true">📈 走势</button>
      <button class="tool-btn" @click="showHistory = true; fetchPointingHistory()">📋 记录</button>
      <button class="tool-btn" @click="showTransactions = true; fetchPointingTransactions()">💰 明细</button>
      <button v-if="isAdmin" class="tool-btn admin-btn" @click="$router.push('/admin')">⚙️ 后台</button>
      <button class="tool-btn" @click="$router.push('/')">🏠 大厅</button>
    </div>
    <div class="game-content">
      <PointingBetPanel
        :characters="characters"
        :balance="balance"
        :is-animating="isAnimating"
        :animating-eliminated="animatingEliminated"
        :result="result"
        :highlight-index="highlightIndex"
        @update-balance="updateBalance"
        @place-bet="startGame"
      />
    </div>
    <PointingResultModal :visible="showResult" :result="gameResult" @close="closeResult" />
    <RecordModal :visible="showHistory" title="对局记录" :items="pointingHistory" mode="history" :config="pointingConfig" @close="showHistory = false" />
    <RecordModal :visible="showTransactions" title="积分明细" :items="pointingTransactions" mode="transactions" @close="showTransactions = false" />
    <PointingTrendModal :visible="showTrend" :history="pointingHistory" @close="showTrend = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import PointingBetPanel from '../components/PointingBetPanel.vue'
import RecordModal from '../components/RecordModal.vue'
import PointingResultModal from '../components/PointingResultModal.vue'
import PointingTrendModal from '../components/PointingTrendModal.vue'
import ConfettiEffect from '../components/ConfettiEffect.vue'
import ToastContainer from '../components/ToastContainer.vue'

const router = useRouter()
const { currentUser, isAdmin, balance, displayBalance, updateBalance, stopBalanceAnimation, authFetch, fetchBalance, refreshUser } = useAuth()

const pointingConfig = {
  choiceMap: {
    '赵云': '赵云(5倍)', '秦良玉': '秦良玉(5倍)', '马超': '马超(5倍)', '花木兰': '花木兰(5倍)',
    '关羽': '关羽(10倍)', '张飞': '张飞(20倍)', '梁红玉': '梁红玉(30倍)', '穆桂英': '穆桂英(40倍)'
  },
  resultMap: {
    '赵云': { label: '赵云胜', color: '#4ade80' }, '秦良玉': { label: '秦良玉胜', color: '#4ade80' },
    '马超': { label: '马超胜', color: '#4ade80' }, '花木兰': { label: '花木兰胜', color: '#4ade80' },
    '关羽': { label: '关羽胜', color: '#ff9f43' }, '张飞': { label: '张飞胜', color: '#ff9f43' },
    '梁红玉': { label: '梁红玉胜', color: '#ff9f43' }, '穆桂英': { label: '穆桂英胜', color: '#ff9f43' },
    all_survived: { label: '通赢', color: '#4ade80' }, all_eliminated: { label: '通杀', color: '#ef4444' }
  }
}

const showResult = ref(false)
const showTrend = ref(false)
const showHistory = ref(false)
const showTransactions = ref(false)
const screenShaking = ref(false)
const showConfetti = ref(false)
const soundEnabled = ref(true)
const isAnimating = ref(false)
const gameResult = ref(null)
const result = ref(null)
const highlightIndex = ref(-1)
const animatingEliminated = ref([])

const characters = ref([
  { name: '赵云', tier: 'normal', odds: 5, image: '/assets/images/games2/赵云.png' },
  { name: '秦良玉', tier: 'normal', odds: 5, image: '/assets/images/games2/秦良玉.png' },
  { name: '马超', tier: 'normal', odds: 5, image: '/assets/images/games2/马超.png' },
  { name: '花木兰', tier: 'normal', odds: 5, image: '/assets/images/games2/花木兰.png' },
  { name: '关羽', tier: 'special', odds: 10, image: '/assets/images/games2/关羽.png' },
  { name: '张飞', tier: 'special', odds: 20, image: '/assets/images/games2/张飞.png' },
  { name: '梁红玉', tier: 'special', odds: 30, image: '/assets/images/games2/梁红玉.png' },
  { name: '穆桂英', tier: 'special', odds: 40, image: '/assets/images/games2/穆桂英.png' }
])

const pointingHistory = ref([])
const pointingTransactions = ref([])

let isMounted = true
let isPageHidden = false

const handleVisibilityChange = () => {
  isPageHidden = document.hidden
}

const imagesPreloaded = ref(false)
function preloadImages() {
  let loaded = 0
  const total = characters.value.length
  if (total === 0) { imagesPreloaded.value = true; return }
  characters.value.forEach(c => {
    const img = new Image()
    img.src = c.image
    img.onload = img.onerror = () => {
      loaded++
      if (loaded >= total) imagesPreloaded.value = true
    }
  })
  setTimeout(() => { imagesPreloaded.value = true }, 3000)
}

onUnmounted(() => {
  isMounted = false
  stopBalanceAnimation()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

async function fetchPointingHistory() {
  try {
    const r = await authFetch('/api/pointing/history?limit=30')
    const d = await r.json()
    if (r.ok) pointingHistory.value = d.history || []
  } catch (e) {}
}

async function fetchPointingTransactions() {
  try {
    const r = await authFetch('/api/pointing/transactions?limit=50')
    const d = await r.json()
    if (r.ok) pointingTransactions.value = d.list || []
  } catch (e) {}
}

const sleep = ms => new Promise(resolve => {
  if (!isMounted || isPageHidden) return resolve()
  setTimeout(resolve, ms)
})

function resetGameState() {
  isAnimating.value = false
  result.value = null
  highlightIndex.value = -1
  animatingEliminated.value = []
  screenShaking.value = false
  showConfetti.value = false
}

async function startGame(betData) {
  if (isAnimating.value) return
  resetGameState()
  isAnimating.value = true

  try {
    const res = await authFetch('/api/pointing/bet', {
      method: 'POST',
      body: JSON.stringify({ bets: betData.bets })
    })
    const data = await res.json()

    if (!isMounted) return
    if (!res.ok) throw new Error(data.error || '下注失败')

    data.result = {
      resultType: data.result.resultType ?? data.result.type,
      survivedCharacters: data.result.survivedCharacters ?? data.result.survived
    }
    data.netChange = data.netChange ?? (data.totalPayout - betData.totalBet)

    await playAssassinationAnimation(data.result)

    if (!isMounted) return
    result.value = data.result
    updateBalance(data.balanceAfter ?? data.balance)
    gameResult.value = buildResultDetails(data, betData.bets)

    // 🚀 核心：本地增量同步走势图，0延迟！不再请求网络
    const newHistoryItem = {
      survivedCharacters: data.result.survivedCharacters,
      resultType: data.result.resultType,
      createdAt: new Date().toISOString()
    }
    pointingHistory.value.unshift(newHistoryItem)
    if (pointingHistory.value.length > 30) pointingHistory.value.pop()

    const isWin = data.netChange > 0
    if (isWin) {
      showConfetti.value = true
      setTimeout(() => { if(isMounted) showConfetti.value = false }, 3000)
    } else {
      screenShaking.value = true
      setTimeout(() => { if(isMounted) screenShaking.value = false }, 500)
    }
    showResult.value = true

    // 🚀 只拉明细，走势图已经本地更新了
    await fetchPointingTransactions()
  } catch (err) {
    alert(err.message || '下注失败')
    updateBalance(balance.value + betData.totalBet)
  } finally {
    if (isMounted) {
      isAnimating.value = false
    }
  }
}

function buildResultDetails(data, bets) {
  let resultIdentifier = data.result.resultType === 'all_survived' ? 'all_survived' :
                         data.result.resultType === 'all_eliminated' ? 'all_eliminated' :
                         (data.result.survivedCharacters[0] || '')

  const details = bets.map(bet => {
    let isWin = false
    let payout = 0
    const hero = characters.value.find(c => c.name === bet.choice)
    if (!hero) return { choice: bet.choice, amount: bet.amount, isWin, payout }

    if (data.result.resultType === 'all_survived') {
      isWin = true
      payout = bet.amount * hero.odds
    } else if (data.result.resultType === 'normal') {
      if (data.result.survivedCharacters.includes(bet.choice)) {
        isWin = true
        payout = bet.amount * hero.odds
      }
    }
    return { choice: bet.choice, amount: bet.amount, isWin, payout: Math.floor(payout) }
  })

  return {
    result: resultIdentifier,
    totalWin: data.netChange > 0,
    netChange: data.netChange,
    details,
    specialText: data.result.resultType === 'all_survived' ? '通赢！' : data.result.resultType === 'all_eliminated' ? '通杀！' : ''
  }
}

async function playAssassinationAnimation(backendResult) {
  const allChars = characters.value.map(c => c.name)
  let toEliminate = []

  if (backendResult.resultType === 'all_eliminated') {
    toEliminate = [...allChars]
  } else if (backendResult.resultType === 'normal') {
    toEliminate = allChars.filter(c => !backendResult.survivedCharacters.includes(c))
  }

  let currentIndex = 0
  toEliminate.sort(() => Math.random() - 0.5)

  for (let i = 0; i < toEliminate.length; i++) {
    if (!isMounted) return

    const targetName = toEliminate[i]
    const targetIndex = allChars.indexOf(targetName)
    let speed = 40
    let stepsToTarget = Math.floor(8 * (0.8 + Math.random() * 0.4)) + ((targetIndex - (currentIndex % 8) + 8) % 8)

    for (let s = 0; s < stepsToTarget; s++) {
      if (!isMounted || isPageHidden) {
        highlightIndex.value = -1
        animatingEliminated.value = toEliminate.slice(0, i + 1)
        return
      }
      highlightIndex.value = currentIndex % 8
      currentIndex++
      if (s > stepsToTarget * 0.7) speed += 20
      if (s > stepsToTarget * 0.9) speed += 40
      await sleep(speed)
    }

    highlightIndex.value = -1
    animatingEliminated.value.push(targetName)
    screenShaking.value = true
    setTimeout(() => { if(isMounted) screenShaking.value = false }, 200)
    await sleep(600)
  }

  if (backendResult.resultType === 'all_survived') {
    for(let i=0; i<3; i++) {
      if (!isMounted || isPageHidden) return
      highlightIndex.value = -2
      await sleep(150)
      highlightIndex.value = -1
      await sleep(150)
    }
  }
  highlightIndex.value = -1
}

function closeResult() {
  showResult.value = false
  resetGameState()
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value
}

onMounted(() => {
  console.log('[点兵点将] 初始化')
  fetchBalance()     
  refreshUser()      
  preloadImages()
  fetchPointingHistory() // 进页面预加载走势
  document.addEventListener('visibilitychange', handleVisibilityChange)
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
.game-app.shaking { animation: shake 0.3s ease; }

.top-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; background: rgba(0,0,0,0.6);
  backdrop-filter: blur(10px); position: sticky; top: 0; z-index: 10;
}
.title-area { display: flex; align-items: center; gap: 6px; }
.game-title { font-size: 17px; font-weight: 800; color: var(--color-gold, #d4af37); margin: 0; }
.icon-btn {
  width: 28px; height: 28px; border-radius: 50%; border: none;
  background: rgba(255,255,255,0.1); color: white; font-size: 14px;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.user-area { display: flex; align-items: center; gap: 8px; }
.username { font-size: 11px; color: rgba(255,255,255,0.6); }
.balance-area {
  display: flex; align-items: center; gap: 4px;
  background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 12px;
}
.balance-label { font-size: 10px; color: rgba(255,255,255,0.6); }
.balance-value {
  font-size: 16px; font-weight: 900; color: var(--color-gold, #d4af37);
  text-shadow: 0 0 8px rgba(212, 175, 55, 0.4);
}
.tool-bar { display: flex; gap: 4px; padding: 6px 12px; background: rgba(0,0,0,0.3); }
.tool-btn {
  flex: 1; height: 30px; border-radius: 6px; border: none;
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); font-size: 12px; cursor: pointer;
}
.admin-btn { color: var(--color-gold, #d4af37); }
.game-content { flex: 1; display: flex; flex-direction: column; padding: 20px; gap: 20px; }

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
</style>
