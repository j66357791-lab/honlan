// client/src/composables/useChat.js
import { ref } from 'vue'
import { useAuth } from './useAuth.js'
import { API_BASE } from '../config.js'

// 全局单例：多个组件共享同一个连接
let wsInstance = null
let reconnectTimer = null
let reconnectAttempts = 0
const MAX_RECONNECT = 5
const RECONNECT_DELAY = 3000

// 全局响应式状态
const connected = ref(false)
const messages = ref([])
const unreadCount = ref(0)
const sessionStatus = ref(null)
const adminName = ref('')
const currentSessionId = ref(null)

// ========== 消息提醒音效 ==========
let notificationAudio = null

function playNotificationSound(sender) {
  try {
    const role = localStorage.getItem('userRole')
    // 只播放对方消息的提醒，不播放自己的
    if (role === 'admin' && sender !== 'user') return
    if (role !== 'admin' && sender !== 'admin') return

    if (!notificationAudio) {
      notificationAudio = new Audio('/assets/sounds/sfx/click.mp3')
      notificationAudio.volume = 0.6
    }
    notificationAudio.currentTime = 0
    notificationAudio.play().catch(() => {})
  } catch {}
}

export function useChat() {
  const { token, isLoggedIn } = useAuth()

  function isValidId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id)
  }

  // ========== 连接与鉴权 ==========

  function getWsUrl() {
    const savedToken = localStorage.getItem('token') || token.value
    if (!savedToken) return null

    if (import.meta.env.PROD) {
      return `wss://honlan.zeabur.app/ws?token=${savedToken}`
    }
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    return `${protocol}://${location.host}/ws?token=${savedToken}`
  }

  function connect() {
    if (wsInstance) {
      const state = wsInstance.readyState
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return
    }
    if (!isLoggedIn.value) return

    const url = getWsUrl()
    if (!url) return

    console.log('[Chat] 正在连接 WebSocket...')
    wsInstance = new WebSocket(url)

    wsInstance.onopen = () => {
      connected.value = true
      reconnectAttempts = 0
      console.log('[Chat] WebSocket 已连接')
      loadHistory()
    }

    wsInstance.onmessage = (event) => {
      let data
      try { data = JSON.parse(event.data) } catch { return }

      switch (data.type) {
        case 'chat_message':
        case 'chat_message_sent':
          if (data.message) {
            const exists = messages.value.find(m => m.id === data.message.id)
            if (!exists) {
              messages.value.push(data.message)
              // 🔔 消息提醒音效（仅对方消息）
              if (data.type === 'chat_message') {
                playNotificationSound(data.message.sender)
              }
            }
            if (data.message.sessionId && data.message.sessionId !== 'undefined') {
              currentSessionId.value = data.message.sessionId
            }
          }
          break

        case 'session_accepted':
          sessionStatus.value = 'active'
          adminName.value = data.adminName || ''
          if (data.sessionId) currentSessionId.value = data.sessionId
          messages.value.push({
            id: Date.now(), sender: 'system',
            content: `客服 ${data.adminName} 已为您服务`,
            contentType: 'system', createdAt: new Date().toISOString()
          })
          break

        case 'session_closed':
          sessionStatus.value = 'closed'
          messages.value.push({
            id: Date.now(), sender: 'system',
            content: '会话已结束', contentType: 'system',
            createdAt: new Date().toISOString()
          })
          break

        case 'system':
          messages.value.push({
            id: Date.now(), sender: 'system',
            content: data.message, contentType: 'system',
            createdAt: new Date().toISOString()
          })
          break

        case 'unread_count':
          unreadCount.value = data.count || 0
          break

        case 'chat_read_ok':
          break

        case 'error':
          console.error('[Chat] 服务端错误:', data.message)
          break
      }
    }

    wsInstance.onclose = () => {
      connected.value = false
      if (reconnectAttempts < MAX_RECONNECT && isLoggedIn.value) {
        reconnectAttempts++
        console.log(`[Chat] ${RECONNECT_DELAY / 1000}s 后尝试第 ${reconnectAttempts} 次重连...`)
        reconnectTimer = setTimeout(() => connect(), RECONNECT_DELAY)
      }
    }

    wsInstance.onerror = () => {
      console.error('[Chat] 连接错误')
    }
  }

  function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (wsInstance) { wsInstance.close(); wsInstance = null }
    connected.value = false
    reconnectAttempts = MAX_RECONNECT
  }

  // ========== 发送消息 ==========

  function sendMessage(content, contentType = 'text', sessionId = null) {
    if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) return false
    if (!content || !content.trim()) return false

    const msg = {
      type: 'chat_send',
      content: content.trim(),
      contentType
    }

    if (sessionId) {
      msg.sessionId = sessionId
    }

    wsInstance.send(JSON.stringify(msg))
    return true
  }

  // ========== 标记已读 ==========

  function markRead(sessionId) {
    if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) return
    if (!sessionId || sessionId === 'undefined' || sessionId === 'null') return
    wsInstance.send(JSON.stringify({ type: 'chat_read', sessionId }))
  }

  // ========== 客服接入/关闭会话 ==========

  function acceptSession(sessionId) {
    if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) return
    if (!sessionId || sessionId === 'undefined' || !isValidId(sessionId)) return
    wsInstance.send(JSON.stringify({ type: 'session_accept', sessionId }))
  }

  function closeSession(sessionId) {
    if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) return
    if (!sessionId || sessionId === 'undefined' || !isValidId(sessionId)) return
    wsInstance.send(JSON.stringify({ type: 'session_close', sessionId }))
  }

  // ========== 重新咨询 ==========

  function resetSession() {
    messages.value = []
    sessionStatus.value = null
    adminName.value = ''
    currentSessionId.value = null
  }

  // ========== 加载历史消息 ==========

  async function loadHistory(sessionId) {
    if (!isLoggedIn.value) return
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
      let url = `${API_BASE}/api/chat/history`
      if (sessionId && sessionId !== 'undefined' && isValidId(sessionId)) {
        url += `?sessionId=${sessionId}`
      }
      const res = await fetch(url, { headers })
      const data = await res.json()
      if (res.ok && data.messages) {
        messages.value = data.messages
      }
      if (res.ok && data.session) {
        sessionStatus.value = data.session.status
        adminName.value = data.session.adminName || ''
        const sid = data.session.id
        currentSessionId.value = (sid && sid !== 'undefined') ? sid : null
      }
    } catch (err) {
      console.error('[Chat] 加载历史失败:', err)
    }
  }

  // ========== 获取会话列表 ==========

  async function fetchSessions() {
    if (!isLoggedIn.value) return []
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
      const res = await fetch(`${API_BASE}/api/chat/sessions`, { headers })
      const data = await res.json()
      if (res.ok && data.sessions) {
        return data.sessions.map(s => ({
          ...s,
          id: s.id || String(s._id)
        }))
      }
      return []
    } catch (err) {
      console.error('[Chat] 获取会话列表失败:', err)
      return []
    }
  }

  return {
    connected, messages, unreadCount, sessionStatus, adminName, currentSessionId,
    connect, disconnect, sendMessage, markRead, loadHistory,
    acceptSession, closeSession, fetchSessions, resetSession
  }
}
