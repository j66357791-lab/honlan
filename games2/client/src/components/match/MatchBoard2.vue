<!-- MatchBoard2.vue 的核心渲染逻辑应该长这样 -->
<template>
  <div class="board-container">
    <div 
      v-for="block in Object.values(boardMap)" 
      :key="block.uid" 
      class="candy-block"
      :class="{ 'is-removing': block.isRemoving }"
      :style="{
        top: (block.row * 10) + '%',   /* 根据行计算 top */
        left: (block.col * 10) + '%',  /* 根据列计算 left */
        backgroundColor: getColor(block.type)
      }"
    ></div>
  </div>
</template>

<script setup>
import { useMatchGame2 } from '../../composables/match/useMatchGame2.js'
const { boardMap } = useMatchGame2()

const colors = ['', '#ff6b81', '#ffd32a', '#0fbcf9', '#05c46b', '#d63384', '#ff922b', '#845ef7']
const getColor = (type) => colors[type] || '#333'
</script>

<style scoped>
.board-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.candy-block {
  position: absolute;
  width: 10%;
  height: 10%;
  /* ★ 这个 transition 极其重要，没有它就没有下落和收缩动画！ */
  transition: top 0.4s ease-in, left 0.3s ease-in; 
  border-radius: 6px;
}
.candy-block.is-removing {
  opacity: 0;
  transform: scale(0);
  transition: all 0.3s ease-out;
}
</style>
