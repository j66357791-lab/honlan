<template>
  <Teleport to="body">
    <Transition name="anno-fade">
      <div v-if="visible" class="anno-overlay" @click.self="handleOverlayClick">
        <div class="anno-modal">
          <img
            src="/assets/images/gonggao-backend.png"
            alt=""
            class="anno-bg"
            draggable="false"
          />
          <div class="anno-glow"></div>
          <button class="anno-close" @click="close">✕</button>
          <div class="anno-body">
            <div class="anno-header">
              <span class="anno-icon">📢</span>
              <h2 class="anno-title">{{ announcement?.title || '平台公告' }}</h2>
            </div>
            <div class="anno-content">
              <div v-if="announcement?.content" class="anno-text" v-html="announcement.content"></div>
              <div v-else class="anno-empty">
                <span>📭</span>
                <p>暂无公告</p>
              </div>
            </div>
            <div class="anno-footer">
              <label class="anno-no-remind">
                <input type="checkbox" v-model="noRemindToday" />
                <span>今日不再提示</span>
              </label>
              <div class="anno-actions">
                <button
                  v-if="announcement?.linkAction"
                  class="anno-btn anno-btn-primary"
                  @click="handleAction"
                >
                  {{ announcement.linkText || '查看详情' }}
                </button>
                <button class="anno-btn anno-btn-secondary" @click="close">
                  我知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  announcement: { type: Object, default: null }
})

const emit = defineEmits(['close', 'action'])

const noRemindToday = ref(false)

function close() {
  emit('close', { noRemindToday: noRemindToday.value })
}

function handleAction() {
  emit('action', props.announcement)
  close()
}

function handleOverlayClick() {
  // 点击遮罩不关闭，防止误触
}
</script>

<style scoped>
.anno-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.anno-modal {
  position: relative;
  width: 100%;
  max-width: 360px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(212, 175, 55, 0.3);
  animation: annoPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes annoPop {
  0% {
    opacity: 0;
    transform: scale(0.7) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.anno-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.anno-glow {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 120px;
  background: radial-gradient(ellipse, rgba(212, 175, 55, 0.4) 0%, transparent 70%);
  z-index: 1;
  pointer-events: none;
}

.anno-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  transition: background 0.2s;
}
.anno-close:active {
  background: rgba(0, 0, 0, 0.45);
}

.anno-body {
  position: relative;
  z-index: 2;
  padding: 32px 24px 24px;
  background: linear-gradient(
    180deg,
    rgba(30, 20, 10, 0.15) 0%,
    rgba(30, 20, 10, 0.45) 100%
  );
  min-height: 320px;
  display: flex;
  flex-direction: column;
}

.anno-header {
  text-align: center;
  margin-bottom: 20px;
}
.anno-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 8px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}
.anno-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #ffd700;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  letter-spacing: 1px;
}

.anno-content {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
}
.anno-text {
  font-size: 14px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  word-break: break-word;
}
.anno-text :deep(p) {
  margin: 0 0 8px;
}
.anno-text :deep(strong),
.anno-text :deep(b) {
  color: #ffd700;
}
.anno-text :deep(em) {
  color: #ff6b6b;
  font-style: normal;
}

.anno-empty {
  text-align: center;
  padding: 40px 0;
  color: rgba(255, 255, 255, 0.5);
}
.anno-empty span {
  font-size: 40px;
}
.anno-empty p {
  margin: 8px 0 0;
  font-size: 14px;
}

.anno-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 16px;
}
.anno-no-remind {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 14px;
  cursor: pointer;
}
.anno-no-remind input[type='checkbox'] {
  width: 15px;
  height: 15px;
  accent-color: #d4af37;
}

.anno-actions {
  display: flex;
  gap: 10px;
}

.anno-btn {
  flex: 1;
  padding: 12px 0;
  border-radius: 10px;
  border: none;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.anno-btn-primary {
  background: linear-gradient(135deg, #d4af37, #f0d060);
  color: #1a1a1a;
  box-shadow: 0 4px 14px rgba(212, 175, 55, 0.4);
}
.anno-btn-primary:active {
  transform: scale(0.97);
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
}

.anno-btn-secondary {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.anno-btn-secondary:active {
  background: rgba(255, 255, 255, 0.2);
}

.anno-fade-enter-active {
  transition: opacity 0.25s ease;
}
.anno-fade-leave-active {
  transition: opacity 0.2s ease;
}
.anno-fade-enter-from,
.anno-fade-leave-to {
  opacity: 0;
}

@media (max-width: 380px) {
  .anno-body {
    padding: 28px 18px 20px;
    min-height: 280px;
  }
  .anno-title {
    font-size: 18px;
  }
  .anno-text {
    font-size: 13px;
  }
}
</style>
