<template>
  <div class="game-info">
    <div class="info-box">
      <span class="label">积分</span>
      <span class="value">{{ store.score }}</span>
    </div>
    <div class="info-box">
      <span class="label">连击</span>
      <span class="value combo">x{{ store.combo }}</span>
    </div>
  </div>
</template>

<script setup>
import { useMatch } from '../../composables/useMatch'
const store = useMatch()
</script>

<style scoped>
.game-info {
  width: 90vw;
  max-width: 400px;
  display: flex;
  justify-content: space-between;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-sizing: border-box;
}
.info-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
}
.label {
  font-size: 12px;
  opacity: 0.7;
}
.value {
  font-size: 22px;
  font-weight: bold;
  color: #ffcc00; /* 金色积分 */
}
.combo {
  color: #ff4757; /* 红色连击 */
}
</style>
