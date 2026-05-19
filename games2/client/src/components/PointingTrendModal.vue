<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2 class="modal-title">📊 点兵点将走势图</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- 期数切换 -->
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
          <span class="hero-name">{{ hero.name }}</span>
          <span class="hero-count">{{ hero.count }}局</span>
          <div class="hero-progress-bg">
            <div class="hero-progress-fill" :style="{ width: hero.percent + '%' }"></div>
          </div>
          <span class="hero-percent">{{ hero.percent }}%</span>
        </div>
      </div>

      <!-- 路子图 -->
      <div class="road-map-title">开奖路子图</div>
      <div class="road-map-grid">
        <div
          v-for="(item, index) in currentRoadMap"
          :key="index"
          class="road-dot"
          :class="item.result"
        >
          {{ item.label }}
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
  history: Array
})

defineEmits(['close'])

const activeTab = ref(50)
const tabs = [
  { value: 10, label: 10 },
  { value: 50, label: 50 },
  { value: 100, label: 100 }
]

const currentList = computed(() => {
  if (!props.history) return []
  return props.history.slice(0, activeTab.value)
})

// 性别统计
const maleCount = computed(() => currentList.value.filter(item => item.result === 'male').length)
const femaleCount = computed(() => currentList.value.filter(item => item.result === 'female').length)

const total = computed(() => currentList.value.length)
const malePercent = computed(() => total.value ? ((maleCount.value / total.value) * 100).toFixed(1) : 0)
const femalePercent = computed(() => total.value ? ((femaleCount.value / total.value) * 100).toFixed(1) : 0)

// 英雄存活统计
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
    { name: '赵云', count: heroCounts['赵云'] || 0 },
    { name: '关羽', count: heroCounts['关羽'] || 0 },
    { name: '张飞', count: heroCounts['张飞'] || 0 },
    { name: '马超', count: heroCounts['马超'] || 0 },
    { name: '秦良玉', count: heroCounts['秦良玉'] || 0 },
    { name: '梁红玉', count: heroCounts['梁红玉'] || 0 },
    { name: '穆桂英', count: heroCounts['穆桂英'] || 0 },
    { name: '花木兰', count: heroCounts['花木兰'] || 0 }
  ].map(hero => ({
    ...hero,
    percent: total.value ? ((hero.count / total.value) * 100).toFixed(1) : 0
  }))
})

// 路子图
const currentRoadMap = computed(() => {
  return currentList.value.map(item => ({
    result: item.result,
    label: item.result === 'male' ? '男' : '女'
  })).reverse()
})
</script>

<style scoped>
/* 样式和通用版本类似，保持一致 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal-card {
  background: #1a1c23;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  color: white;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  margin: 0;
  font-size: 16px;
  color: var(--color-gold);
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.tab-group {
  display: flex;
  padding: 12px 16px 0;
  gap: 8px;
}

.tab-btn {
  flex: 1;
  height: 32px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.tab-btn.active {
  background: rgba(255, 215, 0, 0.15);
  border-color: var(--color-gold);
  color: var(--color-gold);
}

.stats-row {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item {
  display: grid;
  grid-template-columns: 35px 40px 1fr 45px;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.stat-item .label {
  font-weight: 600;
}

.stat-item.male .label { color: #1890ff; }
.stat-item.female .label { color: #ff6b9d; }

.stat-item .value {
  color: rgba(255, 255, 255, 0.8);
}

.progress-bg {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.stat-item.male .progress-fill { background: #1890ff; }
.stat-item.female .progress-fill { background: #ff6b9d; }

.stat-item .percent {
  text-align: right;
  color: rgba(255, 255, 255, 0.6);
}

.hero-stats-title {
  padding: 0 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 8px;
}

.hero-stats-row {
  padding: 0 16px 16px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.hero-stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
}

.hero-name {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}

.hero-count {
  color: rgba(255, 255, 255, 0.6);
}

.hero-progress-bg {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.hero-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

.hero-stat-item:nth-child(1) .hero-progress-fill { background: #1890ff; }
.hero-stat-item:nth-child(2) .hero-progress-fill { background: #ff4d4f; }
.hero-stat-item:nth-child(3) .hero-progress-fill { background: #faad14; }
.hero-stat-item:nth-child(4) .hero-progress-fill { background: #4ade80; }
.hero-stat-item:nth-child(5) .hero-progress-fill { background: #ff6b9d; }
.hero-stat-item:nth-child(6) .hero-progress-fill { background: #8b5cf6; }
.hero-stat-item:nth-child(7) .hero-progress-fill { background: #f59e0b; }
.hero-stat-item:nth-child(8) .hero-progress-fill { background: #ef4444; }

.hero-percent {
  text-align: right;
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
}

.road-map-title {
  padding: 0 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 8px;
}

.road-map-grid {
  padding: 0 16px 16px;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
}

.road-dot {
  aspect-ratio: 1;
  width: 100%;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
}

.road-dot.male { background: rgba(24, 144, 255, 0.2); color: #1890ff; }
.road-dot.female { background: rgba(255, 107, 157, 0.2); color: #ff6b9d; }

.empty-text {
  grid-column: 1/-1;
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  padding: 20px 0;
  font-size: 13px;
}
</style>
