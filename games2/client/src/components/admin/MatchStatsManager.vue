<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="sheet sheet-large">
      <div class="sheet-header">
        <h2>📜 下注流水</h2>
        <button class="x-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="sheet-body">
        <!-- 游戏筛选标签 -->
        <div class="filter-tabs">
          <span class="tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">全部</span>
          <span class="tab" :class="{ active: activeTab === 'giant' }" @click="activeTab = 'giant'">🏇巨人</span>
          <span class="tab" :class="{ active: activeTab === 'pointing' }" @click="activeTab = 'pointing'">🎲点兵</span>
          <span class="tab" :class="{ active: activeTab === 'match' }" @click="activeTab = 'match'">🧩消消乐</span>
        </div>

        <div v-if="filteredBets.length === 0" class="empty">暂无流水数据</div>
        <div v-else>
          <div v-for="bet in filteredBets" :key="bet._id" class="bet-card" :class="{ 'win-card': getBetDetails(bet).profit > 0 }">
            <div class="bc-row bc-top">
              <span class="bc-game">{{ getBetDetails(bet).name }}</span>
              <span class="bc-user">👤 {{ bet.userId?.phone || '未知' }} <span class="bc-uid">({{ bet.userId?.uid || '?' }})</span></span>
            </div>
            <div class="bc-row bc-mid">
              <div class="bc-item">
                <span class="bi-label">下注</span>
                <span class="bi-val">{{ getBetDetails(bet).wager }}</span>
              </div>
              <div class="bc-item">
                <span class="bi-label">派彩</span>
                <span class="bi-val">{{ getBetDetails(bet).payout }}</span>
              </div>
              <div class="bc-item">
                <span class="bi-label">净利润</span>
                <span class="bi-val" :class="getBetDetails(bet).profit >= 0 ? 'text-green' : 'text-red'">
                  {{ getBetDetails(bet).profit >= 0 ? '+' : '' }}{{ getBetDetails(bet).profit }}
                </span>
              </div>
            </div>
            <div class="bc-time">{{ formatTime(bet.createdAt) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth.js'

defineEmits(['close'])
const { authFetch } = useAuth()
const bets = ref([])
const activeTab = ref('all')

// 筛选逻辑
const filteredBets = computed(() => {
  if (activeTab.value === 'all') return bets.value
  return bets.value.filter(bet => {
    if (activeTab.value === 'giant') return bet.choice !== undefined
    if (activeTab.value === 'pointing') return bet.survivedCharacters !== undefined
    if (activeTab.value === 'match') return bet.ticketPrice !== undefined
    return true
  })
})

// ★★★ 核心修复：针对不同游戏精准提取字段 ★★★
function getBetDetails(bet) {
  let name = '🎮游戏'
  let wager = 0
  let payout = 0
  let profit = 0

  if (bet.survivedCharacters !== undefined) { 
    // 点兵
    name = '🎲点兵'
    wager = bet.totalAmount || 0
    payout = bet.totalPayout || 0
    profit = payout - wager
  } else if (bet.ticketPrice !== undefined) { 
    // 消消乐 (优先使用后端的 netProfit，避免前端计算误差)
    name = '🧩消消乐'
    wager = bet.ticketPrice || 0
    payout = bet.payout || 0
    profit = bet.netProfit !== undefined ? bet.netProfit : (payout - wager)
  } else if (bet.choice !== undefined) { 
    // 巨人赛跑
    name = '🏇巨人'
    wager = bet.amount || 0
    payout = bet.payout || 0
    profit = payout - wager
  }

  return { name, wager, payout, profit }
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

/* 筛选标签 */
.filter-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
.tab { padding: 4px 10px; border-radius: 6px; font-size: 12px; background: rgba(255,255,255,0.05); color: #888; cursor: pointer; transition: all .15s; }
.tab.active { background: rgba(240,192,64,0.2); color: #f0c040; font-weight: 600; }

/* 流水卡片 */
.bet-card { background: rgba(255,255,255,0.02); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.04); }
.bet-card.win-card { border-left: 3px solid #2ecc71; }
.bc-row { display: flex; justify-content: space-between; align-items: center; }
.bc-top { margin-bottom: 8px; }
.bc-game { font-weight: 700; font-size: 13px; }
.bc-user { font-size: 12px; color: #aaa; }
.bc-uid { font-size: 10px; color: #666; }

.bc-mid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.bc-item { background: rgba(0,0,0,0.2); padding: 4px 6px; border-radius: 4px; text-align: center; }
.bi-label { font-size: 10px; color: #666; display: block; }
.bi-val { font-size: 13px; font-weight: 700; color: #eee; }

.bc-time { font-size: 10px; color: #555; margin-top: 6px; text-align: right; }

.text-green { color: #2ecc71; }
.text-red { color: #e74c3c; }
.empty { text-align: center; color: #555; padding: 24px; font-size: 13px; }
</style>
