<template>
  <!-- 增加 v-if="visible" -->
  <div v-if="visible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>点兵点将 - 对局记录</h2>
        <button class="close-btn" @click="closeModal">✕</button>
      </div>
      
      <div class="game-filter">
        <select v-model="selectedGame" @change="fetchHistory">
          <option value="all">全部游戏</option>
          <option value="giant">巨人赛跑</option>
          <option value="pointing">点兵点将</option>
        </select>
      </div>

      <div class="record-list">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="history.length === 0" class="empty">暂无记录</div>
        <div v-else class="record-item" v-for="(item, index) in history" :key="index">
          <div class="record-time">{{ item.createdAt }}</div>
          <div class="record-details">
            <span class="record-choice">{{ item.choice || '其他' }}</span>
            <span class="record-result" :class="{ win: item.win, lose: !item.win }">
              {{ item.win ? '赢' : '输' }}
            </span>
            <span class="record-amount">{{ item.amount }}积分</span>
          </div>
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

// 修正：改为 update:visible
const emit = defineEmits(['update:visible'])

const game = useGame()
const loading = ref(false)
const history = ref([])
const selectedGame = ref('pointing')

const fetchHistory = async () => {
  loading.value = true
  try {
    const mockData = [
      { createdAt: '2024-01-15 14:30', choice: 'male', win: true, amount: 100 },
      { createdAt: '2024-01-15 14:25', choice: 'female', win: false, amount: 50 },
      { createdAt: '2024-01-15 14:20', choice: '赵云', win: true, amount: 200 },
      { createdAt: '2024-01-15 14:15', choice: '关羽', win: false, amount: 100 },
      { createdAt: '2024-01-15 14:10', choice: 'female', win: true, amount: 150 },
      { createdAt: '2024-01-15 14:05', choice: 'male', win: false, amount: 80 },
      { createdAt: '2024-01-15 14:00', choice: '花木兰', win: true, amount: 300 },
      { createdAt: '2024-01-15 13:55', choice: '张飞', win: false, amount: 120 }
    ]
    history.value = mockData
  } catch (error) {
    console.error('获取记录数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 修正：关闭方法
const closeModal = () => {
  emit('update:visible', false)
}

onMounted(() => {
  if (props.visible) {
    fetchHistory()
  }
})
</script>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: rgba(30, 30, 30, 0.95); border-radius: 12px; padding: 20px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto; color: white; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.close-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; }
.game-filter { margin-bottom: 20px; }
.game-filter select { padding: 8px; border-radius: 6px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); }
.record-list { margin-top: 20px; }
.loading { text-align: center; padding: 20px; }
.empty { text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.5); }
.record-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.record-time { color: rgba(255, 255, 255, 0.6); font-size: 12px; }
.record-details { display: flex; align-items: center; gap: 10px; }
.record-choice { color: #d4af37; }
.record-result { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
.record-result.win { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
.record-result.lose { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.record-amount { color: rgba(255, 255, 255, 0.8); }
</style>
