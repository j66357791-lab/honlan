<template>
  <div class="ladder-step" :class="stepClass">
    <div class="step-left">
      <div class="step-badge">
        <span v-if="status === 'completed'">✓</span>
        <span v-else-if="status === 'available'">🌟</span>
        <span v-else>{{ config.level }}</span>
      </div>
    </div>
    
    <div class="step-center">
      <div class="step-title">第 {{ config.level }} 阶梯</div>
      <div class="step-detail">
        投入 <span class="num-font highlight">{{ config.costPoint.toLocaleString() }}</span> 积分 
        ➜ 获得 <span class="num-font highlight purple">{{ config.rewardCrystal }}</span> 晶石
      </div>
    </div>

    <div class="step-right">
      <!-- 可挑战状态：显示兑换按钮 -->
      <button 
        v-if="status === 'available'" 
        class="btn btn-gold step-btn" 
        :disabled="exchanging"
        @click.stop="$emit('exchange')"
      >
        {{ exchanging ? '处理中' : '挑战' }}
      </button>
      <!-- 已完成状态 -->
      <div v-else-if="status === 'completed'" class="status-icon">✅</div>
      <!-- 未解锁状态 -->
      <div v-else class="status-icon locked">🔒</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  config: Object,   // { level, costPoint, rewardCrystal }
  current: Number,  // 用户当前已完成的阶梯数
  exchanging: Boolean
})

defineEmits(['exchange'])

// 计算当前阶梯的状态
const status = computed(() => {
  if (props.current >= props.config.level) return 'completed'  // 已通关
  if (props.current === props.config.level - 1) return 'available' // 正好是下一级，可挑战
  return 'locked' // 还没轮到，未解锁
})

// 动态样式类名
const stepClass = computed(() => ({
  'is-completed': status.value === 'completed',
  'is-available': status.value === 'available',
  'is-locked': status.value === 'locked'
}))
</script>

<style scoped>
.ladder-step {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 248, 220, 0.75);
  border: 1px solid rgba(212, 175, 55, 0.2);
  backdrop-filter: blur(5px);
  transition: all 0.3s ease;
}

/* 可挑战状态：高亮放大 */
.is-available {
  border-color: #d4af37;
  background: rgba(255, 248, 220, 0.95);
  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
  transform: scale(1.02);
}

/* 未解锁状态：置灰 */
.is-locked {
  opacity: 0.55;
  filter: grayscale(0.5);
}

.step-left { flex-shrink: 0; }
.step-badge {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(212, 175, 55, 0.15);
  color: #d4af37;
  font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
}
.is-available .step-badge { background: #d4af37; color: #fff; box-shadow: 0 0 10px rgba(212,175,55,0.4); }
.is-completed .step-badge { background: #1bb069; color: #fff; }

.step-center { flex: 1; }
.step-title { font-size: 15px; font-weight: 700; color: #333; margin-bottom: 4px; }
.step-detail { font-size: 12px; color: #666; }
.highlight { color: #d4af37; font-weight: bold; }
.purple { color: #8a2be2; }

.step-right { flex-shrink: 0; }
.step-btn { 
  font-size: 14px; 
  padding: 6px 20px; 
  min-height: auto; 
  border-radius: 20px; 
  box-shadow: 0 2px 8px rgba(212,175,55,0.3);
}
.status-icon { font-size: 24px; text-align: center; width: 60px; }
.status-icon.locked { font-size: 20px; color: #999; }
</style>
