<template>
  <Transition name="fade">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="settings-modal">
        <div class="settings-header">
          <span class="settings-title">⚙️ 设置</span>
          <span class="close-btn" @click="$emit('close')">✕</span>
        </div>

        <div class="settings-body">
          <!-- 清理缓存 -->
          <div class="settings-section">
            <div class="section-title">存储管理</div>
            <div class="setting-item" @click="handleClearCache">
              <div class="item-info">
                <span class="item-icon">🧹</span>
                <span class="item-text">清理本地缓存</span>
              </div>
              <span class="item-arrow">›</span>
            </div>
          </div>

          <!-- 切换账号 -->
          <div class="settings-section">
            <div class="section-title">账号切换 <span class="section-hint">(最多保留3个)</span></div>
            
            <div v-if="historyAccounts.length === 0" class="empty-accounts">
              暂无历史登录记录
            </div>

            <div v-for="(acc, index) in historyAccounts" :key="acc.phone" class="account-item">
              <div class="acc-left" @click="switchAccount(acc)">
                <span class="acc-icon">👤</span>
                <div class="acc-info">
                  <span class="acc-phone">{{ acc.phone }}</span>
                  <span class="acc-role">{{ acc.role === 'admin' ? '管理员' : '用户' }}</span>
                </div>
              </div>
              <div class="acc-right">
                <span v-if="isCurrentAccount(acc)" class="current-tag">当前</span>
                <span v-else class="switch-btn" @click="switchAccount(acc)">切换</span>
                <span class="del-btn" @click="removeAccount(index)">✕</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  show: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])
const router = useRouter()

const historyAccounts = ref([])
const currentPhone = ref('')

onMounted(() => {
  loadAccounts()
})

function loadAccounts() {
  try {
    const currentUserStr = localStorage.getItem('user')
    if (currentUserStr) {
      currentPhone.value = JSON.parse(currentUserStr).phone
    }
    const accountsStr = localStorage.getItem('history_accounts')
    historyAccounts.value = accountsStr ? JSON.parse(accountsStr) : []
  } catch (e) {
    historyAccounts.value = []
  }
}

function isCurrentAccount(acc) {
  return acc.phone === currentPhone.value
}

function handleClearCache() {
  const token = localStorage.getItem('token')
  const user = localStorage.getItem('user')
  const accounts = localStorage.getItem('history_accounts')
  
  // 保留登录信息，清除其他缓存
  localStorage.clear()
  
  if (token) localStorage.setItem('token', token)
  if (user) localStorage.setItem('user', user)
  if (accounts) localStorage.setItem('history_accounts', accounts)

  alert('缓存清理完毕！')
}

function switchAccount(acc) {
  if (isCurrentAccount(acc)) return
  // 简单模拟切换：更新 token 和 user，刷新页面
  localStorage.setItem('token', acc.token)
  localStorage.setItem('user', JSON.stringify(acc.userInfo))
  window.location.reload()
}

function removeAccount(index) {
  historyAccounts.value.splice(index, 1)
  localStorage.setItem('history_accounts', JSON.stringify(historyAccounts.value))
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: flex-end; justify-content: center; z-index: 1000;
}
.settings-modal {
  background: #fff; border-radius: 16px 16px 0 0; width: 100%; max-width: 480px;
  max-height: 80vh; display: flex; flex-direction: column; animation: slideUp 0.3s ease;
}
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

.settings-header {
  display: flex; justify-content: space-between; align-items: center; padding: 18px 20px;
  border-bottom: 1px solid #f0f0f0;
}
.settings-title { font-size: 18px; font-weight: 700; color: #333; }
.close-btn { font-size: 20px; color: #999; cursor: pointer; padding: 0 4px; }

.settings-body { flex: 1; overflow-y: auto; padding: 16px 20px; }

.settings-section { margin-bottom: 24px; }
.section-title { font-size: 14px; color: #888; margin-bottom: 10px; }
.section-hint { font-size: 12px; color: #bbb; }

.setting-item {
  display: flex; justify-content: space-between; align-items: center; padding: 16px;
  background: rgba(255, 248, 220, 0.75); border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 12px; cursor: pointer;
}
.setting-item:active { background: rgba(212, 175, 55, 0.1); }
.item-info { display: flex; align-items: center; gap: 10px; }
.item-icon { font-size: 20px; }
.item-text { font-size: 15px; color: #333; font-weight: 500; }
.item-arrow { color: #ccc; font-size: 18px; }

.empty-accounts { text-align: center; padding: 20px 0; color: #999; font-size: 14px; }

.account-item {
  display: flex; justify-content: space-between; align-items: center; padding: 14px 16px;
  background: #fafafa; border-radius: 10px; margin-bottom: 10px;
}
.acc-left { display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; }
.acc-icon { font-size: 24px; background: rgba(212, 175, 55, 0.15); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
.acc-info { display: flex; flex-direction: column; }
.acc-phone { font-size: 14px; font-weight: 600; color: #333; }
.acc-role { font-size: 11px; color: #888; margin-top: 2px; }

.acc-right { display: flex; align-items: center; gap: 10px; }
.current-tag { font-size: 11px; color: #1bb069; background: rgba(27, 176, 105, 0.1); padding: 4px 10px; border-radius: 20px; font-weight: 600; }
.switch-btn { font-size: 12px; color: #d4af37; border: 1px solid rgba(212, 175, 55, 0.4); padding: 4px 12px; border-radius: 20px; cursor: pointer; }
.switch-btn:active { background: rgba(212, 175, 55, 0.1); }
.del-btn { color: #ccc; font-size: 14px; cursor: pointer; margin-left: 4px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
