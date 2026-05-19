<template>
  <!-- 增加 v-if="visible" -->
  <div v-if="visible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>点兵点将 - 走势图</h2>
        <button class="close-btn" @click="closeModal">✕</button>
      </div>
      
      <div class="game-filter">
        <select v-model="selectedGame" @change="fetchHistory">
          <option value="all">全部游戏</option>
          <option value="giant">巨人赛跑</option>
          <option value="pointing">点兵点将</option>
        </select>
      </div>

      <div class="trend-chart">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="history.length === 0" class="empty">暂无记录</div>
        <div v-else class="chart-container">
          <div class="chart">
            <div v-for="(item, index) in history" :key="index" class="chart-item">
              <div class="chart-bar" 
                   :style="{ height: `${item.win ? 60 : 20}px`, backgroundColor: item.win ? '#4ade80' : '#ef4444' }">
              </div>
              <div class="chart-label">{{ item.choice || '其他' }}</div>
            </div>
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
      { win: true, choice: 'male' }, { win: false, choice: 'female' },
      { win: true, choice: '赵云' }, { win: false, choice: '关羽' },
      { win: true, choice: 'female' }, { win: false, choice: 'male' },
      { win: true, choice: '花木兰' }, { win: false, choice: '张飞' }
    ]
    history.value = mockData
  } catch (error) {
    console.error('获取走势数据失败:', error)
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
.trend-chart { margin-top: 20px; }
.loading { text-align: center; padding: 20px; }
.empty { text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.5); }
.chart-container { display: flex; flex-direction: column; gap: 10px; }
.chart { display: flex; align-items: flex-end; gap: 5px; height: 100px; padding: 10px; background: rgba(0, 0, 0, 0.3); border-radius: 8px; }
.chart-item { display: flex; flex-direction: column; align-items: center; flex: 1; }
.chart-bar { width: 100%; transition: height 0.3s ease; }
.chart-label { margin-top: 5px; font-size: 12px; color: rgba(255, 255, 255, 0.7); }
</style>
