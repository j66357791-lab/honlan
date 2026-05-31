// src/composables/useMembership.js
import { ref } from 'vue'
import { request } from './request.js'
import { useAuth } from './useAuth.js'

export function useMembership() {
  const type = ref('none') // 'none', 'normal', 'super'
  const expireAt = ref(null)
  const canClaim = ref(false)
  const loading = ref(false)
  const activating = ref(false)
  const claiming = ref(false)

  // 获取月卡状态
  async function fetchStatus() {
    loading.value = true
    try {
      const res = await request('/api/membership/status?t=' + Date.now())
      const data = await res.json()
      if (res.ok) {
        type.value = data.type
        expireAt.value = data.expireAt
        canClaim.value = data.canClaim
      }
    } catch (err) {
      console.error('[月卡状态获取失败]', err)
    } finally {
      loading.value = false
    }
  }

  // 激活月卡
  async function activate(code) {
    activating.value = true
    try {
      const res = await request('/api/membership/activate', {
        method: 'POST',
        body: JSON.stringify({ code })
      })
      const data = await res.json()
      if (res.ok) {
        alert(`激活成功！已开通${data.type === 'super' ? '超级' : '普通'}月卡`)
        await fetchStatus() // 刷新月卡状态
        return { success: true }
      } else {
        throw new Error(data.error || '激活失败')
      }
    } catch (err) {
      alert(err.message || '激活失败')
      return { success: false }
    } finally {
      activating.value = false
    }
  }

  // 领取每日奖励
  async function claim() {
    claiming.value = true
    try {
      const res = await request('/api/membership/claim', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        // ★ 关键：领取成功后，联动更新全局余额
        const { updateBalance } = useAuth()
        updateBalance(data.newBalance)
        
        canClaim.value = false // 今天已领
        return { success: true, reward: data.reward }
      } else {
        throw new Error(data.error || '领取失败')
      }
    } catch (err) {
      alert(err.message || '领取失败')
      return { success: false }
    } finally {
      claiming.value = false
    }
  }

  return {
    type, expireAt, canClaim, loading, activating, claiming,
    fetchStatus, activate, claim
  }
}
