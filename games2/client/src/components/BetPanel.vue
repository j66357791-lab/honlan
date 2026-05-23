<template>
  <div class="bet-panel" ref="panelRef" :style="{ '--chip-size': chipSize + 'px' }">

    <!-- 1. 下注区域（上方） -->
    <div class="choice-section">
      <div class="section-label">点击下注（可叠加）</div>
      <div class="choice-buttons">
        <!-- 红方 -->
        <div class="choice-btn red-btn" :class="{ active: choice === 'red' }" @click="placeBet('red')">
          <img src="/assets/images/juese/honse/feitu1-idle_0.png" class="choice-icon" alt="" />
          <span class="choice-name">红巨人</span>
          <!-- ⚠️ 赔率数字用 num-font -->
          <span class="choice-odds num-font">1.9x</span>
          <div class="chip-stack">
            <transition-group name="chip-land" tag="div" class="stack-container">
              <div
                v-for="(bet, idx) in bets.red"
                :key="bet.id"
                class="stacked-chip"
                :style="{
                  bottom: idx * autoStackOffset + 'px',
                  transform: `translateX(-50%) rotate(${bet.rotation}deg)`,
                  left: '50%',
                  marginLeft: bet.offset + 'px'
                }"
              >
                <div class="chip-bg-pattern"></div>
                <!-- ⚠️ 筹码上的金额用 num-font -->
                <span class="stacked-amount num-font">{{ bet.amount }}</span>
              </div>
            </transition-group>
          </div>
          <!-- ⚠️ 总金额用 num-font -->
          <div class="bet-total num-font" v-if="totals.red > 0">{{ totals.red }}</div>
        </div>

        <!-- 平局 -->
        <div class="choice-btn draw-btn" :class="{ active: choice === 'draw' }" @click="placeBet('draw')">
          <span class="draw-icon">🤝</span>
          <span class="choice-name">平局</span>
          <span class="choice-odds num-font">9x</span>
          <div class="chip-stack">
            <transition-group name="chip-land" tag="div" class="stack-container">
              <div
                v-for="(bet, idx) in bets.draw"
                :key="bet.id"
                class="stacked-chip"
                :style="{
                  bottom: idx * autoStackOffset + 'px',
                  transform: `translateX(-50%) rotate(${bet.rotation}deg)`,
                  left: '50%',
                  marginLeft: bet.offset + 'px'
                }"
              >
                <div class="chip-bg-pattern"></div>
                <span class="stacked-amount num-font">{{ bet.amount }}</span>
              </div>
            </transition-group>
          </div>
          <div class="bet-total num-font" v-if="totals.draw > 0">{{ totals.draw }}</div>
        </div>

        <!-- 蓝方 -->
        <div class="choice-btn blue-btn" :class="{ active: choice === 'blue' }" @click="placeBet('blue')">
          <img src="/assets/images/juese/lanse/feitu2-idle_0.png" class="choice-icon" alt="" />
          <span class="choice-name">蓝巨人</span>
          <span class="choice-odds num-font">1.9x</span>
          <div class="chip-stack">
            <transition-group name="chip-land" tag="div" class="stack-container">
              <div
                v-for="(bet, idx) in bets.blue"
                :key="bet.id"
                class="stacked-chip"
                :style="{
                  bottom: idx * autoStackOffset + 'px',
                  transform: `translateX(-50%) rotate(${bet.rotation}deg)`,
                  left: '50%',
                  marginLeft: bet.offset + 'px'
                }"
              >
                <div class="chip-bg-pattern"></div>
                <span class="stacked-amount num-font">{{ bet.amount }}</span>
              </div>
            </transition-group>
          </div>
          <div class="bet-total num-font" v-if="totals.blue > 0">{{ totals.blue }}</div>
        </div>
      </div>
    </div>

    <!-- 2. 操作区域（中间） -->
    <div class="action-section">
      <div class="bet-info" v-if="totalBet > 0">
        总下注: <span class="total-amount num-font">{{ totalBet }}</span>
        <span class="balance-info"> | 余额: <span class="balance-value num-font">{{ balance }}</span></span>
      </div>
      <div class="action-buttons">
        <button class="btn-clear" v-if="totalBet > 0" @click="clearBets">清除</button>
        <button
          class="btn-start"
          :class="{ disabled: !canStart }"
          @click="confirmBet"
        >
          {{ startButtonText }}
        </button>
      </div>
    </div>

    <!-- 3. 筹码选择区域（底部） -->
    <div class="chip-section">
      <div class="section-label">选择筹码</div>
      <div class="chip-buttons">
        <button
          v-for="chip in chipValues"
          :key="chip"
          :data-chip="chip"
          class="chip-btn"
          :class="{ active: selectedChip === chip }"
          @click="selectChip(chip)"
        >
          <div class="chip-inner-circle">
            <div class="chip-bg-pattern"></div>
            <!-- ⚠️ 筹码面值用 num-font -->
            <span class="chip-amount num-font">{{ chip }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- 飞行中的筹码 -->
    <div
      v-for="fly in flyingChips"
      :key="fly.id"
      class="flying-chip"
      :style="{
        left: fly.x + 'px',
        top: fly.y + 'px',
        transform: `translate(-50%, -50%) scale(${fly.scale})`,
        opacity: fly.opacity,
        width: chipSize * 0.65 + 'px',
        height: chipSize * 0.65 + 'px'
      }"
    >
      <div class="chip-bg-pattern"></div>
      <!-- ⚠️ 飞行筹码上的金额用 num-font -->
      <span class="flying-amount num-font">{{ fly.amount }}</span>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  choice: { type: String, default: '' },
  betAmount: { type: Number, default: 100 },
  balance: { type: Number, default: 0 },
  isInsufficient: { type: Boolean, default: false },
  gamePhase: { type: String, default: 'idle' },
  canBet: { type: Boolean, default: false },
  chipSize: { type: Number, default: 60 }
})

const emit = defineEmits(['select', 'set-amount', 'quick-bet', 'place-bet'])

const chipValues = [10, 50, 100, 500, 1000]

const selectedChip = ref(100)
const panelRef = ref(null)
let betIdCounter = 0

const bets = ref({
  red: [],
  draw: [],
  blue: []
})

const flyingChips = ref([])

const autoStackOffset = computed(() => Math.max(4, props.chipSize * 0.09))

const totals = computed(() => ({
  red:  bets.value.red.reduce((s, b) => s + b.amount, 0),
  draw: bets.value.draw.reduce((s, b) => s + b.amount, 0),
  blue: bets.value.blue.reduce((s, b) => s + b.amount, 0)
}))

const totalBet = computed(() => totals.value.red + totals.value.draw + totals.value.blue)

const canStart = computed(() => totalBet.value > 0 && totalBet.value <= props.balance)

const startButtonText = computed(() => {
  if (totalBet.value === 0 && !props.choice) return '请选择下注对象'
  if (totalBet.value > props.balance) return '积分不足'
  return '开始比赛'
})

function selectChip(amount) {
  selectedChip.value = amount
  emit('set-amount', amount)
  console.log(`[BetPanel] 选择筹码: ${amount}, 已通知父组件`)
}

async function placeBet(side) {
  if (props.gamePhase !== 'idle') return
  const amount = selectedChip.value
  if (totalBet.value + amount > props.balance) {
    console.warn(`[BetPanel] 余额不足，无法下注。当前余额: ${props.balance}, 尝试下注: ${amount}`)
    return
  }

  emit('select', side)
  console.log(`[BetPanel] 点击下注阵营: ${side}, 筹码: ${amount}, 已通知父组件`)

  const id = ++betIdCounter
  const flyId = `fly-${id}`

  const panel = panelRef.value
  if (!panel) {
    addBetToStack(side, id, amount)
    return
  }

  const panelRect = panel.getBoundingClientRect()
  const chipBtn = panel.querySelector(`.chip-btn[data-chip="${amount}"]`)
  const sideEl  = panel.querySelector(`.${side}-btn`)

  if (!chipBtn || !sideEl) {
    addBetToStack(side, id, amount)
    return
  }

  const chipRect = chipBtn.getBoundingClientRect()
  const sideRect = sideEl.getBoundingClientRect()

  const startX = chipRect.left + chipRect.width / 2 - panelRect.left
  const startY = chipRect.top  + chipRect.height / 2 - panelRect.top
  const endX   = sideRect.left + sideRect.width / 2 - panelRect.left
  const endY   = sideRect.top  + sideRect.height / 2 - panelRect.top

  flyingChips.value.push({
    id: flyId,
    amount,
    side,
    x: startX,
    y: startY,
    scale: 1,
    opacity: 1
  })

  await nextTick()
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const fly = flyingChips.value.find(f => f.id === flyId)
      if (fly) {
        fly.x = endX
        fly.y = endY
        fly.scale = 0.6
        fly.opacity = 0.8
      }
    })
  })

  setTimeout(() => {
    flyingChips.value = flyingChips.value.filter(f => f.id !== flyId)
    addBetToStack(side, id, amount)
    console.log(`[BetPanel] 筹码已落入 ${side} 方，当前各方总额:`, JSON.parse(JSON.stringify(totals.value)))
  }, 550)
}

function addBetToStack(side, id, amount) {
  bets.value[side].push({
    id,
    amount,
    offset: Math.random() * 8 - 4,
    rotation: Math.random() * 12 - 6
  })
}

function clearBets() {
  bets.value = { red: [], draw: [], blue: [] }
  console.log('[BetPanel] 已清除所有下注')
}

function confirmBet() {
  if (!canStart.value) {
    console.warn('[BetPanel] 无法开始比赛，条件不满足: ', {
      totalBet: totalBet.value,
      balance: props.balance,
      choice: props.choice
    })
    return
  }

  const betData = {
    choice: props.choice,
    betAmount: totalBet.value,
    totalBet: totalBet.value,
    detail: { ...totals.value }
  }

  console.log('[BetPanel] ✅ 点击开始比赛，发送给父组件数据:', betData)
  emit('place-bet', betData)
}

function resetBets() { clearBets() }
defineExpose({ resetBets, totals, totalBet })
</script>

<style scoped>
.bet-panel {
  --chip-size: 60px;
  --stacked-size: calc(var(--chip-size) * 0.65);

  padding: 8px 12px 12px;
  background-image: url('/assets/images/game-ui-icon/chip-background.png');
  background-size: cover;
  background-position: center;
  position: relative;
  min-height: 420px;
  border-radius: 20px;
  overflow: hidden;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-dim);
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
  text-align: center;
  /* ⚠️ 这里千万不要用 num-font，中文会变方块 */
}

.choice-section {
  position: relative;
  z-index: 1;
  margin-bottom: 12px;
}

.choice-buttons {
  display: flex;
  gap: 8px;
}

.choice-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px 28px;
  border-radius: 10px;
  border: 2px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  min-height: 130px;
}

.choice-btn:active {
  transform: scale(0.96);
}

.choice-btn.active {
  border-color: var(--color-gold);
  background: rgba(255,215,0,0.08);
}

.red-btn.active { border-color:var(--color-red); background:rgba(255,59,59,0.1); }
.blue-btn.active { border-color:var(--color-blue); background:rgba(59,139,255,0.1); }
.draw-btn.active { border-color:var(--color-draw); background:rgba(170,102,255,0.1); }

.red-btn:hover   { border-color: rgba(255,59,59,0.4);   background: rgba(255,59,59,0.05); }
.blue-btn:hover  { border-color: rgba(59,139,255,0.4);  background: rgba(59,139,255,0.05); }
.draw-btn:hover  { border-color: rgba(170,102,255,0.4); background: rgba(170,102,255,0.05); }

.choice-icon { width: 40px; height: 40px; object-fit: contain; }
.draw-icon   { font-size: 28px; }
.choice-name { font-size: 12px; font-weight: 600; /* 中文，不用 num-font */ }
.choice-odds {
  font-size: 11px;
  color: var(--color-gold);
  font-weight: 700;
  /* ⚠️ 已在模板上加 num-font，这里不再写 font-family */
}

.chip-stack {
  position: absolute;
  bottom: 22px;
  left: 0; right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.stack-container {
  position: relative;
  width: var(--stacked-size);
  min-height: 10px;
}

.stacked-chip {
  position: absolute;
  width: var(--stacked-size);
  height: var(--stacked-size);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 2px 4px rgba(0,0,0,0.35),
    inset 0 -1px 3px rgba(0,0,0,0.2);
  transition: bottom 0.3s ease;
}

.stacked-chip .chip-bg-pattern {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  border-radius: 50%;
  background-image: url('https://t1.chatglm.cn/file/6a0e71276bd5e5d2b3baf127.png?expired_at=1779763393&sign=757978a5c996416b79d485cad32e9290&ext=png');
  background-size: cover;
  opacity: 0.9;
}

.stacked-amount {
  position: relative;
  z-index: 2;
  font-size: calc(var(--chip-size) * 0.16);
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.6);
  /* ⚠️ 已在模板上加 num-font */
}

.chip-land-enter-active {
  animation: chipLand 0.4s ease-out;
}
.chip-land-leave-active {
  animation: chipLeave 0.25s ease-in;
}

@keyframes chipLand {
  0%   { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(1.3); }
  60%  { opacity: 1; transform: translateX(-50%) translateY(3px) scale(0.95); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

@keyframes chipLeave {
  0%   { opacity: 1; transform: translateX(-50%) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) scale(0.4) translateY(-20px); }
}

.bet-total {
  position: absolute;
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-gold);
  text-shadow: 0 1px 4px rgba(0,0,0,0.6);
  z-index: 5;
  white-space: nowrap;
  /* ⚠️ 已在模板上加 num-font */
}

.action-section {
  position: relative;
  z-index: 1;
  margin-bottom: 14px;
}

.bet-info {
  text-align: center;
  font-size: 13px;
  color: var(--color-text-dim);
  margin-bottom: 8px;
  /* 中文标签，不用 num-font */
}

.total-amount {
  color: var(--color-gold);
  font-weight: 700;
  font-size: 16px;
  /* ⚠️ 已在模板上加 num-font */
}

.balance-info {
  color: var(--color-text-dim);
  font-size: 12px;
}

.balance-value {
  /* ⚠️ 已在模板上加 num-font，这里只管样式 */
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-clear {
  width: 72px;
  height: 48px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 12px;
  background: rgba(255,255,255,0.1);
  color: #ff6b6b;
  border: 1px solid rgba(255,107,107,0.3);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  /* 中文按钮，不用 num-font */
}

.btn-clear:hover {
  background: rgba(255,107,107,0.15);
}

.btn-start {
  flex: 1;
  height: 48px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 12px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #000;
  border: none;
  cursor: pointer;
  letter-spacing: 1px;
  transition: all 0.2s;
  /* 中文按钮，不用 num-font */
}

.btn-start:active:not(.disabled) {
  transform: scale(0.97);
}

.btn-start.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chip-section {
  position: relative;
  z-index: 1;
}

.chip-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.chip-btn {
  width: var(--chip-size);
  height: var(--chip-size);
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  padding: 0;
  flex-shrink: 0;
}

.chip-btn:hover {
  border-color: rgba(255,215,0,0.4);
}

.chip-btn.active {
  border-color: var(--color-gold);
  box-shadow: 0 0 20px rgba(255,215,0,0.4);
  transform: scale(1.08);
  animation: chipPulse 1.2s infinite ease-in-out;
}

.chip-inner-circle {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.chip-bg-pattern {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  border-radius: 50%;
  background-image: url('https://t1.chatglm.cn/file/6a0e71276bd5e5d2b3baf127.png?expired_at=1779763393&sign=757978a5c996416b79d485cad32e9290&ext=png');
  background-size: cover;
  background-position: center;
  opacity: 0.9;
}

.chip-amount {
  position: relative;
  z-index: 2;
  font-size: calc(var(--chip-size) * 0.25);
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 10px rgba(0,0,0,0.5);
  /* ⚠️ 已在模板上加 num-font */
}

.flying-chip {
  position: absolute;
  border-radius: 50%;
  z-index: 100;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 18px rgba(255,215,0,0.5);
}

.flying-chip .chip-bg-pattern {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  border-radius: 50%;
  background-image: url('https://t1.chatglm.cn/file/6a0e71276bd5e5d2b3baf127.png?expired_at=1779763393&sign=757978a5c996416b79d485cad32e9290&ext=png');
  background-size: cover;
  opacity: 0.9;
}

.flying-amount {
  position: relative;
  z-index: 2;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  font-size: calc(var(--chip-size) * 0.18);
  /* ⚠️ 已在模板上加 num-font */
}

@keyframes chipPulse {
  0%, 100% { transform: scale(1.08); }
  50%      { transform: scale(1.13); }
}
</style>
