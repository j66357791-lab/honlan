<template>
  <div class="membership-view">
    <!-- 顶部导航 -->
    <header class="mem-header">
      <div class="back-btn" @click="$router.back()">‹ 返回</div>
      <h2>👑 月卡中心</h2>
      <div></div>
    </header>

    <div class="mem-container" v-if="!loading">
      <!-- 当前状态卡片区 -->
      <div class="card-display">
        <div v-if="type === 'none'" class="mem-card no-card">
          <div class="card-icon">😴</div>
          <div class="card-title">暂未开通月卡</div>
          <div class="card-desc">输入激活码开通，每日领取海量积分</div>
        </div>

        <div v-else-if="type === 'normal'" class="mem-card normal-card">
          <div class="card-badge">普通月卡</div>
          <div class="card-title">每日 50w 积分</div>
          <div class="card-expire">到期：{{ formatDate(expireAt) }}</div>
        </div>

        <div v-else-if="type === 'super'" class="mem-card super-card">
          <div class="card-badge">超级月卡</div>
          <div class="card-title">每日 650w 积分</div>
          <div class="card-expire">到期：{{ formatDate(expireAt) }}</div>
        </div>
      </div>

      <!-- 每日领取区 (只有开卡才显示) -->
      <div v-if="type !== 'none'" class="claim-section">
        <button 
          class="claim-btn" 
          :class="{ 'is-super': type === 'super' }"
          :disabled="!canClaim || claiming"
          @click="handleClaim"
        >
          <!-- ★ 动态按钮文案 -->
          <template v-if="claiming">领取中...</template>
          <template v-else-if="canClaim">
            {{ type === 'super' ? '🎁 领取今日 650w' : '🎁 领取今日 50w' }}
          </template>
          <template v-else>
            ✅ 今日已领 | 明日可领倒计时 {{ countdownText }}
          </template>
        </button>
      </div>

      <!-- 激活码输入区 -->
      <div class="activate-section">
        <h3 class="section-title">激活码充值</h3>
        <div class="activate-form">
          <input 
            v-model="codeInput" 
            class="code-input" 
            placeholder="请输入月卡激活码" 
            maxlength="20"
          />
          <button 
            class="activate-btn" 
            :disabled="!codeInput.trim() || activating"
            @click="handleActivate"
          >
            {{ activating ? '激活中' : '激活' }}
          </button>
        </div>
      </div>

      <!-- 权益对比 -->
      <div class="compare-section">
        <h3 class="section-title">权益对比</h3>
        <div class="compare-cards">
          <div class="compare-item normal">
            <div class="ci-title">普通月卡</div>
            <div class="ci-price">价值 138</div>
            <div class="ci-list">
              <p>✅ 每日 50w 积分</p>
              <p>✅ 连续30天领取</p>
              <p>✅ 合计 1000w 积分</p>
            </div>
          </div>
          <div class="compare-item super">
            <div class="ci-title">超级月卡</div>
            <div class="ci-price">价值 1998</div>
            <div class="ci-list">
              <p>🔥 每日 650w 积分</p>
              <p>🔥 连续30天领取</p>
              <p>🔥 合计 19.5亿 积分</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 加载中 -->
    <div v-else class="loading-box"><div class="loader"></div></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useMembership } from '../composables/useMembership.js'

const { type, expireAt, canClaim, loading, activating, claiming, fetchStatus, activate, claim } = useMembership()
const codeInput = ref('')

// ★ 倒计时逻辑
const countdownText = ref('00:00:00')
let countdownTimer = null

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    // 获取当前北京时间
    const now = new Date()
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    const beijingNow = new Date(utc + (8 * 3600000))
    
    // 计算下一个北京0点
    const beijingTomorrow = new Date(beijingNow)
    beijingTomorrow.setDate(beijingTomorrow.getDate() + 1)
    beijingTomorrow.setHours(0, 0, 0, 0)
    
    // 计算时间差
    const diff = beijingTomorrow.getTime() - beijingNow.getTime()
    if (diff <= 0) {
      // 到了0点，刷新状态
      fetchStatus()
      clearInterval(countdownTimer)
      return
    }
    
    // 格式化时间
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    countdownText.value = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, 1000)
}

onMounted(() => {
  fetchStatus().then(() => {
    if (!canClaim.value) startCountdown() // 如果今天已领，立刻启动倒计时
  })
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

function formatDate(dateStr) {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

async function handleActivate() {
  if (!codeInput.value.trim()) return
  const result = await activate(codeInput.value.trim())
  if (result.success) codeInput.value = ''
}

async function handleClaim() {
  const result = await claim()
  if (result.success) {
    alert(`🎉 领取成功！获得 ${result.reward.toLocaleString()} 积分`)
    startCountdown() // ★ 领取成功后启动倒计时
  }
}
</script>

<style scoped>
/* ★ 全局移动端优化 */
.membership-view { 
  min-height: 100vh; min-height: 100dvh; 
  background: var(--color-bg, #f5f5f5); /* 兼容未定义变量的默认值 */
  padding-bottom: env(safe-area-inset-bottom, 30px); /* 适配刘海屏底部 */
  -webkit-tap-highlight-color: transparent; /* 去除移动端点击高亮 */
  user-select: none; /* 防止长按选中 */
}

.mem-header { 
  display: flex; justify-content: space-between; align-items: center; 
  padding: 12px 16px; background: rgba(255,248,220,0.9); backdrop-filter: blur(10px); 
  border-radius: 0 0 12px 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); 
  position: sticky; top: 0; z-index: 10; 
}
.back-btn { font-size: 28px; color: #d4af37; font-weight: bold; cursor: pointer; width: 60px; line-height: 1; }
.mem-header h2 { font-size: 17px; color: #333; margin: 0; font-weight: 800; }

.mem-container { padding: 16px; }

/* 卡片展示 */
.card-display { margin-bottom: 16px; }
.mem-card { 
  border-radius: 16px; padding: 28px 20px; text-align: center; color: #fff; 
  position: relative; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.12); 
}
.no-card { background: linear-gradient(135deg, #bdc3c7, #ecf0f1); color: #7f8c8d; }
.normal-card { background: linear-gradient(135deg, #d4af37, #FDFC47); }
.super-card { background: linear-gradient(135deg, #8a2be2, #da22ff); }

.card-icon { font-size: 40px; margin-bottom: 10px; }
.card-title { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
.card-desc { font-size: 13px; opacity: 0.8; }
.card-badge { 
  position: absolute; top: 15px; right: -25px; background: rgba(0,0,0,0.2); 
  padding: 4px 30px; font-size: 12px; font-weight: bold; transform: rotate(45deg); 
}
.card-expire { margin-top: 10px; font-size: 12px; opacity: 0.9; font-weight: 500; }

/* 领取按钮 - 移动端加大点击区 */
.claim-section { margin-bottom: 20px; }
.claim-btn { 
  width: 100%; padding: 16px; border-radius: 12px; border: none; 
  font-size: 16px; font-weight: 700; cursor: pointer; 
  background: #d4af37; color: #fff; 
  box-shadow: 0 4px 15px rgba(212,175,55,0.3); 
  transition: all 0.2s; 
  line-height: 1.4; /* 让两行文字的按钮不显得太挤 */
}
.claim-btn.is-super { background: #8a2be2; box-shadow: 0 4px 15px rgba(138,43,226,0.3); }
.claim-btn:disabled { 
  opacity: 0.6; cursor: not-allowed; 
  background: #95a5a6 !important; box-shadow: none !important; color: #fff !important; 
  font-size: 14px; /* 倒计时文字稍小 */
}
/* 移动端不用hover，用active反馈 */
.claim-btn:active:not(:disabled) { transform: scale(0.98); }

/* 激活码输入 */
.activate-section { 
  background: rgba(255,248,220,0.75); border: 1px solid rgba(212,175,55,0.2); 
  border-radius: 14px; padding: 20px; margin-bottom: 20px; 
}
.section-title { font-size: 16px; font-weight: 700; color: #333; margin: 0 0 14px 0; }
.activate-form { display: flex; gap: 10px; }
.code-input { 
  flex: 1; padding: 14px; border: 1px solid #ddd; border-radius: 10px; 
  font-size: 16px; outline: none; background: #fff; 
  /* 防止iOS缩放 */ min-width: 0;
}
.code-input:focus { border-color: #d4af37; }
.activate-btn { 
  padding: 0 24px; border-radius: 10px; border: none; background: #d4af37; 
  color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; 
  white-space: nowrap; 
}
.activate-btn:disabled { opacity: 0.5; }

/* 权益对比 */
.compare-section { background: rgba(255,248,220,0.75); border: 1px solid rgba(212,175,55,0.2); border-radius: 14px; padding: 20px; }
.compare-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.compare-item { border-radius: 12px; padding: 16px 12px; text-align: center; background: #fff; border: 1px solid #eee; }
.compare-item.normal { border-color: rgba(212,175,55,0.3); }
.compare-item.super { border-color: rgba(138,43,226,0.3); background: rgba(255,255,255,0.9); }
.ci-title { font-size: 16px; font-weight: 800; margin-bottom: 4px; color: #333; }
.ci-price { font-size: 12px; color: #999; margin-bottom: 10px; }
.ci-list { text-align: left; font-size: 12px; color: #555; line-height: 1.8; }
.compare-item.super .ci-title { color: #8a2be2; }

.loading-box { display: flex; justify-content: center; padding: 60px; }
.loader { width: 30px; height: 30px; border: 3px solid rgba(212,175,55,0.2); border-top-color: #d4af37; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
