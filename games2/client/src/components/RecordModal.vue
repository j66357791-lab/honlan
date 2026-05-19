<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-card" :style="backgroundStyle">
        <div class="modal-header">
          <h2 class="modal-title">{{ title }}</h2>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>
        
        <!-- 明细模式：顶部添加汇总区域 -->
        <template v-if="mode === 'transactions'">
          <div class="summary-area">
            <div class="summary-item">
              <span class="summary-label">近100期盈亏</span>
              <span class="summary-value" :class="summaryClass">{{ summaryText }}</span>
            </div>
          </div>
        </template>

        <div class="list-area">
          <div v-if="items.length === 0" class="empty-hint">暂无记录</div>
          
          <!-- 列表项 -->
          <div v-for="item in items" :key="item._id" class="record-item">
            
            <!-- 积分明细模式 -->
            <template v-if="mode === 'transactions'">
              <div class="item-left">
                <div class="icon-circle" :class="amountClass(item)">
                  {{ item.type?.includes('win') || item.type?.includes('add') ? '↓' : '↑' }}
                </div>
                <div class="item-info">
                  <span class="item-type">{{ typeText(item) }}</span>
                  <span class="item-time">{{ formatTime(item.createdAt) }}</span>
                </div>
              </div>
              <div class="item-right">
                <span class="item-amount" :class="amountClass(item)">{{ amountText(item) }}</span>
                <span class="item-balance">余额 {{ item.balanceAfter?.toLocaleString() }}</span>
              </div>
            </template>

            <!-- 对局记录模式 -->
            <template v-else>
              <div class="item-left">
                <div class="result-badge" :class="`bg-${item.result}`">
                  {{ item.result === 'red' ? '红' : item.result === 'blue' ? '蓝' : '和' }}
                </div>
                <div class="item-info">
                  <span class="item-type">下注 {{ typeText(item) }}</span>
                  <span class="item-time">{{ formatTime(item.createdAt) }} · 额度 {{ item.amount?.toLocaleString() }}</span>
                </div>
              </div>
              <div class="item-right">
                <span class="item-amount" :class="amountClass(item)">{{ amountText(item) }}</span>
              </div>
            </template>

          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue' // 添加 computed 导入

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '记录' },
  items: { type: Array, default: () => [] },
  mode: { type: String, default: 'transactions' } // 'transactions' or 'history'
})
defineEmits(['close'])

// 计算近100期盈亏汇总
const summaryText = computed(() => {
  if (!props.items || props.items.length === 0) return '0'
  const recent = props.items.slice(0, 100)
  const total = recent.reduce((sum, item) => {
    if (item.type?.includes('win') || item.type?.includes('add')) return sum + item.amount
    return sum - item.amount
  }, 0)
  return total >= 0 ? `+${total.toLocaleString()}` : total.toLocaleString()
})

const summaryClass = computed(() => {
  if (!props.items || props.items.length === 0) return 'text-draw'
  const recent = props.items.slice(0, 100)
  const total = recent.reduce((sum, item) => {
    if (item.type?.includes('win') || item.type?.includes('add')) return sum + item.amount
    return sum - item.amount
  }, 0)
  return total >= 0 ? 'text-win' : 'text-lose'
})

function typeText(item) {
  if (props.mode === 'history') {
    return { red: '红巨人', blue: '蓝巨人', draw: '平局' }[item.choice] || ''
  }
  return { bet_expense: '下注支出', bet_win: '赢取收入', admin_add: '后台增加', admin_sub: '后台扣除' }[item.type] || item.type
}

function amountText(item) {
  if (props.mode === 'history') {
    return `${item.netChange >= 0 ? '+' : ''}${item.netChange?.toLocaleString()}`
  }
  const sign = item.type?.includes('expense') || item.type?.includes('sub') ? '-' : '+'
  return `${sign}${item.amount?.toLocaleString()}`
}

function amountClass(item) {
  if (props.mode === 'history') return item.netChange >= 0 ? 'text-win' : 'text-lose'
  return item.type?.includes('win') || item.type?.includes('add') ? 'text-win' : 'text-lose'
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
/* 使用背景图 */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:100; padding:20px; }
.modal-card { 
  background: url('https://t1.chatglm.cn/file/6a0c0118344a1dc9bad0e7c0.png?expired_at=1779603664&sign=92117b8b0ff8e3e33481c5c241235e31&ext=png') no-repeat center center;
  background-size: 140% auto;
  border-radius:16px; 
  width:100%; 
  max-width:400px; 
  max-height:70vh; 
  display:flex; 
  flex-direction:column; 
  border:1px solid rgba(139,90,43,0.3);
  box-shadow:0 10px 30px rgba(0,0,0,0.5);
  backdrop-filter: blur(2px);
  background-color: rgba(222, 184, 135, 0.9); /* 纸张底色 */
}

.modal-header { display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid rgba(139,90,43,0.3); }
.modal-title { font-size:16px; font-weight:700; color:#5d4037; margin:0; }
.close-btn { width:28px; height:28px; border-radius:50%; border:none; background:rgba(139,90,43,0.2); color:rgba(139,90,43,0.8); font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.close-btn:active { background:rgba(139,90,43,0.3); }

/* 明细模式 - 汇总区域 */
.summary-area {
  padding:12px 16px;
  background:rgba(139,90,43,0.1);
  border-bottom:1px solid rgba(139,90,43,0.2);
}
.summary-item {
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.summary-label {
  font-size:13px;
  color:rgba(139,90,43,0.8);
}
.summary-value {
  font-size:18px;
  font-weight:800;
  letter-spacing: -0.5px;
}
.summary-value.text-win { color:#2e7d32; text-shadow:0 0 8px rgba(46,125,50,0.3); }
.summary-value.text-lose { color:#c62828; text-shadow:0 0 8px rgba(198,40,40,0.3); }
.summary-value.text-draw { color:#ff8f00; }

.list-area { flex:1; overflow-y:auto; padding:8px 12px; -webkit-overflow-scrolling:touch; }
.empty-hint { text-align:center; padding:40px 0; color:rgba(139,90,43,0.6); font-size:13px; }

/* 单条记录卡片样式 */
.record-item {
  display:flex; 
  justify-content:space-between; 
  align-items:center; 
  padding:12px; 
  border-radius:10px; 
  margin-bottom:6px; 
  background:rgba(255,255,255,0.05);
  border:1px solid rgba(255,255,255,0.04);
  transition: background 0.2s;
}
.record-item:active {
  background:rgba(255,255,255,0.08);
}

.item-left {
  display:flex;
  align-items:center;
  gap:10px;
  flex:1;
  min-width:0;
}

/* 积分明细的圆形图标 */
.icon-circle {
  width:32px; height:32px; border-radius:50%; 
  display:flex; align-items:center; justify-content:center;
  font-size:16px; font-weight:800; flex-shrink:0;
}
.icon-circle.text-win { background:rgba(0,230,118,0.15); color:#00e676; }
.icon-circle.text-lose { background:rgba(255,23,68,0.15); color:#ff1744; }

/* 对局记录的结果方块 */
.result-badge {
  width:32px; height:32px; border-radius:6px; 
  display:flex; align-items:center; justify-content:center;
  font-size:13px; font-weight:800; flex-shrink:0;
}
.bg-red { background:rgba(255,77,79,0.2); color:#ff4d4f; }
.bg-blue { background:rgba(24,144,255,0.2); color:#1890ff; }
.bg-draw { background:rgba(250,173,20,0.2); color:#faad14; }

.item-info {
  display:flex; flex-direction:column; gap:2px;
}
.item-type {
  font-size:13px; font-weight:600; color:rgba(139,90,43,0.9);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.item-time {
  font-size:11px; color:rgba(139,90,43,0.6);
}

.item-right {
  display:flex; flex-direction:column; align-items:flex-end; gap:2px;
  margin-left:10px;
}

/* 盈亏金额：放大加粗，视觉核心 */
.item-amount {
  font-size:16px; font-weight:800; letter-spacing: -0.5px;
}
.item-balance {
  font-size:10px; color:rgba(139,90,43,0.6);
}

.text-win { color:#2e7d32; text-shadow:0 0 8px rgba(46,125,50,0.3); }
.text-lose { color:#c62828; text-shadow:0 0 8px rgba(198,40,40,0.3); }
</style>
