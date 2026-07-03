<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content archive-modal">
      <h3>档案室</h3>
      
      <div class="slots-list">
        <div 
          v-for="slot in slots" 
          :key="slot.index" 
          class="slot-card"
          :class="{ active: currentSlot === slot.index }"
          @click="currentSlot = slot.index"
        >
          <div class="slot-header">
            <span class="slot-title">存档 {{ slot.index }}</span>
            <span v-if="slot.exists" class="slot-time">{{ slot.timestamp?.split(' ')[1] }}</span>
          </div>
          <div v-if="slot.exists" class="slot-info">
            <p>{{ slot.desc }}</p>
            <p class="small">{{ slot.preview }}</p>
          </div>
          <div v-else class="slot-empty">空位</div>
        </div>
      </div>

      <div class="archive-actions">
        <button class="btn btn-success" @click="handleSave">覆盖存档</button>
        <button class="btn btn-gold" @click="handleLoad" :disabled="!currentSlotData.exists">读取存档</button>
        <button class="btn btn-danger" @click="$emit('reset')">清空数据</button>
      </div>
      <button class="btn btn-outline close-btn" @click="$emit('close')">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  slots: Array
})

const emit = defineEmits(['close', 'save', 'load', 'reset'])

const currentSlot = ref(1)
const currentSlotData = computed(() => props.slots.find(s => s.index === currentSlot.value))

const handleSave = () => {
  emit('save', currentSlot.value)
}
const handleLoad = () => {
  emit('load', currentSlot.value)
}
</script>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-content { background: var(--color-panel); padding: 20px; border-radius: 12px; width: 80%; max-width: 350px; text-align: center; }
.archive-modal { width: 90%; max-width: 350px; }
.slots-list { display: flex; flex-direction: column; gap: 10px; margin: 15px 0; max-height: 250px; overflow-y: auto; }
.slot-card { border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; background: rgba(0,0,0,0.2); cursor: pointer; transition: all 0.2s; }
.slot-card.active { border-color: var(--color-blue); background: rgba(59, 139, 255, 0.1); }
.slot-header { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; font-weight: bold; }
.slot-time { font-size: 10px; color: var(--color-text-dim); font-weight: normal; }
.slot-info p { margin: 0; font-size: 12px; color: #ccc; }
.slot-info .small { font-size: 10px; color: #888; margin-top: 2px; }
.slot-empty { color: var(--color-text-dim); text-align: center; padding: 5px 0; }

.archive-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.archive-actions .btn-danger { grid-column: span 2; }
.close-btn { margin-top: 8px; }
</style>
