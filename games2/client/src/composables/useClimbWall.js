import { ref } from 'vue'
import { useAuth } from './useAuth.js'

export function useClimbWall() {
  const { authFetch, updateBalance, updateCrystal } = useAuth()
  
  const levels = ref([])
  const currentLevel = ref(0)
  const loading = ref(false)
  const exchanging = ref(false)

  // 获取活动状态与配置
  async function fetchStatus() {
    loading.value = true
    try {
      const res = await authFetch('/api/climbwall/status')
      const data = await res.json()
      if (res.ok) {
        levels.value = data.config || []
        currentLevel.value = data.currentLevel || 0
        // 同步更新全局资产状态
        updateBalance(data.balance)
        updateCrystal(data.crystal) 
      }
    } catch (e) {
      console.error('[爬墙] 获取状态失败', e.message)
    } finally {
      loading.value = false
    }
  }

  // 执行兑换
  async function exchange() {
    if (exchanging.value) return
    exchanging.value = true
    try {
      const res = await authFetch('/api/climbwall/exchange', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        currentLevel.value = data.data.currentLevel
        updateBalance(data.data.balance)
        updateCrystal(data.data.crystal)
        return { success: true, message: data.message }
      } else {
        return { success: false, message: data.error || '兑换失败' }
      }
    } catch (e) {
      return { success: false, message: e.message || '网络错误' }
    } finally {
      exchanging.value = false
    }
  }

  return { levels, currentLevel, loading, exchanging, fetchStatus, exchange }
}
