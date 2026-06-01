<template>
  <!-- 悬浮球 -->
  <div 
    v-if="showFloat"
    class="red-packet-float"
    :style="{ top: posY + 'px' }"
    @click="onClickFloat"
    @touchstart="onTouchStart"
    @touchmove.prevent="onTouchMove"
    @touchend="onTouchEnd"
  >
    <svg class="progress-ring" viewBox="0 0 100 100">
      <circle class="ring-bg" cx="50" cy="50" r="45" />
      <circle 
        class="ring-bar" 
        cx="50" cy="50" r="45"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <div class="rp-icon">🧧</div>
    <div v-if="hasAvailable" class="dot-badge">可抽</div>
  </div>

  <!-- 遮罩层 -->
  <transition name="fade">
    <div v-if="drawerVisible" class="rp-overlay" @click="closeDrawer"></div>
  </transition>

  <!-- 抽屉弹窗 -->
  <transition name="slide">
    <div v-if="drawerVisible" class="rp-drawer">
      <div class="drawer-header">
        <h3>🧧 流水红包</h3>
        <span class="close-btn" @click="closeDrawer">✕</span>
      </div>
      
      <div class="turnover-info">
        当前累计流水：<span class="highlight">{{ formatNumber(status?.currentTurnover) }}</span>
      </div>

      <!-- 场次列表（前端写死奖池） -->
      <div class="field-list">
        <div 
          v-for="item in status?.configs" 
          :key="item.level"
          class="field-card"
          :class="fieldCardClass(item)"
        >
          <div class="field-tag" :class="`tag-level-${item.level}`">
            {{ item.name || getFieldLabel(item.level) }}
          </div>

          <!-- 奖池展示区（前端写死，不依赖后端） -->
          <div class="pool-section">
            <div class="pool-title">奖池随机抽取：</div>
            <div class="pool-grid">
              <!-- 青铜场：0.1 / 0.2 / 0.3 / 0.4 / 0.5 -->
              <div v-if="item.level === 1" class="pool-item" 
                   v-for="(val, idx) in [0.1, 0.2, 0.3, 0.4, 0.5]" 
                   :key="`${item.level}-${idx}`">
                {{ val }} <span class="unit">晶石</span>
              </div>
              <!-- 白银场：0.3 / 1.2 / 1.8 / 2.4 / 3.0 -->
              <div v-else-if="item.level === 2" class="pool-item" 
                   v-for="(val, idx) in [0.3, 1.2, 1.8, 2.4, 3.0]" 
                   :key="`${item.level}-${idx}`">
                {{ val }} <span class="unit">晶石</span>
              </div>
            </div>
          </div>

          <div class="field-footer">
            <div class="field-require">需流水: {{ formatNumber(item.requiredTurnover) }}</div>
            
            <button 
              v-if="item.status === 'available'" 
              class="claim-btn" 
              :disabled="loadingLevel === item.level"
              @click="handleClaim(item.level)"
            >
              {{ loadingLevel === item.level ? '抽取中...' : '🧧 抽取红包' }}
            </button>
            <div v-else-if="item.status === 'claimed'" class="status-text claimed">✅ 已领取</div>
            <div v-else class="status-text locked">🔒 未达标</div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useRedPacket } from '../composables/useRedPacket'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const { status, progressPercent, hasAvailable, fetchStatus, claimReward } = useRedPacket()
const { updateCrystal } = useAuth()

const showFloat = computed(() => route.path !== '/login' && route.path !== '/register')

const posY = ref(window.innerHeight / 2 - 25)
let startY = 0
let startTop = 0
let isDragging = false

const onTouchStart = (e) => { isDragging = false; startY = e.touches[0].clientY; startTop = posY.value }
const onTouchMove = (e) => {
  isDragging = true
  let newTop = startTop + (e.touches[0].clientY - startY)
  posY.value = Math.max(50, Math.min(window.innerHeight - 50, newTop))
}
const onTouchEnd = () => {}
const onClickFloat = () => { if (!isDragging) openDrawer() }

const circumference = 2 * Math.PI * 45
const dashOffset = computed(() => circumference * (1 - progressPercent.value / 100))

const drawerVisible = ref(false)
const openDrawer = () => { drawerVisible.value = true; fetchStatus() }
const closeDrawer = () => drawerVisible.value = false

const loadingLevel = ref(null)
const handleClaim = async (level) => {
  if (loadingLevel.value) return
  loadingLevel.value = level
  try {
    const res = await claimReward(level)
    // 后端返回的是底层放大1000倍的整数（如100），前端转成0.1显示
    if (res?.rewardCrystal !== undefined) {
      updateCrystal(res.crystal) // 更新全局晶石余额
      const showAmount = res.rewardCrystal / 1000 // 转成0.1/0.2等
      alert(`🎉 恭喜抽中 ${showAmount} 晶石！`)
    }
  } catch (err) {
    alert(err.message || '抽取失败')
  } finally {
    loadingLevel.value = null
  }
}

// 格式化辅助（防止NaN）
const formatCrystal = (val) => {
  if (val === undefined || val === null) return '0'
  return Number((val / 1000).toFixed(1))
}
const formatNumber = (num) => num === undefined || num === null ? '0' : num.toLocaleString()
const getFieldLabel = (level) => ({ 1: '青铜场', 2: '白银场', 3: '黄金场' }[level] || `第${level}场`)
const fieldCardClass = (item) => ({
  'is-available': item.status === 'available',
  'is-claimed': item.status === 'claimed',
  'is-locked': item.status === 'locked'
})

let timer = null
onMounted(() => { fetchStatus(); timer = setInterval(fetchStatus, 30000) })
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
/* 悬浮球 */
.red-packet-float { position: fixed; right: 10px; width: 50px; height: 50px; z-index: 999; display: flex; align-items: center; justify-content: center; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.progress-ring { position: absolute; width: 100%; height: 100%; transform: rotate(-90deg); pointer-events: none; }
.ring-bg { fill: none; stroke: rgba(255,255,255,0.2); stroke-width: 6; }
.ring-bar { fill: none; stroke: #ff4d4f; stroke-width: 6; stroke-linecap: round; transition: stroke-dashoffset 0.5s ease; }
.rp-icon { font-size: 28px; z-index: 1; pointer-events: none; }
.dot-badge { position: absolute; top: -2px; right: -2px; background: #ffd700; color: #000; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 8px; animation: pulse 1.5s infinite; z-index: 2; pointer-events: none; }
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }

/* 遮罩与抽屉 */
.rp-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 1000; }
.rp-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 85%; max-width: 400px; background: linear-gradient(180deg, #1a0b2e, #120628); z-index: 1001; padding: 20px 15px; box-shadow: -5px 0 30px rgba(0,0,0,0.8); color: white; display: flex; flex-direction: column; overflow-y: auto; }
.drawer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,215,0,0.3); padding-bottom: 10px; }
.drawer-header h3 { margin: 0; font-size: 18px; color: #ffd700; }
.close-btn { font-size: 24px; cursor: pointer; color: rgba(255,255,255,0.5); }
.turnover-info { text-align: center; font-size: 14px; margin-bottom: 20px; color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; }
.highlight { color: #ffd700; font-weight: bold; font-size: 20px; text-shadow: 0 0 10px rgba(255,215,0,0.5); }

/* 卡片列表 */
.field-list { flex: 1; display: flex; flex-direction: column; gap: 15px; }
.field-card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.1); position: relative; overflow: hidden; transition: all 0.3s; }
.field-card.is-available { border-color: #ffd700; box-shadow: 0 0 15px rgba(255,215,0,0.2) inset, 0 0 10px rgba(255,215,0,0.2); }
.field-card.is-claimed { opacity: 0.5; filter: grayscale(0.5); }
.field-tag { position: absolute; top: 0; left: 0; padding: 4px 12px; font-size: 12px; font-weight: bold; border-bottom-right-radius: 12px; color: #000; }
.tag-level-1 { background: linear-gradient(135deg, #cd7f32, #e6a855); }
.tag-level-2 { background: linear-gradient(135deg, #c0c0c0, #e8e8e8); }
.tag-level-3 { background: linear-gradient(135deg, #ffd700, #ffaa00); }

.pool-section { margin-top: 25px; margin-bottom: 15px; }
.pool-title { font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
.pool-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.pool-item { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,215,0,0.3); border-radius: 6px; padding: 4px 8px; font-size: 14px; color: #ffd700; font-weight: bold; }
.pool-item .unit { font-size: 10px; color: rgba(255,255,255,0.6); font-weight: normal; margin-left: 2px; }

.field-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px; }
.field-require { font-size: 12px; color: rgba(255,255,255,0.5); }
.claim-btn { background: linear-gradient(135deg, #ff4d4f, #e6e611); color: white; border: none; padding: 6px 18px; border-radius: 20px; font-weight: bold; font-size: 13px; cursor: pointer; box-shadow: 0 0 10px rgba(255,77,79,0.5); }
.claim-btn:disabled { opacity: 0.6; cursor: not-allowed; background: #555; box-shadow: none; }
.status-text { font-size: 13px; font-weight: bold; }
.claimed { color: #52c41a; }
.locked { color: rgba(255,255,255,0.5); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
</style>
