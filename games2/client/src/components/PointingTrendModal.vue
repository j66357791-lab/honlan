<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2 class="modal-title">📊 点兵点将走势图</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- 期数切换 (改为 10期 / 30期) -->
      <div class="tab-group">
        <button 
          v-for="tab in tabs" 
          :key="tab.value" 
          :class="['tab-btn', activeTab === tab.value && 'active']" 
          @click="activeTab = tab.value"
        >
          近{{ tab.label }}期
        </button>
      </div>

      <!-- 统计占比 -->
      <div class="stats-row">
        <div class="stat-item male">
          <span class="label">男将胜</span>
          <span class="value">{{ maleCount }}局</span>
          <div class="progress-bg">
            <div class="progress-fill" :style="{ width: malePercent + '%' }"></div>
          </div>
          <span class="percent">{{ malePercent }}%</span>
        </div>
        <div class="stat-item female">
          <span class="label">女将胜</span>
          <span class="value">{{ femaleCount }}局</span>
          <div class="progress-bg">
            <div class="progress-fill" :style="{ width: femalePercent + '%' }"></div>
          </div>
          <span class="percent">{{ femalePercent }}%</span>
        </div>
      </div>

      <!-- 英雄存活统计 -->
      <div class="hero-stats-title">英雄存活统计</div>
      <div class="hero-stats-row">
        <div v-for="hero in heroes" :key="hero.name" class="hero-stat-item">
          <span class="hero-name" :style="{ color: heroColors[hero.name] }">{{ hero.name }}</span>
          <span class="hero-count">{{ hero.count }}局</span>
          <div class="hero-progress-bg">
            <div class="hero-progress-fill" :style="{ width: hero.percent + '%', backgroundColor: heroColors[hero.name] }"></div>
          </div>
          <span class="hero-percent">{{ hero.percent }}%</span>
        </div>
      </div>

      <!-- 英雄开奖路子图 -->
      <div class="road-map-title">英雄开奖记录</div>
      <div class="road-map-grid">
        <div v-if="currentRoadMap.length === 0" class="empty-text">暂无走势数据</div>
        <template v-else>
          <div v-for="(item, index) in currentRoadMap" :key="index" class="road-hero-item">
            <div 
              v-for="hero in item.heroes" 
              :key="hero" 
              class="hero-dot" 
              :style="{ backgroundColor: heroColors[hero] + '33', color: heroColors[hero], borderColor: heroColors[hero] }"
            >
              {{ hero.substring(0, 1) }}
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  history: Array // 🚀 核心改变：接收父组件提前加载好的数据
})
defineEmits(['close'])

// 🚀 核心改变：默认近10期，最多看30期
const activeTab = ref(10)
const tabs = [
  { value: 10, label: 10 },
  { value: 30, label: 30 }
]

const maleHeroNames = ['赵云', '关羽', '张飞', '马超']
const femaleHeroNames = ['秦良玉', '梁红玉', '穆桂英', '花木兰']

const heroColors = {
  '赵云': '#1890ff', '关羽': '#ff4d4f', '张飞': '#faad14', '马超': '#4ade80',
  '秦良玉': '#ff6b9d', '梁红玉': '#8b5cf6', '穆桂英': '#f59e0b', '花木兰': '#ef4444'
}

const currentList = computed(() => {
  if (!props.history) return []
  // 根据当前选中的期数截取数据
  return props.history.slice(0, activeTab.value)
})

const maleCount = computed(() => {
  return currentList.value.filter(item => 
    item.survivedCharacters?.some(hero => maleHeroNames.includes(hero))
  ).length
})

const femaleCount = computed(() => {
  return currentList.value.filter(item => 
    item.survivedCharacters?.some(hero => femaleHeroNames.includes(hero))
  ).length
})

const total = computed(() => currentList.value.length)
const malePercent = computed(() => total.value ? ((maleCount.value / total.value) * 100).toFixed(1) : 0)
const femalePercent = computed(() => total.value ? ((femaleCount.value / total.value) * 100).toFixed(1) : 0)

const heroes = computed(() => {
  const heroCounts = {}
  currentList.value.forEach(item => {
    if (item.survivedCharacters) {
      item.survivedCharacters.forEach(heroName => {
        heroCounts[heroName] = (heroCounts[heroName] || 0) + 1
      })
    }
  })
  return [
    { name: '赵云' }, { name: '关羽' }, { name: '张飞' }, { name: '马超' },
    { name: '秦良玉' }, { name: '梁红玉' }, { name: '穆桂英' }, { name: '花木兰' }
  ].map(hero => ({
    ...hero,
    count: heroCounts[hero.name] || 0,
    percent: total.value ? (((heroCounts[hero.name] || 0) / total.value) * 100).toFixed(1) : 0
  }))
})

const currentRoadMap = computed(() => {
  return currentList.value.map(item => ({
    heroes: item.survivedCharacters || []
  })).reverse()
})
</script>

<style scoped>
/* 样式和之前保持完全一致，不用改 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal-card { background: #1a1c23; border-radius: 16px; width: 100%; max-width: 400px; color: white; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.1); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.modal-title { margin: 0; font-size: 16px; color: var(--color-gold, #ffd700); }
.close-btn { background: none; border: none; color: rgba(255, 255, 255, 0.5); font-size: 24px; cursor: pointer; line-height: 1; }
.tab-group { display: flex; padding: 12px 16px 0; gap: 8px; }
.tab-btn { flex: 1; height: 32px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.6); font-size: 13px; font-weight: 600; cursor: pointer; }
.tab-btn.active { background: rgba(255, 215, 0, 0.15); border-color: var(--color-gold, #ffd700); color: var(--color-gold, #ffd700); }
.stats-row { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.stat-item { display: grid; grid-template-columns: 35px 40px 1fr 45px; align-items: center; gap: 8px; font-size: 12px; }
.stat-item .label { font-weight: 600; } .stat-item.male .label { color: #1890ff; } .stat-item.female .label { color: #ff6b9d; } .stat-item .value { color: rgba(255, 255, 255, 0.8); }
.progress-bg { height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; overflow: hidden; } .progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
.stat-item.male .progress-fill { background: #1890ff; } .stat-item.female .progress-fill { background: #ff6b9d; } .stat-item .percent { text-align: right; color: rgba(255, 255, 255, 0.6); }
.hero-stats-title { padding: 0 16px; font-size: 12px; color: rgba(255, 255, 255, 0.4); margin-bottom: 8px; }
.hero-stats-row { padding: 0 16px 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; } .hero-stat-item { display: flex; flex-direction: column; gap: 4px; font-size: 11px; }
.hero-name { font-weight: 600; } .hero-count { color: rgba(255, 255, 255, 0.6); } .hero-progress-bg { height: 4px; background: rgba(255, 255, 255, 0.1); border-radius: 2px; overflow: hidden; } .hero-progress-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
.hero-percent { text-align: right; color: rgba(255, 255, 255, 0.6); font-size: 10px; }
.road-map-title { padding: 0 16px; font-size: 12px; color: rgba(255, 255, 255, 0.4); margin-bottom: 8px; }
.road-map-grid { padding: 0 16px 16px; display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px; max-height: 260px; overflow-y: auto; }
.road-hero-item { aspect-ratio: 1; width: 100%; display: flex; align-items: center; justify-content: center; gap: 2px; }
.hero-dot { width: 100%; height: 100%; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; border: 1px solid; box-sizing: border-box; }
.empty-text { grid-column: 1/-1; text-align: center; color: rgba(255, 255, 255, 0.3); padding: 20px 0; font-size: 13px; }
</style>
