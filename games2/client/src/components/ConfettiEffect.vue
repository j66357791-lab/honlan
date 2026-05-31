//庆祝撒花特效组件

<template>
  <div class="confetti-container">
    <div v-for="piece in pieces" :key="piece.id" class="confetti-piece" :style="piece.style"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const pieces = ref([])
onMounted(() => {
  const colors = ['#ff3b3b','#3b8bff','#ffd700','#00e676','#aa66ff','#ff6b35','#00bcd4']
  for (let i = 0; i < 30; i++) {
    pieces.value.push({
      id: i,
      style: {
        left: Math.random()*100+'%', backgroundColor: colors[Math.floor(Math.random()*colors.length)],
        width: (Math.random()*8+4)+'px', height: (Math.random()*12+6)+'px',
        animationDuration: (Math.random()*2+2)+'s', animationDelay: (Math.random()*1.5)+'s',
        borderRadius: Math.random()>0.5?'50%':'2px'
      }
    })
  }
})
</script>

<style scoped>
.confetti-container { position:fixed; inset:0; pointer-events:none; z-index:999; overflow:hidden; }
.confetti-piece { position:absolute; top:-20px; animation:confettiFall linear forwards; }
@keyframes confettiFall { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
</style>
