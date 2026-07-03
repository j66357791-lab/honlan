<template>
  <div class="phase-shop">
    <header class="header">
      <h2>六道轮回</h2>
      <div class="header-right">
        <div class="merit-display">
          <span class="label">功德</span>
          <span class="num-font value">{{ merit }}</span>
        </div>
        <button class="icon-btn" @click="$emit('open-archive')">📂</button>
      </div>
    </header>

    <div class="shop-list">
      <div v-for="item in items" :key="item.id" class="shop-item">
        <div class="item-info">
          <h3 class="item-name">{{ item.name }}</h3>
          <p class="item-desc">{{ item.desc }}</p>
        </div>
        <button 
          class="btn btn-sm" 
          :class="merit >= item.price ? 'btn-gold' : 'btn-outline'"
          :disabled="merit < item.price"
          @click="$emit('buy', item)"
        >
          {{ item.price }} 功德
        </button>
      </div>
    </div>

    <div class="action-area">
      <button class="btn btn-gold full-width" @click="showBirthSelect = true">
        开始投胎
      </button>
    </div>

    <div v-if="showBirthSelect" class="modal-overlay" @click.self="showBirthSelect = false">
      <div class="modal-content">
        <h3>这一世，你想做个...</h3>
        <div class="gender-select">
          <button class="btn btn-outline" @click="selectGender('male')">男儿身</button>
          <button class="btn btn-outline" @click="selectGender('female')">女儿身</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  merit: Number,
  items: Array
})
const emit = defineEmits(['buy', 'start-life', 'open-archive'])

const showBirthSelect = ref(false)

const selectGender = (gender) => {
  emit('start-life', gender)
  showBirthSelect.value = false
}
</script>

<style scoped>
.phase-shop { height: 100%; display: flex; flex-direction: column; }
.header { padding: 10px 15px; background-color: var(--color-panel); border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
.header-right { display: flex; align-items: center; gap: 10px; }
.merit-display .value { color: var(--color-gold); font-weight: bold; }
.icon-btn { background: none; border: none; font-size: 18px; color: var(--color-text-dim); cursor: pointer; }

.shop-list { padding: 15px; flex: 1; overflow-y: auto; }
.shop-item { background: var(--color-panel-light); margin-bottom: 10px; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
.item-name { margin: 0 0 4px 0; font-size: 14px; }
.item-desc { margin: 0; font-size: 12px; color: var(--color-text-dim); }
.action-area { padding: 15px; border-top: 1px solid rgba(255,255,255,0.1); }
.full-width { width: 100%; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-content { background: var(--color-panel); padding: 20px; border-radius: 12px; width: 80%; max-width: 300px; text-align: center; }
.gender-select { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
</style>
