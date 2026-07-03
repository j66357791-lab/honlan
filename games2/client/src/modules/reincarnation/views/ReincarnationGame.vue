<template>
  <div class="cycle-container">
    <!-- 阶段 1: 商店 -->
    <ShopPhase
      v-if="gamePhase === 'shop'"
      :merit="totalMerit"
      :items="shopItems"
      @buy="handleBuy"
      @start-life="startNewLife"
      @open-archive="showArchive = true"
    />

    <!-- 阶段 2: 游戏中 -->
    <div v-if="gamePhase === 'living'" class="phase-game">
      <GameHeader
        :age="player.age"
        :month="player.month"
        :location="player.hometown"
        @open-archive="showArchive = true"
      />
      <LivingPhase
        :player="player"
        :event="currentEvent"
        :logs="yearlyLog"
        :actions="getAvailableActions()"
        @handle-choice="handleEventChoice"
        @pass-month="passMonth"
      />
    </div>

    <!-- 阶段 3: 死亡 -->
    <DeathPhase
      v-if="gamePhase === 'dead'"
      :age="player.age"
      :merit-gain="player.age * 10 + player.stats.int * 5"
      :total-merit="totalMerit"
      @restart="restartGame"
    />

    <!-- 档案室 (全局弹窗) -->
    <!-- 👇 使用 :key="saveKey" 确保每次保存后强制刷新组件 -->
    <ArchiveModal
      :key="saveKey"
      :is-open="showArchive"
      :slots="saveSlots"
      @close="showArchive = false"
      @save="handleSave"
      @load="handleLoad"
      @reset="handleReset"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useReincarnationCore } from '../composables/useReincarnationCore'

// 引入组件
import ShopPhase from '../components/ShopPhase.vue'
import GameHeader from '../components/GameHeader.vue'
import LivingPhase from '../components/LivingPhase.vue'
import DeathPhase from '../components/DeathPhase.vue'
import ArchiveModal from '../components/ArchiveModal.vue'

const {
  gamePhase, player, totalMerit, currentEvent, yearlyLog, shopItems,
  buyItem, startNewLife, passMonth, handleEventChoice, restartGame,
  getSaveSlots, saveGameToSlot, loadGameFromSlot, hardReset,
  getAvailableActions
} = useReincarnationCore()

// 状态管理
const showArchive = ref(false)
const saveKey = ref(0) // 用于强制刷新存档列表

// 存档列表计算 (依赖 saveKey)
const saveSlots = computed(() => {
  saveKey.value 
  return getSaveSlots()
})

// === 事件处理封装 ===

const handleBuy = (item) => {
  buyItem(item)
}

const handleSave = (slotIndex) => {
  saveGameToSlot(slotIndex)
  saveKey.value++ // 触发刷新
  alert(`已保存到 存档 ${slotIndex}`)
}

const handleLoad = (slotIndex) => {
  const success = loadGameFromSlot(slotIndex)
  if (success) {
    saveKey.value++
    showArchive.value = false
  } else {
    alert('读取失败，存档可能损坏')
  }
}

const handleReset = () => {
  if(confirm('警告：确定要删除所有存档、功德和进度吗？')) {
    hardReset()
  }
}

onMounted(() => {
  // 初始化逻辑（如果需要自动读档，在这里写）
})
</script>

<style scoped>
.cycle-container { width: 100%; height: 100vh; background-color: var(--color-bg); color: var(--color-text); display: flex; flex-direction: column; overflow: hidden; }
.phase-game { display: flex; flex-direction: column; height: 100%; }
</style>
