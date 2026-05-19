<template>
  <!-- 增加 v-if="visible" 确保不显示时彻底不渲染 -->
  <div v-if="visible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>点兵点将 - 积分明细</h2>
        <button class="close-btn" @click="closeModal">✕</button>
      </div>
      
      <div class="game-filter">
        <select v-model="selectedGame" @change="fetchTransactions">
          <option value="all">全部游戏</option>
          <option value="giant">巨人赛跑</option>
          <option value="pointing">点兵点将</option>
        </select>
      </div>

      <div class="transaction-list">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="transactions.length === 0" class="empty">暂无记录</div>
        <div v-else class="transaction-item" v-for="(item, index) in transactions" :key="index">
          <div class="transaction-time">{{ item.createdAt }}</div>
          <div class="transaction-details">
            <span class="transaction-type">{{ getTransactionTypeText(item.type) }}</span>
            <span class="transaction-amount" :class="{ add: item.type.includes('add'), sub: item.type.includes('sub') }">
              {{ item.type.includes('add') ? '+' : '-' }}{{ item.amount }}积分
            </span>
          </div>
          <div class="transaction-balance">余额: {{ item.balanceAfter }}积分</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useGame } from '../composables/useGame.js'

const props = defineProps({
  visible: Boolean
})

// 修正：将 'close' 改为 'update:visible'，配合父组件的 v-model:visible
const emit = defineEmits(['update:visible'])

const game = useGame()
const loading = ref(false)
const transactions = ref([])
const selectedGame = ref('pointing')

const getTransactionTypeText = (type) => {
  switch (type) {
    case 'bet_expense': return '下注支出'
    case 'bet_win': return '下注赢取'
    case 'admin_add': return '管理员增加'
    case 'admin_sub': return '管理员扣除'
    default: return type
  }
}

const fetchTransactions = async () => {
  loading.value = true
  try {
    // 模拟数据
    const mockData = [
      { createdAt: '2024-01-15 14:30', type: 'bet_expense', amount: 100, balanceAfter: 900 },
      { createdAt: '2024-01-15 14:30', type: 'bet_win', amount: 190, balanceAfter: 1090 },
      { createdAt: '2024-01-15 14:25', type: 'bet_expense', amount: 50, balanceAfter: 1040 },
      { createdAt: '2024-01-15 14:25', type: 'bet_win', amount: 0, balanceAfter: 1040 },
      { createdAt: '2024-01-15 14:20', type: 'bet_expense', amount: 200, balanceAfter: 840 },
      { createdAt: '2024-01-15 14:20', type: 'bet_win', amount: 540, balanceAfter: 1380 },
      { createdAt: '2024-01-15 14:15', type: 'bet_expense', amount: 100, balanceAfter: 1280 },
      { createdAt: '2024-01-15 14:15', type: 'bet_win', amount: 0, balanceAfter: 1280 },
      { createdAt: '2024-01-15 14:10', type: 'bet_expense', amount: 150, balanceAfter: 1130 },
      { createdAt: '2024-01-15 14:10', type: 'bet_win', amount: 285, balanceAfter: 1415 },
      { createdAt: '2024-01-15 14:05', type: 'bet_expense', amount: 80, balanceAfter: 1335 },
      { createdAt: '2024-01-15 14:05', type: 'bet_win', amount: 0, balanceAfter: 1335 },
      { createdAt: '2024-01-15 14:00', type: 'bet_expense', amount: 300, balanceAfter: 1035 },
      { createdAt: '2024-01-15 14:00', type: 'bet_win', amount: 2400, balanceAfter: 3435 },
      { createdAt: '2024-01-15 13:55', type: 'bet_expense', amount: 120, balanceAfter: 3315 },
      { createdAt: '2024-01-15 13:55', type: 'bet_win', amount: 0, balanceAfter: 3315 }
    ]
    transactions.value = mockData
  } catch (error) {
    console.error('获取明细数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 修正：触发 update:visible 事件，传入 false 关闭弹窗
const closeModal = () => {
  emit('update:visible', false)
}

onMounted(() => {
  if (props.visible) {
    fetchTransactions()
  }
})
</script>

<style scoped>
/* 样式保持不变 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: rgba(30, 30, 30, 0.95);
  border-radius: 12px;
  padding: 20px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  color: white;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.game-filter {
  margin-bottom: 20px;
}

.game-filter select {
  padding: 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.transaction-list {
  margin-top: 20px;
}

.loading {
  text-align: center;
  padding: 20px;
}

.empty {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.5);
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.transaction-time {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.transaction-details {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.transaction-type {
  color: #d4af37;
}

.transaction-amount {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
}

.transaction-amount.add {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.transaction-amount.sub {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.transaction-balance {
  color: rgba(255, 255, 255, 0.8);
}
</style>
