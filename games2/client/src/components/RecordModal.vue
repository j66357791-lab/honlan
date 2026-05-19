<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-card">
        <div class="modal-header">
          <h2 class="modal-title">{{ title }}</h2>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>
        <div class="list-area">
          <div v-if="items.length === 0" class="empty-hint">暂无记录</div>
          <div v-for="item in items" :key="item._id" class="list-item" :class="itemClass(item)">
            <div class="item-main">
              <span class="item-type" :class="typeClass(item)">{{ typeText(item) }}</span>
              <span class="item-amount" :class="amountClass(item)">{{ amountText(item) }}</span>
            </div>
            <div class="item-meta">
              <span class="item-balance">余额: {{ item.balanceAfter?.toLocaleString() }}</span>
              <span class="item-time">{{ formatTime(item.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '记录' },
  items: { type: Array, default: () => [] },
  mode: { type: String, default: 'transactions' } // 'transactions' or 'history'
})
defineEmits(['close'])

function itemClass(item) {
  if (props.mode === 'history') {
    return item.netChange > 0 ? 'win' : item.netChange < 0 ? 'lose' : 'draw'
  }
  return item.type?.includes('win') || item.type?.includes('add') ? 'positive' : 'negative'
}

function typeText(item) {
  if (props.mode === 'history') {
    return { red: '红巨人', blue: '蓝巨人', draw: '平局' }[item.choice] || ''
  }
  return { bet_expense: '下注支出', bet_win: '赢取收入', admin_add: '管理员增加', admin_sub: '管理员扣除' }[item.type] || item.type
}

function typeClass(item) {
  if (props.mode === 'history') return `text-${item.result}`
  return item.type?.includes('win') || item.type?.includes('add') ? 'text-win' : 'text-lose'
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
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:flex-end; justify-content:center; z-index:100; }
.modal-card { background:var(--color-panel); border-radius:16px 16px 0 0; width:100%; max-width:480px; max-height:80vh; display:flex; flex-direction:column; }
.modal-header { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.06); }
.modal-title { font-size:16px; font-weight:700; }
.close-btn { width:32px; height:32px; border-radius:50%; border:none; background:rgba(255,255,255,0.08); color:var(--color-text-dim); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.list-area { flex:1; overflow-y:auto; padding:12px 16px; -webkit-overflow-scrolling:touch; }
.empty-hint { text-align:center; padding:40px 0; color:var(--color-text-dim); font-size:14px; }
.list-item { padding:10px 12px; border-radius:8px; margin-bottom:6px; background:rgba(255,255,255,0.03); border-left:3px solid transparent; }
.list-item.win, .list-item.positive { border-left-color:var(--color-success); }
.list-item.lose, .list-item.negative { border-left-color:var(--color-danger); }
.list-item.draw { border-left-color:var(--color-draw); }
.item-main { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
.item-type { font-size:14px; font-weight:600; }
.item-amount { font-size:14px; font-weight:700; }
.text-red { color:var(--color-red); }
.text-blue { color:var(--color-blue); }
.text-draw { color:var(--color-draw); }
.text-win { color:var(--color-success); }
.text-lose { color:var(--color-danger); }
.item-meta { display:flex; justify-content:space-between; font-size:11px; color:rgba(255,255,255,0.3); }
</style>
