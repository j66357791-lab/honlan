<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="sheet sheet-large">
      <div class="sheet-header">
        <h2>👥 用户管理</h2>
        <button class="x-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="sheet-body">
        <input v-model="searchPhone" class="search-input" placeholder="搜索手机号..." />
        <div class="user-list">
          <div v-for="user in filteredUsers" :key="user._id" class="user-card">
            <div class="uc-top">
              <span class="uc-phone">{{ user.phone }}</span>
              <span class="uc-nick">{{ user.nickname || '未设置' }}</span>
              <span class="uc-bal">💰{{ user.balance?.toLocaleString() }}</span>
            </div>
            <div class="uc-mid">
              <span class="uc-profit" :class="user.todayProfit >= 0 ? 'green' : 'red'">
                今日{{ user.todayProfit >= 0 ? '+' : '' }}{{ user.todayProfit }}
              </span>
              <span v-if="user.isHighRisk" class="tag tag-risk">高危</span>
              <span v-if="user.isWhitelisted" class="tag tag-white">白名单</span>
              <span v-if="user.isInternal" class="tag tag-int">内部</span>
              <span v-if="user.banned" class="tag tag-ban">封禁</span>
            </div>
            <div class="uc-btns">
              <button class="ub" @click="openAdjust(user)">余额</button>
              <button class="ub" @click="openProfile(user)">资料</button>
              <button class="ub" :class="user.isInternal ? 'ub-on' : ''" @click="toggle('toggle-internal', user)">{{ user.isInternal ? '取消内部' : '内部' }}</button>
              <button class="ub" :class="user.isHighRisk ? 'ub-on' : ''" @click="toggle('toggle-risk', user)">{{ user.isHighRisk ? '取消高危' : '高危' }}</button>
              <button class="ub" :class="user.isWhitelisted ? 'ub-on' : ''" @click="toggle('toggle-whitelist', user)">{{ user.isWhitelisted ? '取消白名单' : '白名单' }}</button>
              <button class="ub" :class="user.banned ? 'ub-ban' : 'ub-danger'" @click="toggleBan(user)">{{ user.banned ? '解封' : '封禁' }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 余额调整子弹窗 -->
      <div v-if="showAdjust" class="sub-overlay" @click.self="showAdjust = false">
        <div class="sub-sheet">
          <div class="sub-hdr"><h3>余额调整 - {{ adjustTarget?.phone }}</h3><button class="x-btn" @click="showAdjust = false">✕</button></div>
          <div class="sub-body">
            <p class="sub-text">当前余额: <strong class="gold">{{ adjustTarget?.balance?.toLocaleString() }}</strong></p>
            <div class="form-row">
              <select v-model="adjustType" class="form-select"><option value="add">增加</option><option value="sub">扣除</option></select>
              <input v-model.number="adjustAmount" type="number" class="form-input" placeholder="金额" min="1" />
            </div>
            <input v-model="adjustRemark" class="form-input full" placeholder="备注（可选）" />
            <div class="form-btns"><button class="btn-cancel" @click="showAdjust = false">取消</button><button class="btn-confirm" @click="submitAdjust">确认</button></div>
          </div>
        </div>
      </div>

      <!-- 资料修改子弹窗 -->
      <div v-if="showProfile" class="sub-overlay" @click.self="showProfile = false">
        <div class="sub-sheet">
          <div class="sub-hdr"><h3>修改资料 - {{ profileTarget?.phone }}</h3><button class="x-btn" @click="showProfile = false">✕</button></div>
          <div class="sub-body">
            <label class="form-label">昵称（2-12字符）</label>
            <input v-model="profileForm.nickname" class="form-input full" maxlength="12" />
            <label class="form-label">头像</label>
            <div class="avatar-row">
              <div v-for="n in 5" :key="n" class="av-item" :class="{ active: profileForm.avatar === n }" @click="profileForm.avatar = n">
                <img :src="AVATAR_MAP[n]" />
              </div>
            </div>
            <div class="form-btns"><button class="btn-cancel" @click="showProfile = false">取消</button><button class="btn-confirm" @click="submitProfile" :disabled="profileLoading">{{ profileLoading ? '提交中...' : '确认' }}</button></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth.js'
import { AVATAR_MAP } from '../../config.js'

const emit = defineEmits(['close'])
const { authFetch } = useAuth()

const users = ref([])
const searchPhone = ref('')
const filteredUsers = computed(() => {
  if (!searchPhone.value) return users.value
  return users.value.filter(u => u.phone.includes(searchPhone.value))
})

async function fetchUsers() {
  try {
    const res = await authFetch('/api/admin/users')
    const data = await res.json()
    if (res.ok) users.value = data.users || []
  } catch (e) { console.error(e) }
}

onMounted(fetchUsers)

// 余额调整
const showAdjust = ref(false)
const adjustTarget = ref(null)
const adjustType = ref('add')
const adjustAmount = ref(0)
const adjustRemark = ref('')

function openAdjust(user) {
  adjustTarget.value = user; adjustType.value = 'add'; adjustAmount.value = 0; adjustRemark.value = ''
  showAdjust.value = true
}

async function submitAdjust() {
  if (!adjustAmount.value || adjustAmount.value <= 0) return
  const res = await authFetch('/api/admin/adjust-balance', {
    method: 'POST',
    body: JSON.stringify({ userId: adjustTarget.value._id, type: adjustType.value, amount: adjustAmount.value, remark: adjustRemark.value })
  })
  const data = await res.json()
  if (res.ok) { showAdjust.value = false; fetchUsers() }
  else alert(data.error)
}

// 资料修改
const showProfile = ref(false)
const profileTarget = ref(null)
const profileForm = ref({ nickname: '', avatar: 1 })
const profileLoading = ref(false)

function openProfile(user) {
  profileTarget.value = user
  profileForm.value = { nickname: user.nickname || '', avatar: user.avatar || 1 }
  showProfile.value = true
}

async function submitProfile() {
  profileLoading.value = true
  const res = await authFetch('/api/admin/user-profile', {
    method: 'PUT',
    body: JSON.stringify({ userId: profileTarget.value._id, ...profileForm.value })
  })
  const data = await res.json()
  if (res.ok) { showProfile.value = false; fetchUsers() }
  else alert(data.error)
  profileLoading.value = false
}

// 风控切换
async function toggle(endpoint, user) {
  const res = await authFetch(`/api/admin/${endpoint}`, { method: 'POST', body: JSON.stringify({ userId: user._id }) })
  if (res.ok) fetchUsers()
}

async function toggleBan(user) {
  const url = user.banned ? '/api/admin/unban' : '/api/admin/ban'
  const res = await authFetch(url, { method: 'POST', body: JSON.stringify({ userId: user._id, reason: '管理员封禁' }) })
  if (res.ok) fetchUsers()
}
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
.search-input { width: 100%; background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; color: #eee; font-size: 13px; outline: none; margin-bottom: 12px; }
.user-card { background: rgba(255,255,255,0.02); border-radius: 8px; padding: 10px; margin-bottom: 8px; }
.uc-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 13px; margin-bottom: 4px; }
.uc-phone { font-weight: 600; } .uc-nick { color: #888; } .uc-bal { color: #f0c040; margin-left: auto; }
.uc-mid { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; font-size: 11px; margin-bottom: 6px; }
.uc-profit { font-weight: 600; }
.green { color: #27ae60; } .red { color: #e74c3c; } .gold { color: #f0c040; }
.tag { font-size: 10px; padding: 1px 5px; border-radius: 3px; font-weight: 600; }
.tag-risk { color: #e74c3c; background: rgba(231,76,60,0.15); }
.tag-white { color: #3498db; background: rgba(52,152,219,0.15); }
.tag-int { color: #f0c040; background: rgba(240,192,64,0.15); }
.tag-ban { color: #e74c3c; background: rgba(231,76,60,0.1); }
.uc-btns { display: flex; gap: 4px; flex-wrap: wrap; }
.ub { padding: 3px 8px; border-radius: 4px; border: none; font-size: 10px; cursor: pointer; font-weight: 600; background: rgba(255,255,255,0.06); color: #aaa; }
.ub-on { background: rgba(240,192,64,0.2); color: #f0c040; }
.ub-danger { background: rgba(231,76,60,0.2); color: #e74c3c; }
.ub-ban { background: rgba(39,174,96,0.2); color: #27ae60; }
/* 子弹窗 */
.sub-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10; border-radius: 16px; }
.sub-sheet { background: #1c2129; border-radius: 12px; width: 90%; max-width: 380px; border: 1px solid rgba(255,255,255,0.1); }
.sub-hdr { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.sub-hdr h3 { font-size: 14px; margin: 0; }
.sub-body { padding: 14px; }
.sub-text { font-size: 12px; color: #888; margin: 0 0 8px; }
.form-row { display: flex; gap: 8px; margin: 8px 0; }
.form-input { background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px; color: #eee; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.form-select { background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px; color: #eee; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.full { width: 100%; }
.form-btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.btn-cancel { padding: 7px 16px; border-radius: 6px; border: none; background: rgba(255,255,255,0.08); color: #ccc; cursor: pointer; font-size: 13px; }
.btn-confirm { padding: 7px 16px; border-radius: 6px; border: none; background: #f0c040; color: #000; cursor: pointer; font-weight: 600; font-size: 13px; }
.form-label { font-size: 11px; color: #8b949e; display: block; margin: 10px 0 4px; }
.avatar-row { display: flex; gap: 8px; margin-top: 4px; }
.av-item { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; cursor: pointer; border: 2px solid transparent; }
.av-item img { width: 100%; height: 100%; object-fit: cover; }
.av-item.active { border-color: #f0c040; }
</style>
