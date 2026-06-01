<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="admin-modal code-modal">
      <div class="modal-header">
        <h2>🎫 激活码管理</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <!-- 生成区 -->
        <div class="section-box">
          <h3 class="section-title">批量生成</h3>
          <div class="gen-form">
            <select v-model="genType" class="form-select">
              <option value="normal">普通月卡 (VIP)</option>
              <option value="super">超级月卡 (SVIP)</option>
            </select>
            <input v-model.number="genCount" type="number" class="form-input" min="1" max="100" placeholder="数量(1-100)" />
            <button class="gen-btn" @click="handleGenerate" :disabled="generating">
              {{ generating ? '生成中...' : '⚡ 生成' }}
            </button>
          </div>
          <!-- 生成结果展示 -->
          <div v-if="generatedCodes.length > 0" class="result-box">
            <div class="result-header">
              <span class="result-title">生成成功 ({{ generatedCodes.length }}个)</span>
              <button class="copy-btn" @click="copyCodes">📋 一键复制</button>
            </div>
            <div class="code-list">
              <div v-for="(code, idx) in generatedCodes" :key="idx" class="code-item">
                <span class="code-type" :class="genType === 'super' ? 'super' : 'normal'">
                  {{ genType === 'super' ? 'SVIP' : 'VIP' }}
                </span>
                <span class="code-text">{{ code }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 记录查询区 -->
        <div class="section-box">
          <div class="filter-row">
            <select v-model="filterType" class="form-select-sm" @change="fetchRecords(1)">
              <option value="">全部类型</option>
              <option value="normal">普通月卡</option>
              <option value="super">超级月卡</option>
            </select>
            <select v-model="filterStatus" class="form-select-sm" @change="fetchRecords(1)">
              <option value="">全部状态</option>
              <option value="unused">未激活</option>
              <option value="used">已激活</option>
            </select>
          </div>

          <div v-if="loadingRecords" class="loading-box">加载中...</div>
          
          <div v-else-if="records.length === 0" class="empty-box">暂无记录</div>
          
          <div v-else class="record-list">
            <div v-for="item in records" :key="item._id" class="record-item" :class="{ 'is-used': item.isUsed }">
              <div class="record-top">
                <span class="code-type sm" :class="item.type === 'super' ? 'super' : 'normal'">
                  {{ item.type === 'super' ? 'SVIP' : 'VIP' }}
                </span>
                <span class="record-code">{{ item.code }}</span>
                <span class="record-status" :class="item.isUsed ? 'used' : 'unused'">
                  {{ item.isUsed ? '已激活' : '未激活' }}
                </span>
              </div>
              <div class="record-bottom">
                <span>生成: {{ formatTime(item.createdAt) }}</span>
                <span v-if="item.isUsed && item.usedBy" class="used-info">
                  激活: {{ formatTime(item.usedAt) }} | 用户: {{ item.usedBy.uid || item.usedBy.phone }}
                </span>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="totalPages > 1" class="pagination">
            <button :disabled="currentPage <= 1" @click="fetchRecords(currentPage - 1)">上一页</button>
            <span>{{ currentPage }} / {{ totalPages }}</span>
            <button :disabled="currentPage >= totalPages" @click="fetchRecords(currentPage + 1)">下一页</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { request } from '../../composables/request.js'

defineEmits(['close'])

const genType = ref('normal')
const genCount = ref(10)
const generating = ref(false)
const generatedCodes = ref([])

const filterType = ref('')
const filterStatus = ref('')
const loadingRecords = ref(false)
const records = ref([])
const currentPage = ref(1)
const totalPages = ref(1)

onMounted(() => fetchRecords(1))

// 生成激活码
async function handleGenerate() {
  if (!genCount.value || genCount.value < 1 || genCount.value > 100) {
    return alert('数量必须在1-100之间')
  }
  generating.value = true
  try {
    const res = await request('/api/admin/generate-membership-codes', {
      method: 'POST',
      body: JSON.stringify({ type: genType.value, count: genCount.value })
    })
    const data = await res.json()
    if (res.ok) {
      generatedCodes.value = data.codes
      fetchRecords(1) // 刷新记录列表
    } else {
      throw new Error(data.error || '生成失败')
    }
  } catch (err) {
    alert(err.message)
  } finally {
    generating.value = false
  }
}

// 复制激活码
function copyCodes() {
  const text = generatedCodes.value.join('\n')
  navigator.clipboard.writeText(text).then(() => alert('复制成功！')).catch(() => {
    const textarea = document.createElement('textarea')
    textarea.value = text; document.body.appendChild(textarea); textarea.select()
    document.execCommand('copy'); document.body.removeChild(textarea); alert('复制成功！')
  })
}

// 拉取记录
async function fetchRecords(page = 1) {
  loadingRecords.value = true
  currentPage.value = page
  try {
    const params = new URLSearchParams({ page, limit: 15 })
    if (filterType.value) params.append('type', filterType.value)
    if (filterStatus.value) params.append('status', filterStatus.value)
    
    const res = await request(`/api/admin/activation-codes?${params.toString()}`)
    const data = await res.json()
    if (res.ok) {
      records.value = data.codes
      totalPages.value = Math.ceil(data.total / 15) || 1
    }
  } catch (err) {
    console.error('获取记录失败', err)
  } finally {
    loadingRecords.value = false
  }
}

// 格式化时间
function formatTime(dateStr) {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.admin-modal { background: #161b22; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; width: 100%; max-width: 600px; color: #e0e0e0; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.modal-header h2 { margin: 0; font-size: 16px; color: #f0c040; }
.close-btn { background: none; border: none; color: #888; font-size: 18px; cursor: pointer; }
.close-btn:hover { color: #fff; }

.modal-body { padding: 20px; max-height: 75vh; overflow-y: auto; }
.section-box { background: #0d1117; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 20px; }
.section-title { font-size: 14px; font-weight: 700; color: #aaa; margin: 0 0 12px 0; }

.gen-form { display: flex; gap: 10px; }
.form-select, .form-input { padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #21262d; color: #fff; font-size: 13px; outline: none; }
.form-select { flex: 1; }
.form-input { width: 100px; }
.gen-btn { padding: 0 20px; border-radius: 8px; border: none; background: #8a2be2; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.gen-btn:disabled { opacity: 0.5; }

.result-box { margin-top: 14px; border: 1px dashed rgba(138, 43, 226, 0.3); border-radius: 8px; padding: 10px; background: rgba(138, 43, 226, 0.05); }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.result-title { font-size: 12px; color: #d87bff; font-weight: 600; }
.copy-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: #aaa; padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 600; }

.code-list { max-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.code-item { display: flex; align-items: center; gap: 8px; }
.code-type { font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 3px; }
.code-type.normal { background: rgba(212, 175, 55, 0.2); color: #d4af37; }
.code-type.super { background: rgba(138, 43, 226, 0.2); color: #d87bff; }
.code-type.sm { font-size: 10px; }
.code-text { font-family: monospace; font-size: 13px; font-weight: 600; color: #fff; letter-spacing: 1px; }

.filter-row { display: flex; gap: 10px; margin-bottom: 14px; }
.form-select-sm { padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: #21262d; color: #fff; font-size: 12px; outline: none; flex: 1; }

.loading-box, .empty-box { text-align: center; color: #666; padding: 20px; font-size: 13px; }

.record-list { display: flex; flex-direction: column; gap: 8px; }
.record-item { background: #21262d; border-radius: 8px; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s; }
.record-item.is-used { opacity: 0.6; }
.record-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.record-code { font-family: monospace; font-size: 14px; font-weight: 700; color: #f0f6fc; flex: 1; }
.record-status { font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
.record-status.unused { background: rgba(46, 160, 67, 0.2); color: #3fb950; }
.record-status.used { background: rgba(139, 148, 158, 0.2); color: #8b949e; }

.record-bottom { font-size: 11px; color: #8b949e; display: flex; justify-content: space-between; align-items: center; }
.used-info { color: #d4af37; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 14px; font-size: 12px; color: #aaa; }
.pagination button { padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: #21262d; color: #ccc; cursor: pointer; font-size: 11px; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
