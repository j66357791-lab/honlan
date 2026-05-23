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

    <!-- 余额卡片 --> 
    <div class="balance-card"> 
      <div class="balance-label">账户余额</div> 
      <div class="balance-value">{{ displayBalance.toLocaleString() }}</div> 
      <div class="balance-unit">积分</div> 
    </div> 

    <!-- 功能菜单 (已修改) -->
    <div class="menu-group"> 
      <!-- 新增：邀请记录占位 -->
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
          <!-- 冷却期提示 --> 
          <div v-if="cooldownDays > 0" class="cooldown-hint"> 
            ⏰ 昵称30天内只能修改一次，还需等待 <strong>{{ cooldownDays }}</strong> 天 
          </div> 
          <!-- 可修改时显示输入框 --> 
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
          <!-- 冷却期时只显示关闭 --> 
          <button v-if="cooldownDays > 0" class="picker-close" @click="showNicknameEditor = false">知道了</button> 
        </div> 
      </div> 
    </Transition> 
  </div> 
</template> 

<script setup> 
import { ref, computed } from 'vue' 
import { useAuth } from '../composables/useAuth.js' 
import { AVATAR_MAP } from '../config.js' 

const props = defineProps({ 
  currentUser: { type: Object, default: null }, 
  isAdmin: { type: Boolean, default: false }, 
  displayBalance: { type: Number, default: 0 } 
}) 
defineEmits(['logout', 'go-admin', 'go-chat-admin', 'go-game']) 

const { updateNickname, updateAvatar, getNicknameCooldownDays, refreshUser } = useAuth() 

// 头像URL计算 
const avatarUrl = computed(() => { 
  const n = props.currentUser?.avatar || 1 
  return AVATAR_MAP[n] || AVATAR_MAP[1] 
}) 

// ========== 头像选择 ========== 
const showAvatarPicker = ref(false) 
function openAvatarPicker() { 
  showAvatarPicker.value = true 
} 
async function selectAvatar(n) { 
  if (props.currentUser?.avatar === n) { 
    showAvatarPicker.value = false 
    return 
  } 
  try { 
    await updateAvatar(n) 
    showAvatarPicker.value = false 
  } catch (err) { 
    alert(err.message || '头像修改失败') 
  } 
} 

// ========== 昵称修改 ========== 
const showNicknameEditor = ref(false) 
const newNickname = ref('') 
const submitting = ref(false) 
const cooldownDays = ref(0) 

function openNicknameEditor() { 
  cooldownDays.value = getNicknameCooldownDays() 
  newNickname.value = props.currentUser?.nickname || '' 
  showNicknameEditor.value = true 
} 

const canSubmitNickname = computed(() => { 
  const trimmed = newNickname.value.trim() 
  return trimmed.length >= 2 && trimmed.length <= 12 
}) 

async function submitNickname() { 
  if (!canSubmitNickname.value || submitting.value) return 
  submitting.value = true 
  try { 
    await updateNickname(newNickname.value.trim()) 
    showNicknameEditor.value = false 
    // 刷新一下用户信息确保同步 
    await refreshUser() 
  } catch (err) { 
    // 如果返回429（冷却期），解析剩余天数 
    if (err.message.includes('还需等待')) { 
      const match = err.message.match(/还需等待(\d+)天/) 
      if (match) cooldownDays.value = Number(match[1]) 
    } 
    alert(err.message || '昵称修改失败') 
  } finally { 
    submitting.value = false 
  } 
}

// ========== 新增：邀请记录占位 ==========
function handleInviteClick() {
  alert('🎁 邀请记录功能开发中，敬请期待！')
}
</script> 

<style scoped> 
.profile-panel { padding: 20px 16px; } 
/* 用户卡片 */ 
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
/* 余额卡片 */ 
.balance-card { text-align: center; padding: 22px; background: rgba(255, 248, 220, 0.75); border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 14px; margin-bottom: 14px; backdrop-filter: blur(5px); } 
.balance-label { font-size: 13px; color: #888; } 
.balance-value { font-size: 36px; font-weight: 900; color: #d4af37; margin: 8px 0 2px; } 
.balance-unit { font-size: 12px; color: #999; } 
/* 菜单组 */ 
.menu-group { background: rgba(255, 248, 220, 0.75); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 14px; overflow: hidden; margin-bottom: 14px; backdrop-filter: blur(5px); } 
.menu-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid rgba(212, 175, 55, 0.1); cursor: pointer; } 
.menu-item:last-child { border-bottom: none; } 
.menu-item:active { background: rgba(212, 175, 55, 0.08); } 
.menu-icon { font-size: 18px; width: 24px; text-align: center; } 
.menu-text { flex: 1; font-size: 14px; color: #444; } 
.menu-arrow { font-size: 16px; color: #ccc; } 
/* 退出按钮 */ 
.logout-btn { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid rgba(220, 80, 80, 0.3); background: rgba(220, 80, 80, 0.06); color: #c0392b; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 6px; } 
.logout-btn:active { background: rgba(220, 80, 80, 0.15); } 
/* ========== 弹窗通用 ========== */ 
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; } 
.picker-modal { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 340px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); } 
.picker-title { font-size: 18px; font-weight: 700; color: #333; text-align: center; margin-bottom: 20px; } 
/* 头像网格 */ 
.avatar-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; } 
.avatar-option { position: relative; aspect-ratio: 1; border-radius: 50%; overflow: hidden; cursor: pointer; border: 3px solid transparent; transition: all 0.2s; } 
.avatar-option img { width: 100%; height: 100%; object-fit: cover; } 
.avatar-option.active { border-color: #d4af37; box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.3); } 
.avatar-option:active { transform: scale(0.92); } 
.avatar-check { position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; background: #d4af37; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; } 
.picker-close { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #ddd; background: #f8f8f8; color: #666; font-size: 14px; font-weight: 600; cursor: pointer; } 
.picker-close:active { background: #eee; } 
/* 昵称修改 */ 
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
/* 弹窗过渡 */ 
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; } 
.fade-enter-from, .fade-leave-to { opacity: 0; } 
</style>
