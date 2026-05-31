<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="sheet sheet-small">
      <div class="sheet-header">
        <h2>🎰 奖池微调</h2>
        <button class="x-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="sheet-body">
        <div class="pool-display">
          <span>系统净收益</span>
          <span class="pool-num" :class="systemProfit >= 0 ? 'green' : 'red'">
            {{ systemProfit >= 0 ? '+' : '' }}{{ systemProfit?.toLocaleString() }}
          </span>
        </div>
        <div class="form-row">
          <select v-model="adjustType" class="form-select">
            <option value="add">增加收益</option>
            <option value="sub">扣除收益</option>
          </select>
          <input v-model.number="adjustAmount" type="number" class="form-input" placeholder="金额" min="1" />
        </div>
        <div class="form-btns">
          <button class="btn-cancel" @click="$emit('close')">取消</button>
          <button class="btn-confirm" @click="submit">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth.js'

defineEmits(['close'])
const { authFetch } = useAuth()
const systemProfit = ref(0)
const adjustType = ref('add')
const adjustAmount = ref(0)

async function fetchProfit() {
  try {
    const res = await authFetch('/api/admin/pool')
    const data = await res.json()
    if (res.ok) systemProfit.value = data.currentProfit ?? 0
  } catch (e) { console.error(e) }
}

async function submit() {
  if (!adjustAmount.value || adjustAmount.value <= 0) return alert('输入有效金额')
  const res = await authFetch('/api/admin/pool/adjust', {
    method: 'POST',
    body: JSON.stringify({ type: adjustType.value, amount: adjustAmount.value })
  })
  const data = await res.json()
  if (res.ok) { fetchProfit(); adjustAmount.value = 0 }
  else alert(data.error)
}

onMounted(fetchProfit)
</script>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
@media (min-width: 600px) { .overlay { align-items: center; } }
.sheet { background: #161b22; border-radius: 16px 16px 0 0; border: 1px solid rgba(255,255,255,0.08); width: 100%; max-height: 90vh; display: flex; flex-direction: column; animation: slideUp .25s ease; }
@media (min-width: 600px) { .sheet { border-radius: 16px; } }
@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.sheet-small { max-width: 420px; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.sheet-header h2 { font-size: 15px; margin: 0; }
.x-btn { width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(255,255,255,0.08); color: #888; font-size: 14px; cursor: pointer; }
.sheet-body { padding: 14px; overflow-y: auto; flex: 1; }
.pool-display { display: flex; justify-content: space-between; align-items: center; padding: 14px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 12px; }
.pool-num { font-size: 20px; font-weight: 800; }
.green { color: #27ae60; } .red { color: #e74c3c; }
.form-row { display: flex; gap: 8px; margin: 8px 0; }
.form-input { background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px; color: #eee; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.form-select { background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px; color: #eee; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.form-btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.btn-cancel { padding: 7px 16px; border-radius: 6px; border: none; background: rgba(255,255,255,0.08); color: #ccc; cursor: pointer; font-size: 13px; }
.btn-confirm { padding: 7px 16px; border-radius: 6px; border: none; background: #f0c040; color: #000; cursor: pointer; font-weight: 600; font-size: 13px; }
</style>
