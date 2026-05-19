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
      <div class="character-cards">
        <div
          v-for="(character, index) in characters"
          :key="index"
          class="character-card"
          :class="getClassNames(character, index)"
          @click="placeBet('character', character.name)"
        >
          <div class="character-image">
            <img :src="character.image" :alt="character.name" draggable="false">
          </div>
          <div class="character-name">{{ character.name }}</div>
          <div class="character-odds">{{ character.odds }}倍</div>
          <div v-if="animatingEliminated.includes(character.name)" class="x-mark-anim"></div>
          <div v-if="result && !result.survivedCharacters.includes(character.name) && result.resultType === 'normal'" class="x-mark-anim"></div>
          <div v-if="result && result.resultType === 'all_eliminated'" class="x-mark-anim"></div>
          <div v-if="characterBets[character.name] > 0" class="bet-badge" @click.stop="revokeBet('character', character.name)">
            {{ characterBets[character.name] }}
            <span class="revoke-x">✕</span>
          </div>
        </div>
      </div>

      <div class="betting-area">
        <div class="bet-options">
          <div class="bet-group">
            <h3>性别下注</h3>
            <div class="bet-buttons">
              <button class="bet-btn" :class="{ selected: genderBets.male > 0 }" @click="placeBet('gender', 'male')">
                猜男 (1.9倍)
                <span v-if="genderBets.male > 0" class="btn-bet-amount" @click.stop="revokeBet('gender', 'male')">{{ genderBets.male }} ✕</span>
              </button>
              <button class="bet-btn" :class="{ selected: genderBets.female > 0 }" @click="placeBet('gender', 'female')">
                猜女 (1.9倍)
                <span v-if="genderBets.female > 0" class="btn-bet-amount" @click.stop="revokeBet('gender', 'female')">{{ genderBets.female }} ✕</span>
              </button>
            </div>
          </div>
        </div>

        <div class="chip-selector">
          <label>筹码:</label>
          <div class="chips">
            <button class="chip-btn" :class="{ active: currentChip === 10 }" @click="currentChip = 10">10</button>
            <button class="chip-btn" :class="{ active: currentChip === 50 }" @click="currentChip = 50">50</button>
            <button class="chip-btn" :class="{ active: currentChip === 100 }" @click="currentChip = 100">100</button>
            <button class="chip-btn" :class="{ active: currentChip === 500 }" @click="currentChip = 500">500</button>
          </div>
        </div>

        <div class="action-area">
          <div class="total-bet">总计: <span>{{ totalBetAmount }}</span> 积分</div>
          <button class="clear-btn" @click="refundAndClearBets" v-if="totalBetAmount > 0">撤销全部</button>
        </div>

        <button class="start-game-btn" :disabled="totalBetAmount === 0 || isAnimating" @click="startGame">
          {{ isAnimating ? '点兵点将中...' : '开始游戏' }}
        </button>
      </div>
    </div>

    <!-- 弹窗区 -->
    <PointingResultModal
      :visible="showResult"
      :result="gameResult"
      @close="closeResult"
    />
    <RecordModal
      :visible="showHistory"
      title="对局记录"
      :items="pointingHistory"
      mode="history"
      :config="pointingConfig"
      @close="showHistory = false"
    />
    <RecordModal
      :visible="showTransactions"
      title="积分明细"
      :items="pointingTransactions"
      mode="transactions"
      @close="showTransactions = false"
    />
    <PointingTrendModal
      :visible="showTrend"
      :history="pointingHistory"
      @close="showTrend = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import RecordModal from '../components/RecordModal.vue'
import PointingResultModal from '../components/PointingResultModal.vue'
import PointingTrendModal from '../components/PointingTrendModal.vue'
import ConfettiEffect from '../components/ConfettiEffect.vue'
import ToastContainer from '../components/ToastContainer.vue'

const router = useRouter()
const { currentUser, isAdmin, balance, displayBalance, updateBalance, authFetch } = useAuth()

const pointingConfig = {
  choiceMap: {
    male: '猜男', female: '猜女',
    '赵云': '赵云', '关羽': '关羽', '张飞': '张飞', '马超': '马超',
    '秦良玉': '秦良玉', '梁红玉': '梁红玉', '穆桂英': '穆桂英', '花木兰': '花木兰'
  },
  resultMap: {
    male:           { label: '男胜', color: '#1890ff' },
    female:         { label: '女胜', color: '#ff6b9d' },
    all_survived:   { label: '通赢', color: '#4ade80' },
    all_eliminated: { label: '通杀', color: '#ef4444' }
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
const currentChip = ref(10)

const genderBets = reactive({ male: 0, female: 0 })
const characterBets = reactive({
  '赵云': 0, '关羽': 0, '张飞': 0, '马超': 0,
  '秦良玉': 0, '梁红玉': 0, '穆桂英': 0, '花木兰': 0
})

const characters = ref([
  { name: '赵云', gender: 'male', power: 4, odds: 2.7, image: '/assets/images/games2/赵云.png' },
  { name: '关羽', gender: 'male', power: 3, odds: 3.4, image: '/assets/images/games2/关羽.png' },
  { name: '张飞', gender: 'male', power: 2, odds: 4.9, image: '/assets/images/games2/张飞.png' },
  { name: '马超', gender: 'male', power: 1, odds: 8.0, image: '/assets/images/games2/马超.png' },
  { name: '秦良玉', gender: 'female', power: 4, odds: 2.7, image: '/assets/images/games2/秦良玉.png' },
  { name: '梁红玉', gender: 'female', power: 3, odds: 3.4, image: '/assets/images/games2/梁红玉.png' },
  { name: '穆桂英', gender: 'female', power: 2, odds: 4.9, image: '/assets/images/games2/穆桂英.png' },
  { name: '花木兰', gender: 'female', power: 1, odds: 8.0, image: '/assets/images/games2/花木兰.png' }
])

const totalBetAmount = computed(() => {
  let total = genderBets.male + genderBets.female
  for (let key in characterBets) total += characterBets[key]
  return total
})

const pointingHistory = ref([])
const pointingTransactions = ref([])

async function fetchPointingHistory() {
  try {
    const res = await authFetch('/api/pointing/history?limit=50')
    const data = await res.json()
    if (res.ok) {
      pointingHistory.value = data.history || data.list || data || []
    }
  } catch (e) {
    console.error('[点兵] 获取记录失败', e)
  }
}

async function fetchPointingTransactions() {
  try {
    const res = await authFetch('/api/pointing/transactions?limit=50')
    const data = await res.json()
    if (res.ok) {
      pointingTransactions.value = data.list || data.transactions || data || []
    }
  } catch (e) {
    console.error('[点兵] 获取明细失败', e)
  }
}

function placeBet(type, name) {
  if (isAnimating.value) return
  if (balance.value < currentChip.value) {
    alert('积分不足')
    return
  }
  updateBalance(balance.value - currentChip.value)
  if (type === 'gender') genderBets[name] += currentChip.value
  else if (type === 'character') characterBets[name] += currentChip.value
}

function revokeBet(type, name) {
  if (isAnimating.value) return
  let amount = 0
  if (type === 'gender') {
    amount = genderBets[name]
    genderBets[name] = 0
  } else {
    amount = characterBets[name]
    characterBets[name] = 0
  }
  if (amount > 0) updateBalance(balance.value + amount)
}

function refundAndClearBets() {
  if (isAnimating.value) return
  const total = totalBetAmount.value
  if (total > 0) updateBalance(balance.value + total)
  genderBets.male = 0
  genderBets.female = 0
  for (let key in characterBets) characterBets[key] = 0
}

function resetBets() {
  genderBets.male = 0
  genderBets.female = 0
  for (let key in characterBets) characterBets[key] = 0
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function startGame() {
  if (totalBetAmount.value === 0 || isAnimating.value) return

  isAnimating.value = true
  result.value = null
  animatingEliminated.value = []
  highlightIndex.value = -1

  const currentTotalBet = totalBetAmount.value

  const bets = []
  if (genderBets.male > 0) bets.push({ type: 'gender', choice: 'male', amount: genderBets.male })
  if (genderBets.female > 0) bets.push({ type: 'gender', choice: 'female', amount: genderBets.female })
  for (let name in characterBets) {
    if (characterBets[name] > 0) bets.push({ type: 'character', choice: name, amount: characterBets[name] })
  }

  try {
    const res = await authFetch('/api/pointing/bet', {
      method: 'POST',
      body: JSON.stringify({ bets })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '下注失败')

    await playAssassinationAnimation(data.result)
    result.value = data.result

    updateBalance(data.balance)

    // 构建 gameResult，包含 result 字段供弹窗使用
    gameResult.value = buildResultDetails(data, bets)

    const isWin = data.netChange > 0
    if (isWin) {
      showConfetti.value = true
      setTimeout(() => showConfetti.value = false, 3000)
    } else {
      screenShaking.value = true
      setTimeout(() => screenShaking.value = false, 500)
    }

    showResult.value = true

    await fetchPointingHistory()
    await fetchPointingTransactions()
  } catch (err) {
    updateBalance(balance.value + currentTotalBet)
    alert(err.message || '下注失败')
  } finally {
    isAnimating.value = false
    resetBets()
  }
}

function buildResultDetails(data, bets) {
  // ===== 推算获胜性别 =====
  let resultGender
  if (data.result.resultType === 'all_survived') {
    resultGender = 'all_survived'
  } else if (data.result.resultType === 'all_eliminated') {
    resultGender = 'all_eliminated'
  } else {
    const survivedChar = characters.value.find(c => data.result.survivedCharacters.includes(c.name))
    resultGender = survivedChar?.gender || 'male'
  }

  const details = bets.map(bet => {
    let isWin = false
    let payout = 0
    if (data.result.resultType === 'all_survived') {
      isWin = true
      payout = bet.type === 'gender'
        ? bet.amount * 1.9
        : bet.amount * characters.value.find(c => c.name === bet.choice).odds
    } else if (data.result.resultType === 'normal') {
      if (bet.type === 'gender') {
        const winGender = characters.value.find(c => data.result.survivedCharacters.includes(c.name))?.gender
        if (bet.choice === winGender) { isWin = true; payout = bet.amount * 1.9 }
      } else {
        if (data.result.survivedCharacters.includes(bet.choice)) {
          isWin = true
          payout = bet.amount * characters.value.find(c => c.name === bet.choice).odds
        }
      }
    }
    return { choice: bet.choice, amount: bet.amount, isWin, payout: Math.floor(payout) }
  })

  return {
    result: resultGender,
    totalWin: data.netChange > 0,
    netChange: data.netChange,
    details,
    specialText: data.result.resultType === 'all_survived'
      ? '通赢！'
      : data.result.resultType === 'all_eliminated' ? '通杀！' : ''
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
  let speed = 80

  const emptyRounds = 8 + Math.floor(Math.random() * 8)
  for (let i = 0; i < emptyRounds; i++) {
    highlightIndex.value = currentIndex % 8
    currentIndex++
    await sleep(speed)
  }

  for (let i = 0; i < toEliminate.length; i++) {
    const targetName = toEliminate[i]
    const targetIndex = allChars.indexOf(targetName)
    let stepsToTarget = (targetIndex - (currentIndex % 8) + 8) % 8
    if (stepsToTarget === 0) stepsToTarget = 8

    for (let s = 0; s < stepsToTarget; s++) {
      highlightIndex.value = currentIndex % 8
      currentIndex++
      speed = 80 + (s * 40)
      await sleep(speed)
    }

    animatingEliminated.value.push(targetName)
    screenShaking.value = true
    setTimeout(() => screenShaking.value = false, 300)
    await sleep(1200)
    speed = 80
  }

  if (backendResult.resultType === 'all_survived') {
    highlightIndex.value = -1
    await sleep(500)
  }
  highlightIndex.value = -1
}

function closeResult() {
  showResult.value = false
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value
}

function getClassNames(character, index) {
  const classes = {
    highlight: highlightIndex.value === index,
    survived: false,
    'special-all-survived': false
  }
  if (result.value) {
    if (result.value.resultType === 'all_survived') classes['special-all-survived'] = true
    else if (result.value.resultType === 'normal' && result.value.survivedCharacters.includes(character.name)) classes.survived = true
  }
  return classes
}

onMounted(() => {
  console.log('[点兵点将] 初始化')
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
  padding: 8px 12px; background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
  position: sticky; top: 0; z-index: 10;
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
.balance-area { display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 12px; }
.balance-label { font-size: 10px; color: rgba(255,255,255,0.6); }
.balance-value { font-size: 16px; font-weight: 900; color: var(--color-gold, #d4af37); text-shadow: 0 0 8px rgba(212, 175, 55, 0.4); }

.tool-bar { display: flex; gap: 4px; padding: 6px 12px; background: rgba(0,0,0,0.3); }
.tool-btn { flex: 1; height: 30px; border-radius: 6px; border: none; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); font-size: 12px; cursor: pointer; }
.admin-btn { color: var(--color-gold, #d4af37); }

.game-content { flex: 1; display: flex; flex-direction: column; padding: 20px; gap: 20px; }

.character-cards {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 12px; max-width: 600px; margin: 0 auto; width: 100%;
}
.character-card {
  background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2);
  border-radius: 8px; padding: 10px; text-align: center;
  cursor: pointer; transition: all 0.1s; color: white; position: relative;
}
.character-card:active { transform: scale(0.95); }
.character-image { width: 60px; height: 60px; margin: 0 auto 8px; border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.2); }
.character-image img { width: 100%; height: 100%; object-fit: cover; }
.character-name { font-weight: bold; font-size: 13px; }
.character-odds { font-size: 11px; color: #d4af37; }
.character-card.highlight { border-color: #fff; background: rgba(255,255,255,0.3); transform: scale(1.05); box-shadow: 0 0 15px rgba(255,255,255,0.5); z-index: 2; }
.character-card.survived { border-color: #4ade80; background: rgba(74,222,128,0.1); }
.character-card.special-all-survived { border-color: #4ade80; background: rgba(74,222,128,0.2); box-shadow: 0 0 15px rgba(74,222,128,0.3); }

.x-mark-anim {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(239,68,68,0.3); display: flex; align-items: center;
  justify-content: center; border-radius: 6px; animation: xAppear 0.3s ease;
}
.x-mark-anim::after { content: '✕'; font-size: 50px; color: #ef4444; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }

.bet-badge {
  position: absolute; top: -8px; right: -8px;
  background: var(--color-gold, #d4af37); color: #000;
  font-size: 12px; font-weight: bold; border-radius: 10px;
  padding: 2px 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  display: flex; align-items: center; gap: 2px;
}
.revoke-x { font-size: 10px; opacity: 0.6; }

.betting-area {
  max-width: 600px; margin: 0 auto; width: 100%;
  background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px;
}
.bet-group { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 15px; }
.bet-group h3 { margin: 0 0 10px 0; color: var(--color-gold, #d4af37); font-size: 14px; }
.bet-buttons { display: flex; gap: 10px; }
.bet-btn { flex: 1; padding: 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.05); color: white; cursor: pointer; position: relative; }
.bet-btn.selected { border-color: var(--color-gold, #d4af37); background: rgba(255,215,0,0.15); }
.btn-bet-amount { margin-left: 5px; background: var(--color-gold, #d4af37); color: #000; font-size: 12px; font-weight: bold; padding: 1px 6px; border-radius: 8px; }

.chip-selector { margin-top: 15px; display: flex; align-items: center; gap: 10px; }
.chip-selector label { color: white; font-size: 14px; }
.chips { display: flex; gap: 8px; flex: 1; }
.chip-btn { flex: 1; padding: 8px 0; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.05); color: white; cursor: pointer; font-weight: bold; }
.chip-btn.active { background: var(--color-gold, #d4af37); color: #000; border-color: var(--color-gold, #d4af37); }

.action-area { margin-top: 15px; display: flex; justify-content: space-between; align-items: center; }
.total-bet { color: white; font-size: 16px; font-weight: bold; }
.total-bet span { color: var(--color-gold, #d4af37); font-size: 20px; }
.clear-btn { padding: 6px 12px; border: 1px solid #ef4444; border-radius: 4px; background: transparent; color: #ef4444; cursor: pointer; }

.start-game-btn { width: 100%; padding: 12px; margin-top: 15px; border: none; border-radius: 8px; background: var(--color-gold, #d4af37); color: #000; font-weight: bold; font-size: 16px; cursor: pointer; }
.start-game-btn:disabled { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.5); cursor: not-allowed; }

@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
@keyframes xAppear { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }

@media (max-width: 480px) {
  .game-content { padding: 10px; gap: 10px; }
  .character-cards { gap: 6px; }
  .character-card { padding: 6px; border-width: 1px; }
  .character-image { width: 40px; height: 40px; margin-bottom: 4px; border-radius: 4px; }
  .character-name { font-size: 11px; }
  .character-odds { font-size: 9px; }
  .x-mark-anim::after { font-size: 30px; }
  .bet-badge { font-size: 9px; top: -4px; right: -4px; padding: 1px 4px; }
  .betting-area { padding: 12px; }
  .bet-group { padding: 10px; }
  .bet-btn { padding: 8px; font-size: 12px; }
  .chip-btn { padding: 6px 0; font-size: 12px; }
}
</style>
