<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="sheet sheet-small">
      <div class="sheet-header danger-hdr">
        <h2>☢️ 系统维护</h2>
        <button class="x-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="sheet-body">
        <!-- ★ 新增：维护模式开关卡片 -->
        <div class="maint-switch-card">
          <h4>🚧 全站维护模式</h4>
          <div class="maint-status-row">
            <span>当前状态：</span>
            <span :class="['maint-badge', isMaintenance ? 'active' : 'inactive']">
              {{ isMaintenance ? '维护中' : '正常运行' }}
            </span>
          </div>
          <p class="maint-desc">开启后，普通用户无法访问，管理员/内部号不受影响。</p>
          <button 
            :class="['m-btn', isMaintenance ? 'm-green' : 'm-error']" 
            @click="toggleMaintenance"
            :disabled="maintLoading"
          >
            {{ maintLoading ? '处理中...' : (isMaintenance ? '关闭维护' : '开启维护') }}
          </button>
        </div>

        <div class="db-card">
          <h4>🗄️ 数据库状态</h4>
          <div class="db-row">
            <span>数据: <strong>{{ dbStats.dbSizeMB }}MB</strong></span>
            <span>磁盘: <strong>{{ dbStats.storageSizeMB }}MB</strong></span>
            <span>索引: <strong>{{ dbStats.indexSizeMB }}MB</strong></span>
          </div>
          <div class="db-cols">
            <div v-for="col in dbStats.collections" :key="col.name" class="dc-item">
              <span>{{ col.name }}</span>
              <span class="dc-count">{{ col.count?.toLocaleString() }}</span>
            </div>
          </div>
        </div>
        <div class="warn-box">⚠️ 以下操作不可撤销！</div>
        <div class="maint-item">
          <h4>🧹 清空对局与流水</h4>
          <p>清空巨人/点兵/消消乐记录和流水</p>
          <button class="m-btn m-warn" @click="resetBets">清空对局</button>
        </div>
        <div class="maint-item">
          <h4>🧼 清空盈亏与风控</h4>
          <p>余额归零、风控重置、奖池归零</p>
          <button class="m-btn m-error" @click="resetProfits">清空盈亏</button>
        </div>
        <div class="maint-item">
          <h4>☢️ 恢复出厂设置</h4>
          <p>清空一切数据，含公告</p>
          <button class="m-btn m-nuke" @click="resetData">全部重置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth.js'

defineEmits(['close'])
const { authFetch } = useAuth()
const dbStats = ref({ dbSizeMB: '0.00', storageSizeMB: '0.00', indexSizeMB: '0.00', collections: [] })

// ★ 新增：维护模式相关状态
const isMaintenance = ref(false)
const maintLoading = ref(false)

async function fetchDbStats() {
  try {
    const res = await authFetch('/api/admin/db-stats')
    const data = await res.json()
    if (res.ok) dbStats.value = data
  } catch (e) { console.error(e) }
}

// ★ 新增：获取维护状态
async function fetchMaintStatus() {
  try {
    maintLoading.value = true
    const res = await authFetch('/api/admin/maintenance-status')
    const data = await res.json()
    if (res.ok) isMaintenance.value = data.isMaintenance
  } catch (e) { console.error(e) }
  finally { maintLoading.value = false }
}

// ★ 新增：切换维护状态
async function toggleMaintenance() {
  if (maintLoading.value) return
  const actionText = isMaintenance.value ? '关闭' : '开启'
  if (!confirm(`确定要${actionText}全站维护模式吗？`)) return
  
  try {
    maintLoading.value = true
    const res = await authFetch('/api/admin/toggle-maintenance', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      isMaintenance.value = data.isMaintenance
      alert(data.message)
    } else {
      alert(data.error)
    }
  } catch (e) { console.error(e) }
  finally { maintLoading.value = false }
}

async function resetBets() {
  if (!confirm('确定清空对局记录？')) return
  const res = await authFetch('/api/admin/reset-bets', { method: 'POST' })
  const d = await res.json()
  if (res.ok) { alert(d.message); fetchDbStats() }
  else alert(d.error)
}

async function resetProfits() {
  if (!confirm('确定清空盈亏与风控？')) return
  const res = await authFetch('/api/admin/reset-profits', { method: 'POST' })
  const d = await res.json()
  if (res.ok) { alert(d.message); fetchDbStats() }
  else alert(d.error)
}

async function resetData() {
  if (!confirm('☢️ 终极警告！确定恢复出厂？')) return
  const res = await authFetch('/api/admin/reset-data', { method: 'POST' })
  const d = await res.json()
  if (res.ok) { alert(d.message); fetchDbStats() }
  else alert(d.error)
}

onMounted(() => {
  fetchDbStats()
  fetchMaintStatus() // ★ 新增：挂载时获取状态
})
</script>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
@media (min-width: 600px) { .overlay { align-items: center; } }
.sheet { background: #161b22; border-radius: 16px 16px 0 0; border: 1px solid rgba(255,255,255,0.08); width: 100%; max-height: 90vh; display: flex; flex-direction: column; animation: slideUp .25s ease; }
@media (min-width: 600px) { .sheet { border-radius: 16px; } }
@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.sheet-small { max-width: 420px; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.sheet-header h2 { font-size: 15px; margin: 0; }
.danger-hdr { background: rgba(231,76,60,0.1); }
.x-btn { width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(255,255,255,0.08); color: #888; font-size: 14px; cursor: pointer; }
.sheet-body { padding: 14px; overflow-y: auto; flex: 1; }

/* ★ 新增：维护模式开关卡片样式 */
.maint-switch-card { background: rgba(231,76,60,0.06); border: 1px solid rgba(231,76,60,0.25); border-radius: 8px; padding: 12px; margin-bottom: 14px; }
.maint-switch-card h4 { margin: 0 0 8px; color: #e74c3c; font-size: 13px; }
.maint-status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; color: #aaa; }
.maint-badge { padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; }
.maint-badge.active { background: rgba(231,76,60,0.2); color: #e74c3c; }
.maint-badge.inactive { background: rgba(46,204,113,0.2); color: #2ecc71; }
.maint-desc { margin: 0 0 10px; font-size: 11px; color: #888; }
.m-green { background: rgba(46,204,113,0.2); color: #2ecc71; }

.db-card { background: rgba(52,152,219,0.06); border: 1px solid rgba(52,152,219,0.15); border-radius: 8px; padding: 12px; margin-bottom: 12px; }
.db-card h4 { margin: 0 0 8px; color: #3498db; font-size: 13px; }
.db-row { display: flex; gap: 12px; font-size: 11px; color: #aaa; flex-wrap: wrap; margin-bottom: 8px; }
.db-row strong { color: #f0c040; }
.db-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.dc-item { background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px; display: flex; justify-content: space-between; font-size: 10px; color: #888; }
.dc-count { color: #eee; font-weight: 600; }
.warn-box { background: rgba(243,156,18,0.1); color: #f39c12; padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 12px; }
.maint-item { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.maint-item:last-child { border-bottom: none; margin-bottom: 0; }
.maint-item h4 { margin: 0 0 4px; font-size: 13px; }
.maint-item p { margin: 0 0 8px; font-size: 11px; color: #888; }
.m-btn { padding: 6px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; font-size: 12px; }
.m-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.m-warn { background: rgba(243,156,18,0.2); color: #f39c12; }
.m-error { background: rgba(231,76,60,0.2); color: #e74c3c; }
.m-nuke { background: #e74c3c; color: #fff; }
</style>
