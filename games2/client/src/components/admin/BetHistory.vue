<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="sheet sheet-large">
      <div class="sheet-header">
        <h2>📜 下注流水</h2>
        <button class="x-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="sheet-body">
        <div v-if="bets.length === 0" class="empty">暂无流水数据</div>
        <div v-else>
          <div v-for="bet in bets" :key="bet._id" class="bet-card">
            <div class="bc-row">
              <span class="bc-game">{{ getGameLabel(bet) }}</span>
              <span class="bc-user">👤{{ bet.userId?.phone || '未知' }}</span>
            </div>
            <div class="bc-row">
              <span>下注: <strong>{{ bet.totalAmount || bet.amount }}</strong></span>
              <span :class="(bet.totalPayout || bet.payout) > 0 ? 'green' : ''">
                派彩: <strong>{{ bet.totalPayout || bet.payout || 0 }}</strong>
              </span>
            </div>
            <div class="bc-time">{{ formatTime(bet.createdAt) }}</div>
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
const bets = ref([])

function getGameLabel(bet) {
  if (bet.survivedCharacters) return '🎲点兵'
  if (bet.ticketPrice) return '🧩消消乐'
  if (bet.choice) return '🏇巨人'
  return '🎮游戏'
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  try {
    const res = await authFetch('/api/admin/bets?limit=50')
    const data = await res.json()
    if (res.ok) bets.value = data.bets || []
  } catch (e) { console.error(e) }
})
</script>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
@media (min-width: 600px) { .overlay { align-items: center; } }
.sheet { background: #161b22; border-radius: 16px 16px 0 0; border: 1px solid rgba(255,255,255,0.08); width: 100%; max-height: 90vh; display: flex; flex-direction: column; animation: slideUp .25s ease; }
@media (min-width: 600px) { .sheet { border-radius: 16px; } }
@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.sheet-large { max-width: 700px; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.sheet-header h2 { font-size: 15px; margin: 0; }
.x-btn { width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(255,255,255,0.08); color: #888; font-size: 14px; cursor: pointer; }
.sheet-body { padding: 14px; overflow-y: auto; flex: 1; }
.bet-card { background: rgba(255,255,255,0.02); border-radius: 8px; padding: 8px 10px; margin-bottom: 6px; }
.bc-row { display: flex; justify-content: space-between; font-size: 12px; color: #ccc; }
.bc-row + .bc-row { margin-top: 2px; }
.bc-game { font-weight: 600; }
.bc-time { font-size: 11px; color: #666; margin-top: 2px; }
.green { color: #27ae60; }
.empty { text-align: center; color: #555; padding: 24px; font-size: 13px; }
</style>
