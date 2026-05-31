<template>
  <div class="activity-view">
    <!-- 顶部导航栏 -->
    <header class="activity-header">
      <div class="back-btn" @click="currentView === 'detail' ? currentView = 'list' : router.back()">
        ‹ 返回
      </div>
      <h2>🎉 活动中心</h2>
      <div class="header-assets">
        <span class="ha-item">💰 {{ displayBalance.toLocaleString() }}</span>
        <span class="ha-item crystal">💎 {{ displayCrystal }}</span>
      </div>
    </header>

    <!-- ====== 视图1：活动列表广场 ====== -->
    <div v-if="currentView === 'list'" class="list-container">
      
      <!-- 主推活动：晶石千层楼 -->
      <div class="featured-card" @click="currentView = 'detail'">
        <div class="fc-bg"></div>
        <div class="fc-content">
          <div class="fc-badge">限时活动</div>
          <h3 class="fc-title">晶石千层楼</h3>
          <p class="fc-desc">积分当砖，晶石上天！逐级攀登解锁稀有晶石</p>
          <button class="fc-btn">立即前往 ›</button>
        </div>
        <div class="fc-icon">🏰</div>
      </div>

      <!-- 占位活动列表 -->
      <div class="activity-grid">
        <div class="act-card" @click="comingSoon">
          <div class="act-icon">📅</div>
          <div class="act-name">每日签到</div>
          <div class="act-status">开启中</div>
        </div>
        <div class="act-card" @click="comingSoon">
          <div class="act-icon">🎰</div>
          <div class="act-name幸运转盘</div>
          <div class="act-status>即将开启</div>
        </div>
        <div class="act-card" @click="comingSoon">
          <div class="act-icon">🧧</div>
          <div class="act-name">红包雨</div>
          <div class="act-status">即将开启</div>
        </div>
        <div class="act-card" @click="comingSoon">
          <div class="act-icon">⚔️</div>
          <div class="act-name">冲榜大奖</div>
          <div class="act-status">即将开启</div>
        </div>
      </div>
    </div>

    <!-- ====== 视图2：晶石千层楼详情 ====== -->
    <div v-else class="detail-container">
      <div class="detail-banner">
        <h3>🏰 晶石千层楼</h3>
        <p>投入积分，逐层解锁丰厚晶石奖励</p>
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useClimbWall } from '../composables/useClimbWall.js'
import LadderStep from '../components/climbWall/LadderStep.vue'

const router = useRouter()
const { displayBalance, displayCrystal } = useAuth()
const { levels, currentLevel, loading, exchanging, fetchStatus, exchange } = useClimbWall()

// 视图控制：list(广场) / detail(千层楼详情)
const currentView = ref('list')

// 进入详情页时拉取状态
onMounted(() => fetchStatus())

async function handleExchange() {
  const result = await exchange()
  if (!result.success) alert(result.message)
}

function comingSoon() {
  alert('🎉 该活动即将上线，敬请期待！')
}
</script>

<style scoped>
.activity-view {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: 30px;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 248, 220, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 0 0 12px 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}
.back-btn { font-size: 24px; color: #d4af37; font-weight: bold; cursor: pointer; padding-right: 10px; }
.activity-header h2 { font-size: 17px; color: #333; margin: 0; position: absolute; left: 50%; transform: translateX(-50%); }
.header-assets { display: flex; gap: 10px; font-size: 12px; font-weight: 600; margin-left: auto; }
.ha-item { color: #d4af37; }
.ha-item.crystal { color: #8a2be2; }

/* === 列表广场样式 === */
.list-container { padding: 16px; }
.featured-card {
  position: relative;
  background: linear-gradient(135deg, #2a1a48, #1a1a2e);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(138, 43, 226, 0.2);
  cursor: pointer;
  transition: transform 0.2s;
}
.featured-card:active { transform: scale(0.98); }
.fc-bg { position: absolute; top: 0; right: 0; width: 60%; height: 100%; background: radial-gradient(circle at top right, rgba(212, 175, 55, 0.15), transparent 70%); }
.fc-content { position: relative; z-index: 2; }
.fc-badge { display: inline-block; background: #e74c3c; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-bottom: 10px; }
.fc-title { color: #fff; font-size: 24px; margin: 0 0 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
.fc-desc { color: rgba(255,255,255,0.7); font-size: 13px; margin-bottom: 16px; }
.fc-btn { background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000; border: none; padding: 8px 20px; border-radius: 20px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 215, 0, 0.3); }
.fc-icon { position: absolute; right: 20px; bottom: 10px; font-size: 80px; opacity: 0.3; z-index: 1; }

.activity-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.act-card {
  background: rgba(255, 248, 220, 0.75);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 12px;
  padding: 20px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(5px);
}
.act-card:active { transform: scale(0.96); border-color: #d4af37; }
.act-icon { font-size: 32px; margin-bottom: 8px; }
.act-name { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 4px; }
.act-status { font-size: 11px; color: #888; }

/* === 详情视图样式 === */
.detail-container { padding: 16px; }
.detail-banner {
  text-align: center;
  padding: 24px 16px;
  background: rgba(138, 43, 226, 0.1);
  border: 1px solid rgba(138, 43, 226, 0.2);
  border-radius: 14px;
  margin-bottom: 20px;
}
.detail-banner h3 { color: #8a2be2; font-size: 20px; margin: 0 0 6px; }
.detail-banner p { color: #aaa; font-size: 13px; margin: 0; }

.ladder-list { display: flex; flex-direction: column; gap: 14px; }
.status-box { text-align: center; padding: 40px; color: var(--color-text-dim); display: flex; justify-content: center; }
.loader { width: 24px; height: 24px; border: 3px solid rgba(212, 175, 55, 0.2); border-top-color: #d4af37; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
