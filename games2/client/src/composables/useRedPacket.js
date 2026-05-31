import { ref, computed } from 'vue'
import { useAuth } from './useAuth' // ★ 引入你现有的 useAuth

// 红包状态
const status = ref(null)
const isLoading = ref(false)

export function useRedPacket() {
  // ★ 使用你项目统一的 authFetch，自动带 token 和处理登出
  const { authFetch } = useAuth()

  // 获取红包状态
  const fetchStatus = async () => {
    try {
      const res = await authFetch('/api/redpacket/status')
      const data = await res.json()
      if (res.ok) {
        status.value = data
      } else {
        console.error('[红包] 获取状态失败:', data.error)
      }
    } catch (err) {
      console.error('[红包] 获取状态网络错误:', err)
    }
  }

  // 抽取红包
  const claimReward = async (level) => {
    if (isLoading.value) return
    isLoading.value = true
    try {
      const res = await authFetch('/api/redpacket/claim', {
        method: 'POST',
        body: JSON.stringify({ level })
      })
      const data = await res.json()
      
      if (res.ok) {
        // 抽取成功后，立刻刷新红包状态
        await fetchStatus()
        return data // 返回给组件播动画
      } else {
        throw new Error(data.error || '领取失败')
      }
    } catch (err) {
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 计算悬浮球进度环的比例 (0-100)
  const progressPercent = computed(() => {
    if (!status.value || !status.value.configs) return 0
    const turnover = status.value.currentTurnover
    
    // 找到第一个未领取且未达标的档位作为进度环目标
    const target = status.value.configs.find(c => c.status !== 'claimed')
    
    if (!target) return 100 // 全部领完了
    if (turnover >= target.requiredTurnover) return 99 // 达标了但还没领，显示99提示去领
    
    const percent = (turnover / target.requiredTurnover) * 100
    return Math.min(Math.floor(percent), 100)
  })

  // 是否有可领取的红包 (控制红点)
  const hasAvailable = computed(() => {
    return status.value?.configs?.some(c => c.status === 'available') || false
  })

  return {
    status,
    isLoading,
    progressPercent,
    hasAvailable,
    fetchStatus,
    claimReward
  }
}
