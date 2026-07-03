<template>
  <div class="game-app">
    <!-- 顶部导航栏 -->
    <header class="top-bar">
      <div class="title-area">
        <button class="icon-btn" @click="$emit('back')">←</button>
        <h1 class="game-title">🔗 糖果连连看</h1>
      </div>
      <div class="user-area">
        <button class="icon-btn sound-btn" @click="toggleSound"> {{ soundEnabled ? '🔊' : '🔇' }} </button>
        <div class="balance-area">
          <span class="balance-label">积分</span>
          <span class="balance-value">{{ displayBalance.toLocaleString() }}</span>
        </div>
      </div>
    </header>

    <!-- ★★★ 大奖池跑马灯 ★★★ -->
    <div class="jackpot-bar">
      <span class="jp-icon">🏆</span>
      <span class="jp-label">清盘大奖池</span>
      <span class="jp-amount">{{ jackpotAmount.toLocaleString() }}</span>
    </div>

    <!-- 游戏主体 -->
    <div class="game-content">
      <div v-if="errorMessage" class="error-toast">{{ errorMessage }}</div>
      <div class="board-wrapper">
        <!-- 状态1：未开始 -->
        <div v-if="gameState === 'idle'" class="idle-board" @click="openTicketModal">
          <div v-for="(block, index) in idleBlocks" :key="index" class="idle-block">
            <img :src="block.image" alt="block" class="block-img" />
          </div>
          <div class="idle-overlay"><span class="idle-text">点击选择门票开始</span></div>
        </div>

        <!-- 状态2 & 3：游戏中 -->
        <div v-show="gameState !== 'idle'" class="board-stage" :class="[enterAnimClass, exitAnimClass]">
          <MatchBoard2 />
          
          <!-- ★★★ SVG 连线画布 ★★★ -->
          <svg class="line-svg" v-if="highlightLines.length > 0">
            <polyline v-for="(line, idx) in highlightLines" :key="idx"
              :points="line.points" 
              :class="['link-line', line.isSpecial ? 'line-special' : 'line-normal']"
            />
          </svg>
        </div>

        <!-- 连击飘字 -->
        <div class="float-container">
          <div v-for="item in floatingTexts" :key="item.id" class="float-item" :style="{ '--random-x': item.x + 'px' }">
            <span class="combo-text">x{{ item.wave }} 波</span>
            <span class="score-text">+{{ item.score }}</span>
          </div>
        </div>
      </div>

      <button class="control-bar-btn" @click="openTicketModal" :disabled="gameState === 'playing'">
        {{ gameState === 'playing' ? '消除中...' : '选择门票' }}
      </button>

      <div class="battle-log-area" v-if="gameState !== 'idle'">
        <div class="log-header">战况实况</div>
        <div class="log-list" ref="logListRef">
          <TransitionGroup name="log-slide">
            <div v-for="log in battleLogs" :key="log.id" class="log-item">
              <span class="log-wave">第{{ log.wave }}波</span>
              <span class="log-score">+{{ log.score }}</span>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </div>

    <!-- 门票弹窗 -->
    <Transition name="fade">
      <div v-if="showTicketModal" class="ticket-modal" @click.self="showTicketModal = false">
        <div class="ticket-content">
          <h3 class="ticket-title">选择门票</h3>
          <div class="ticket-grid">
            <div v-for="price in ticketPrices" :key="price" class="ticket-card" :class="{ 'is-active': selectedTicket === price }" @click="selectedTicket = price">
              <span class="tc-label">🔗</span>
              <span class="tc-value">{{ price.toLocaleString() }}</span>
            </div>
          </div>
          <button class="ticket-start-btn" @click="confirmStart">开始游戏</button>
        </div>
      </div>
    </Transition>

    <!-- ★★★ 结算弹窗 (增加近失提示) ★★★ -->
    <Transition name="fade">
      <div v-if="showResultModal && lastResult" class="result-modal" @click.self="closeResult">
        <div class="result-content">
          <h2 :class="lastResult.netProfit >= 0 ? 'title-win' : 'title-lose'">
            {{ lastResult.netProfit >= 0 ? '🎉 太棒啦！' : '😔 差一点' }}
          </h2>
          
          <!-- ★ 近失诛心提示 ★ -->
          <div v-if="lastResult.nearMissMsg" class="near-miss-box">
            {{ lastResult.nearMissMsg }}
          </div>

          <div class="detail-rows" v-if="detailedFrames.length > 0">
            <div class="detail-row" v-for="(frame, index) in detailedFrames" :key="index">
              <span class="detail-wave">第 {{ frame.wave }} 波</span>
              <span class="detail-score">+{{ frame.waveScore }}</span>
            </div>
          </div>
          <div class="result-rows">
            <div class="result-row"><span>消除总分</span><span class="val">{{ lastResult.totalScore }}</span></div>
            <div class="result-row"><span>门票</span><span class="val text-red">-{{ lastResult.ticketPrice || 100 }}</span></div>
            <div v-if="lastResult.fee > 0" class="result-row fee-row"><span>手续费 (10%)</span><span class="val text-orange">-{{ lastResult.fee }}</span></div>
            <div class="result-divider"></div>
            <div class="result-row result-final">
              <span>{{ lastResult.netProfit >= 0 ? '净赚' : '净亏' }}</span>
              <span class="val" :class="lastResult.netProfit >= 0 ? 'text-green' : 'text-red'">
                {{ lastResult.netProfit >= 0 ? '+' : '' }}{{ lastResult.netProfit }}
              </span>
            </div>
            <div v-if="lastResult.fee > 0" class="result-hint">实际到账 {{ lastResult.payout }} 积分（已扣手续费 {{ lastResult.fee }}）</div>
            <div v-else class="result-hint">到账 {{ lastResult.payout }} 积分</div>
          </div>
          <button class="result-btn" @click="closeResult">继续游戏</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useAuth } from '../../composables/useAuth.js'
import { useMatchSound } from '../../composables/useMatchSound.js'
import { useMatchGame2 } from '../../composables/match/useMatchGame2.js'
import MatchBoard2 from './MatchBoard2.vue'

defineEmits(['back'])
const { displayBalance } = useAuth()
const { soundEnabled, initBGM, stopBGM, toggleSound } = useMatchSound()
const { gameState, lastResult, waveInfo, errorMessage, closeResult, startGame, jackpotAmount, highlightGroups, fetchJackpot } = useMatchGame2()

const ticketPrices = [5000, 20000, 100000, 500000]
const showTicketModal = ref(false)
const selectedTicket = ref(ticketPrices[0])

function openTicketModal() { if (gameState.value !== 'idle') return; showTicketModal.value = true }
function confirmStart() { showTicketModal.value = false; if (startGame) startGame(selectedTicket.value) }

const enterAnimClass = ref('')
const exitAnimClass = ref('')
const enterAnims = ['anim-bounce-in', 'anim-drop-in', 'anim-flip-in', 'anim-rotate-in']
const exitAnims = ['anim-vortex-out', 'anim-collapse-out', 'anim-zoom-blur-out', 'anim-scale-out']
function getRandomAnim(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// 方块图片URL映射（1-10对应8基础+2特殊）
const blockImages = {
  1: 'https://t1.chatglm.cn/file/6a1030ba344a1dc9bad344b5.png',
  2: 'https://t1.chatglm.cn/file/6a1e5d73344a1dc9bada53c6.png',
  3: 'https://t1.chatglm.cn/file/6a102c8c299619fb24abf08b.png',
  4: 'https://t1.chatglm.cn/file/6a1e5d732eb7153fdcb241a4.png',
  5: 'https://t1.chatglm.cn/file/6a1e5d73344a1dc9bada53c7.png',
  6: 'https://t1.chatglm.cn/file/6a1e5d73c4e0c0347f081690.png',
  7: 'https://t1.chatglm.cn/file/6a1e5d736bd5e5d2b3c31488.png',
  8: 'https://t1.chatglm.cn/file/6a1e5d73299619fb24b3a731.png',
  9: 'https://t1.chatglm.cn/file/6a1e5d73299619fb24b3a732.png',
  10: 'https://t1.chatglm.cn/file/6a1e5d73534dae20080eac00.png'
}

// 生成待机背景方块（使用图片）
const idleBlocks = computed(() => {
  const blocks = []
  for (let i = 0; i < 100; i++) {
    // 随机选择1-10的方块类型
    const type = Math.floor(Math.random() * 10) + 1
    blocks.push({
      image: blockImages[type],
      type: type
    })
  }
  return blocks
})

const floatingTexts = ref([])
let textId = 0
const battleLogs = ref([])
let logId = 0
const logListRef = ref(null)

watch(() => waveInfo.value?.wave, (newWave) => {
  if (newWave >= 1) {
    if (newWave >= 2) {
      const id = textId++
      const randomX = Math.random() * 80 - 40
      floatingTexts.value.push({ id, wave: newWave, score: waveInfo.value.waveScore, x: randomX })
      setTimeout(() => {
        floatingTexts.value = floatingTexts.value.filter(item => item.id !== id)
      }, 1500)
    }
    const lid = logId++
    battleLogs.value.push({ id: lid, wave: newWave, score: waveInfo.value.waveScore })
    nextTick(() => {
      if (logListRef.value) logListRef.value.scrollTop = logListRef.value.scrollHeight
    })
  }
})

// ★★★ 计算SVG连线坐标 (百分比基准) ★★★
const CELL_SIZE = 10;
const highlightLines = computed(() => {
  if (!highlightGroups.value || highlightGroups.value.length === 0) return []
  return highlightGroups.value.map(group => {
    // 排序保证连线顺序：先从上到下，再从左到右
    group.sort((a, b) => a.row - b.row || a.col - b.col)
    const points = group.map(b => {
      const x = (b.col * CELL_SIZE) + (CELL_SIZE / 2)
      const y = (b.row * CELL_SIZE) + (CELL_SIZE / 2)
      return `${x}%,${y}%` // 使用百分比定位，自适应棋盘
    }).join(' ')
    
    // 判断是否是特殊方块 (type 9 或 10)
    const isSpecial = group.length > 0 && (group[0].type === 9 || group[0].type === 10)
    return { points, isSpecial }
  })
})

const showResultModal = ref(false)
const detailedFrames = ref([])
watch(gameState, (newState) => {
  if (newState === 'playing') {
    enterAnimClass.value = getRandomAnim(enterAnims)
    exitAnimClass.value = ''
    battleLogs.value = []
  } else if (newState === 'result') {
    enterAnimClass.value = ''
    exitAnimClass.value = getRandomAnim(exitAnims)
    detailedFrames.value = lastResult.value && lastResult.value.frames ? lastResult.value.frames.filter(f => f.type === 'wave') : []
    setTimeout(() => {
      showResultModal.value = true
    }, 1000)
  } else if (newState === 'idle') {
    showResultModal.value = false
  }
})

onMounted(() => { initBGM(); fetchJackpot() })
onUnmounted(() => { stopBGM() })
</script>

<style scoped>
/* ================== 基础布局 ================== */
.game-app { min-height: 100vh; background: linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.3)), url('/assets/images/match/ui/night_main_bg.png'); background-size: cover; background-position: center; background-attachment: fixed; position: relative; display: flex; flex-direction: column; }
.top-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); position: sticky; top: 0; z-index: 10; flex-shrink: 0; }
.title-area { display: flex; align-items: center; gap: 8px; }
.game-title { font-size: 17px; font-weight: 800; color: #d4af37; margin: 0; }
.icon-btn { background: rgba(255,255,255,0.1); border: none; color: white; border-radius: 50%; width: 28px; height: 28px; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.user-area { display: flex; align-items: center; gap: 8px; }
.balance-area { display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 12px; }
.balance-label { font-size: 10px; color: rgba(255,255,255,0.6); }
.balance-value { font-size: 16px; font-weight: 900; color: #d4af37; }
.game-content { flex: 1; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 15px; box-sizing: border-box; gap: 15px; }
.error-toast { position: fixed; top: 60px; left: 50%; transform: translateX(-50%); background: rgba(239, 68, 68, 0.9); color: white; padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; z-index: 200; white-space: nowrap; }
.board-wrapper { width: 90vw; max-width: 400px; aspect-ratio: 1 / 1; background: rgba(0, 0, 0, 0.4); border-radius: 12px; padding: 10px; box-sizing: border-box; border: 2px solid rgba(255, 255, 255, 0.1); position: relative; overflow: hidden; flex-shrink: 0; }

/* ================== 大奖池跑马灯 ================== */
.jackpot-bar { display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(90deg, rgba(0,0,0,0), rgba(255,215,0,0.2), rgba(0,0,0,0)); padding: 8px 0; border-bottom: 1px solid rgba(255, 215, 0, 0.3); }
.jp-icon { font-size: 20px; } .jp-label { font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 600; }
.jp-amount { font-size: 20px; font-weight: 900; color: #ffd700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.6); animation: jackpotPulse 2s infinite; }
@keyframes jackpotPulse { 0%,100%{opacity:1} 50%{opacity:0.8} }

/* ================== 待机静态背景 (10x10) ================== */
.idle-board { width: 100%; height: 100%; display: grid; grid-template-columns: repeat(10, 1fr); grid-template-rows: repeat(10, 1fr); gap: 3px; border-radius: 8px; overflow: hidden; position: absolute; top: 0; left: 0; padding: 10px; box-sizing: border-box; cursor: pointer; }
.idle-block { border-radius: 6px; overflow: hidden; animation: idleBreath 3s infinite alternate ease-in-out; }
.idle-block .block-img { width: 100%; height: 100%; object-fit: cover; display: block; }
@keyframes idleBreath { 0% { transform: scale(0.9); opacity: 0.4; } 100% { transform: scale(1); opacity: 0.7; } }
.idle-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
.idle-text { color: white; font-size: 18px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.5); animation: idlePulse 2s infinite; }
@keyframes idlePulse { 0%, 100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }

/* ================== 核心动画池 ================== */
.board-stage { width: 100%; height: 100%; will-change: transform, opacity, filter; transform: translateZ(0); animation-fill-mode: forwards; animation-duration: 0.6s; }
.anim-bounce-in { animation-name: bounceIn; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
.anim-drop-in { animation-name: dropIn; animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1); }
.anim-flip-in { animation-name: flipIn; animation-timing-function: ease-out; animation-duration: 0.8s; }
.anim-rotate-in { animation-name: rotateIn; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
.anim-vortex-out { animation-name: vortexOut; animation-timing-function: cubic-bezier(0.6, -0.28, 0.74, 0.05); animation-duration: 0.8s; }
.anim-collapse-out { animation-name: collapseOut; animation-timing-function: ease-in; }
.anim-zoom-blur-out { animation-name: zoomBlurOut; animation-timing-function: ease-in; }
.anim-scale-out { animation-name: scaleOut; animation-timing-function: ease-in; }
@keyframes bounceIn { from { transform: scale(0.3) rotate(-10deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; } }
@keyframes dropIn { from { transform: translateY(-100vh) scale(0.8); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
@keyframes flipIn { from { transform: perspective(400px) rotateY(90deg); opacity: 0; } to { transform: perspective(400px) rotateY(0deg); opacity: 1; } }
@keyframes rotateIn { from { transform: scale(0) rotate(-360deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; } }
@keyframes vortexOut { 0% { transform: scale(1) rotate(0deg); opacity: 1; filter: blur(0px); } 100% { transform: scale(0) rotate(540deg); opacity: 0; filter: blur(10px); } }
@keyframes collapseOut { 0% { transform: scaleY(1); opacity: 1; transform-origin: top; } 100% { transform: scaleY(0); opacity: 0; transform-origin: top; } }
@keyframes zoomBlurOut { 0% { transform: scale(1); filter: blur(0px); opacity: 1; } 100% { transform: scale(4); filter: blur(20px); opacity: 0; } }
@keyframes scaleOut { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } 100% { transform: scale(0); opacity: 0; } }

/* ================== SVG 连线画布 ================== */
.line-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 30; }
.link-line { fill: none; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 0 4px currentColor); animation: lineGlow 0.8s ease-in-out infinite alternate; }
.line-normal { stroke: #fff; stroke-width: 3; }
.line-special { stroke: #ffd700; stroke-width: 5; } 
@keyframes lineGlow { from { opacity: 0.6; } to { opacity: 1; } }

/* ================== 控制栏按钮 ================== */
.control-bar-btn { width: 90vw; max-width: 400px; padding: 12px; border: none; border-radius: 12px; background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); color: #333; font-size: 16px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 10px rgba(253, 160, 133, 0.3); transition: transform 0.1s; flex-shrink: 0; }
.control-bar-btn:active { transform: scale(0.95); } .control-bar-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: scale(1); }

/* ================== 连击飘字 ================== */
.float-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 20; display: flex; justify-content: center; }
.float-item { position: absolute; top: 25%; display: flex; flex-direction: column; align-items: center; transform: translateX(var(--random-x)); animation: comboFloat 1.5s ease-out forwards; }
.combo-text { font-size: 22px; font-weight: 900; font-style: italic; color: #ffd700; text-shadow: 0 0 5px #ffd700, 0 2px 2px rgba(0, 0, 0, 0.8); letter-spacing: 2px; }
.score-text { font-size: 32px; font-weight: 900; font-style: italic; color: #fff5cc; text-shadow: 0 0 8px #ffd700, 0 2px 3px rgba(0, 0, 0, 0.9); margin-top: -5px; }
@keyframes comboFloat { 0% { opacity: 0; transform: translateX(var(--random-x)) translateY(20px) scale(0.5); } 15% { opacity: 1; transform: translateX(var(--random-x)) translateY(0) scale(1.2); } 100% { opacity: 0; transform: translateX(var(--random-x)) translateY(-80px) scale(0.8); } }

/* ================== 底部战况日志 ================== */
.battle-log-area { width: 90vw; max-width: 400px; background: rgba(0, 0, 0, 0.5); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-direction: column; overflow: hidden; flex: 1; min-height: 80px; }
.log-header { padding: 8px 12px; font-size: 12px; font-weight: 700; color: rgba(255, 255, 255, 0.7); border-bottom: 1px solid rgba(255, 255, 255, 0.1); background: rgba(0,0,0,0.2); }
.log-list { flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
.log-item { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #e2e8f0; animation: logFadeIn 0.3s ease-out; }
.log-wave { font-weight: 600; color: #a78bfa; } .log-score { font-weight: 800; color: #fbbf24; }
.log-slide-enter-active, .log-slide-leave-active { transition: all 0.3s ease; } .log-slide-enter-from { opacity: 0; transform: translateX(-20px); }
@keyframes logFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* ================== 门票选择弹窗 ================== */
.ticket-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 150; backdrop-filter: blur(4px); padding: 20px; }
.ticket-content { background: linear-gradient(135deg, #fff0f5, #ffe4e1); padding: 24px; border-radius: 24px; width: 100%; max-width: 340px; border: 3px solid #ffb7c5; box-shadow: 0 10px 30px rgba(255, 105, 180, 0.3); }
.ticket-title { text-align: center; color: #d63384; font-size: 20px; margin: 0 0 20px; font-weight: 800; }
.ticket-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.ticket-card { background: white; border: 2px solid #ffd6e0; border-radius: 16px; padding: 15px 0; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 0 #ffb7c5; }
.ticket-card:active { transform: translateY(2px); box-shadow: 0 2px 0 #ffb7c5; }
.ticket-card.is-active { border-color: #d63384; background: #fff0f5; box-shadow: 0 4px 0 #d63384; }
.tc-label { font-size: 20px; } .tc-value { font-size: 16px; font-weight: 800; color: #343a40; }
.ticket-start-btn { width: 100%; padding: 14px; border: none; border-radius: 50px; background: linear-gradient(135deg, #ff6b81, #d63384); color: white; font-size: 16px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 15px rgba(214, 51, 132, 0.4); transition: transform 0.1s; }
.ticket-start-btn:active { transform: scale(0.95); }

/* ================== 结算弹窗 ================== */
.result-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); }
.result-content { background: linear-gradient(135deg, #fff0f5, #ffe4e1); padding: 24px 20px; border-radius: 24px; text-align: center; border: 3px solid #ffb7c5; width: 320px; max-width: 90vw; box-shadow: 0 10px 30px rgba(255, 105, 180, 0.3); display: flex; flex-direction: column; max-height: 80vh; }
.title-win { color: #d63384; margin: 0 0 10px; font-size: 22px; text-shadow: 0 2px 0 #fff; }
.title-lose { color: #6c757d; margin: 0 0 10px; font-size: 22px; text-shadow: 0 2px 0 #fff; }

/* ★ 近失诛心提示 ★ */
.near-miss-box { background: linear-gradient(90deg, #fff3cd, #ffc107); color: #664d03; padding: 10px; border-radius: 8px; font-weight: 800; font-size: 14px; text-align: center; margin-bottom: 15px; animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
@keyframes shake { 10%,90%{transform:translate3d(-1px,0,0)} 20%,80%{transform:translate3d(2px,0,0)} 30%,50%,70%{transform:translate3d(-4px,0,0)} 40%,60%{transform:translate3d(4px,0,0)} }

.detail-rows { max-height: 120px; overflow-y: auto; background: rgba(255, 255, 255, 0.5); border-radius: 12px; padding: 10px; margin-bottom: 15px; border: 1px dashed #ffb7c5; }
.detail-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #495057; border-bottom: 1px solid rgba(255, 183, 197, 0.3); }
.detail-row:last-child { border-bottom: none; } .detail-wave { font-weight: 600; color: #6c757d; } .detail-score { font-weight: 800; color: #d63384; }
.result-rows { margin-bottom: 15px; }
.result-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #6c757d; font-weight: 600; }
.result-row .val { font-weight: 800; color: #343a40; }
.text-green { color: #2dc653 !important; } .text-red { color: #ff6b6b !important; } .text-orange { color: #ff922b !important; }
.fee-row { font-size: 12px; color: #ff922b; } .fee-row .val { color: #ff922b; }
.result-divider { border-top: 2px dashed #ffb7c5; margin: 8px 0; }
.result-final { font-size: 18px; font-weight: 800; color: #343a40; } .result-final .val { font-size: 22px; }
.result-hint { font-size: 11px; color: #868e96; margin-top: 6px; }
.result-btn { width: 100%; padding: 12px; border: none; border-radius: 50px; background: linear-gradient(135deg, #ff6b81, #d63384); color: white; font-size: 16px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 15px rgba(214, 51, 132, 0.4); transition: transform 0.1s; flex-shrink: 0; }
.result-btn:active { transform: scale(0.95); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; } .fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
