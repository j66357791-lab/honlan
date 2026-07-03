<!-- src/views/TransferRecords.vue -->
<template>
  <div class="records-view">
    <header class="records-header">
      <div class="back-btn" @click="router.back()">‹ 返回</div>
      <h2>💎 晶石转增记录</h2>
      <span></span>
    </header>

    <div class="records-container">
      <div v-if="loading && records.length === 0" class="status-box"><div class="loader"></div></div>
      
      <div v-else-if="records.length === 0" class="status-box empty">暂无转增记录</div>

      <div v-else class="record-list">
        <div class="record-card" v-for="item in records" :key="item._id">
          <div class="rc-top">
            <span class="rc-type" :class="{ 'out': item.type === 'crystal_transfer_out', 'in': item.type === 'crystal_transfer_in' }">
              {{ item.type === 'crystal_transfer_out' ? '转出' : '转入' }}
            </span>
            <span class="rc-amount" :class="{ 'out': item.type === 'crystal_transfer_out', 'in': item.type === 'crystal_transfer_in' }">
              {{ item.type === 'crystal_transfer_out' ? '-' : '+' }}{{ (item.amount / 1000).toFixed(2) }}
            </span>
          </div>
          <div class="rc-info">
            <p>{{ item.remark }}</p>
            <p v-if="item.fee > 0" class="fee-text">手续费: {{ (item.fee / 1000).toFixed(2) }}</p>
            <p class="time-text">{{ formatTime(item.createdAt) }}</p>
          </div>
          <div class="rc-order">单号: {{ item.tradeNo }}</div>
        </div>

        <div v-if="records.length < total" class="load-more" @click="loadMore">
          {{ loading ? '加载中...' : '点击加载更多' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTransferRecords } from '../composables/useTransferRecords.js'

const router = useRouter()
const { records, loading, total, fetchRecords, loadMore } = useTransferRecords()

onMounted(() => fetchRecords())

function formatTime(isoStr) {
  const d = new Date(isoStr)
  const pad = n => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.records-view { min-height: 100vh; min-height: 100dvh; background: var(--color-bg); }
.records-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(138, 43, 226, 0.08); border-bottom: 1px solid rgba(138, 43, 226, 0.2); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(10px); }
.back-btn { font-size: 24px; color: #8a2be2; font-weight: bold; cursor: pointer; }
.records-header h2 { font-size: 17px; color: #8a2be2; margin: 0; }

.records-container { padding: 16px; }
.status-box { text-align: center; padding: 40px; color: var(--color-text-dim); }
.empty { color: #888; }
.loader { width: 24px; height: 24px; border: 3px solid rgba(138, 43, 226, 0.2); border-top-color: #8a2be2; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.record-list { display: flex; flex-direction: column; gap: 12px; }
.record-card { background: rgba(255, 248, 220, 0.75); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; padding: 14px; backdrop-filter: blur(5px); }

.rc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.rc-type { font-size: 14px; font-weight: bold; padding: 2px 8px; border-radius: 4px; background: rgba(138, 43, 226, 0.1); }
.rc-type.out { color: #f56c6c; background: rgba(245, 108, 108, 0.1); }
.rc-type.in { color: #1bb069; background: rgba(27, 176, 105, 0.1); }

.rc-amount { font-size: 18px; font-weight: bold; font-family: 'Arial', sans-serif; }
.rc-amount.out { color: #f56c6c; }
.rc-amount.in { color: #1bb069; }

.rc-info { font-size: 12px; color: #666; margin-bottom: 6px; line-height: 1.5; }
.fee-text { color: #e6a23c; }
.time-text { color: #999; margin-top: 2px; }

.rc-order { font-size: 10px; color: #aaa; border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 6px; margin-top: 4px; word-break: break-all; }

.load-more { text-align: center; padding: 12px; color: #8a2be2; font-size: 14px; cursor: pointer; }
</style>
