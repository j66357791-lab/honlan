<template>
  <div
    class="viewport"
    @mousemove="onDrag"
    @mouseup="stopDrag"
    @mouseleave="stopDrag"
    @touchmove="onDrag"
    @touchend="stopDrag"
  >
    <!-- 模式提示 -->
    <div class="mode-info">
      当前模式: <span :class="{ 'edit-mode': isEditMode }">{{ isEditMode ? '拼图模式 (移动方块)' : '漫游模式 (移动地图)' }}</span>
    </div>

    <!-- 地图层 -->
    <div
      class="huge-map"
      :style="mapStyle"
      @mousedown="startMapDrag"
      @touchstart="startMapDrag"
    >
      <!-- 目前 tiles 是空的，这里不会渲染任何图片，只显示背景地砖 -->
      <!-- 以后如果你想放建筑，可以往 tiles 数组里加数据 -->
      <div
        v-for="tile in tiles"
        :key="tile.id"
        class="map-tile-wrapper"
        :style="{
          left: tile.x + 'px',
          top: tile.y + 'px',
          width: tile.w + 'px',
          height: tile.h + 'px',
          border: activeTile === tile ? '2px solid #00ff00' : '1px dashed rgba(255, 255, 255, 0.4)'
        }"
        @mousedown.stop="startTileDrag(tile, $event)"
        @touchstart.stop="startTileDrag(tile, $event)"
      >
        <img :src="tile.src" class="map-img" draggable="false" />
        <div class="tile-label">{{ tile.id }}</div>
      </div>

      <!-- 原点标记，方便看位置 -->
      <div class="origin-marker">0,0</div>
    </div>

    <!-- UI 控件 -->
    <div class="ui-controls">
      <!-- 模式切换按钮 (目前只有背景，拼图模式下拖动无效，直到你添加 tiles 数据) -->
      <button class="ui-btn mode-btn" @click="toggleMode">
        {{ isEditMode ? '切换漫游模式' : '切换拼图模式' }}
      </button>

      <button class="ui-btn" @click="resetView">重置视角</button>
      <button class="ui-btn exit-btn" @click="router.back()">退出</button>
      
      <div class="zoom-controls">
        <button class="zoom-btn" @click="handleZoom(0.05)">+</button>
        <div class="zoom-text">{{ Math.round(scale * 100) }}%</div>
        <button class="zoom-btn" @click="handleZoom(-0.05)">-</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 拼图数据现在是空的，背景靠 CSS 设置
const tiles = ref([])

// ==================== 2. 状态管理 ====================
const isDraggingMap = ref(false)
const isDraggingTile = ref(false)
const startPos = { x: 0, y: 0 }
const offset = ref({ x: -100, y: -100 })
const scale = ref(1.0)

const isEditMode = ref(false)
const activeTile = ref(null)
const tileStartPos = { x: 0, y: 0 }

const MIN_SCALE = 0.1
const MAX_SCALE = 5.0

const mapStyle = computed(() => {
  return {
    width: '10000px',
    height: '10000px',
    transformOrigin: '0 0',
    transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`
  }
})

function toggleMode() {
  isEditMode.value = !isEditMode.value
}

function startMapDrag(e) {
  if (isEditMode.value) return
  isDraggingMap.value = true
  const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX
  const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY
  startPos.x = clientX - offset.value.x
  startPos.y = clientY - offset.value.y
}

function startTileDrag(tile, e) {
  if (!isEditMode.value) return
  isDraggingTile.value = true
  activeTile.value = tile
  const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX
  const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY
  startPos.x = clientX
  startPos.y = clientY
  tileStartPos.x = tile.x
  tileStartPos.y = tile.y
}

function onDrag(e) {
  const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX
  const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY

  if (isDraggingMap.value) {
    e.preventDefault()
    offset.value.x = clientX - startPos.x
    offset.value.y = clientY - startPos.y
  } else if (isDraggingTile.value && activeTile.value) {
    e.preventDefault()
    const deltaX = (clientX - startPos.x) / scale.value
    const deltaY = (clientY - startPos.y) / scale.value
    activeTile.value.x = tileStartPos.x + deltaX
    activeTile.value.y = tileStartPos.y + deltaY
  }
}

function stopDrag() {
  isDraggingMap.value = false
  isDraggingTile.value = false
  activeTile.value = null
}

function handleZoom(delta) {
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  applyZoom(delta, centerX, centerY)
}

function applyZoom(deltaAmount, mouseX, mouseY) {
  const oldScale = scale.value
  let newScale = oldScale + deltaAmount
  newScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE)
  const scaleRatio = newScale / oldScale
  const worldX = (mouseX - offset.value.x) / oldScale
  const worldY = (mouseY - offset.value.y) / oldScale
  offset.value.x = mouseX - worldX * newScale
  offset.value.y = mouseY - worldY * newScale
  scale.value = newScale
}

function resetView() {
  scale.value = 1.0
  offset.value = { x: -100, y: -100 }
}
</script>

<style scoped>
.viewport {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #1a1a1a;
  cursor: grab;
  position: relative;
}
.viewport:active {
  cursor: grabbing;
}

.mode-info {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  z-index: 1000;
  pointer-events: none;
}
.mode-info span {
  font-weight: bold;
  color: #aaa;
}
.mode-info .edit-mode {
  color: #00ff00;
}

.huge-map {
  position: absolute;
  top: 0;
  left: 0;
  width: 10000px;
  height: 10000px;
  
  /* ★ 核心修改：地砖平铺背景 */
  /* 请确认文件名是否正确，是 xingcheng-dizhuan 还是 xingcehn-dizhuan */
  background-image: url('/assets/images/Game-xingmeng/ui-map/xingcheng-dizhuan.png');
  background-repeat: repeat; 
  background-size: auto; 
  
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
  will-change: transform;
}

.map-tile-wrapper {
  position: absolute;
  box-sizing: border-box;
  cursor: default;
  transition: border-color 0.2s;
}
.map-tile-wrapper:hover {
  border-color: rgba(255, 255, 255, 0.8) !important;
}
.map-img {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  image-rendering: pixelated;
}
.tile-label {
  position: absolute;
  top: 5px;
  left: 5px;
  background: rgba(255, 0, 0, 0.8);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  pointer-events: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
  border: 2px solid #fff;
}

.origin-marker {
  position: absolute;
  top: 0;
  left: 0;
  color: red;
  font-size: 12px;
  pointer-events: none;
}

.ui-controls {
  position: fixed;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.ui-btn {
  position: absolute;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  z-index: 999;
}
.mode-btn {
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff8dc;
}
.ui-btn:nth-of-type(2) {
  top: 20px;
  left: 20px;
  transform: none;
}
.exit-btn {
  top: 20px;
  right: 20px;
}
.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 5px;
  border-radius: 8px;
  pointer-events: auto;
}
.zoom-btn {
  width: 32px;
  height: 32px;
  background: #fff;
  border: none;
  border-radius: 4px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.zoom-text {
  color: #fff;
  font-size: 10px;
  margin: 2px 0;
}
</style>
