<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-card">
        <div class="modal-header">
          <h2 class="modal-title">点兵点将结算</h2>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="result-content">
          <div class="result-icon" :class="resultClass">
            {{ resultIcon }}
          </div>
          <div class="result-text">
            <div class="result-title">{{ resultTitle }}</div>
            <div class="result-details">
              <div v-for="detail in details" :key="detail.choice">
                <div>{{ detail.choice }}: {{ detail.amount.toLocaleString() }}积分</div>
                <div v-if="detail.isWin">赢取: {{ detail.payout.toLocaleString() }}积分</div>
              </div>
              <div>总盈亏: <span :class="netChangeClass">{{ netChangeText }}</span></div>
              <div v-if="specialText">特殊: {{ specialText }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  result: Object
})

defineEmits(['close'])

// ===== 计算属性 =====
const resultIcon = computed(() => {
  const r = props.result?.result
  return r === 'male' ? '👨' : r === 'female' ? '👩' : '🏆'
})

const resultTitle = computed(() => {
  const r = props.result?.result
  return r === 'male' ? '男将胜出' : r === 'female' ? '女将胜出' : '特殊结果'
})

const details = computed(() => props.result?.details || [])
const specialText = computed(() => props.result?.specialText || '')

const netChange = computed(() => props.result?.netChange || 0)
const netChangeText = computed(() => netChange.value >= 0 ? `+${netChange.value}` : netChange.value)
const netChangeClass = computed(() => netChange.value >= 0 ? 'text-win' : 'text-lose')
const resultClass = computed(() => {
  const r = props.result?.result
  return r === 'male' ? 'male' : r === 'female' ? 'female' : 'special'
})
</script>

<style scoped>
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
  background: url('https://t1.chatglm.cn/file/6a0cacd2534dae200804b470.png?expired_at=1779647615&sign=97a6b02608ccd4bf483e8dbfbb5395c0&ext=png') no-repeat center center;
  background-size: 140% auto;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(139,90,43,0.3);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  backdrop-filter: blur(2px);
  background-color: rgba(222, 184, 135, 0.9);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.modal-title {
  font-size: 17px;
  font-weight: 800;
  color: #5d4037;
  margin: 0;
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(139,90,43,0.2);
  color: rgba(139,90,43,0.8);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:active {
  background: rgba(139,90,43,0.3);
}

.result-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.result-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: bold;
}

.result-icon.male { background: rgba(24,144,255,0.2); color: #1890ff; }
.result-icon.female { background: rgba(255,107,157,0.2); color: #ff6b9d; }
.result-icon.special { background: rgba(74,222,128,0.2); color: #4ade80; }

.result-text {
  text-align: center;
  color: #5d4037;
}

.result-title {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 15px;
}

.result-details {
  font-size: 14px;
  line-height: 1.6;
}

.result-details div {
  margin: 5px 0;
}

.text-win { color: #2e7d32; }
.text-lose { color: #c62828; }
</style>
