<template>
  <div class="item-bar">
    <button class="item-btn bomb" @click="useItem('炸弹', 50)">💣<span>50</span></button>
    <button class="item-btn shuffle" @click="useItem('洗牌', 30)">🔀<span>30</span></button>
    <button class="item-btn freeze" @click="useItem('冰冻', 20)">❄️<span>20</span></button>
    <button class="item-btn double" @click="useItem('双倍', 80)">✨<span>80</span></button>
    <button class="item-btn eye" @click="useItem('预知', 10)">👁️<span>10</span></button>
  </div>
</template>

<script setup>
import { useMatch } from '../../composables/useMatch'
const store = useMatch()

const useItem = (name, cost) => {
  if (store.buyItem(cost)) {
    alert(`使用了 ${name}，扣除 ${cost} 积分！`)
  } else {
    alert('积分不足！')
  }
}
</script>

<style scoped>
.item-bar {
  width: 90vw;
  max-width: 400px;
  display: flex;
  gap: 6px;
  justify-content: space-between;
}
.item-btn {
  flex: 1; /* 按钮等分空间 */
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  padding: 8px 0;
  font-size: 18px; /* emoji 稍微大点 */
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.item-btn span {
  font-size: 10px;
  color: #ffcc00;
}
.item-btn:active { transform: scale(0.9); background: rgba(255,255,255,0.1); }
.bomb { border-color: #ff4757; }
.shuffle { border-color: #ffa502; }
.freeze { border-color: #70a1ff; }
.double { border-color: #2ed573; }
.eye { border-color: #a29bfe; }
</style>
