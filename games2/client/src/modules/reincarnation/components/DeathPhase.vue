<template>
  <div class="phase-dead">
    <h2 class="dead-title">驾鹤西去</h2>
    <div class="dead-stats">
      <p>享年：{{ age }} 岁</p>
      <p>获得功德：+{{ meritGain }}</p>
      <p class="highlight">总功德：{{ totalMerit }}</p>
    </div>
    <button class="btn btn-gold full-width" @click="$emit('restart')">进入轮回</button>
  </div>
</template>

<script setup>
const props = defineProps({
  age: Number,
  meritGain: Number,
  totalMerit: Number
})
defineEmits(['restart'])
</script>

<style scoped>
.phase-dead { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 30px; text-align: center; }
.dead-title { font-size: 28px; margin-bottom: 30px; color: var(--color-text-dim); }
.dead-stats { background: var(--color-panel); padding: 20px; border-radius: 8px; width: 100%; margin-bottom: 30px; line-height: 2; }
.highlight { color: var(--color-gold); font-weight: bold; font-size: 1.1em; }
.full-width { width: 100%; }
</style>
