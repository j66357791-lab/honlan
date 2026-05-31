<template>
  <div class="pointing-bet-panel" ref="panelRef" :style="{ '--chip-size': chipSize + 'px' }">
    <!-- 上横条插槽 -->
    <div class="top-bar-slot">
      <slot name="top-bar"></slot>
    </div>

    <!-- 左侧英雄区域插槽 -->
    <div class="side-column left-column">
      <slot name="left-heroes" v-bind="slotProps"></slot>
    </div>

    <!-- 中间操作区 -->
    <div class="center-area">
      <div class="betting-controls">
        <div class="action-area">
          <div class="total-bet">总计: <span>{{ totalBetAmount }}</span></div>
          <button class="clear-btn" @click="handleRefundAndClearBets" v-if="totalBetAmount > 0">撤销全部</button>
        </div>
        <button class="start-game-btn" :disabled="totalBetAmount === 0 || isAnimating" @click="handleStartGame">
          {{ isAnimating ? '点兵点将中...' : '开始游戏' }}
        </button>
      </div>

      <div class="chip-section">
        <div class="section-label">选择筹码</div>
        <div class="chip-buttons">
          <button v-for="chip in chipValues" :key="chip" :data-chip="chip" class="chip-btn" :class="{ active: selectedChip === chip }" @click="selectChip(chip)">
            <div class="chip-inner-circle">
              <div class="chip-bg-pattern"></div>
              <span class="chip-amount">{{ chip }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- 右侧英雄区域插槽 -->
    <div class="side-column right-column">
      <slot name="right-heroes" v-bind="slotProps"></slot>
    </div>

    <!-- 下横条插槽 -->
    <div class="bottom-bar-slot">
      <slot name="bottom-bar"></slot>
    </div>

    <!-- 飞行中的筹码 -->
    <div v-for="fly in flyingChips" :key="fly.id" class="flying-chip" :style="{ left: fly.x + 'px', top: fly.y + 'px', transform: `translate(-50%, -50%) scale(${fly.scale})`, opacity: fly.opacity, width: chipSize * 0.65 + 'px', height: chipSize * 0.65 + 'px' }">
      <div class="chip-bg-pattern"></div>
      <span class="flying-amount">{{ fly.amount }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue'

const props = defineProps({
  characters: { type: Array, required: true },
  balance: { type: Number, required: true },
  isAnimating: { type: Boolean, default: false },
  animatingEliminated: { type: Array, default: () => [] },
  result: { type: Object, default: null },
  highlightIndex: { type: Number, default: -1 }
})

const emit = defineEmits(['update-balance', 'place-bet'])

const chipValues = [10, 50, 100, 500, 1000]
const selectedChip = ref(100)
const chipSize = ref(60)
const panelRef = ref(null)
const flyingChips = ref([])
let flyIdCounter = 0

const characterBets = reactive({
  '赵云': 0, '秦良玉': 0, '马超': 0, '花木兰': 0,
  '关羽': 0, '张飞': 0, '梁红玉': 0, '穆桂英': 0
})

const totalBetAmount = computed(() => {
  let t = 0; for (let k in characterBets) t += characterBets[k]; return t
})

const slotProps = computed(() => ({
  characters: props.characters,
  bets: characterBets,
  animatingEliminated: props.animatingEliminated,
  result: props.result,
  highlightIndex: props.highlightIndex,
  handlePlaceBet: handlePlaceBet,
  handleRevokeBet: handleRevokeBet
}))

function selectChip(amount) { selectedChip.value = amount }

async function handlePlaceBet(name, event) {
  if (props.isAnimating) return
  const amount = selectedChip.value
  if (props.balance < amount) { alert('积分不足'); return }

  characterBets[name] += amount
  emit('update-balance', props.balance - amount)

  const id = ++flyIdCounter
  const flyId = `fly-${id}`
  const panel = panelRef.value
  if (!panel) return
  const panelRect = panel.getBoundingClientRect()
  const chipBtn = panel.querySelector(`.chip-btn[data-chip="${amount}"]`)
  const cardEl = event.target.closest('.character-card')
  if (chipBtn && cardEl) {
    const chipRect = chipBtn.getBoundingClientRect()
    const cardRect = cardEl.getBoundingClientRect()
    const startX = chipRect.left + chipRect.width / 2 - panelRect.left
    const startY = chipRect.top + chipRect.height / 2 - panelRect.top
    const endX = cardRect.left + cardRect.width / 2 - panelRect.left
    const endY = cardRect.top + cardRect.height / 2 - panelRect.top
    flyingChips.value.push({ id: flyId, amount, x: startX, y: startY, scale: 1, opacity: 1 })
    await nextTick()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const fly = flyingChips.value.find(f => f.id === flyId)
        if (fly) { fly.x = endX; fly.y = endY; fly.scale = 0.6; fly.opacity = 0.8 }
      })
    })
    setTimeout(() => { flyingChips.value = flyingChips.value.filter(f => f.id !== flyId) }, 550)
  }
}

function handleRevokeBet(name) {
  if (props.isAnimating) return
  const refundAmount = characterBets[name]
  characterBets[name] = 0
  if (refundAmount > 0) emit('update-balance', props.balance + refundAmount)
}

function handleRefundAndClearBets() {
  if (props.isAnimating) return
  if (totalBetAmount.value > 0) emit('update-balance', props.balance + totalBetAmount.value)
  for (let k in characterBets) characterBets[k] = 0
}

function handleStartGame() {
  if (totalBetAmount.value === 0 || props.isAnimating) return
  const bets = []
  for (let n in characterBets) { if (characterBets[n] > 0) bets.push({ choice: n, amount: characterBets[n] }) }
  emit('place-bet', { bets, totalBet: totalBetAmount.value })
  for (let k in characterBets) characterBets[k] = 0
}
</script>

<style scoped>
.pointing-bet-panel {
  --chip-size: 60px;
  /* 核心调节区：你想拉高拉宽，改这里就行 */
  --grid-col-side: 130px;   /* 左右英雄栏宽度 */
  --grid-row-bar: 65px;     /* 上下横条高度 (想拉高就改大这个值) */
  --grid-gap: 15px;         /* 格子之间的间距 */

  position: relative;
  display: grid;
  grid-template-columns: var(--grid-col-side) 1fr var(--grid-col-side);
  grid-template-rows: var(--grid-row-bar) 1fr var(--grid-row-bar);
  gap: var(--grid-gap);
  width: 100%;
  max-width: 750px;
  margin: 0 auto;
}

.top-bar-slot { grid-column: 1 / 4; grid-row: 1; }
.bottom-bar-slot { grid-column: 1 / 4; grid-row: 3; }

.side-column {
  grid-row: 2;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 10px;
}
.left-column { grid-column: 1; }
.right-column { grid-column: 3; }

.center-area {
  grid-column: 2; grid-row: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 25px;
  min-height: 280px; 
}

.betting-controls { width: 100%; max-width: 260px; }
.action-area { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.total-bet { color: white; font-size: 16px; font-weight: bold; }
.total-bet span { color: var(--color-gold, #d4af37); font-size: 22px; }
.clear-btn { padding: 6px 12px; border: 1px solid #ef4444; border-radius: 4px; background: transparent; color: #ef4444; font-size: 12px; cursor: pointer; }
.start-game-btn {
  width: 100%; padding: 14px; border: none; border-radius: 8px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #000; font-weight: bold; font-size: 16px; cursor: pointer;
}
.start-game-btn:disabled { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.5); cursor: not-allowed; }
.start-game-btn:not(:disabled):active { transform: scale(0.97); }

.chip-section { position: relative; z-index: 1; width: 100%; max-width: 280px; }
.section-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 10px; text-align: center; }
.chip-buttons { display: flex; gap: 8px; justify-content: center; }

.chip-btn { width: var(--chip-size); height: var(--chip-size); border-radius: 50%; border: 2px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); cursor: pointer; position: relative; overflow: hidden; transition: all 0.3s; padding: 0; flex-shrink: 0; }
.chip-btn:hover { border-color: rgba(255,215,0,0.4); }
.chip-btn.active { border-color: var(--color-gold); box-shadow: 0 0 20px rgba(255,215,0,0.4); transform: scale(1.08); animation: chipPulse 1.2s infinite ease-in-out; }
.chip-inner-circle { width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; }
.chip-bg-pattern { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; background-image: url('/assets/images/game-ui-icon/chouma-icon.png'); background-size: cover; background-position: center; opacity: 0.9; }
.chip-amount { position: relative; z-index: 2; font-family: 'Digital-7', monospace; font-size: calc(var(--chip-size) * 0.25); font-weight: 700; color: #fff; text-shadow: 0 0 10px rgba(0,0,0,0.5); }

.flying-chip { position: absolute; border-radius: 50%; z-index: 100; pointer-events: none; display: flex; align-items: center; justify-content: center; transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 4px 18px rgba(255,215,0,0.5); }
.flying-chip .chip-bg-pattern { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; background-image: url('/assets/images/game-ui-icon/chouma-icon.png'); background-size: cover; opacity: 0.9; }
.flying-amount { position: relative; z-index: 2; font-weight: 700; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.5); font-size: calc(var(--chip-size) * 0.18); }

@keyframes chipPulse { 0%, 100% { transform: scale(1.08); } 50% { transform: scale(1.13); } }

@media (max-width: 480px) {
  .pointing-bet-panel {
    --grid-col-side: 80px;   
    --grid-row-bar: 45px;    
    --grid-gap: 8px;
  }
  .center-area { min-height: 220px; gap: 15px; }
  .chip-section { max-width: 100%; }
  .chip-buttons { flex-wrap: wrap; gap: 6px; }
  .chip-btn { width: 42px; height: 42px; }
  .chip-amount { font-size: 11px; }
}
</style>
