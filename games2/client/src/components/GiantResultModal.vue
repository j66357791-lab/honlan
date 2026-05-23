<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-card">
        <div class="modal-header">
          <h2 class="modal-title">巨人赛跑结算</h2>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="result-content">
          <div class="result-icon" :class="resultClass">
            {{ resultIcon }}
          </div>
          <div class="result-text">
            <div class="result-title">{{ resultTitle }}</div>
            <div class="result-details">
              <div>下注: {{ choiceLabel }}</div>
              <div>额度: {{ amount.toLocaleString() }} 积分</div>
              <div>结果: {{ resultLabel }}</div>
              <div>盈亏: <span :class="netChangeClass">{{ netChangeText }}</span></div>
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
  result: Object,
  choice: String
})

defineEmits(['close'])

// ===== 计算属性 =====
const resultIcon = computed(() => {
  const r = props.result?.result
  return r === 'red' ? '🔴' : r === 'blue' ? '🔵' : '⚪'
})

const resultTitle = computed(() => {
  const r = props.result?.result
  return r === 'red' ? '红巨人胜出' : r === 'blue' ? '蓝巨人胜出' : '平局'
})

const resultLabel = computed(() => {
  const r = props.result?.result
  return r === 'red' ? '红巨人' : r === 'blue' ? '蓝巨人' : '平局'
})

const choiceLabel = computed(() => {
  const c = props.choice
  return c === 'red' ? '红巨人' : c === 'blue' ? '蓝巨人' : '平局'
})

const amount = computed(() => props.result?.amount || 0)
const netChange = computed(() => props.result?.netChange || 0)
const netChangeText = computed(() => netChange.value >= 0 ? `+${netChange.value}` : netChange.value)
const netChangeClass = computed(() => netChange.value >= 0 ? 'text-win' : 'text-lose')
const resultClass = computed(() => {
  const r = props.result?.result
  return r === 'red' ? 'red' : r === 'blue' ? 'blue' : 'draw'
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

.result-icon.red { background: rgba(255,77,79,0.2); color: #ff4d4f; }
.result-icon.blue { background: rgba(24,144,255,0.2); color: #1890ff; }
.result-icon.draw { background: rgba(250,173,20,0.2); color: #faad14; }

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
