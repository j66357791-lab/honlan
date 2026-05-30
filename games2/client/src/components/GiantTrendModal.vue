<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content trend-modal">
      <div class="modal-header">
        <h3>📊 走势图</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="tab-group">
        <button :class="['tab-btn', activeTab === 10 && 'active']" @click="activeTab = 10">近10期</button>
        <button :class="['tab-btn', activeTab === 100 && 'active']" @click="activeTab = 50">近50期</button>
      </div>

      <!-- 统计占比 -->
      <div class="stats-row">
        <div class="stat-item red">
          <span class="label">红胜</span>
          <span class="value">{{ currentStats.redCount }}局</span>
          <div class="progress-bg"><div class="progress-fill" :style="{ width: currentStats.redPercent + '%' }"></div></div>
          <span class="percent">{{ currentStats.redPercent }}%</span>
        </div>
        <div class="stat-item blue">
          <span class="label">蓝胜</span>
          <span class="value">{{ currentStats.blueCount }}局</span>
          <div class="progress-bg"><div class="progress-fill" :style="{ width: currentStats.bluePercent + '%' }"></div></div>
          <span class="percent">{{ currentStats.bluePercent }}%</span>
        </div>
        <div class="stat-item draw">
          <span class="label">平局</span>
          <span class="value">{{ currentStats.drawCount }}局</span>
          <div class="progress-bg"><div class="progress-fill" :style="{ width: currentStats.drawPercent + '%' }"></div></div>
          <span class="percent">{{ currentStats.drawPercent }}%</span>
        </div>
      </div>

      <!-- 路子图 -->
      <div class="road-map-title">开奖路子图</div>
      <div class="road-map-grid">
        <!-- 渲染顺序：左旧右新 -->
        <div v-for="(item, index) in currentRoadMap" :key="index" class="road-dot" :class="item.result">
          {{ item.result === 'red' ? '红' : item.result === 'blue' ? '蓝' : '和' }}
        </div>
        <div v-if="currentRoadMap.length === 0" class="empty-text">暂无数据</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  history: Array // 从父组件接收历史记录 (后端返回的是倒序：最新在前)
})

const emit = defineEmits(['close'])
const activeTab = ref(10)

// 根据Tab截取对应期数的数据
const currentList = computed(() => {
  if (!props.history) return []
  // 后端返回的是最新在前，slice(0, N) 截取的就是最新的 N 条
  return props.history.slice(0, activeTab.value)
})

// 统计数据
const currentStats = computed(() => {
  const list = currentList.value
  if (list.length === 0) return { redCount: 0, blueCount: 0, drawCount: 0, redPercent: 0, bluePercent: 0, drawPercent: 0 }
  
  let redCount = 0, blueCount = 0, drawCount = 0
  list.forEach(item => {
    if (item.result === 'red') redCount++
    else if (item.result === 'blue') blueCount++
    else drawCount++
  })

  const total = list.length
  return {
    redCount,
    blueCount,
    drawCount,
    redPercent: ((redCount / total) * 100).toFixed(1),
    bluePercent: ((blueCount / total) * 100).toFixed(1),
    drawPercent: ((drawCount / total) * 100).toFixed(1)
  }
})

// 路子图数据：保证左旧右新
const currentRoadMap = computed(() => {
  return currentList.value.map(item => ({
    result: item.result
  })).reverse() // 将最新在前反转为旧新在前，渲染时左边就是最旧的，右边是最新的
})
</script>

<style scoped>
.modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:100; padding:20px; }
.modal-content { background:#1a1c23; border-radius:12px; width:100%; max-width:400px; color:white; overflow:hidden; border:1px solid rgba(255,255,255,0.1); }
.modal-header { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.1); }
.modal-header h3 { margin:0; font-size:16px; color:var(--color-gold); }
.close-btn { background:none; border:none; color:rgba(255,255,255,0.5); font-size:24px; cursor:pointer; line-height:1; }

.tab-group { display:flex; padding:12px 16px 0; gap:8px; }
.tab-btn { flex:1; height:32px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.6); font-size:13px; font-weight:600; cursor:pointer; }
.tab-btn.active { background:rgba(255,215,0,0.15); border-color:var(--color-gold); color:var(--color-gold); }

.stats-row { padding:16px; display:flex; flex-direction:column; gap:12px; }
.stat-item { display:grid; grid-template-columns:35px 40px 1fr 45px; align-items:center; gap:8px; font-size:12px; }
.stat-item .label { font-weight:600; }
.stat-item.red .label { color:#ff4d4f; }
.stat-item.blue .label { color:#1890ff; }
.stat-item.draw .label { color:#faad14; }
.stat-item .value { color:rgba(255,255,255,0.8); }
.progress-bg { height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; }
.progress-fill { height:100%; border-radius:3px; transition:width 0.3s; }
.stat-item.red .progress-fill { background:#ff4d4f; }
.stat-item.blue .progress-fill { background:#1890ff; }
.stat-item.draw .progress-fill { background:#faad14; }
.stat-item .percent { text-align:right; color:rgba(255,255,255,0.6); }

.road-map-title { padding:0 16px; font-size:12px; color:rgba(255,255,255,0.4); margin-bottom:8px; }

/* 优化：路子图网格，固定每行10个 */
.road-map-grid { 
  padding:0 16px 16px; 
  display:grid; 
  grid-template-columns: repeat(10, 1fr); /* 固定每行10列 */
  gap:6px; 
  max-height:260px;
  overflow-y:auto;
}
.road-dot { 
  aspect-ratio: 1; /* 保持正方形 */
  width:100%; 
  border-radius:4px; 
  display:flex; align-items:center; justify-content:center; 
  font-size:10px; font-weight:700; 
}
.road-dot.red { background:rgba(255,77,79,0.2); color:#ff4d4f; }
.road-dot.blue { background:rgba(24,144,255,0.2); color:#1890ff; }
.road-dot.draw { background:rgba(250,173,20,0.2); color:#faad14; }
.empty-text { grid-column:1/-1; text-align:center; color:rgba(255,255,255,0.3); padding:20px 0; font-size:13px; }
</style>