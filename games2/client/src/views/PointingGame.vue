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
          <div class="character-odds" :class="{ 'special-odds': character.tier === 'special' }">
            {{ character.odds }}倍
          </div>
          
          <!-- 动画击杀红叉 (有放大震屏效果) -->
          <div v-if="animatingEliminated.includes(character.name)" class="x-mark-anim"></div>
          <!-- 最终结果红叉 (静态暗淡) -->
          <div v-if="result && !result.survivedCharacters.includes(character.name) && result.resultType === 'normal' && !animatingEliminated.includes(character.name)" class="x-mark-static"></div>
          <div v-if="result && result.resultType === 'all_eliminated' && !animatingEliminated.includes(character.name)" class="x-mark-static"></div>

          <!-- 下注标记 -->
          <div v-if="characterBets[character.name] > 0" class="bet-badge" @click.stop="revokeBet('character', character.name)">
            {{ characterBets[character.name] }} <span class="revoke-x">✕</span>
          </div>
        </div>
      </div>

      <div class="betting-area">
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
    <PointingResultModal :visible="showResult" :result="gameResult" @close="closeResult" />
    <RecordModal :visible="showHistory" title="对局记录" :items="pointingHistory" mode="history" :config="pointingConfig" @close="showHistory = false" />
    <RecordModal :visible="showTransactions" title="积分明细" :items="pointingTransactions" mode="transactions" @close="showTransactions = false" />
    <PointingTrendModal :visible="showTrend" :history="pointingHistory" @close="showTrend = false" />
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

// ★ 配置映射
const pointingConfig = {
  choiceMap: { '赵云': '赵云(5倍)', '秦良玉': '秦良玉(5倍)', '马超': '马超(5倍)', '花木兰': '花木兰(5倍)', '关羽': '关羽(10倍)', '张飞': '张飞(20倍)', '梁红玉': '梁红玉(30倍)', '穆桂英': '穆桂英(40倍)' },
  resultMap: { '赵云': { label: '赵云胜', color: '#4ade80' }, '秦良玉': { label: '秦良玉胜', color: '#4ade80' }, '马超': { label: '马超胜', color: '#4ade80' }, '花木兰': { label: '花木兰胜', color: '#4ade80' }, '关羽': { label: '关羽胜', color: '#ff9f43' }, '张飞': { label: '张飞胜', color: '#ff9f43' }, '梁红玉': { label: '梁红玉胜', color: '#ff9f43' }, '穆桂英': { label: '穆桂英胜', color: '#ff9f43' }, all_survived: { label: '通赢', color: '#4ade80' }, all_eliminated: { label: '通杀', color: '#ef4444' } }
}

const showResult = ref(false); const showTrend = ref(false); const showHistory = ref(false); const showTransactions = ref(false)
const screenShaking = ref(false); const showConfetti = ref(false); const soundEnabled = ref(true)
const isAnimating = ref(false); const gameResult = ref(null); const result = ref(null)
const highlightIndex = ref(-1); const animatingEliminated = ref([])
const currentChip = ref(10)

const characterBets = reactive({ '赵云': 0, '秦良玉': 0, '马超': 0, '花木兰': 0, '关羽': 0, '张飞': 0, '梁红玉': 0, '穆桂英': 0 })

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

const totalBetAmount = computed(() => { let t = 0; for (let k in characterBets) t += characterBets[k]; return t })
const pointingHistory = ref([]); const pointingTransactions = ref([])

async function fetchPointingHistory() { try { const r = await authFetch('/api/pointing/history?limit=50'); const d = await r.json(); if (r.ok) pointingHistory.value = d.history || [] } catch (e) {} }
async function fetchPointingTransactions() { try { const r = await authFetch('/api/pointing/transactions?limit=50'); const d = await r.json(); if (r.ok) pointingTransactions.value = d.list || [] } catch (e) {} }

function placeBet(type, name) { if (isAnimating.value) return; if (balance.value < currentChip.value) { alert('积分不足'); return } updateBalance(balance.value - currentChip.value); characterBets[name] += currentChip.value }
function revokeBet(type, name) { if (isAnimating.value) return; const a = characterBets[name]; characterBets[name] = 0; if (a > 0) updateBalance(balance.value + a) }
function refundAndClearBets() { if (isAnimating.value) return; if (totalBetAmount.value > 0) updateBalance(balance.value + totalBetAmount.value); for (let k in characterBets) characterBets[k] = 0 }
function resetBets() { for (let k in characterBets) characterBets[k] = 0 }

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function startGame() {
  if (totalBetAmount.value === 0 || isAnimating.value) return
  isAnimating.value = true; result.value = null; animatingEliminated.value = []; highlightIndex.value = -1
  const currentTotalBet = totalBetAmount.value
  const bets = []; for (let n in characterBets) { if (characterBets[n] > 0) bets.push({ choice: n, amount: characterBets[n] }) }

  try {
    const res = await authFetch('/api/pointing/bet', { method: 'POST', body: JSON.stringify({ bets }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '下注失败')

    // ★ 执行刺激动画
    await playAssassinationAnimation(data.result)
    result.value = data.result
    updateBalance(data.balance)
    gameResult.value = buildResultDetails(data, bets)
    const isWin = data.netChange > 0
    if (isWin) { showConfetti.value = true; setTimeout(() => showConfetti.value = false, 3000) } 
    else { screenShaking.value = true; setTimeout(() => screenShaking.value = false, 500) }
    showResult.value = true
    await fetchPointingHistory(); await fetchPointingTransactions()
  } catch (err) {
    updateBalance(balance.value + currentTotalBet); alert(err.message || '下注失败')
  } finally { isAnimating.value = false; resetBets() }
}

function buildResultDetails(data, bets) {
  let resultIdentifier = data.result.resultType === 'all_survived' ? 'all_survived' : data.result.resultType === 'all_eliminated' ? 'all_eliminated' : (data.result.survivedCharacters[0] || '')
  const details = bets.map(bet => { let isWin = false; let payout = 0; const hero = characters.value.find(c => c.name === bet.choice); if (!hero) return { choice: bet.choice, amount: bet.amount, isWin, payout }; if (data.result.resultType === 'all_survived') { isWin = true; payout = bet.amount * hero.odds } else if (data.result.resultType === 'normal') { if (data.result.survivedCharacters.includes(bet.choice)) { isWin = true; payout = bet.amount * hero.odds } } return { choice: bet.choice, amount: bet.amount, isWin, payout: Math.floor(payout) } })
  return { result: resultIdentifier, totalWin: data.netChange > 0, netChange: data.netChange, details, specialText: data.result.resultType === 'all_survived' ? '通赢！' : data.result.resultType === 'all_eliminated' ? '通杀！' : '' }
}

// ★★★ 刺激动画：跑马灯轮转 + 减速 + 击杀 + 延迟 ★★★
// ★★★ 刺激动画：跑马灯轮转 + 击杀 + 延迟 (0.5~1秒杀一个) ★★★
async function playAssassinationAnimation(backendResult) {
  const allChars = characters.value.map(c => c.name)
  let toEliminate = []
  if (backendResult.resultType === 'all_eliminated') { toEliminate = [...allChars] } 
  else if (backendResult.resultType === 'normal') { toEliminate = allChars.filter(c => !backendResult.survivedCharacters.includes(c)) }
  // all_survived 时无人淘汰

  let currentIndex = 0
  // 打乱淘汰顺序，增加随机刺激感
  toEliminate.sort(() => Math.random() - 0.5)

  for (let i = 0; i < toEliminate.length; i++) {
    const targetName = toEliminate[i]
    const targetIndex = allChars.indexOf(targetName)
    
    // 1. 跑马灯阶段：快速绕圈，适度减速（整体控制在 0.5~1 秒内杀一个）
    let speed = 40 // 起步更快
    // 减少绕圈数，控制在 0.8~1.2 圈 + 偏移到目标
    let stepsToTarget = Math.floor(8 * (0.8 + Math.random() * 0.4)) + ((targetIndex - (currentIndex % 8) + 8) % 8)
    
    for (let s = 0; s < stepsToTarget; s++) {
      highlightIndex.value = currentIndex % 8
      currentIndex++
      // 逐渐减速，但幅度小一点，免得太慢
      if (s > stepsToTarget * 0.7) speed += 20
      if (s > stepsToTarget * 0.9) speed += 40
      await sleep(speed)
    }

    // 2. 击杀阶段：停在被杀英雄上，震动，亮红叉
    highlightIndex.value = -1 // 取消跑马灯高亮
    animatingEliminated.value.push(targetName)
    screenShaking.value = true
    setTimeout(() => screenShaking.value = false, 200) // 震动时间略缩短
    
    // 3. 停顿 0.6 秒，节奏更紧凑
    await sleep(600) 
  }

  // 如果是全存活，全量高亮闪烁（节奏也加快）
  if (backendResult.resultType === 'all_survived') {
    for(let i=0; i<3; i++) { highlightIndex.value = -2; await sleep(150); highlightIndex.value = -1; await sleep(150); } // 闪烁更快
  }
  highlightIndex.value = -1
}


function closeResult() { showResult.value = false }
function toggleSound() { soundEnabled.value = !soundEnabled.value }
function getClassNames(character, index) {
  const classes = { highlight: highlightIndex.value === index, survived: false, 'special-all-survived': false }
  if (result.value) {
    if (result.value.resultType === 'all_survived') classes['special-all-survived'] = true
    else if (result.value.resultType === 'normal' && result.value.survivedCharacters.includes(character.name)) classes.survived = true
  }
  // 动画进行中，全存活闪烁效果
  if (highlightIndex.value === -2) classes['special-all-survived'] = true 
  return classes
}

onMounted(() => { console.log('[点兵点将] 初始化') })
</script>

<style scoped>
.game-app { min-height: 100vh; background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.75)), url('/assets/images/bg.01.png'); background-size: 140% auto; background-position: center; background-attachment: fixed; position: relative; display: flex; flex-direction: column; }
.game-app.shaking { animation: shake 0.3s ease; }
.top-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); position: sticky; top: 0; z-index: 10; }
.title-area { display: flex; align-items: center; gap: 6px; }
.game-title { font-size: 17px; font-weight: 800; color: var(--color-gold, #d4af37); margin: 0; }
.icon-btn { width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(255,255,255,0.1); color: white; font-size: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.user-area { display: flex; align-items: center; gap: 8px; }
.username { font-size: 11px; color: rgba(255,255,255,0.6); }
.balance-area { display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 12px; }
.balance-label { font-size: 10px; color: rgba(255,255,255,0.6); }
.balance-value { font-size: 16px; font-weight: 900; color: var(--color-gold, #d4af37); text-shadow: 0 0 8px rgba(212, 175, 55, 0.4); }
.tool-bar { display: flex; gap: 4px; padding: 6px 12px; background: rgba(0,0,0,0.3); }
.tool-btn { flex: 1; height: 30px; border-radius: 6px; border: none; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); font-size: 12px; cursor: pointer; }
.admin-btn { color: var(--color-gold, #d4af37); }
.game-content { flex: 1; display: flex; flex-direction: column; padding: 20px; gap: 20px; }
.character-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 600px; margin: 0 auto; width: 100%; }
.character-card { background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 10px; text-align: center; cursor: pointer; transition: all 0.1s; color: white; position: relative; }
.character-card:active { transform: scale(0.95); }
.character-card.special-hero { border-color: rgba(255, 165, 0, 0.6); background: linear-gradient(135deg, rgba(255,215,0,0.05), rgba(255,165,0,0.1)); box-shadow: 0 0 8px rgba(255, 165, 0, 0.2); }
.character-image { width: 60px; height: 60px; margin: 0 auto 8px; border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.2); }
.character-image img { width: 100%; height: 100%; object-fit: cover; }
.character-name { font-weight: bold; font-size: 13px; }
.character-odds { font-size: 11px; color: #d4af37; }
.character-odds.special-odds { color: #ff9f43; font-weight: bold; text-shadow: 0 0 5px rgba(255, 159, 67, 0.4); }

/* ★ 动画高亮：放大 + 超亮发光边框 */
.character-card.highlight { border-color: #fff; background: rgba(255,255,255,0.4); transform: scale(1.1); box-shadow: 0 0 25px rgba(255,255,255,0.8); z-index: 2; }
.character-card.survived { border-color: #4ade80; background: rgba(74,222,128,0.1); box-shadow: 0 0 15px rgba(74,222,128,0.5); transform: scale(1.05); }
.character-card.special-all-survived { border-color: #4ade80; background: rgba(74,222,128,0.2); box-shadow: 0 0 20px rgba(74,222,128,0.6); }

/* ★ 动画击杀红叉 (带动画) */
.x-mark-anim { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(239,68,68,0.4); display: flex; align-items: center; justify-content: center; border-radius: 6px; animation: xAppear 0.3s ease; z-index: 3; }
.x-mark-anim::after { content: '✕'; font-size: 50px; color: #ef4444; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
/* ★ 静态结果红叉 (暗淡) */
.x-mark-static { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; border-radius: 6px; z-index: 1; }
.x-mark-static::after { content: '✕'; font-size: 40px; color: #7f1d1d; font-weight: bold; opacity: 0.8; }

.bet-badge { position: absolute; top: -8px; right: -8px; background: var(--color-gold, #d4af37); color: #000; font-size: 12px; font-weight: bold; border-radius: 10px; padding: 2px 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 2px; z-index: 4; }
.revoke-x { font-size: 10px; opacity: 0.6; }
.betting-area { max-width: 600px; margin: 0 auto; width: 100%; background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; }
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

@media (max-width: 480px) { .game-content { padding: 10px; gap: 10px; } .character-cards { gap: 6px; } .character-card { padding: 6px; border-width: 1px; } .character-image { width: 40px; height: 40px; margin-bottom: 4px; border-radius: 4px; } .character-name { font-size: 11px; } .character-odds { font-size: 9px; } .x-mark-anim::after { font-size: 30px; } .x-mark-static::after { font-size: 25px; } .bet-badge { font-size: 9px; top: -4px; right: -4px; padding: 1px 4px; } .betting-area { padding: 12px; } .chip-btn { padding: 6px 0; font-size: 12px; } }
</style>
