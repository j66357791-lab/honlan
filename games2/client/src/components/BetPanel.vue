<template>
  <div class="bet-panel">
    <div class="choice-section">
      <div class="section-label">选择下注</div>
      <div class="choice-buttons">
        <button class="choice-btn red-btn" :class="{ active: choice === 'red' }" @click="$emit('select', 'red')">
          <img src="/assets/images/juese/honse/feitu1-idle_0.png" class="choice-icon" alt="" />
          <span class="choice-name">红巨人</span>
          <span class="choice-odds">1.9x</span>
        </button>
        <button class="choice-btn draw-btn" :class="{ active: choice === 'draw' }" @click="$emit('select', 'draw')">
          <span class="draw-icon">🤝</span>
          <span class="choice-name">平局</span>
          <span class="choice-odds">9x</span>
        </button>
        <button class="choice-btn blue-btn" :class="{ active: choice === 'blue' }" @click="$emit('select', 'blue')">
          <img src="/assets/images/juese/lanse/feitu2-idle_0.png" class="choice-icon" alt="" />
          <span class="choice-name">蓝巨人</span>
          <span class="choice-odds">1.9x</span>
        </button>
      </div>
    </div>
    <div class="amount-section">
      <div class="section-label">下注金额 <span class="range-hint">(10~8000)</span></div>
      <div class="amount-input-row">
        <button class="amount-adjust" @click="$emit('set-amount', Math.max(10, betAmount - 100))">-</button>
        <input :value="betAmount" type="number" class="amount-input" min="10" max="8000" @input="$emit('set-amount', $event.target.value)" />
        <button class="amount-adjust" @click="$emit('set-amount', Math.min(8000, betAmount + 100))">+</button>
      </div>
      <div class="quick-bet-row">
        <button class="quick-btn" @click="$emit('quick-bet', 10)">10</button>
        <button class="quick-btn" @click="$emit('quick-bet', 100)">100</button>
        <button class="quick-btn" @click="$emit('quick-bet', 500)">500</button>
        <button class="quick-btn" @click="$emit('quick-bet', 1000)">1000</button>
        <button class="quick-btn all-in" @click="$emit('quick-bet', 'all')">全押</button>
      </div>
    </div>
    <div class="action-section">
      <button class="btn-start" :class="{ disabled: !canBet }" @click="$emit('place-bet')">
        {{ !choice ? '请选择下注对象' : !canBet ? '积分不足' : '开始比赛' }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  choice: { type: String, default: '' },
  betAmount: { type: Number, default: 100 },
  balance: { type: Number, default: 0 },
  isInsufficient: { type: Boolean, default: false },
  gamePhase: { type: String, default: 'idle' },
  canBet: { type: Boolean, default: false }
})
defineEmits(['select', 'set-amount', 'quick-bet', 'place-bet'])
</script>

<style scoped>
.bet-panel { padding:8px 12px; }
.section-label { font-size:13px; font-weight:600; color:var(--color-text-dim); margin-bottom:8px; }
.range-hint { font-weight:400; font-size:11px; }
.choice-buttons { display:flex; gap:8px; margin-bottom:14px; }
.choice-btn { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; padding:10px 4px; border-radius:10px; border:2px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); cursor:pointer; transition:all 0.2s; }
.choice-btn.active { border-color:var(--color-gold); background:rgba(255,215,0,0.08); }
.red-btn.active { border-color:var(--color-red); background:rgba(255,59,59,0.1); }
.blue-btn.active { border-color:var(--color-blue); background:rgba(59,139,255,0.1); }
.draw-btn.active { border-color:var(--color-draw); background:rgba(170,102,255,0.1); }
.choice-icon { width:40px; height:40px; object-fit:contain; }
.draw-icon { font-size:28px; }
.choice-name { font-size:12px; font-weight:600; }
.choice-odds { font-size:11px; color:var(--color-gold); font-weight:700; }
.amount-section { margin-bottom:10px; }
.amount-input-row { display:flex; gap:8px; align-items:center; }
.amount-adjust { width:40px; height:40px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:var(--color-text); font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.amount-input { flex:1; height:40px; text-align:center; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:var(--color-gold); font-size:18px; font-weight:700; outline:none; -webkit-appearance:textfield; }
.quick-bet-row { display:flex; gap:6px; margin-top:8px; }
.quick-btn { flex:1; height:32px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); color:var(--color-text-dim); font-size:12px; font-weight:600; cursor:pointer; }
.quick-btn:active { background:rgba(255,255,255,0.1); transform:scale(0.95); }
.quick-btn.all-in { color:var(--color-danger); border-color:rgba(255,23,68,0.2); }
.action-section { margin-top:10px; }
.btn-start { width:100%; height:48px; font-size:16px; font-weight:700; border-radius:12px; background:linear-gradient(135deg,#ffd700,#ff8c00); color:#000; border:none; cursor:pointer; letter-spacing:1px; }
.btn-start:active:not(.disabled) { transform:scale(0.97); }
.btn-start.disabled { opacity:0.4; cursor:not-allowed; }
</style>
