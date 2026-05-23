<template>
  <div class="control-bar">
    <div class="bet-info">
      门票: 
      <!-- ★ 上拉选择框 -->
      <select v-model="selectedPrice" class="price-select">
        <option :value="100">100</option>
        <option :value="500">500</option>
        <option :value="1000">1000</option>
        <option :value="5000">5000</option>
        <option :value="10000">10000</option>
      </select>
      积分
    </div>
    <button 
      class="start-btn" 
      @click="handleStart" 
      :disabled="gameState === 'playing' || balance < selectedPrice"
    >
      {{ buttonText }}
    </button>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAuth } from '../../composables/useAuth.js'
import { useMatch } from '../../composables/useMatch.js'

const { balance } = useAuth()
const { gameState, startGame } = useMatch()

// ★ 新增：当前选中的门票价格
const selectedPrice = ref(100)

const buttonText = computed(() => {
  if (gameState.value === 'playing') return '消除中...'
  // ★ 修改：判断余额是否小于当前选中的价格
  if (balance.value < selectedPrice.value) return '积分不足'
  return '开始游戏'
})

const handleStart = () => {
  // ★ 修改：判断余额是否足够支付选中的价格
  if (balance.value < selectedPrice.value) {
    alert(`积分不足 ${selectedPrice.value}`)
    return
  }
  // ★ 修改：将选中的价格传给 startGame
  startGame(selectedPrice.value)
}
</script>

<style scoped>
.control-bar {
  width: 100%;
  max-width: 400px;
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  background: rgba(0,0,0,0.4); 
  padding: 12px 16px; 
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  box-sizing: border-box;
}
.bet-info { 
  color: rgba(255,255,255,0.8); 
  font-size: 14px; 
  display: flex;
  align-items: center;
}

/* ★ 新增：下拉框样式 */
.price-select {
  background: rgba(0,0,0,0.3);
  color: #d4af37; /* 金色文字 */
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 6px;
  padding: 4px 8px;
  margin: 0 4px;
  font-size: 16px;
  font-weight: bold;
  outline: none;
  cursor: pointer;
  appearance: menulist; /* 显示下拉箭头 */
}
.price-select option {
  background: #2a2a2a;
  color: #fff;
}

.start-btn {
  padding: 10px 28px; 
  font-size: 15px; 
  font-weight: bold; 
  border: none; 
  border-radius: 20px;
  background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
  color: #333; 
  cursor: pointer; 
  box-shadow: 0 4px 10px rgba(253, 160, 133, 0.3);
  transition: transform 0.1s;
  white-space: nowrap; /* 防止按钮文字换行 */
}
.start-btn:active { transform: scale(0.95); }
.start-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: scale(1); }
</style>
