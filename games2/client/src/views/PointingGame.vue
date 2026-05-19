<template>
  <div class="game-app" :class="{ shaking: screenShaking }">
    <ConfettiEffect v-if="showConfetti" />
    <ToastContainer />
    
    <!-- 顶部栏 -->
    <header class="top-bar">
      <div class="title-area">
        <h1 class="game-title">点兵点将</h1>
        <button class="icon-btn" @click="toggleSound">{{ soundEnabled ? '🔊' : '🔇' }}</button>
      </div>
      <div class="user-area">
        <span class="username">{{ currentUser?.phone }}</span>
        <div class="balance-area">
          <span class="balance-label">积分</span>
          <span class="balance-value">{{ balance.toLocaleString() }}</span>
        </div>
      </div>
    </header>

    <!-- 快捷功能图标栏 -->
    <div class="tool-bar">
      <button class="tool-btn" @click="showTrend = true">📈 走势</button>
      <button class="tool-btn" @click="showHistory = true">📋 记录</button>
      <button class="tool-btn" @click="showTransactions = true">💰 明细</button>
      <button v-if="isAdmin" class="tool-btn admin-btn" @click="$router.push('/admin')">⚙️ 后台</button>
      <button class="tool-btn" @click="$router.push('/')">🏠 大厅</button>
    </div>

    <!-- 游戏主体区域 -->
    <div class="game-content">
      <!-- 角色卡牌区域 -->
      <div class="character-cards">
        <div v-for="(character, index) in characters" :key="index" class="character-card" :class="getClassNames(character, index)" @click="placeBet('character', character.name)">
          <div class="character-image">
            <img :src="character.image" :alt="character.name" draggable="false">
          </div>
          <div class="character-name">{{ character.name }}</div>
          <div class="character-odds">{{ character.odds }}倍</div>
          <!-- 动画中的红叉叉 -->
          <div v-if="animatingEliminated.includes(character.name)" class="x-mark-anim"></div>
          <!-- 结果中的红叉叉 -->
          <div v-if="result && !result.survivedCharacters.includes(character.name) && result.resultType === 'normal'" class="x-mark-anim"></div>
          <div v-if="result && result.resultType === 'all_eliminated'" class="x-mark-anim"></div>
          
          <!-- 角色下注金额显示 -->
          <div v-if="characterBets[character.name] > 0" class="bet-badge">
            {{ characterBets[character.name] }}
          </div>
        </div>
      </div>

      <!-- 下注区域 -->
      <div class="betting-area">
        <div class="bet-options">
          <div class="bet-group">
            <h3>性别下注</h3>
            <div class="bet-buttons">
              <button class="bet-btn" :class="{ selected: genderBets.male > 0 }" @click="placeBet('gender', 'male')">
                猜男 (1.9倍)
                <span v-if="genderBets.male > 0" class="btn-bet-amount">{{ genderBets.male }}</span>
              </button>
              <button class="bet-btn" :class="{ selected: genderBets.female > 0 }" @click="placeBet('gender', 'female')">
                猜女 (1.9倍)
                <span v-if="genderBets.female > 0" class="btn-bet-amount">{{ genderBets.female }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 筹码选择区 -->
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
          <button class="clear-btn" @click="clearBets" v-if="totalBetAmount > 0">清除</button>
        </div>

        <button class="start-game-btn" :disabled="totalBetAmount === 0 || isAnimating" @click="startGame">
          {{ isAnimating ? '点兵点将中...' : '开始游戏' }}
        </button>
      </div>
    </div>

    <!-- 结算弹窗 (传入详细的 details 数组) -->
    <ResultModal v-if="showResult" :result="gameResult" @close="closeResult" />

    <!-- 弹窗区 -->
    <PointingTrendModal v-if="showTrend" v-model:visible="showTrend" />
    <PointingRecordModal v-if="showHistory" v-model:visible="showHistory" />
    <PointingTransactionsModal v-if="showTransactions" v-model:visible="showTransactions" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import ResultModal from '../components/ResultModal.vue'
import PointingTrendModal from '../components/PointingTrendModal.vue'
import PointingRecordModal from '../components/PointingRecordModal.vue'
import PointingTransactionsModal from '../components/PointingTransactionsModal.vue'
import ConfettiEffect from '../components/ConfettiEffect.vue'
import ToastContainer from '../components/ToastContainer.vue'

const router = useRouter()
const { currentUser, isAdmin } = useAuth()

// 基础状态
const balance = ref(0)
const isAnimating = ref(false)
const showResult = ref(false)
const gameResult = ref(null)
const result = ref(null) 

// 弹窗状态
const showTrend = ref(false)
const showHistory = ref(false)
const showTransactions = ref(false)

// 特效状态
const screenShaking = ref(false)
const showConfetti = ref(false)
const soundEnabled = ref(true)

// 动画状态
const highlightIndex = ref(-1) // 当前高亮的转盘索引
const animatingEliminated = ref([]) // 动画中已经被暗杀的角色

// 下注数据
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

async function fetchBalance() {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/balance', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.balance !== undefined) balance.value = data.balance
  } catch (err) { console.error(err) }
}

function placeBet(type, name) {
  if (isAnimating.value) return
  if (balance.value - totalBetAmount.value < currentChip.value) return alert('积分不足')
  if (type === 'gender') genderBets[name] += currentChip.value
  else if (type === 'character') characterBets[name] += currentChip.value
}

function clearBets() {
  genderBets.male = 0; genderBets.female = 0
  for (let key in characterBets) characterBets[key] = 0
}

// 延时工具
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function startGame() {
  if (totalBetAmount.value === 0 || isAnimating.value) return
  if (balance.value < totalBetAmount.value) return alert('积分不足')

  isAnimating.value = true
  // 🔥 关键：开局瞬间清空上一局残留结果和动画状态
  result.value = null 
  animatingEliminated.value = []
  highlightIndex.value = -1

  const bets = []
  if (genderBets.male > 0) bets.push({ type: 'gender', choice: 'male', amount: genderBets.male })
  if (genderBets.female > 0) bets.push({ type: 'gender', choice: 'female', amount: genderBets.female })
  for (let name in characterBets) {
    if (characterBets[name] > 0) bets.push({ type: 'character', choice: name, amount: characterBets[name] })
  }

  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/pointing/bet', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ bets })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '下注失败')
    
    // 🔥 拿到后端结果，执行转盘动画
    await playAssassinationAnimation(data.result)

    // 动画结束，更新最终状态
    result.value = data.result
    balance.value = data.balance 
    
    // 构建详细的结算明细
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

  } catch (err) {
    alert(err.message || '下注失败')
  } finally {
    isAnimating.value = false
  }
}

// 构建结算明细函数
function buildResultDetails(data, bets) {
  const details = bets.map(bet => {
    let isWin = false
    let payout = 0
    if (data.result.resultType === 'all_survived') {
      isWin = true
      payout = bet.type === 'gender' ? bet.amount * 1.9 : bet.amount * characters.value.find(c=>c.name===bet.choice).odds
    } else if (data.result.resultType === 'normal') {
      if (bet.type === 'gender') {
        const winGender = characters.value.find(c => data.result.survivedCharacters.includes(c.name))?.gender
        if (bet.choice === winGender) { isWin = true; payout = bet.amount * 1.9 }
      } else {
        if (data.result.survivedCharacters.includes(bet.choice)) {
          isWin = true; payout = bet.amount * characters.value.find(c=>c.name===bet.choice).odds
        }
      }
    }
    return { choice: bet.choice, amount: bet.amount, isWin, payout: Math.floor(payout) }
  })

  return {
    totalWin: data.netChange > 0,
    netChange: data.netChange,
    details,
    specialText: data.result.resultType === 'all_survived' ? '通赢！' : 
                  data.result.resultType === 'all_eliminated' ? '通杀！' : ''
  }
}

// 🔥 核心转盘暗杀动画
async function playAssassinationAnimation(backendResult) {
  const allChars = characters.value.map(c => c.name)
  let toEliminate = []
  
  if (backendResult.resultType === 'all_eliminated') {
    toEliminate = [...allChars]
  } else if (backendResult.resultType === 'normal') {
    toEliminate = allChars.filter(c => !backendResult.survivedCharacters.includes(c))
  }
  // 通赢没有暗杀目标，转圈后全部高亮

  let currentIndex = 0
  let speed = 80 // 初始转速
  
  // 1. 随机空转 1-2 圈，营造紧张感
  const emptyRounds = 8 + Math.floor(Math.random() * 8)
  for (let i = 0; i < emptyRounds; i++) {
    highlightIndex.value = currentIndex % 8
    currentIndex++
    await sleep(speed)
  }

  // 2. 逐个暗杀目标
  for (let i = 0; i < toEliminate.length; i++) {
    const targetName = toEliminate[i]
    const targetIndex = allChars.indexOf(targetName)
    
    // 计算跳到目标需要的步数
    let stepsToTarget = (targetIndex - (currentIndex % 8) + 8) % 8
    if (stepsToTarget === 0) stepsToTarget = 8 // 至少转一圈

    // 减速靠近目标
    for (let s = 0; s < stepsToTarget; s++) {
      highlightIndex.value = currentIndex % 8
      currentIndex++
      speed = 80 + (s * 40) // 越靠近目标越慢
      await sleep(speed)
    }

    // 暗杀！加上红叉叉
    animatingEliminated.value.push(targetName)
    screenShaking.value = true
    setTimeout(() => screenShaking.value = false, 300)
    await sleep(1200) // 停顿展示暗杀效果
    speed = 80 // 恢复速度准备找下一个
  }

  // 3. 如果是通赢，最后闪一下绿光
  if (backendResult.resultType === 'all_survived') {
    highlightIndex.value = -1
    await sleep(500)
  }

  highlightIndex.value = -1 // 动画结束，清除高亮
}

function closeResult() {
  showResult.value = false
  clearBets() // 关闭结算时清除下注
}

function toggleSound() { soundEnabled.value = !soundEnabled.value }

function getClassNames(character, index) {
  const classes = {
    highlight: highlightIndex.value === index, // 转盘高亮
    survived: false,
    'special-all-survived': false,
  }
  // 最终结果状态 (动画结束后由 result 触发)
  if (result.value) {
    if (result.value.resultType === 'all_survived') classes['special-all-survived'] = true
    else if (result.value.resultType === 'normal' && result.value.survivedCharacters.includes(character.name)) {
      classes.survived = true
    }
  }
  return classes
}

onMounted(() => { fetchBalance() })
</script>

<style scoped>
/* 基础布局样式保持不变 */
.game-app { min-height: 100vh; background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.75)), url('/assets/images/bg.01.png'); background-size: 140% auto; background-position: center; background-attachment: fixed; position: relative; display: flex; flex-direction: column; }
.game-app.shaking { animation: shake 0.3s ease; }
.top-bar { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(0,0,0,0.6); backdrop-filter:blur(10px); position:sticky; top:0; z-index:10; }
.title-area { display:flex; align-items:center; gap:6px; }
.game-title { font-size:17px; font-weight:800; color:var(--color-gold); margin:0; }
.icon-btn { width:28px; height:28px; border-radius:50%; border:none; background:rgba(255,255,255,0.1); color:white; font-size:14px; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.user-area { display:flex; align-items:center; gap:8px; }
.username { font-size:11px; color:var(--color-text-dim); }
.balance-area { display:flex; align-items:center; gap:4px; background:rgba(0,0,0,0.3); padding:2px 8px; border-radius:12px; }
.balance-label { font-size:10px; color:var(--color-text-dim); }
.balance-value { font-size:16px; font-weight:900; color:var(--color-gold); text-shadow:0 0 8px var(--color-gold-glow); }
.tool-bar { display:flex; gap:4px; padding:6px 12px; background:rgba(0,0,0,0.3); }
.tool-btn { flex:1; height:30px; border-radius:6px; border:none; background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.7); font-size:12px; cursor:pointer; }
.admin-btn { color:var(--color-gold); }
.game-content { flex:1; display: flex; flex-direction: column; padding: 20px; gap: 20px; }

/* 角色卡牌 */
.character-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 600px; margin: 0 auto; }
.character-card { background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 10px; text-align: center; cursor: pointer; transition: all 0.1s; color: white; position: relative; }
.character-card:active { transform: scale(0.95); }
.character-image { width: 60px; height: 60px; margin: 0 auto 8px; border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.2); }
.character-image img { width: 100%; height: 100%; object-fit: cover; }
.character-name { font-weight: bold; font-size: 13px; }
.character-odds { font-size: 11px; color: #d4af37; }

/* 动画与状态样式 */
.character-card.highlight { border-color: #fff; background: rgba(255, 255, 255, 0.3); transform: scale(1.05); box-shadow: 0 0 15px rgba(255,255,255,0.5); z-index: 2; }
.character-card.survived { border-color: #4ade80; background: rgba(74, 222, 128, 0.1); }
.character-card.special-all-survived { border-color: #4ade80; background: rgba(74, 222, 128, 0.2); box-shadow: 0 0 15px rgba(74, 222, 128, 0.3); }

/* 红叉叉动画 */
.x-mark-anim { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center; border-radius: 6px; animation: xAppear 0.3s ease; }
.x-mark-anim::after { content: '✕'; font-size: 50px; color: #ef4444; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
@keyframes xAppear { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.bet-badge { position: absolute; top: -8px; right: -8px; background: var(--color-gold); color: #000; font-size: 12px; font-weight: bold; border-radius: 10px; padding: 2px 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }

/* 下注区域 */
.betting-area { max-width: 600px; margin: 0 auto; background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; }
.bet-group { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 15px; }
.bet-group h3 { margin: 0 0 10px 0; color: var(--color-gold); font-size: 14px; }
.bet-buttons { display: flex; gap: 10px; }
.bet-btn { flex: 1; padding: 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.05); color: white; cursor: pointer; position: relative; }
.bet-btn.selected { border-color: var(--color-gold); background: rgba(255,215,0,0.15); }
.btn-bet-amount { margin-left: 5px; background: var(--color-gold); color: #000; font-size: 12px; font-weight: bold; padding: 1px 6px; border-radius: 8px; }

.chip-selector { margin-top: 15px; display: flex; align-items: center; gap: 10px; }
.chip-selector label { color: white; font-size: 14px; }
.chips { display: flex; gap: 8px; flex: 1; }
.chip-btn { flex: 1; padding: 8px 0; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.05); color: white; cursor: pointer; font-weight: bold; }
.chip-btn.active { background: var(--color-gold); color: #000; border-color: var(--color-gold); }

.action-area { margin-top: 15px; display: flex; justify-content: space-between; align-items: center; }
.total-bet { color: white; font-size: 16px; font-weight: bold; }
.total-bet span { color: var(--color-gold); font-size: 20px; }
.clear-btn { padding: 6px 12px; border: 1px solid #ef4444; border-radius: 4px; background: transparent; color: #ef4444; cursor: pointer; }

.start-game-btn { width: 100%; padding: 12px; margin-top: 15px; border: none; border-radius: 8px; background: var(--color-gold); color: #000; font-weight: bold; font-size: 16px; cursor: pointer; }
.start-game-btn:disabled { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.5); cursor: not-allowed; }

@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
@media (max-width: 480px) { .character-cards { grid-template-columns: repeat(2, 1fr); } }
</style>
