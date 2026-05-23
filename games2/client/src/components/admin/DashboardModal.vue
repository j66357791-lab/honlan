<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="sheet">
      <div class="sheet-header">
        <h2>📊 数据大盘</h2>
        <button class="x-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="sheet-body">
        <div class="mini-stats">
          <div class="mini-stat">
            <div class="ms-label">系统净收益</div>
            <div class="ms-val" :class="systemProfit >= 0 ? 'green' : 'red'">
              {{ systemProfit >= 0 ? '+' : '' }}{{ systemProfit?.toLocaleString() }}
            </div>
          </div>
          <div class="mini-stat">
            <div class="ms-label">玩家总余额</div>
            <div class="ms-val gold">{{ stats.totalPlayerBalance?.toLocaleString() }}</div>
          </div>
          <div class="mini-stat">
            <div class="ms-label">管理员加币</div>
            <div class="ms-val blue">{{ stats.totalAdminAdd?.toLocaleString() }}</div>
          </div>
          <div class="mini-stat">
            <div class="ms-label">管理员扣币</div>
            <div class="ms-val red">{{ stats.totalAdminSub?.toLocaleString() }}</div>
          </div>
          <div class="mini-stat">
            <div class="ms-label">总投注额</div>
            <div class="ms-val">{{ stats.totalSystemBet?.toLocaleString() }}</div>
          </div>
          <div class="mini-stat">
            <div class="ms-label">总派彩额</div>
            <div class="ms-val">{{ stats.totalSystemPayout?.toLocaleString() }}</div>
          </div>
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
const stats = ref({})
const systemProfit = ref(0)

async function fetchStats() {
  try {
    const res = await authFetch('/api/admin/stats')
    const data = await res.json()
    if (res.ok) stats.value = data
  } catch (e) { console.error(e) }
}

async function fetchProfit() {
  try {
    const res = await authFetch('/api/admin/pool')
    const data = await res.json()
    if (res.ok) systemProfit.value = data.currentProfit ?? 0
  } catch (e) { console.error(e) }
}

onMounted(() => { fetchStats(); fetchProfit() })
</script>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
@media (min-width: 600px) { .overlay { align-items: center; } }
.sheet { background: #161b22; border-radius: 16px 16px 0 0; border: 1px solid rgba(255,255,255,0.08); width: 100%; max-width: 700px; max-height: 90vh; display: flex; flex-direction: column; animation: slideUp .25s ease; }
@media (min-width: 600px) { .sheet { border-radius: 16px; } }
@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.sheet-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.sheet-header h2 { font-size: 15px; margin: 0; }
.x-btn { width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(255,255,255,0.08); color: #888; font-size: 14px; cursor: pointer; }
.sheet-body { padding: 14px; overflow-y: auto; flex: 1; }
.mini-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.mini-stat { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px 8px; text-align: center; }
.ms-label { font-size: 11px; color: #888; margin-bottom: 6px; }
.ms-val { font-size: 18px; font-weight: 800; }
.green { color: #27ae60; } .red { color: #e74c3c; } .gold { color: #f0c040; } .blue { color: #3498db; }
</style>
