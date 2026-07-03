<template>
  <main class="game-main">
    <!-- 事件卡片 -->
    <div v-if="event" class="event-card">
      <h3 class="event-title">【{{ event.title }}】</h3>
      <p class="event-text">{{ event.text }}</p>
      <div class="event-choices">
        <button 
          v-for="(choice, idx) in event.choices" 
          :key="idx"
          class="btn btn-outline full-width"
          @click="$emit('handle-choice', idx)"
        >
          {{ choice.text }}
        </button>
      </div>
    </div>

    <!-- 日常行动 -->
    <div v-else class="planning-panel">
      <div class="intro-card">
        <h4>📜 身份</h4>
        <p>{{ player.background?.name }} · {{ player.background?.familyStatus }}</p>
        <p>父亲：{{ player.parents.father?.name }}</p>
      </div>

      <div class="stats-display">
        <p>力量: <b>{{ player.stats.str.toFixed(1) }}</b></p>
        <p>智力: <b>{{ player.stats.int.toFixed(1) }}</b></p>
        <p>体质: <b>{{ player.stats.con.toFixed(1) }}</b></p>
        <p>容貌: <b>{{ player.stats.chr.toFixed(1) }}</b></p>
        <p>心情: <b :style="{color: player.mood < 30 ? 'red' : 'white'}">{{ player.mood }}</b></p>
      </div>
      
      <!-- 优化后的日志 -->
      <div class="log-box-container">
        <h4 class="log-title">人生经历</h4>
        <div class="log-box">
          <p v-if="logs.length === 0" class="placeholder">岁月静好，暂无大事...</p>
          <div 
            v-for="(log, index) in logs.slice(0, 15)" 
            :key="index" 
            class="log-item"
            :class="{ fresh: index === 0 }"
          >
            {{ log }}
          </div>
        </div>
      </div>

      <div class="actions">
        <p class="tips">本月安排：</p>
        <div class="action-grid">
          <button 
            v-for="action in actions" 
            :key="action.id"
            class="btn btn-outline"
            @click="$emit('pass-month', action.id)"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
defineProps({
  player: Object,
  event: Object,
  logs: Array,
  actions: Array
})
defineEmits(['handle-choice', 'pass-month'])
</script>

<style scoped>
.game-main { flex: 1; padding: 15px; position: relative; overflow-y: auto; }
.intro-card { background: rgba(59, 139, 255, 0.1); padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 12px; }
.intro-card h4 { margin: 0 0 4px 0; color: var(--color-blue); }

.stats-display { background: var(--color-panel-light); padding: 12px; border-radius: 8px; margin-bottom: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; font-size: 12px; text-align: center; }
.stats-display b { color: var(--color-gold); }

.log-box-container { background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 15px; padding: 10px; max-height: 120px; display: flex; flex-direction: column; }
.log-title { margin: 0 0 8px 0; font-size: 12px; color: var(--color-text-dim); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; }
.log-box { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.log-item { padding: 4px 8px; border-radius: 4px; color: #ccc; line-height: 1.4; animation: slideIn 0.3s ease-out; }
.log-item.fresh { background: rgba(59, 139, 255, 0.15); color: #fff; border-left: 3px solid var(--color-blue); font-weight: bold; }
.placeholder { text-align: center; color: var(--color-text-dim); font-style: italic; }
@keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }

.actions { background: var(--color-panel); padding: 15px; border-radius: 8px; }
.tips { text-align: center; margin-bottom: 10px; font-size: 12px; color: var(--color-text-dim); }
.action-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }

.event-card { background: var(--color-panel); padding: 20px; border-radius: 8px; border: 1px solid var(--color-blue-glow); text-align: center; }
.event-title { color: var(--color-blue); margin-bottom: 10px; }
.event-text { font-size: 15px; margin-bottom: 20px; line-height: 1.6; }
.full-width { width: 100%; }
</style>
