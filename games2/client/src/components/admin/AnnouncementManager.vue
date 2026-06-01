<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="sheet sheet-large">
      <div class="sheet-header">
        <h2>📢 公告管理</h2>
        <button class="x-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="sheet-body">
        <!-- 统计条 -->
        <div class="anno-stats-bar">
          <div class="as-item"><span class="as-num">{{ stats.total }}</span><span class="as-label">全部</span></div>
          <div class="as-item as-active"><span class="as-num">{{ stats.active }}</span><span class="as-label">已发布</span></div>
          <div class="as-item"><span class="as-num">{{ stats.draft }}</span><span class="as-label">草稿</span></div>
          <div class="as-item"><span class="as-num">{{ stats.expired }}</span><span class="as-label">已下架</span></div>
        </div>
        <button class="btn-create" @click="openCreate">＋ 创建公告</button>
        <div v-if="list.length === 0" class="empty">暂无公告，点击上方按钮创建</div>
        <div v-else>
          <div v-for="item in list" :key="item._id" class="anno-card">
            <div class="ac-top">
              <span class="ac-title">{{ item.title }}</span>
              <span class="ac-status" :class="{ 'st-active': item.status === 'active', 'st-draft': item.status === 'draft', 'st-expired': item.status === 'expired' }">{{ label(item.status) }}</span>
            </div>
            <div class="ac-content">{{ strip(item.content) }}</div>
            <div class="ac-meta">
              <span>{{ item.type === 'activity' ? '🎉活动' : item.type === 'notice' ? '📋通知' : '🔄更新' }}</span>
              <span>优先级: {{ item.priority }}</span>
              <span>{{ fmtTime(item.createdAt) }}</span>
            </div>
            <div class="ac-btns">
              <button class="ab" @click="openEdit(item)">编辑</button>
              <button class="ab" @click="toggleStatus(item)">{{ item.status === 'active' ? '下架' : '发布' }}</button>
              <button class="ab ab-danger" @click="remove(item)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showEditor" class="overlay2" @click.self="showEditor = false">
      <div class="sheet2">
        <div class="sheet-header2">
          <h3>{{ editMode === 'create' ? '创建公告' : '编辑公告' }}</h3>
          <button class="x-btn" @click="showEditor = false">✕</button>
        </div>
        <div class="sheet-body2">
          <label class="fl">标题 *</label>
          <input v-model="form.title" class="fi full" placeholder="公告标题" maxlength="50" />
          <label class="fl">内容 * (支持HTML)</label>
          <textarea v-model="form.content" class="ft" placeholder="<p>公告内容</p>" rows="5"></textarea>
          <div class="fr2">
            <div><label class="fl">类型</label><select v-model="form.type" class="fs full"><option value="activity">🎉 活动</option><option value="notice">📋 通知</option><option value="update">🔄 更新</option></select></div>
            <div><label class="fl">状态</label><select v-model="form.status" class="fs full"><option value="draft">草稿</option><option value="active">发布</option></select></div>
          </div>
          <div class="fr2">
            <div><label class="fl">优先级</label><input v-model.number="form.priority" type="number" class="fi full" placeholder="0" /></div>
            <div><label class="fl">按钮文字</label><input v-model="form.linkText" class="fi full" placeholder="查看详情" /></div>
          </div>
          <label class="fl">按钮动作</label>
          <select v-model="form.linkAction" class="fs full">
            <option value="">无按钮</option>
            <option value="activity">跳转活动Tab</option>
            <option value="/game/giant">跳转巨人赛跑</option>
            <option value="/game/pointing">跳转点兵点将</option>
            <option value="/game/match">跳转消消乐</option>
          </select>
          <div class="form-btns"><button class="btn-cancel" @click="showEditor = false">取消</button><button class="btn-confirm" @click="submitForm" :disabled="submitting">{{ submitting ? '提交中...' : '保存' }}</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth.js'

defineEmits(['close'])
const { authFetch } = useAuth()

const list = ref([])
const stats = ref({ total: 0, active: 0, draft: 0, expired: 0 })
const showEditor = ref(false)
const editMode = ref('create')
const form = ref({ title: '', content: '', type: 'activity', status: 'draft', linkAction: '', linkText: '', priority: 0 })
const submitting = ref(false)

async function fetchList() {
  try {
    const res = await authFetch('/api/announcements/admin/list?pageSize=50')
    const data = await res.json()
    if (res.ok) {
      list.value = data.data || []
      // 从列表数据算统计，不需要单独的 /announcement-stats 接口
      stats.value = {
        total: data.total || list.value.length,
        active: list.value.filter(a => a.status === 'active').length,
        draft: list.value.filter(a => a.status === 'draft').length,
        expired: list.value.filter(a => a.status === 'expired').length
      }
    }
  } catch (e) { console.error(e) }
}

function openCreate() {
  editMode.value = 'create'
  form.value = { title: '', content: '', type: 'activity', status: 'draft', linkAction: '', linkText: '', priority: 0 }
  showEditor.value = true
}

function openEdit(item) {
  editMode.value = 'edit'
  form.value = { id: item._id, title: item.title, content: item.content, type: item.type || 'activity', status: item.status, linkAction: item.linkAction || '', linkText: item.linkText || '', priority: item.priority || 0 }
  showEditor.value = true
}

async function submitForm() {
  if (!form.value.title || !form.value.content) return alert('标题和内容不能为空')
  submitting.value = true
  try {
    const url = editMode.value === 'create' ? '/api/announcements/admin/create' : `/api/announcements/admin/update/${form.value.id}`
    const method = editMode.value === 'create' ? 'POST' : 'PUT'
    const res = await authFetch(url, { method, body: JSON.stringify(form.value) })
    const data = await res.json()
    if (res.ok) { showEditor.value = false; fetchList() }
    else alert(data.error)
  } catch (e) { alert('操作失败') }
  submitting.value = false
}

async function toggleStatus(item) {
  const res = await authFetch(`/api/announcements/admin/toggle/${item._id}`, { method: 'PUT' })
  if (res.ok) fetchList()
}

async function remove(item) {
  if (!confirm(`确定删除「${item.title}」？`)) return
  const res = await authFetch(`/api/announcements/admin/delete/${item._id}`, { method: 'DELETE' })
  if (res.ok) fetchList()
}

function label(s) { return s === 'active' ? '已发布' : s === 'draft' ? '草稿' : '已下架' }
function strip(html) { if (!html) return ''; const t = html.replace(/<[^>]*>/g, ''); return t.length > 60 ? t.slice(0, 60) + '...' : t }
function fmtTime(t) { if (!t) return ''; return new Date(t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }

onMounted(fetchList)
</script>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
@media (min-width: 600px) { .overlay { align-items: center; } }
.sheet { background: #161b22; border-radius: 16px 16px 0 0; border: 1px solid rgba(255,255,255,0.08); width: 100%; max-height: 90vh; display: flex; flex-direction: column; animation: slideUp .25s ease; }
@media (min-width: 600px) { .sheet { border-radius: 16px; } }
@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.sheet-large { max-width: 700px; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.sheet-header h2 { font-size: 15px; margin: 0; }
.x-btn { width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(255,255,255,0.08); color: #888; font-size: 14px; cursor: pointer; }
.sheet-body { padding: 14px; overflow-y: auto; flex: 1; }
/* 统计条 */
.anno-stats-bar { display: flex; gap: 8px; margin-bottom: 12px; }
.as-item { flex: 1; text-align: center; padding: 8px 4px; background: rgba(255,255,255,0.03); border-radius: 6px; }
.as-active { border: 1px solid rgba(39,174,96,0.3); }
.as-num { display: block; font-size: 18px; font-weight: 800; color: #eee; }
.as-label { font-size: 10px; color: #888; }
.btn-create { width: 100%; padding: 10px; border-radius: 8px; border: 1px dashed rgba(240,192,64,0.4); background: rgba(240,192,64,0.06); color: #f0c040; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 12px; }
.anno-card { background: rgba(255,255,255,0.02); border-radius: 8px; padding: 10px; margin-bottom: 8px; }
.ac-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.ac-title { font-size: 14px; font-weight: 700; }
.ac-status { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
.st-active { color: #27ae60; background: rgba(39,174,96,0.15); }
.st-draft { color: #888; background: rgba(255,255,255,0.06); }
.st-expired { color: #e74c3c; background: rgba(231,76,60,0.1); }
.ac-content { font-size: 12px; color: #888; margin-bottom: 6px; line-height: 1.5; }
.ac-meta { display: flex; gap: 10px; font-size: 10px; color: #666; margin-bottom: 8px; }
.ac-btns { display: flex; gap: 4px; }
.ab { padding: 3px 10px; border-radius: 4px; border: none; font-size: 11px; cursor: pointer; font-weight: 600; background: rgba(255,255,255,0.06); color: #aaa; }
.ab-danger { color: #e74c3c; background: rgba(231,76,60,0.15); }
.empty { text-align: center; color: #555; padding: 24px; font-size: 13px; }
/* 编辑弹窗（第二层） */
.overlay2 { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 1010; }
.sheet2 { background: #161b22; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); width: 92%; max-width: 420px; max-height: 85vh; display: flex; flex-direction: column; animation: slideUp .2s ease; }
.sheet-header2 { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.sheet-header2 h3 { font-size: 14px; margin: 0; }
.sheet-body2 { padding: 14px; overflow-y: auto; flex: 1; }
.fl { font-size: 11px; color: #8b949e; display: block; margin: 10px 0 4px; }
.fi { background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px; color: #eee; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.fs { background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px; color: #eee; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.ft { background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px; color: #eee; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; resize: vertical; }
.full { width: 100%; }
.fr2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.form-btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.btn-cancel { padding: 7px 16px; border-radius: 6px; border: none; background: rgba(255,255,255,0.08); color: #ccc; cursor: pointer; font-size: 13px; }
.btn-confirm { padding: 7px 16px; border-radius: 6px; border: none; background: #f0c040; color: #000; cursor: pointer; font-weight: 600; font-size: 13px; }
</style>
