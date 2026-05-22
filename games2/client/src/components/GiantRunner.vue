<template>
  <div class="giant-runner" :style="runnerStyle">
    <img v-if="showWine" :src="'/assets/images/daoju/icon_gift_jiu.png'" class="wine-icon" alt="" />
    <img :src="currentImage" class="giant-img" :class="{ running: mood === 'running' }" alt="" draggable="false" @error="handleImageError" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  color: { type: String, required: true },
  progress: { type: Number, default: 0 },
  mood: { type: String, default: 'idle' },
  showWine: { type: Boolean, default: false }
})

// ========== 图片路径映射 ==========
const redImages = {
  idle: '/assets/images/juese/honse/feitu1-idle_0.png',
  run: ['/assets/images/juese/honse/feitu1-run_0.png','/assets/images/juese/honse/feitu1-run_1.png','/assets/images/juese/honse/feitu1-run_2.png','/assets/images/juese/honse/feitu1-run_3.png','/assets/images/juese/honse/feitu1-run_4.png'],
  win: '/assets/images/biaoqing/tongyong22_kaixin01.png',
  lose: '/assets/images/biaoqing/tongyong11_kulou01.png'
}
const blueImages = {
  idle: '/assets/images/juese/lanse/feitu2-idle_0.png',
  run: ['/assets/images/juese/lanse/feitu2-run_0.png','/assets/images/juese/lanse/feitu2-run_1.png','/assets/images/juese/lanse/feitu2-run_2.png','/assets/images/juese/lanse/feitu2-run_3.png','/assets/images/juese/lanse/feitu2-run_4.png'],
  win: '/assets/images/biaoqing/tongyong22_kaixin01.png',
  lose: '/assets/images/biaoqing/tongyong11_kulou01.png'
}

const images = computed(() => props.color === 'red' ? redImages : blueImages)

// ========== 跑步帧动画（从事件获取） ==========
const runFrame = ref(0)

// ✅ 修正：将 handleFrameEvent 提升到 setup 顶层，确保作用域可见
const handleFrameEvent = (e) => {
  console.log(`[GiantRunner] 收到帧事件: ${props.color}, 帧索引: ${e.detail}`)
  runFrame.value = e.detail
}

// 监听 CustomEvent
onMounted(() => {
  window.addEventListener(`giant-frame-${props.color}`, handleFrameEvent)
})

onUnmounted(() => {
  // ✅ 确保移除事件监听，避免内存泄漏
  window.removeEventListener(`giant-frame-${props.color}`, handleFrameEvent)
})

// 调试：监听 runFrame 变化
watch(runFrame, (newVal) => {
  console.log(`[GiantRunner] runFrame 变化: ${newVal}`)
})

// ========== 当前显示图片 ==========
const currentImage = computed(() => {
  const img = images.value
  let result = ''
  switch (props.mood) {
    case 'idle': 
      result = img.idle
      break
    case 'running': 
      result = img.run[runFrame.value]
      break
    case 'win': 
      result = img.win
      break
    case 'lose': 
      result = img.lose
      break
    default: 
      result = img.idle
  }
  console.log(`[GiantRunner] currentImage: ${result}`)
  return result
})

// 调试：监听 currentImage 变化
watch(currentImage, (newVal) => {
  console.log(`[GiantRunner] currentImage 变化: ${newVal}`)
})

// 图片加载错误处理
function handleImageError(e) {
  console.error(`[GiantRunner] 图片加载失败: ${e.target.src}`)
  e.target.style.display = 'none'
}

// ========== 位置控制 ==========
const runnerStyle = computed(() => ({
  left: `${95 - props.progress * 0.9}%`,
  transform: 'translate(-50%, -50%)'
}))
</script>

<style scoped>
.giant-runner { position:absolute; top:50%; z-index:2; }
.giant-img { 
  width:64px; 
  height:64px; 
  object-fit:contain; 
  display:block; 
  filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  /* 添加边框以便调试 */
  border: 2px solid transparent;
}
.giant-img.running { 
  animation:runBounce 0.15s ease infinite alternate; 
  /* 添加红色边框表示正在运行 */
  border: 2px solid #ff0000;
}
@keyframes runBounce { 0%{transform:translateY(0)} 100%{transform:translateY(-3px)} }
.wine-icon { 
  position:absolute; 
  top:-20px; 
  right:-10px; 
  width:28px; 
  height:28px; 
  object-fit:contain; 
  animation:wineFloat 0.3s ease infinite alternate; 
  z-index:3; 
  filter:drop-shadow(0 0 6px rgba(255,215,0,0.8));
  border: 2px solid transparent;
}
@keyframes wineFloat { 0%{transform:translateY(0) scale(1)} 100%{transform:translateY(-4px) scale(1.1)} }
</style>
