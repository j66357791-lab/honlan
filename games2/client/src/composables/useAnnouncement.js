import { ref, computed } from 'vue'
import { useAuth } from './useAuth.js'

// 公告存储 key 前缀
const STORAGE_PREFIX = 'anno_dismissed_'

export function useAnnouncement() {
  const { authFetch } = useAuth()

  const announcements = ref([])
  const loading = ref(false)

  // 获取今日应显示的公告（未被"今日不再提示"）
  const activeAnnouncement = computed(() => {
    return announcements.value.find((a) => {
      if (a.status !== 'active') return false
      return !isDismissedToday(a._id)  // ← a.id 改成 a._id
    })
  })

  /**
   * 从后端拉取公告列表
   */
  async function fetchAnnouncements() {
    loading.value = true
    try {
      const res = await authFetch('/api/announcements')
      const data = await res.json()
      if (res.ok) {
        announcements.value = data.data || []
      } else {
        console.warn('[公告] 接口返回错误:', data.error)
        announcements.value = getDefaultAnnouncements()
      }
    } catch (e) {
      console.warn('[公告] 获取失败，使用本地默认公告', e)
      announcements.value = getDefaultAnnouncements()
    } finally {
      loading.value = false
    }
    return announcements.value
  }

  /** 判断某条公告今天是否已关闭 */
  function isDismissedToday(id) {
    const key = STORAGE_PREFIX + id
    const dismissedDate = localStorage.getItem(key)
    if (!dismissedDate) return false
    return dismissedDate === getTodayStr()
  }

  /** 标记某条公告今日不再显示 */
  function dismissToday(id) {
    const key = STORAGE_PREFIX + id
    localStorage.setItem(key, getTodayStr())
  }

  function getTodayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
  }

  /** 默认公告（接口不可用时的回退） */
  function getDefaultAnnouncements() {
    return [
      {
        _id: 'default_1',  // ← id 改成 _id
        title: '🎉 欢迎来到大满贯',
        content: '<p>全新版本已上线！</p>' +
          '<p>🏇 <strong>巨人赛跑</strong> — 红蓝对决，激情开跑</p>' +
          '<p>🎲 <strong>点兵点将</strong> — 策略与运气的碰撞</p>' +
          '<p>🧩 <strong>自动消消乐</strong> — 全新上线，快来体验</p>' +
          '<p>更多精彩活动请关注<strong>活动中心</strong>！</p>',
        status: 'active',
        linkAction: 'activity',
        linkText: '前往活动中心'
      }
    ]
  }

  return {
    announcements,
    loading,
    activeAnnouncement,
    fetchAnnouncements,
    dismissToday
  }
}
