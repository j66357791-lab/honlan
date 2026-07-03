<template>
  <div class="membership-view">
    <!-- 顶部导航 -->
    <header class="mem-header">
      <div class="back-btn" @click="$router.back()">‹</div>
      <h2>👑 月卡中心</h2>
      <div style="width:28px"></div>
    </header>

    <div class="mem-container" v-if="!loading">
      <!-- 公共激活码输入区 -->
      <div class="activate-section">
        <div class="activate-form">
          <input 
            v-model="codeInput" 
            class="code-input" 
            placeholder="输入激活码 (VIP/SVIP自动识别)" 
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

      <!-- ★ 核心修改：左右双卡独立展示区 -->
      <div class="cards-wrapper">
        <!-- VIP 普通月卡 -->
        <div class="member-card vip-card">
          <div class="card-header">🌟 普通月卡</div>
          <div class="card-body">
            <div class="reward-text">每日 <strong>50w</strong> 积分</div>
            
            <div v-if="isVipActive" class="card-status">
              <div class="active-tag">已激活</div>
              <div class="expire-text">剩余 {{ vipRemainDays }} 天</div>
            </div>
            <div v-else class="card-status">
              <div class="inactive-tag">未激活</div>
            </div>

            <button 
              class="claim-btn vip-claim" 
              :disabled="!isVipActive || !canClaimVip || claimingVip"
              @click="handleClaim('vip')"
            >
              <template v-if="claimingVip">领取中...</template>
              <template v-else-if="isVipActive && canClaimVip">🎁 领取今日奖励</template>
              <template v-else-if="isVipActive && !canClaimVip">✅ 今日已领</template>
              <template v-else>未激活不可领</template>
            </button>
          </div>
        </div>

        <!-- SVIP 超级月卡 -->
        <div class="member-card svip-card">
          <div class="card-header">💎 超级月卡</div>
          <div class="card-body">
            <div class="reward-text">每日 <strong>650w</strong> 积分</div>
            
            <div v-if="isSvipActive" class="card-status">
              <div class="active-tag svip-tag">已激活</div>
              <div class="expire-text">剩余 {{ svipRemainDays }} 天</div>
            </div>
            <div v-else class="card-status">
              <div class="inactive-tag">未激活</div>
            </div>

            <button 
              class="claim-btn svip-claim" 
              :disabled="!isSvipActive || !canClaimSvip || claimingSvip"
              @click="handleClaim('svip')"
            >
              <template v-if="claimingSvip">领取中...</template>
              <template v-else-if="isSvipActive && canClaimSvip">🔥 领取今日奖励</template>
              <template v-else-if="isSvipActive && !canClaimSvip">✅ 今日已领</template>
              <template v-else>未激活不可领</template>
            </button>
          </div>
        </div>
      </div>

      <!-- 权益对比 -->
      <div class="compare-section">
        <h3 class="section-title">权益对比</h3>
        <div class="compare-list">
          <div class="compare-row row-header"><span>权益</span><span>普通月卡</span><span>超级月卡</span></div>
          <div class="compare-row"><span>每日奖励</span><span>50w</span><span class="highlight">650w</span></div>
          <div class="compare-row"><span>30天合计</span><span>1000w</span><span class="highlight">19.5亿</span></div>
          <div class="compare-row"><span>可否同时拥有</span><span colspan="2" class="full-tip">✅ 互不影响，奖励独立领取</span></div>
        </div>
      </div>
    </div>
    
    <div v-else class="loading-box"><div class="loader"></div></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import { request } from '../composables/request.js'

const { currentUser, refreshUser, updateBalance } = useAuth()

const loading = ref(true)
const activating = ref(false)
const claimingVip = ref(false)
const claimingSvip = ref(false)
const codeInput = ref('')

// ★ 获取北京时间当天的日期字符串 (与后端严格对齐)
const getBeijingTodayStr = () => {
  const d = new Date()
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000)
  const beijingTime = new Date(utc + (8 * 3600000))
  return `${beijingTime.getFullYear()}-${String(beijingTime.getMonth() + 1).padStart(2, '0')}-${String(beijingTime.getDate()).padStart(2, '0')}`
}

// ========== VIP 独立状态 ==========
const isVipActive = computed(() => currentUser.value?.vipExpireAt && new Date(currentUser.value.vipExpireAt).getTime() > Date.now())
const vipRemainDays = computed(() => {
  if (!isVipActive.value) return 0
  return Math.ceil((new Date(currentUser.value.vipExpireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
})
const canClaimVip = computed(() => isVipActive.value && currentUser.value?.vipLastClaimDate !== getBeijingTodayStr())

// ========== SVIP 独立状态 ==========
const isSvipActive = computed(() => currentUser.value?.svipExpireAt && new Date(currentUser.value.svipExpireAt).getTime() > Date.now())
const svipRemainDays = computed(() => {
  if (!isSvipActive.value) return 0
  return Math.ceil((new Date(currentUser.value.svipExpireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
})
const canClaimSvip = computed(() => isSvipActive.value && currentUser.value?.svipLastClaimDate !== getBeijingTodayStr())

// ========== 业务逻辑 ==========
async function handleActivate() {
  if (!codeInput.value.trim()) return
  activating.value = true
  try {
    const res = await request('/api/membership/activate', { method: 'POST', body: JSON.stringify({ code: codeInput.value.trim() }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    
    alert('激活成功！')
    codeInput.value = ''
    await refreshUser() // 激活后立刻刷新用户数据，卡片状态实时更新
  } catch (err) {
    alert(err.message || '激活失败')
  } finally {
    activating.value = false
  }
}

async function handleClaim(type) {
  const claimingRef = type === 'vip' ? claimingVip : claimingSvip
  claimingRef.value = true
  try {
    const res = await request('/api/membership/claim', { method: 'POST', body: JSON.stringify({ type }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    
    alert(`🎉 领取成功！获得 ${data.reward.toLocaleString()} 积分`)
    updateBalance(data.newBalance) // 实时更新顶部余额
    await refreshUser()            // 实时更新领取按钮状态
  } catch (err) {
    alert(err.message || '领取失败')
  } finally {
    claimingRef.value = false
  }
}

onMounted(async () => {
  await refreshUser() // 进入页面确保拿最新状态
  loading.value = false
})
</script>

<style scoped>
.membership-view { 
  min-height: 100vh; min-height: 100dvh; 
  background: #f5f5f5;
  padding-bottom: env(safe-area-inset-bottom, 30px); 
  -webkit-tap-highlight-color: transparent; 
  user-select: none; 
}

.mem-header { 
  display: flex; justify-content: space-between; align-items: center; 
  padding: 12px 16px; background: rgba(255,248,220,0.9); backdrop-filter: blur(10px); 
  border-radius: 0 0 12px 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); 
  position: sticky; top: 0; z-index: 10; 
}
.back-btn { font-size: 28px; color: #d4af37; font-weight: bold; cursor: pointer; width: 28px; line-height: 1; }
.mem-header h2 { font-size: 17px; color: #333; margin: 0; font-weight: 800; }

.mem-container { padding: 16px; }

/* 激活码输入 */
.activate-section { margin-bottom: 16px; }
.activate-form { display: flex; gap: 10px; }
.code-input { 
  flex: 1; padding: 14px; border: 1px solid #ddd; border-radius: 10px; 
  font-size: 15px; outline: none; background: #fff; min-width: 0;
}
.code-input:focus { border-color: #d4af37; }
.activate-btn { 
  padding: 0 24px; border-radius: 10px; border: none; background: #d4af37; 
  color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; white-space: nowrap; 
}
.activate-btn:disabled { opacity: 0.5; }

/* 双卡布局 */
.cards-wrapper { display: flex; gap: 12px; margin-bottom: 20px; }
.member-card { 
  flex: 1; background: #fff; border-radius: 14px; padding: 16px 12px; 
  display: flex; flex-direction: column; align-items: center; text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.vip-card { border-top: 4px solid #d4af37; }
.svip-card { border-top: 4px solid #8a2be2; }

.card-header { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #333; }
.svip-card .card-header { color: #8a2be2; }

.card-body { width: 100%; display: flex; flex-direction: column; align-items: center; flex: 1; }
.reward-text { font-size: 13px; color: #666; margin-bottom: 12px; }
.reward-text strong { font-size: 18px; color: #333; }
.svip-card .reward-text strong { color: #8a2be2; }

.card-status { min-height: 50px; margin-bottom: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.active-tag { 
  display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;
  background: rgba(212, 175, 55, 0.15); color: #d4af37; border: 1px solid rgba(212, 175, 55, 0.3); margin-bottom: 4px;
}
.svip-tag { background: rgba(138, 43, 226, 0.1); color: #8a2be2; border-color: rgba(138, 43, 226, 0.3); }
.inactive-tag { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; background: #f0f0f0; color: #999; }
.expire-text { font-size: 11px; color: #888; margin-top: 4px; }

.claim-btn { 
  width: 100%; padding: 10px; border-radius: 8px; border: none; font-weight: 700;
  font-size: 13px; cursor: pointer; margin-top: auto; transition: all 0.2s; color: #fff;
}
.vip-claim { background: linear-gradient(135deg, #d4af37, #FDFC47); color: #333; }
.svip-claim { background: linear-gradient(135deg, #8a2be2, #da22ff); }
.claim-btn:disabled { opacity: 0.5; cursor: not-allowed; background: #ccc !important; color: #666 !important; }
.claim-btn:not(:disabled):active { transform: scale(0.95); }

/* 权益对比 */
.compare-section { background: #fff; border-radius: 14px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.section-title { font-size: 16px; font-weight: 700; color: #333; margin: 0 0 14px 0; text-align: center; }
.compare-list { width: 100%; }
.compare-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #666; border-bottom: 1px solid #f5f5f5; }
.compare-row:last-child { border-bottom: none; }
.row-header { font-weight: 700; color: #333; }
.compare-row span { flex: 1; text-align: center; }
.compare-row span:first-child { text-align: left; }
.highlight { color: #8a2be2; font-weight: 700; }
.full-tip { flex: 2; text-align: center; color: #27ae60; font-weight: 600; }

.loading-box { display: flex; justify-content: center; padding: 60px; }
.loader { width: 30px; height: 30px; border: 3px solid rgba(212,175,55,0.2); border-top-color: #d4af37; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
