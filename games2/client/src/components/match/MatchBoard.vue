<template>
  <div class="board-area">
    <div 
      v-for="block in boardList" 
      :key="block.uid" 
      class="block-cell"
      :class="{ removing: block.isRemoving }"
      :style="{ 
        left: block.col * 12.5 + '%', 
        top: block.row * 12.5 + '%' 
      }"
    >
      <img 
        v-if="block.type && block.row >= 0"
        :src="`/assets/images/match/elements/item_${block.type}.png`" 
        alt="元素" 
        class="element-img" 
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMatch } from '../../composables/useMatch.js'
const { boardMap } = useMatch()

const boardList = computed(() => Object.values(boardMap.value))
</script>

<style scoped>
.board-area { width: 100%; height: 100%; position: relative; overflow: hidden; }
.block-cell {
  position: absolute; width: 12.5%; height: 12.5%; box-sizing: border-box; padding: 2px; 
  transition: top 0.5s cubic-bezier(0.2, 0.6, 0.3, 1.2); 
}
.block-cell.removing { 
  animation: popAndShrink 0.35s ease-out forwards; 
  transition: none; /* 消除时取消位移动画 */
}
.element-img { width: 100%; height: 100%; object-fit: contain; image-rendering: crisp-edges; pointer-events: none; }

@keyframes popAndShrink {
  0% { transform: scale(1); opacity: 1; filter: brightness(1); }
  30% { transform: scale(1.2); opacity: 1; filter: brightness(2.5); }
  100% { transform: scale(0); opacity: 0; filter: brightness(2); }
}
</style>
