<template>
  <div class="control-bar">
    <div class="bet-info">
      门票: 
      <!-- ★ 上拉选择框 -->
      <select v-model="selectedPrice" class="price-select">
        <option :value="5000">5,000</option>
        <option :value="20000">2万</option>
        <option :value="100000">10万</option>
        <option :value="500000">50万</option>
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
import { useMatchGame1 as useMatch } from '../../composables/match/useMatchGame1.js'

const { balance } = useAuth()
const { gameState, startGame } = useMatch()

// ★ 修改：默认选中 5000 档位
const selectedPrice = ref(5000)

const buttonText = computed(() => {
  if (gameState.value === 'playing') return '消除中...'
  if (balance.value < selectedPrice.value) return '积分不足'
  return '开始游戏'
})

const handleStart = () => {
  if (balance.value < selectedPrice.value) {
    alert(`积分不足 ${selectedPrice.value}`)
    return
  }
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

/* 下拉框样式 */
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
  min-width: 65px; /* ★ 新增：稍微加宽一点，防止“100,000”这种数字撑爆 */
  text-align: center; /* ★ 新增：文字居中更好看 */
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
  white-space: nowrap;
}
.start-btn:active { transform: scale(0.95); }
.start-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: scale(1); }
</style>
