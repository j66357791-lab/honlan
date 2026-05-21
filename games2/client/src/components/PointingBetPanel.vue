<template>
  <div class="pointing-bet-panel" ref="panelRef" :style="{ '--chip-size': chipSize + 'px' }">
    <!-- 英雄卡片区域 -->
    <div class="character-cards">
      <div 
        v-for="(character, index) in characters" 
        :key="index" 
        class="character-card" 
        :class="getClassNames(character, index)"
        @click="handlePlaceBet(character.name, $event)"
      >
        <div class="character-image">
          <img :src="character.image" :alt="character.name" draggable="false">
        </div>
        <div class="character-name">{{ character.name }}</div>
        <div class="character-odds" :class="{ 'special-odds': character.tier === 'special' }">
          {{ character.odds }}倍
        </div>

        <!-- 动画击杀红叉 -->
        <div v-if="animatingEliminated.includes(character.name)" class="x-mark-anim"></div>
        <!-- 最终结果红叉 -->
        <div v-if="result && !result.survivedCharacters.includes(character.name) && result.resultType === 'normal' && !animatingEliminated.includes(character.name)" class="x-mark-static"></div>
        <div v-if="result && result.resultType === 'all_eliminated' && !animatingEliminated.includes(character.name)" class="x-mark-static"></div>

        <!-- 下注标记与撤销 -->
        <div v-if="characterBets[character.name] > 0" class="bet-badge" @click.stop="handleRevokeBet(character.name)">
          {{ characterBets[character.name] }}
          <span class="revoke-x">✕</span>
        </div>
      </div>
    </div>

    <!-- 操作区 -->
    <div class="betting-controls">
      <div class="action-area">
        <div class="total-bet">总计: <span>{{ totalBetAmount }}</span> 积分</div>
        <button class="clear-btn" @click="handleRefundAndClearBets" v-if="totalBetAmount > 0">撤销全部</button>
      </div>
      <button class="start-game-btn" :disabled="totalBetAmount === 0 || isAnimating" @click="handleStartGame">
        {{ isAnimating ? '点兵点将中...' : '开始游戏' }}
      </button>
    </div>

    <!-- 筹码选择区域（原样复用巨人BetPanel） -->
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
            <span class="chip-amount">{{ chip }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- 飞行中的筹码（原样复用巨人BetPanel） -->
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
const chipSize = ref(60) // 筹码大小基准值

const panelRef = ref(null)
const flyingChips = ref([])
let flyIdCounter = 0

const characterBets = reactive({
  '赵云': 0, '秦良玉': 0, '马超': 0, '花木兰': 0,
  '关羽': 0, '张飞': 0, '梁红玉': 0, '穆桂英': 0
})

const totalBetAmount = computed(() => {
  let t = 0; 
  for (let k in characterBets) t += characterBets[k]; 
  return t
})

function selectChip(amount) {
  selectedChip.value = amount
}

// 核心交互：点击英雄叠加下注 + 复用巨人的飞行动画
async function handlePlaceBet(name, event) {
  if (props.isAnimating) return
  const amount = selectedChip.value
  
  if (props.balance < amount) {
    alert('积分不足')
    return
  }
  
  // 增加该英雄的下注额并扣除余额
  characterBets[name] += amount
  emit('update-balance', props.balance - amount)

  // === 飞行动画逻辑 (与 BetPanel.vue 完全一致) ===
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
    
    // 计算起点和终点坐标 (基于 panel 内部定位)
    const startX = chipRect.left + chipRect.width / 2 - panelRect.left
    const startY = chipRect.top + chipRect.height / 2 - panelRect.top
    const endX = cardRect.left + cardRect.width / 2 - panelRect.left
    const endY = cardRect.top + cardRect.height / 2 - panelRect.top

    flyingChips.value.push({ id: flyId, amount, x: startX, y: startY, scale: 1, opacity: 1 })
    
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
    }, 550)
  }
}

function handleRevokeBet(name) {
  if (props.isAnimating) return
  const refundAmount = characterBets[name]
  characterBets[name] = 0
  if (refundAmount > 0) {
    emit('update-balance', props.balance + refundAmount)
  }
}

function handleRefundAndClearBets() {
  if (props.isAnimating) return
  if (totalBetAmount.value > 0) {
    emit('update-balance', props.balance + totalBetAmount.value)
  }
  for (let k in characterBets) characterBets[k] = 0
}

function handleStartGame() {
  if (totalBetAmount.value === 0 || props.isAnimating) return
  
  const bets = []
  for (let n in characterBets) {
    if (characterBets[n] > 0) bets.push({ choice: n, amount: characterBets[n] })
  }
  
  emit('place-bet', { bets, totalBet: totalBetAmount.value })
  for (let k in characterBets) characterBets[k] = 0
}

function getClassNames(character, index) {
  const classes = {
    highlight: props.highlightIndex === index,
    survived: false,
    'special-all-survived': false
  }
  if (props.result) {
    if (props.result.resultType === 'all_survived') classes['special-all-survived'] = true
    else if (props.result.resultType === 'normal' && props.result.survivedCharacters.includes(character.name)) classes.survived = true
  }
  if (props.highlightIndex === -2) classes['special-all-survived'] = true
  return classes
}
</script>

<style scoped>
.pointing-bet-panel {
  --chip-size: 60px;
  position: relative; /* 飞行筹码需要相对定位的父容器 */
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* === 卡片区域 === */
.character-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}
.character-card {
  background: rgba(255,255,255,0.1);
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.1s;
  color: white;
  position: relative;
}
.character-card:active { transform: scale(0.95); }
.character-card.special-hero {
  border-color: rgba(255, 165, 0, 0.6);
  background: linear-gradient(135deg, rgba(255,215,0,0.05), rgba(255,165,0,0.1));
  box-shadow: 0 0 8px rgba(255, 165, 0, 0.2);
}
.character-image { width: 60px; height: 60px; margin: 0 auto 8px; border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.2); }
.character-image img { width: 100%; height: 100%; object-fit: cover; }
.character-name { font-weight: bold; font-size: 13px; }
.character-odds { font-size: 11px; color: #d4af37; }
.character-odds.special-odds { color: #ff9f43; font-weight: bold; text-shadow: 0 0 5px rgba(255, 159, 67, 0.4); }

.character-card.highlight { border-color: #fff; background: rgba(255,255,255,0.4); transform: scale(1.1); box-shadow: 0 0 25px rgba(255,255,255,0.8); z-index: 2; }
.character-card.survived { border-color: #4ade80; background: rgba(74,222,128,0.1); box-shadow: 0 0 15px rgba(74,222,128,0.5); transform: scale(1.05); }
.character-card.special-all-survived { border-color: #4ade80; background: rgba(74,222,128,0.2); box-shadow: 0 0 20px rgba(74,222,128,0.6); }

.x-mark-anim { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(239,68,68,0.4); display: flex; align-items: center; justify-content: center; border-radius: 6px; animation: xAppear 0.3s ease; z-index: 3; }
.x-mark-anim::after { content: '✕'; font-size: 50px; color: #ef4444; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
.x-mark-static { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; border-radius: 6px; z-index: 1; }
.x-mark-static::after { content: '✕'; font-size: 40px; color: #7f1d1d; font-weight: bold; opacity: 0.8; }

.bet-badge { position: absolute; top: -8px; right: -8px; background: var(--color-gold, #d4af37); color: #000; font-size: 12px; font-weight: bold; border-radius: 10px; padding: 2px 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 2px; z-index: 4; animation: popIn 0.2s ease; }
.revoke-x { font-size: 10px; opacity: 0.6; }

/* === 操作区 === */
.betting-controls {
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
  background: rgba(0,0,0,0.3);
  border-radius: 12px;
  padding: 15px;
}
.action-area { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.total-bet { color: white; font-size: 16px; font-weight: bold; }
.total-bet span { color: var(--color-gold, #d4af37); font-size: 20px; }
.clear-btn { padding: 6px 12px; border: 1px solid #ef4444; border-radius: 4px; background: transparent; color: #ef4444; cursor: pointer; }
.start-game-btn { width: 100%; padding: 12px; border: none; border-radius: 8px; background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000; font-weight: bold; font-size: 16px; cursor: pointer; transition: all 0.2s; }
.start-game-btn:disabled { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.5); cursor: not-allowed; }
.start-game-btn:not(:disabled):active { transform: scale(0.97); }

/* === 筹码区域 (原样复用) === */
.chip-section { position: relative; z-index: 1; }
.section-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 8px; text-align: center; }
.chip-buttons { display: flex; gap: 8px; justify-content: center; }
.chip-btn {
  width: var(--chip-size); height: var(--chip-size);
  border-radius: 50%; border: 2px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05); cursor: pointer;
  position: relative; overflow: hidden; transition: all 0.3s;
  padding: 0; flex-shrink: 0;
}
.chip-btn:hover { border-color: rgba(255,215,0,0.4); }
.chip-btn.active {
  border-color: var(--color-gold);
  box-shadow: 0 0 20px rgba(255,215,0,0.4);
  transform: scale(1.08);
  animation: chipPulse 1.2s infinite ease-in-out;
}
.chip-inner-circle {
  width: 100%; height: 100%; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.chip-bg-pattern {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  border-radius: 50%;
  /* 🚀 使用你本地的筹码图片，统一底色 */
  background-image: url('/assets/images/game-ui-icon/chouma-icon.png');
  background-size: cover; background-position: center;
  opacity: 0.9;
}
.chip-amount {
  position: relative; z-index: 2;
  font-family: 'Digital-7', monospace;
  font-size: calc(var(--chip-size) * 0.25);
  font-weight: 700; color: #fff;
  text-shadow: 0 0 10px rgba(0,0,0,0.5);
}

/* === 飞行筹码 (原样复用) === */
.flying-chip {
  position: absolute; border-radius: 50%; z-index: 100;
  pointer-events: none; display: flex; align-items: center; justify-content: center;
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 18px rgba(255,215,0,0.5);
}
.flying-chip .chip-bg-pattern {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  border-radius: 50%;
  /* 🚀 使用你本地的筹码图片 */
  background-image: url('/assets/images/game-ui-icon/chouma-icon.png');
  background-size: cover; opacity: 0.9;
}
.flying-amount {
  position: relative; z-index: 2; font-weight: 700; color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  font-size: calc(var(--chip-size) * 0.18);
}

@keyframes chipPulse { 0%, 100% { transform: scale(1.08); } 50% { transform: scale(1.13); } }
@keyframes xAppear { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }

@media (max-width: 480px) {
  .character-cards { gap: 6px; }
  .character-card { padding: 6px; border-width: 1px; }
  .character-image { width: 40px; height: 40px; margin-bottom: 4px; border-radius: 4px; }
  .character-name { font-size: 11px; }
  .character-odds { font-size: 9px; }
  .x-mark-anim::after { font-size: 30px; }
  .x-mark-static::after { font-size: 25px; }
  .bet-badge { font-size: 9px; top: -4px; right: -4px; padding: 1px 4px; }
  .betting-controls { padding: 12px; }
  .chip-btn { width: 45px; height: 45px; }
  .chip-amount { font-size: 11px; }
}
</style>
