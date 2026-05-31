<template>
  <div class="activity-view" :style="backgroundStyle">
    <!-- 顶部导航 -->
    <header class="act-header">
      <button class="back-btn" @click="router.back()">
        <span class="iconify" data-icon="lucide:chevron-left" data-width="20"></span>
        返回
      </button>
      <h2>🎉 活动中心</h2>
      <div class="header-assets">
        <span class="asset coins">
          <span class="iconify" data-icon="lucide:coins" data-width="14"></span>
          {{ displayBalance.toLocaleString() }}
        </span>
        <span class="asset gems">
          <span class="iconify" data-icon="lucide:diamond" data-width="14"></span>
          {{ displayCrystal }}
        </span>
      </div>
    </header>

    <!-- ★ 主推活动：晶石千层塔 (恢复大卡片) -->
    <div class="featured-card" @click="router.push('/activity/climbwall')">
      <div class="fc-bg-glow"></div>
      <div class="fc-content">
        <div class="fc-top-row">
          <span class="fc-badge">限时活动</span>
          <span class="fc-tag">热门</span>
        </div>
        <h3 class="fc-title">晶石千层塔</h3>
        <p class="fc-desc">投入积分当砖，逐层攀登解锁稀有晶石！每层奖励递增，越往上越爽</p>
        <div class="fc-meta">
          <span class="fc-meta-item">
            <span class="iconify" data-icon="lucide:trophy" data-width="13"></span>
            已有 {{ currentLevel || 0 }} 层通关
          </span>
          <span class="fc-meta-item">
            <span class="iconify" data-icon="lucide:clock" data-width="13"></span>
            活动进行中
          </span>
        </div>
        <button class="fc-btn">
          立即登塔
          <span class="iconify" data-icon="lucide:arrow-right" data-width="15"></span>
        </button>
      </div>
      <div class="fc-icon">
        <span class="iconify" data-icon="lucide:castle" data-width="72"></span>
      </div>
    </div>

    <!-- 快捷入口：横向滚动 (移除了千层塔，避免重复) -->
    <div class="quick-scroll-wrap">
      <div class="quick-scroll">
        <div
          class="quick-item"
          v-for="item in quickEntries"
          :key="item.key"
          @click="item.action"
        >
          <div class="qi-icon" :style="{ background: item.gradient }">
            <span class="iconify" :data-icon="item.icon" data-width="20"></span>
          </div>
          <span class="qi-name">{{ item.name }}</span>
        </div>
      </div>
    </div>

    <!-- 常驻活动列表 -->
    <section class="act-section">
      <div class="section-head">
        <h3>
          <span class="iconify" data-icon="lucide:pin" data-width="14"></span>
          常驻活动
        </h3>
      </div>
      <div class="act-list">
        <div
          class="act-item"
          v-for="item in permanentActivities"
          :key="item.key"
          @click="item.action"
        >
          <div class="ai-icon" :style="{ background: item.gradient }">
            <span class="iconify" :data-icon="item.icon" data-width="18"></span>
          </div>
          <div class="ai-body">
            <div class="ai-title">{{ item.name }}</div>
            <div class="ai-desc">{{ item.desc }}</div>
          </div>
          <span class="ai-badge" :class="item.badgeType">{{ item.badge }}</span>
          <span class="iconify ai-arrow" data-icon="lucide:chevron-right" data-width="16"></span>
        </div>
      </div>
    </section>

    <!-- 即将上线 -->
    <section class="act-section">
      <div class="section-head">
        <h3>
          <span class="iconify" data-icon="lucide:sparkles" data-width="14"></span>
          敬请期待
        </h3>
      </div>
      <div class="act-list coming">
        <div
          class="act-item disabled"
          v-for="item in comingActivities"
          :key="item.key"
        >
          <div class="ai-icon" :style="{ background: item.gradient }">
            <span class="iconify" :data-icon="item.icon" data-width="18"></span>
          </div>
          <div class="ai-body">
            <div class="ai-title">{{ item.name }}</div>
            <div class="ai-desc">{{ item.desc }}</div>
          </div>
          <span class="ai-badge soon">即将上线</span>
        </div>
      </div>
    </section>

    <div class="footer-hint">更多活动筹备中，敬请期待 ✨</div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useClimbWall } from '../composables/useClimbWall.js'

const router = useRouter()
const { displayBalance, displayCrystal } = useAuth()
const { currentLevel } = useClimbWall()

const backgroundStyle = { backgroundImage: `url('/assets/images/lobby_bg.png')` }

function comingSoon() {
  alert('🎉 该活动即将上线，敬请期待！')
}

/* ── 快捷入口 (去掉了千层塔，因为它已经是主推大卡片了) ── */
const quickEntries = [
  { key: 'sign',   name: '签到',   icon: 'lucide:calendar-check', gradient: 'linear-gradient(135deg,#22c55e,#16a34a)', action: comingSoon },
  { key: 'wheel',  name: '转盘',   icon: 'lucide:loader',         gradient: 'linear-gradient(135deg,#a855f7,#7e22ce)', action: comingSoon },
  { key: 'redpkt', name: '红包',   icon: 'lucide:gift',           gradient: 'linear-gradient(135deg,#ef4444,#dc2626)', action: comingSoon },
  { key: 'rank',   name: '冲榜',   icon: 'lucide:swords',         gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', action: comingSoon },
  { key: 'task',   name: '任务',   icon: 'lucide:list-todo',      gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)', action: comingSoon },
  { key: 'invite', name: '邀请',   icon: 'lucide:user-plus',      gradient: 'linear-gradient(135deg,#14b8a6,#0d9488)', action: comingSoon },
  { key: 'shop',   name: '兑换',   icon: 'lucide:shopping-bag',   gradient: 'linear-gradient(135deg,#f97316,#ea580c)', action: comingSoon },
]

/* ── 常驻活动 ── */
const permanentActivities = [
  {
    key: 'sign', name: '每日签到', desc: '每日登录领取积分与道具',
    icon: 'lucide:calendar-check', gradient: 'linear-gradient(135deg,#22c55e,#16a34a)',
    badge: '可参与', badgeType: 'open', action: comingSoon,
  },
  {
    key: 'task', name: '每日任务', desc: '完成任务获取额外奖励',
    icon: 'lucide:list-todo', gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)',
    badge: '可参与', badgeType: 'open', action: comingSoon,
  },
]

/* ── 即将上线 ── */
const comingActivities = [
  { key: 'wheel',  name: '幸运转盘', desc: '消耗积分抽取稀有晶石',   icon: 'lucide:loader',      gradient: 'linear-gradient(135deg,#a855f7,#7e22ce)' },
  { key: 'redpkt', name: '红包雨',   desc: '整点开抢，手慢无',       icon: 'lucide:gift',        gradient: 'linear-gradient(135deg,#ef4444,#dc2626)' },
  { key: 'rank',   name: '冲榜大奖', desc: '排名靠前领豪礼',         icon: 'lucide:swords',      gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  { key: 'invite', name: '邀请有礼', desc: '邀好友双方均获奖励',     icon: 'lucide:user-plus',   gradient: 'linear-gradient(135deg,#14b8a6,#0d9488)' },
  { key: 'shop',   name: '积分兑换', desc: '积分兑换稀有道具',       icon: 'lucide:shopping-bag', gradient: 'linear-gradient(135deg,#f97316,#ea580c)' },
]
</script>

<style scoped>
.activity-view {
  min-height: 100vh;
  min-height: 100dvh;
  background-color: #fff;
  background-size: cover;
  background-position: center top;
  background-attachment: fixed;
  padding-bottom: 40px;
  color: #333;
}

/* ── 顶部导航 ── */
.act-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 248, 220, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 20;
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  color: #d4af37;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  margin-right: 8px;
}
.act-header h2 {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: #d4af37;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.header-assets {
  display: flex;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  margin-left: auto;
}
.asset {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 8px;
  background: rgba(255,255,255,0.4);
  border: 1px solid rgba(212,175,55,0.2);
}
.asset.coins { color: #d4af37; }
.asset.gems  { color: #8a2be2; }

/* ── 主推大卡片 (与 LadderStep 同款毛玻璃风格) ── */
.featured-card {
  position: relative;
  margin: 16px 16px 0;
  background: rgba(255, 248, 220, 0.85);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 16px;
  padding: 22px 20px;
  overflow: hidden;
  cursor: pointer;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.15);
  transition: all 0.2s;
}
.featured-card:active {
  transform: scale(0.98);
  border-color: #d4af37;
  background: rgba(255, 248, 220, 0.95);
}
.fc-bg-glow {
  position: absolute;
  top: -40px; right: -30px;
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.2), transparent 65%);
  border-radius: 50%;
  pointer-events: none;
}
.fc-content { position: relative; z-index: 2; }
.fc-top-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.fc-badge {
  display: inline-block;
  background: #e74c3c;
  color: #fff;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 700;
}
.fc-tag {
  font-size: 10px;
  color: #d4af37;
  background: rgba(212,175,55,0.15);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
}
.fc-title {
  font-size: 22px;
  font-weight: 800;
  color: #333;
  margin: 0 0 6px;
}
.fc-desc {
  font-size: 13px;
  color: #666;
  margin: 0 0 12px;
  line-height: 1.5;
}
.fc-meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: #888;
  margin-bottom: 16px;
}
.fc-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.fc-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #d4af37;
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(212,175,55,0.3);
  transition: all 0.15s;
}
.fc-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 6px rgba(212,175,55,0.3);
}
.fc-icon {
  position: absolute;
  right: 14px; bottom: 10px;
  color: rgba(212, 175, 55, 0.15);
  z-index: 1;
  pointer-events: none;
}

/* ── 快捷入口 ── */
.quick-scroll-wrap {
  padding: 20px 0 4px;
}
.quick-scroll {
  display: flex;
  gap: 6px;
  padding: 0 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.quick-scroll::-webkit-scrollbar { display: none; }
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 58px;
  padding: 10px 4px 8px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.quick-item:active { opacity: 0.7; }
.qi-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.qi-name {
  font-size: 11px;
  color: #555;
  white-space: nowrap;
}

/* ── 活动列表区 ── */
.act-section {
  padding: 0 16px;
  margin-top: 20px;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.section-head h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  color: #d4af37;
  margin: 0;
}
.act-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── 单条活动卡片 (与 LadderStep 同款样式) ── */
.act-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 248, 220, 0.75);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 12px;
  padding: 14px 14px;
  cursor: pointer;
  backdrop-filter: blur(5px);
  transition: all 0.15s;
}
.act-item:active {
  transform: scale(0.98);
  background: rgba(255, 248, 220, 0.95);
  border-color: #d4af37;
}
.act-item.disabled {
  cursor: default;
  opacity: 0.6;
}
.act-item.disabled:active {
  transform: none;
  background: rgba(255, 248, 220, 0.75);
  border-color: rgba(212, 175, 55, 0.2);
}

.ai-icon {
  width: 40px; height: 40px;
  min-width: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.ai-body { flex: 1; min-width: 0; }
.ai-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 2px; }
.ai-desc {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}
.ai-badge.active { background: rgba(139,92,246,0.12); color: #8b5cf6; }
.ai-badge.open { background: rgba(27, 176, 105, 0.12); color: #1bb069; }
.ai-badge.soon { background: rgba(0,0,0,0.05); color: #999; }
.ai-arrow { color: #ccc; flex-shrink: 0; }

.footer-hint {
  text-align: center;
  font-size: 12px;
  color: #999;
  padding: 24px 16px 0;
}
</style>
