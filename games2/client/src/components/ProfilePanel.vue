<template> 
  <div class="profile-panel"> 
    <!-- 用户卡片 --> 
    <div class="profile-card"> 
      <div class="profile-avatar" @click="openAvatarPicker"> 
        <img :src="avatarUrl" alt="头像" class="avatar-img" /> 
        <div class="avatar-edit-badge">换</div> 
      </div> 
      <div class="profile-main"> 
        <div class="name-row"> 
          <span class="profile-name">{{ currentUser?.nickname || '未设置昵称' }}</span> 
          <button class="edit-name-btn" @click="openNicknameEditor">✏️</button> 
        </div> 
        <div class="profile-uid">UID: {{ currentUser?.uid || '--' }}</div> 
        <div class="profile-phone">{{ currentUser?.phone || '' }}</div> 
        <div class="profile-role">{{ currentUser?.role === 'admin' ? '管理员' : '普通用户' }}</div> 
      </div> 
    </div> 

    <!-- ★ 优化：双资产卡片 --> 
    <div class="balance-card"> 
      <div class="balance-row">
        <div class="balance-item"> 
          <div class="balance-label">💰 账户余额</div> 
          <div class="balance-value num-font">{{ displayBalance.toLocaleString() }}</div> 
          <div class="balance-unit">积分</div> 
        </div>
        <div class="balance-divider"></div>
        <div class="balance-item pos-rel"> 
          <div class="balance-label">💎 晶石余额</div> 
          <div class="balance-value num-font crystal-color">{{ displayCrystal }}</div> 
          <div class="balance-unit">晶石</div> 
          <button class="crystal-transfer-btn" @click="openTransferModal">转增</button>
        </div>
      </div>
    </div> 

    <!-- 功能菜单 --> 
    <div class="menu-group"> 
      <div class="menu-item highlight-item" @click="goActivity"> 
        <span class="menu-icon">🎉</span> 
        <span class="menu-text">活动中心</span> 
        <span class="menu-tag">HOT</span>
        <span class="menu-arrow">›</span> 
      </div> 
      <div class="menu-item" @click="handleInviteClick"> 
        <span class="menu-icon">🎁</span> 
        <span class="menu-text">邀请记录</span> 
        <span class="menu-arrow">›</span> 
      </div> 
    </div> 

    <!-- 管理员菜单 --> 
    <div class="menu-group" v-if="isAdmin"> 
      <div class="menu-item" @click="$emit('go-admin')"> 
        <span class="menu-icon">⚙️</span> 
        <span class="menu-text">管理后台</span> 
        <span class="menu-arrow">›</span> 
      </div> 
      <div class="menu-item" @click="$emit('go-chat-admin')"> 
        <span class="menu-icon">💬</span> 
        <span class="menu-text">客服管理</span> 
        <span class="menu-arrow">›</span> 
      </div> 
    </div> 

    <!-- 退出登录 --> 
    <button class="logout-btn" @click="$emit('logout')">退出登录</button> 

    <!-- ========== 头像选择弹窗 ========== --> 
    <Transition name="fade"> 
 
      <div v-if="showAvatarPicker" class="modal-overlay" @click.self="showAvatarPicker = false"> 
        <div class="picker-modal"> 
          <div class="picker-title">选择头像</div> 
          <div class="avatar-grid"> 
            <div v-for="n in 5" :key="n" class="avatar-option" :class="{ active: currentUser?.avatar === n }" @click="selectAvatar(n)" > 
              <img :src="AVATAR_MAP[n]" :alt="'头像' + n" /> 
              <div v-if="currentUser?.avatar === n" class="avatar-check">✓</div> 
            </div> 
          </div> 
          <button class="picker-close" @click="showAvatarPicker = false">关闭</button> 
        </div> 
      </div> 
    </Transition> 

    <!-- ========== 修改昵称弹窗 ========== --> 
    <Transition name="fade"> 
      <div v-if="showNicknameEditor" class="modal-overlay" @click.self="showNicknameEditor = false"> 
        <div class="picker-modal"> 
          <div class="picker-title">修改昵称</div> 
          <div v-if="cooldownDays > 0" class="cooldown-hint"> 
            ⏰ 昵称30天内只能修改一次，还需等待 <strong>{{ cooldownDays }}</strong> 天 
          </div> 
          <template v-else> 
            <input v-model="newNickname" class="nickname-input" placeholder="请输入2-12个字符的昵称" maxlength="12" @keydown.enter="submitNickname" /> 
            <div class="nickname-char-count">{{ newNickname.length }} / 12</div> 
            <div class="nickname-warning">⚠️ 修改后30天内不可再次更改</div> 
            <div class="form-actions"> 
              <button class="cancel-btn" @click="showNicknameEditor = false">取消</button> 
              <button class="confirm-btn" @click="submitNickname" :disabled="!canSubmitNickname || submitting" > 
                {{ submitting ? '提交中...' : '确认修改' }} 
              </button> 
            </div> 
          </template> 
          <button v-if="cooldownDays > 0" class="picker-close" @click="showNicknameEditor = false">知道了</button> 
        </div> 
      </div> 
    </Transition> 

    <!-- ========== 晶石转增弹窗 ========== --> 
    <Transition name="fade"> 
      <div v-if="showTransferModal" class="modal-overlay" @click.self="showTransferModal = false"> 
        <div class="picker-modal transfer-modal"> 
          <div class="picker-title">💎 晶石转增</div> 
          
          <!-- 步骤1：校验对方信息 -->
          <div class="transfer-step" v-if="!targetInfo">
            <input v-model="transferAccount" class="nickname-input" placeholder="请输入对方UID或手机号" />
            <button class="confirm-btn check-btn" @click="checkTargetUser" :disabled="checking"> 
              {{ checking ? '查询中...' : '查询校验' }}
            </button>
          </div>

          <!-- 步骤2：输入金额并确认 -->
          <div class="transfer-step" v-else>
            <div class="target-info-card">
              <div class="target-confirm-row">
                <div class="target-name">{{ targetInfo.nickname }}</div>
                <div class="target-uid">UID: {{ targetInfo.uid }}</div>
              </div>
              <div class="target-warning">⚠️ 请务必核对昵称和UID，转增无法撤回！</div>
            </div>
            
            <!-- ★ 修改：step=0.01 支持小数，min=1 最少1起转 -->
            <input v-model="transferAmount" class="nickname-input" type="number" placeholder="请输入转增数量 (最少1)" min="1" step="0.01" />
            <div class="transfer-fee-hint">
              手续费5%：需额外支付 <strong>{{ transferFee }}</strong> 晶石<br/>
              实际扣除：<strong class="crystal-color">{{ transferTotalCost }}</strong> 晶石，对方到账 <strong class="crystal-color">{{ validAmount }}</strong> 晶石
            </div>

            <div class="form-actions" style="margin-top:16px"> 
              <button class="cancel-btn" @click="resetTransferModal">取消</button> 
              <button class="confirm-btn" @click="submitTransfer" :disabled="!canTransfer || transferring"> 
                {{ transferring ? '处理中...' : '确认转增' }} 
              </button> 
            </div> 
          </div>
        </div> 
      </div> 
    </Transition> 
  </div> 
</template> 

<script setup> 
import { ref, computed } from 'vue' 
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js' 
import { AVATAR_MAP } from '../config.js' 
import { request } from '../composables/request.js' 

const router = useRouter()
const props = defineProps({ 
  currentUser: { type: Object, default: null }, 
  isAdmin: { type: Boolean, default: false }, 
  displayBalance: { type: Number, default: 0 },
  displayCrystal: { type: Number, default: 0 } 
}) 
defineEmits(['logout', 'go-admin', 'go-chat-admin', 'go-game']) 

const { updateNickname, updateAvatar, getNicknameCooldownDays, refreshUser } = useAuth() 

const avatarUrl = computed(() => { 
  const n = props.currentUser?.avatar || 1 
  return AVATAR_MAP[n] || AVATAR_MAP[1] 
}) 

const showAvatarPicker = ref(false) 
function openAvatarPicker() { showAvatarPicker.value = true } 
async function selectAvatar(n) { 
  if (props.currentUser?.avatar === n) { showAvatarPicker.value = false; return } 
  try { 
    await updateAvatar(n); showAvatarPicker.value = false 
  } catch (err) { alert(err.message || '头像修改失败') } 
} 

const showNicknameEditor = ref(false) 
const newNickname = ref('') 
const submitting = ref(false) 
const cooldownDays = ref(0) 
function openNicknameEditor() { 
  cooldownDays.value = getNicknameCooldownDays()
  newNickname.value = props.currentUser?.nickname || ''
  showNicknameEditor.value = true 
} 
const canSubmitNickname = computed(() => newNickname.value.trim().length >= 2 && newNickname.value.trim().length <= 12) 
async function submitNickname() { 
  if (!canSubmitNickname.value || submitting.value) return 
  submitting.value = true
  try { 
    await updateNickname(newNickname.value.trim()); showNicknameEditor.value = false; await refreshUser() 
  } catch (err) { 
    if (err.message.includes('还需等待')) { const match = err.message.match(/还需等待(\d+)天/); if (match) cooldownDays.value = Number(match[1]) }
    alert(err.message || '昵称修改失败') 
  } finally { submitting.value = false } 
}

function goActivity() { router.push('/activity') }
function handleInviteClick() { alert('🎁 邀请记录功能开发中，敬请期待！') }

const showTransferModal = ref(false)
const checking = ref(false)
const transferring = ref(false)
const transferAccount = ref('')
const transferAmount = ref('')
const targetInfo = ref(null)

function openTransferModal() {
  showTransferModal.value = true
  resetTransferModal()
}

function resetTransferModal() {
  targetInfo.value = null
  transferAccount.value = ''
  transferAmount.value = ''
}

async function checkTargetUser() {
  if (!transferAccount.value.trim()) return alert('请输入对方UID或手机号')
  checking.value = true
  try {
    const res = await request('/api/transfer/check-target', { 
      method: 'POST', 
      body: JSON.stringify({ account: transferAccount.value.trim() }) 
    })
    const data = await res.json()
    targetInfo.value = data
  } catch (err) {
    alert(err.message || '查询失败')
  } finally {
    checking.value = false
  }
}

// ★ 优化：支持小数点后两位的校验与计算
const validAmount = computed(() => {
  const amt = parseFloat(transferAmount.value)
  if (isNaN(amt) || amt < 1) return 0
  // 检查小数位数
  const parts = transferAmount.value.toString().split('.')
  if (parts[1] && parts[1].length > 2) return 0
  return amt
})

const transferFee = computed(() => {
  if (validAmount.value <= 0) return '0.00'
  return (validAmount.value * 0.05).toFixed(2)
})

const transferTotalCost = computed(() => {
  if (validAmount.value <= 0) return '0.00'
  // 防止 JS 浮点数计算丢失精度 (如 1.05 变成 1.04999999)
  const total = validAmount.value + parseFloat(transferFee.value)
  return total.toFixed(2)
})

const canTransfer = computed(() => {
  return validAmount.value >= 1 && parseFloat(transferTotalCost.value) <= props.displayCrystal
})

async function submitTransfer() {
  if (!canTransfer.value) return alert('余额不足或数量错误')
  transferring.value = true
  try {
    const res = await request('/api/transfer/crystal', { 
      method: 'POST',
      body: JSON.stringify({ 
        targetAccount: targetInfo.value.uid, 
        amount: validAmount.value 
      })
    })
    const data = await res.json()
    alert(`转增成功！订单号: ${data.tradeNo}`)
    showTransferModal.value = false
    await refreshUser() 
  } catch (err) {
    alert(err.message || '转增失败')
  } finally {
    transferring.value = false
  }
}
</script> 

<style scoped> 
.profile-panel { padding: 20px 16px; } 
.profile-card { display: flex; align-items: center; gap: 14px; padding: 20px; background: rgba(255, 248, 220, 0.75); border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 14px; margin-bottom: 14px; backdrop-filter: blur(5px); } 
.profile-avatar { width: 60px; height: 60px; border-radius: 50%; background: rgba(212, 175, 55, 0.12); display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; overflow: hidden; flex-shrink: 0; } 
.avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; } 
.avatar-edit-badge { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.55); color: #fff; font-size: 10px; text-align: center; padding: 2px 0; letter-spacing: 1px; } 
.profile-main { flex: 1; min-width: 0; } 
.name-row { display: flex; align-items: center; gap: 6px; } 
.profile-name { font-size: 17px; font-weight: 700; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } 
.edit-name-btn { background: none; border: none; font-size: 14px; cursor: pointer; padding: 2px; opacity: 0.6; transition: opacity 0.2s; } 
.edit-name-btn:active { opacity: 1; } 
.profile-uid { font-size: 12px; color: #d4af37; font-weight: 600; margin-top: 2px; letter-spacing: 0.5px; } 
.profile-phone { font-size: 11px; color: #aaa; margin-top: 1px; } 
.profile-role { font-size: 11px; color: #999; margin-top: 1px; } 

.balance-card { padding: 20px; background: rgba(255, 248, 220, 0.75); border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 14px; margin-bottom: 14px; backdrop-filter: blur(5px); } 
.balance-row { display: flex; align-items: center; }
.balance-item { flex: 1; text-align: center; }
.balance-divider { width: 1px; height: 40px; background-color: rgba(212, 175, 55, 0.2); }
.balance-label { font-size: 13px; color: #888; margin-bottom: 6px; } 
.balance-value { font-size: 28px; font-weight: 900; color: #d4af37; line-height: 1; } 
.crystal-color { color: #8a2be2; }
.balance-unit { font-size: 11px; color: #aaa; margin-top: 4px; } 

.menu-group { background: rgba(255, 248, 220, 0.75); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 14px; overflow: hidden; margin-bottom: 14px; backdrop-filter: blur(5px); } 
.menu-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid rgba(212, 175, 55, 0.1); cursor: pointer; transition: background 0.15s; } 
.menu-item:last-child { border-bottom: none; } 
.menu-item:active { background: rgba(212, 175, 55, 0.08); } 
.menu-icon { font-size: 18px; width: 24px; text-align: center; } 
.menu-text { flex: 1; font-size: 14px; color: #444; font-weight: 500; } 
.menu-arrow { font-size: 16px; color: #ccc; } 
.highlight-item .menu-text { font-weight: 700; color: #d4af37; }
.menu-tag { font-size: 10px; background: #e74c3c; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: 700; }

.logout-btn { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid rgba(220, 80, 80, 0.3); background: rgba(220, 80, 80, 0.06); color: #c0392b; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 6px; } 
.logout-btn:active { background: rgba(220, 80, 80, 0.15); } 

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; } 
.picker-modal { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 340px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); } 
.picker-title { font-size: 18px; font-weight: 700; color: #333; text-align: center; margin-bottom: 20px; } 
.avatar-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; } 
.avatar-option { position: relative; aspect-ratio: 1; border-radius: 50%; overflow: hidden; cursor: pointer; border: 3px solid transparent; transition: all 0.2s; } 
.avatar-option img { width: 100%; height: 100%; object-fit: cover; } 
.avatar-option.active { border-color: #d4af37; box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.3); } 
.avatar-option:active { transform: scale(0.92); } 
.avatar-check { position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; background: #d4af37; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; } 
.picker-close { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #ddd; background: #f8f8f8; color: #666; font-size: 14px; font-weight: 600; cursor: pointer; } 
.picker-close:active { background: #eee; } 
.nickname-input { width: 100%; padding: 12px 14px; border: 1px solid #ddd; border-radius: 10px; font-size: 15px; color: #333; outline: none; box-sizing: border-box; transition: border-color 0.2s; } 
.nickname-input:focus { border-color: #d4af37; } 
.nickname-char-count { text-align: right; font-size: 11px; color: #aaa; margin-top: 4px; } 
.nickname-warning { font-size: 12px; color: #e67e22; margin: 10px 0; text-align: center; } 
.cooldown-hint { text-align: center; padding: 20px; color: #666; font-size: 14px; line-height: 1.8; } 
.cooldown-hint strong { color: #e74c3c; font-size: 20px; } 
.form-actions { display: flex; gap: 10px; margin-top: 12px; } 
.cancel-btn { flex: 1; padding: 12px; border-radius: 10px; border: 1px solid #ddd; background: #f8f8f8; color: #666; font-size: 14px; font-weight: 600; cursor: pointer; } 
.confirm-btn { flex: 1; padding: 12px; border-radius: 10px; border: none; background: #d4af37; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; } 
.confirm-btn:active:not(:disabled) { background: #b8972e; } 
.confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; } 

.pos-rel { position: relative; }
.crystal-transfer-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #8a2be2;
  color: #fff;
  border: none;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
.transfer-modal { max-width: 360px; }
.transfer-step { width: 100%; }
.target-info-card {
  background: rgba(138, 43, 226, 0.08);
  border: 1px dashed rgba(138, 43, 226, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  text-align: center;
}
.target-confirm-row {
  margin-bottom: 8px;
}
.target-name {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}
.target-uid {
  font-size: 13px;
  color: #8a2be2;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.target-warning {
  font-size: 11px;
  color: #e74c3c;
  text-align: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(138, 43, 226, 0.2);
}
.check-btn { width: 100%; margin-top: 10px; }
.transfer-fee-hint {
  font-size: 12px;
  color: #888;
  margin-top: 8px;
  line-height: 1.8;
  padding: 8px;
  background: #fffcf0;
  border-radius: 6px;
  border: 1px solid rgba(212, 175, 55, 0.2);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; } 
.fade-enter-from, .fade-leave-to { opacity: 0; } 
</style> 
