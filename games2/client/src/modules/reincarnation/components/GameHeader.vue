<template>
  <header class="header">
    <div class="header-left">
      <div class="age-display">
        <span class="age-num num-font">{{ age }}</span>
        <span class="age-unit">岁</span>
        <span class="month-num num-font">{{ month + 1 }}</span>
        <span class="age-unit">个月</span>
      </div>
    </div>
    
    <div class="header-center">
       <span class="badge-loc">{{ location }}</span>
    </div>

    <div class="header-right">
      <button class="icon-btn" @click="$emit('open-archive')">📂</button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  age: Number,
  month: Number,
  location: String
})
defineEmits(['open-archive'])
</script>

<style scoped>
.header { padding: 10px 15px; background-color: var(--color-panel); border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; }
.header-left, .header-right { display: flex; align-items: center; gap: 10px; }
.header-center { flex: 1; text-align: center; }
.age-display { display: flex; align-items: baseline; font-size: 14px; }
.age-num { font-size: 20px; color: var(--color-text); font-weight: bold; }
.month-num { font-size: 16px; color: var(--color-blue); margin-left: 4px; }
.age-unit { font-size: 12px; color: var(--color-text-dim); margin: 0 2px; }
.badge-loc { font-size: 10px; padding: 2px 8px; background: rgba(255,255,255,0.1); border-radius: 10px; }
.icon-btn { background: none; border: none; font-size: 18px; color: var(--color-text-dim); cursor: pointer; }
</style>
