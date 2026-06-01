// src/composables/useClimbWall.js
import { ref } from 'vue'
import { request } from './request.js'

export function useClimbWall() {
  const levels = ref([])
  const currentLevel = ref(0)
  const loading = ref(false)
  const exchanging = ref(false)

  // 获取状态
  async function fetchStatus() {
    loading.value = true
    try {
      // 🌟 关键修复：加上 t=${Date.now()}，打破浏览器缓存！
      const res = await request(`/api/climb-wall/status?t=${Date.now()}`)
      const data = await res.json()
      if (res.ok) {
        currentLevel.value = data.currentLevel 
        levels.value = data.config || []       
      }
    } catch (err) {
      console.error('[爬墙状态获取失败]', err)
    } finally {
      loading.value = false
    }
  }

  // 执行兑换
  async function exchange() {
    exchanging.value = true
    try {
      const res = await request('/api/climb-wall/exchange', { method: 'POST' })
      const data = await res.json()
      
      if (res.ok) {
        await fetchStatus() 
        return { success: true, message: '兑换成功' }
      } else {
        return { success: false, message: data.error || '兑换失败' }
      }
    } catch (err) {
      return { success: false, message: '网络请求失败' }
    } finally {
      exchanging.value = false
    }
  }

  return { levels, currentLevel, loading, exchanging, fetchStatus, exchange }
}
