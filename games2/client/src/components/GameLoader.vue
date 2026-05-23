<template>
  <Transition name="loader-fade">
    <div v-if="show" class="game-loader">
      <!-- 背景装饰 -->
      <div class="loader-bg">
        <div class="floating-shape shape-1"></div>
        <div class="floating-shape shape-2"></div>
        <div class="floating-shape shape-3"></div>
        <div class="floating-shape shape-4"></div>
      </div>

      <!-- 主内容 -->
      <div class="loader-content">
        <!-- 游戏图标 -->
        <div class="loader-icon-wrap">
          <span class="loader-icon">🧩</span>
          <div class="icon-ring"></div>
        </div>

        <!-- 游戏标题 -->
        <h2 class="loader-title">消消乐</h2>

        <!-- 进度区域 -->
        <div class="loader-progress-area">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: progress + '%' }">
              <div class="progress-shine"></div>
            </div>
          </div>
          <div class="progress-info">
            <span class="progress-percent">{{ progress }}%</span>
            <span class="progress-detail" v-if="!isComplete">
              {{ doneCount }} / {{ totalCount }}
            </span>
            <span class="progress-detail complete" v-else>✓ 加载完成</span>
          </div>
          <div class="current-resource" v-if="currentName && !isComplete">
            正在加载: {{ currentName }}
          </div>
        </div>

        <!-- 开始按钮 -->
        <Transition name="btn-pop">
          <button v-if="isComplete" class="start-btn" @click="$emit('start')">
            <span class="btn-text">开始游戏</span>
            <span class="btn-arrow">›</span>
          </button>
        </Transition>

        <!-- 提示 -->
        <div class="loader-tip" v-if="!isComplete">
          首次加载可能需要几秒钟，请耐心等待
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: true },
  progress: { type: Number, default: 0 },
  currentName: { type: String, default: '' },
  totalCount: { type: Number, default: 0 },
  doneCount: { type: Number, default: 0 },
  loaded: { type: Boolean, default: false }
})

defineEmits(['start'])

const isComplete = computed(() => props.loaded && props.progress >= 100)
</script>

<style scoped>
.game-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: linear-gradient(135deg, #0a0e1a 0%, #1a1040 40%, #0d1f3c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* 浮动装饰 */
.loader-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.floating-shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.06;
  animation: floatShape 8s ease-in-out infinite;
}

.shape-1 { width: 300px; height: 300px; background: #d4af37; top: -80px; right: -60px; }
.shape-2 { width: 200px; height: 200px; background: #6c5ce7; bottom: -40px; left: -40px; animation-delay: -2s; }
.shape-3 { width: 150px; height: 150px; background: #00cec9; top: 40%; left: 10%; animation-delay: -4s; }
.shape-4 { width: 120px; height: 120px; background: #fd79a8; bottom: 20%; right: 15%; animation-delay: -6s; }

@keyframes floatShape {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(20px, -30px) scale(1.05); }
  50% { transform: translate(-15px, 20px) scale(0.95); }
  75% { transform: translate(10px, 15px) scale(1.02); }
}

/* 主内容 */
.loader-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 20px;
  width: 100%;
  max-width: 380px;
}

/* 图标 */
.loader-icon-wrap {
  position: relative;
  display: inline-block;
  margin-bottom: 20px;
}

.loader-icon {
  font-size: 64px;
  display: block;
  animation: iconBounce 2s ease-in-out infinite;
  filter: drop-shadow(0 4px 20px rgba(212, 175, 55, 0.4));
}

.icon-ring {
  position: absolute;
  inset: -16px;
  border-radius: 50%;
  border: 2px solid rgba(212, 175, 55, 0.15);
  animation: ringPulse 2s ease-in-out infinite;
}

@keyframes iconBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes ringPulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.15); opacity: 0.1; }
}

/* 标题 */
.loader-title {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 28px;
  text-shadow: 0 2px 12px rgba(212, 175, 55, 0.3);
  letter-spacing: 2px;
}

/* 进度条 */
.loader-progress-area {
  margin-bottom: 28px;
}

.progress-track {
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 5px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.progress-fill {
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, #d4af37, #f0d060, #d4af37);
  transition: width 0.3s ease;
  position: relative;
}

.progress-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
  animation: shine 1.5s ease-in-out infinite;
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.progress-percent {
  font-size: 20px;
  font-weight: 800;
  color: #d4af37;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
}

.progress-detail {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
}

.progress-detail.complete {
  color: #27ae60;
  font-weight: 600;
}

.current-resource {
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 开始按钮 */
.start-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 40px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #d4af37, #f0d060);
  color: #1a1a1a;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4), 0 0 40px rgba(212, 175, 55, 0.15);
  transition: all 0.2s;
  animation: btnGlow 2s ease-in-out infinite;
  letter-spacing: 1px;
}

.start-btn:active {
  transform: scale(0.96);
}

.btn-arrow {
  font-size: 22px;
  font-weight: 800;
}

@keyframes btnGlow {
  0%, 100% { box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4), 0 0 40px rgba(212, 175, 55, 0.15); }
  50% { box-shadow: 0 4px 30px rgba(212, 175, 55, 0.6), 0 0 60px rgba(212, 175, 55, 0.25); }
}

/* 提示 */
.loader-tip {
  margin-top: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.25);
}

/* 过渡动画 */
.loader-fade-leave-active {
  transition: all 0.5s ease;
}

.loader-fade-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

.btn-pop-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-pop-enter-from {
  opacity: 0;
  transform: scale(0.5) translateY(20px);
}
</style>
