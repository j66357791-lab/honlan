<template>
  <div class="climb-view">
    <!-- 顶部导航栏 -->
    <header class="climb-header">
      <div class="back-btn" @click="router.back()">‹ 返回</div>
      <h2>🏰 晶石千层塔</h2>
      <div class="header-assets">
        <span class="ha-item">💰 {{ displayBalance.toLocaleString() }}</span>
        <!-- ★ 修复：晶石除以1000并保留两位小数 -->
        <span class="ha-item crystal">💎 {{ ((displayCrystal || 0) / 1000).toFixed(2) }}</span>
      </div>
    </header>

    <div class="climb-container">
      <div class="detail-banner">
        <h3>投入积分，逐层解锁丰厚晶石</h3>
      </div>

      <div v-if="loading" class="status-box"><div class="loader"></div></div>
      
      <div v-else class="ladder-list">
        <LadderStep 
          v-for="item in levels" 
          :key="item.level" 
          :config="item" 
          :current="currentLevel"
          :exchanging="exchanging"
          @exchange="handleExchange"
        />
        <div v-if="levels.length === 0" class="status-box empty">暂无阶梯配置</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useClimbWall } from '../composables/useClimbWall.js'
import LadderStep from '../components/climbWall/LadderStep.vue'

const router = useRouter()
const { displayBalance, displayCrystal } = useAuth()
const { levels, currentLevel, loading, exchanging, fetchStatus, exchange } = useClimbWall()

onMounted(() => fetchStatus())

async function handleExchange() {
  const result = await exchange()
  if (!result.success) alert(result.message)
}
</script>

<style scoped>
.climb-view { min-height: 100vh; min-height: 100dvh; background: var(--color-bg); padding-bottom: 30px; }
.climb-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255, 248, 220, 0.85); backdrop-filter: blur(10px); border-radius: 0 0 12px 12px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); position: sticky; top: 0; z-index: 10; }
.back-btn { font-size: 24px; color: #d4af37; font-weight: bold; cursor: pointer; padding-right: 10px; }
.climb-header h2 { font-size: 17px; color: #333; margin: 0; position: absolute; left: 50%; transform: translateX(-50%); }
.header-assets { display: flex; gap: 10px; font-size: 12px; font-weight: 600; margin-left: auto; }
.ha-item { color: #d4af37; }
.ha-item.crystal { color: #8a2be2; }

.climb-container { padding: 16px; }
.detail-banner { text-align: center; padding: 20px 16px; background: rgba(138, 43, 226, 0.1); border: 1px solid rgba(138, 43, 226, 0.2); border-radius: 14px; margin-bottom: 20px; }
.detail-banner h3 { color: #8a2be2; font-size: 16px; margin: 0; }

.ladder-list { display: flex; flex-direction: column; gap: 14px; }
.status-box { text-align: center; padding: 40px; color: var(--color-text-dim); display: flex; justify-content: center; }
.empty { color: #888; }
.loader { width: 24px; height: 24px; border: 3px solid rgba(212, 175, 55, 0.2); border-top-color: #d4af37; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
