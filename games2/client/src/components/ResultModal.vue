<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-card" :class="resultClass">
        <div class="result-header">
          <div class="result-icon">{{ resultIcon }}</div>
          <h2 class="result-title">{{ resultTitle }}</h2>
        </div>
        <div class="result-details">
          <div class="result-row"><span class="result-label">下注对象</span><span class="result-value">{{ choiceLabel }}</span></div>
          <div class="result-row"><span class="result-label">下注金额</span><span class="result-value">{{ result?.amount?.toLocaleString() }}</span></div>
          <div class="result-row"><span class="result-label">比赛结果</span><span class="result-value" :class="resultColor">{{ resultText }}</span></div>
          <div class="result-row highlight"><span class="result-label">盈亏</span><span class="result-value" :class="netChangeClass">{{ netChangeText }}</span></div>
        </div>
        <div class="mood-images">
          <img :src="result?.result === 'red' ? '/assets/images/biaoqing/tongyong22_kaixin01.png' : '/assets/images/biaoqing/tongyong11_kulou01.png'" class="mood-img" :class="{ winner: result?.result === 'red' }" alt="" />
          <img :src="result?.result === 'blue' ? '/assets/images/biaoqing/tongyong22_kaixin01.png' : '/assets/images/biaoqing/tongyong11_kulou01.png'" class="mood-img" :class="{ winner: result?.result === 'blue' }" alt="" />
        </div>
        <button class="btn-close-modal" @click="$emit('close')">确定</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ result: { type: Object, default: null }, choice: { type: String, default: '' } })
defineEmits(['close'])

const resultClass = computed(() => {
  if (!props.result) return ''
  return props.result.win ? 'win' : 'lose'
})
const resultIcon = computed(() => props.result?.win ? '🎉' : '😢')
const resultTitle = computed(() => props.result?.win ? '恭喜获胜' : '很遗憾')
const choiceLabel = computed(() => ({ red: '红巨人', blue: '蓝巨人', draw: '平局' }[props.choice] || ''))
const resultText = computed(() => ({ red: '红巨人胜', blue: '蓝巨人胜', draw: '平局' }[props.result?.result] || ''))
const resultColor = computed(() => `text-${props.result?.result}`)
const netChangeClass = computed(() => props.result?.netChange >= 0 ? 'text-win' : 'text-lose')
const netChangeText = computed(() => props.result ? `${props.result.netChange >= 0 ? '+' : ''}${props.result.netChange.toLocaleString()}` : '')
</script>

<style scoped>
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:100; padding:20px; }
.modal-card { background:var(--color-panel); border-radius:16px; padding:24px; width:100%; max-width:340px; border:2px solid rgba(255,215,0,0.2); }
.modal-card.win { border-color:rgba(0,230,118,0.4); }
.modal-card.lose { border-color:rgba(255,23,68,0.4); }
.result-header { text-align:center; margin-bottom:16px; }
.result-icon { font-size:36px; margin-bottom:4px; }
.result-title { font-size:20px; font-weight:800; }
.modal-card.win .result-title { color:var(--color-success); }
.modal-card.lose .result-title { color:var(--color-danger); }
.result-details { background:rgba(0,0,0,0.2); border-radius:10px; padding:12px; margin-bottom:16px; }
.result-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; }
.result-row.highlight { border-top:1px solid rgba(255,255,255,0.06); margin-top:4px; padding-top:10px; }
.result-label { font-size:13px; color:var(--color-text-dim); }
.result-value { font-size:14px; font-weight:600; }
.text-red { color:var(--color-red); }
.text-blue { color:var(--color-blue); }
.text-draw { color:var(--color-draw); }
.text-win { color:var(--color-success); font-size:18px; font-weight:800; }
.text-lose { color:var(--color-danger); font-size:18px; font-weight:800; }
.mood-images { display:flex; justify-content:center; gap:20px; margin-bottom:16px; }
.mood-img { width:48px; height:48px; object-fit:contain; border-radius:50%; opacity:0.5; transition:all 0.3s; }
.mood-img.winner { opacity:1; transform:scale(1.2); filter:drop-shadow(0 0 8px rgba(255,215,0,0.6)); }
.btn-close-modal { width:100%; height:44px; font-size:15px; font-weight:700; border-radius:10px; background:linear-gradient(135deg,#ffd700,#ff8c00); color:#000; border:none; cursor:pointer; }
.btn-close-modal:active { transform:scale(0.97); }
</style>
