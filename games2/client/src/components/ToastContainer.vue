<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div v-for="toast in toastList" :key="toast.id" class="toast-item" :class="toast.type">{{ toast.message }}</div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToast } from '../composables/useGame.js'
const { toastList } = useToast()
</script>

<style scoped>
.toast-container { position:fixed; top:60px; left:50%; transform:translateX(-50%); z-index:9999; display:flex; flex-direction:column; align-items:center; gap:8px; pointer-events:none; max-width:480px; width:100%; padding:0 16px; }
.toast-item { background:rgba(30,30,50,0.95); color:white; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:500; pointer-events:auto; backdrop-filter:blur(10px); box-shadow:0 4px 20px rgba(0,0,0,0.5); text-align:center; width:fit-content; max-width:100%; }
.toast-item.success { border-left:3px solid var(--color-success); }
.toast-item.error { border-left:3px solid var(--color-danger); }
.toast-item.info { border-left:3px solid var(--color-blue); }
.toast-enter-active { animation:slideIn 0.3s ease; }
.toast-leave-active { animation:slideOut 0.3s ease; }
@keyframes slideIn { from{transform:translateY(-20px);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes slideOut { from{transform:translateY(0);opacity:1} to{transform:translateY(-20px);opacity:0} }
</style>
