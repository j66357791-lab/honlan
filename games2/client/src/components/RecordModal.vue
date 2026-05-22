<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-card">
        <!-- 头部 -->
        <div class="modal-header">
          <h2 class="modal-title">{{ title }}</h2>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <!-- 游戏筛选下拉框 -->
        <div class="filter-area">
          <select v-model="selectedGame" @change="onFilterChange">
            <option value="all">全部游戏</option>
            <option value="giant">巨人赛跑</option>
            <option value="pointing">点兵点将</option>
          </select>
        </div>

        <!-- 明细模式：汇总 -->
        <div v-if="mode === 'transactions'" class="summary-area">
          <div class="summary-item">
            <span class="summary-label">近100期盈亏</span>
            <span class="summary-value" :class="summaryClass">{{ summaryText }}</span>
          </div>
        </div>

        <!-- 列表 -->
        <div class="list-area">
          <div v-if="filteredItems.length === 0" class="empty-hint">暂无记录</div>

          <div v-for="(item, idx) in filteredItems" :key="item._id || idx" class="record-item">

            <!-- ===== 明细模式 ===== -->
            <template v-if="mode === 'transactions'">
              <div class="item-left">
                <div class="icon-circle" :class="isIncome(item) ? 'income' : 'expense'">
                  {{ isIncome(item) ? '↓' : '↑' }}
                </div>
                <div class="item-info">
                  <span class="item-type">{{ txTypeLabel(item) }}</span>
                  <span class="item-time">{{ formatTime(item.createdAt) }}</span>
                </div>
              </div>
              <div class="item-right">
                <span class="item-amount" :class="isIncome(item) ? 'text-win' : 'text-lose'">
                  {{ isIncome(item) ? '+' : '-' }}{{ item.amount?.toLocaleString() }}
                </span>
                <span class="item-balance">余额 {{ item.balanceAfter?.toLocaleString() }}</span>
              </div>
            </template>

            <!-- ===== 对局记录模式 ===== -->
            <template v-else>
              <div class="item-left">
                <div class="result-badge" :style="badgeStyle(item)">
                  {{ badgeText(item) }}
                </div>
                <div class="item-info">
                  <span class="item-type">下注 {{ choiceLabel(item) }}</span>
                  <span class="item-time">
                    {{ formatTime(item.createdAt) }} · 额度 {{ item.amount?.toLocaleString() }}
                  </span>
                </div>
              </div>
              <div class="item-right">
                <span class="item-amount" :class="item.netChange >= 0 ? 'text-win' : 'text-lose'">
                  {{ item.netChange >= 0 ? '+' : '' }}{{ item.netChange?.toLocaleString() }}
                </span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '记录' },
  items: { type: Array, default: () => [] },
  mode: { type: String, default: 'transactions' }, // 'transactions' | 'history'
  // 游戏配置驱动显示
  config: {
    type: Object,
    default: () => ({
      // choiceMap: { red: '红巨人', blue: '蓝巨人', draw: '平局' }
      // resultMap: {
      //   red:  { label: '红', color: '#ff4d4f' },
      //   blue: { label: '蓝', color: '#1890ff' },
      //   draw: { label: '和', color: '#faad14' }
      // }
    })
  }
})

defineEmits(['close'])

// ===== 筛选状态 =====
const selectedGame = ref('all')

// ===== Config 解构 =====
const choiceMap = computed(() => props.config.choiceMap || {})
const resultMap = computed(() => props.config.resultMap || {})

// ===== 筛选逻辑 =====
const filteredItems = computed(() => {
  if (!props.items?.length) return []
  
  if (selectedGame.value === 'all') return props.items
  
  // 根据游戏类型过滤
  return props.items.filter(item => {
    if (selectedGame.value === 'giant') {
      // 巨人赛跑的记录特征：choice 是 red/blue/draw
      return ['red', 'blue', 'draw'].includes(item.choice)
    } else if (selectedGame.value === 'pointing') {
      // 点兵点将的记录特征：choice 是 male/female/角色名
      return ['male', 'female', '赵云', '关羽', '张飞', '马超', '秦良玉', '梁红玉', '穆桂英', '花木兰'].includes(item.choice)
    }
    return false
  })
})

// ===== 筛选变更处理 =====
function onFilterChange() {
  console.log('筛选游戏:', selectedGame.value)
}

// ===== 明细模式 =====
function isIncome(item) {
  return item.type?.includes('win') || item.type?.includes('add')
}

function txTypeLabel(item) {
  const map = {
    bet_expense: '下注支出',
    bet_win: '赢取收入',
    admin_add: '后台增加',
    admin_sub: '后台扣除'
  }
  return map[item.type] || item.type
}

const summaryText = computed(() => {
  if (!props.items?.length) return '0'
  const total = props.items.slice(0, 100).reduce((sum, item) => {
    return sum + (isIncome(item) ? item.amount : -item.amount)
  }, 0)
  return total >= 0 ? `+${total.toLocaleString()}` : total.toLocaleString()
})

const summaryClass = computed(() => {
  if (!props.items?.length) return 'text-draw'
  const total = props.items.slice(0, 100).reduce((sum, item) => {
    return sum + (isIncome(item) ? item.amount : -item.amount)
  }, 0)
  return total >= 0 ? 'text-win' : 'text-lose'
})

// ===== 对局记录模式 =====
function badgeText(item) {
  const r = item.result
  if (resultMap.value[r]?.label) return resultMap.value[r].label
  // 兜底
  const defaults = { red: '红', blue: '蓝', draw: '和', male: '男', female: '女' }
  return defaults[r] || r
}

function badgeStyle(item) {
  const r = item.result
  const entry = resultMap.value[r]
  if (entry) {
    return { color: entry.color, background: `${entry.color}33` }
  }
  // 兜底颜色
  const defaults = {
    red: '#ff4d4f', blue: '#1890ff', draw: '#faad14',
    male: '#1890ff', female: '#ff6b9d'
  }
  const c = defaults[r] || '#999'
  return { color: c, background: `${c}33` }
}

function choiceLabel(item) {
  return choiceMap.value[item.choice] || item.choice || '--'
}

// ===== 通用 =====
function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal-card {
  background: url('https://t1.chatglm.cn/file/6a0cacd2534dae200804b470.png?expired_at=1779647615&sign=97a6b02608ccd4bf483e8dbfbb5395c0&ext=png') no-repeat center center;
  background-size: 140% auto;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(139,90,43,0.3);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  backdrop-filter: blur(2px);
  background-color: rgba(222, 184, 135, 0.9); /* 纸张底色 */
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #5d4037;
  margin: 0;
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(139,90,43,0.2);
  color: rgba(139,90,43,0.8);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:active {
  background: rgba(139,90,43,0.3);
}

/* 筛选区域 */
.filter-area {
  padding: 0 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-area select {
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  color: #e0e0e0;
  border: 1px solid rgba(255,255,255,0.2);
  font-size: 13px;
}

.filter-area select:focus {
  outline: none;
  border-color: var(--color-gold);
  background: rgba(255,215,0,0.1);
}

/* 汇总区域 */
.summary-area {
  padding: 12px 16px;
  background: rgba(139,90,43,0.1);
  border-bottom: 1px solid rgba(139,90,43,0.2);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 13px;
  color: rgba(139,90,43,0.8);
}

.summary-value {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.summary-value.text-win {
  color: #2e7d32;
  text-shadow: 0 0 8px rgba(46,125,50,0.3);
}

.summary-value.text-lose {
  color: #c62828;
  text-shadow: 0 0 8px rgba(198,40,40,0.3);
}

.summary-value.text-draw {
  color: #ff8f00;
}

.list-area {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  -webkit-overflow-scrolling: touch;
}

.empty-hint {
  text-align: center;
  padding: 40px 0;
  color: rgba(139,90,43,0.6);
  font-size: 13px;
}

/* 单条记录卡片样式 */
.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 6px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.04);
  transition: background 0.2s;
}

.record-item:active {
  background: rgba(255,255,255,0.08);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

/* 积分明细的圆形图标 */
.icon-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  flex-shrink: 0;
}

.icon-circle.income {
  background: rgba(0,230,118,0.15);
  color: #00e676;
}

.icon-circle.expense {
  background: rgba(255,23,68,0.15);
  color: #ff1744;
}

/* 对局记录的结果方块 */
.result-badge {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}

/* 列表项内容 */
.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-type {
  font-size: 13px;
  font-weight: 600;
  color: rgba(139,90,43,0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-time {
  font-size: 11px;
  color: rgba(139,90,43,0.6);
}

.item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  margin-left: 10px;
}

/* 盈亏金额：放大加粗，视觉核心 */
.item-amount {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.item-balance {
  font-size: 10px;
  color: rgba(139,90,43,0.6);
}

.text-win {
  color: #2e7d32;
  text-shadow: 0 0 8px rgba(46,125,50,0.3);
}

.text-lose {
  color: #c62828;
  text-shadow: 0 0 8px rgba(198,40,40,0.3);
}

/* 滚动条 */
.list-area::-webkit-scrollbar {
  width: 3px;
}

.list-area::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
}
</style>
