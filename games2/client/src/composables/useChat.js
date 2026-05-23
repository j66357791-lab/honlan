/**
 * 客服系统 - 组合函数 v3
 * [v3] 纯推送架构：消息存localStorage，会话列表WebSocket推送
 * - 不再轮询 /api/chat/sessions
 * - 不再拉取 /api/chat/history
 * - 消息持久化在浏览器 localStorage
 */
import { ref } from 'vue'
import { useAuth } from './useAuth.js'

// 全局单例
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
const sessionList = ref([]) // ★ 管理员会话列表（WebSocket推送，不再轮询）

// ========== ★ localStorage 消息存储 ==========
const STORAGE_PREFIX = 'chat_msg_'
const STORAGE_CURRENT_SESSION = 'chat_current_session'
const STORAGE_SESSION_LIST = 'chat_session_list'

function saveMessagesToLocal(sessionId, msgs) {
  if (!sessionId) return
  try {
    const key = STORAGE_PREFIX + sessionId
    const toSave = msgs.slice(-500) // 最多保留500条
    localStorage.setItem(key, JSON.stringify(toSave))
  } catch {}
}

function loadMessagesFromLocal(sessionId) {
  if (!sessionId) return []
  try {
    const key = STORAGE_PREFIX + sessionId
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

function saveCurrentSession(sessionId) {
  try { localStorage.setItem(STORAGE_CURRENT_SESSION, sessionId || '') } catch {}
}

function loadCurrentSession() {
  try { return localStorage.getItem(STORAGE_CURRENT_SESSION) || null } catch { return null }
}

function saveSessionListToLocal(list) {
  try { localStorage.setItem(STORAGE_SESSION_LIST, JSON.stringify(list)) } catch {}
}

function loadSessionListFromLocal() {
  try {
    const data = localStorage.getItem(STORAGE_SESSION_LIST)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

// ========== 消息提醒音效 ==========
let notificationAudio = null
function playNotificationSound(sender) {
  try {
    const role = localStorage.getItem('userRole')
    if (role === 'admin' && sender !== 'user') return
    if (role !== 'admin' && sender !== 'admin' && sender !== 'bot') return
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

      // ★ 从localStorage恢复上次会话
      const savedSession = loadCurrentSession()
      if (savedSession && isValidId(savedSession)) {
        currentSessionId.value = savedSession
        messages.value = loadMessagesFromLocal(savedSession)
      }

      // ★ 管理员从localStorage恢复会话列表（WebSocket推送会随后更新）
      const role = localStorage.getItem('userRole')
      if (role === 'admin') {
        sessionList.value = loadSessionListFromLocal()
      }
    }

    wsInstance.onmessage = (event) => {
      let data
      try { data = JSON.parse(event.data) } catch { return }
      const role = localStorage.getItem('userRole')

      switch (data.type) {
        case 'chat_message':
        case 'chat_message_sent':
          if (data.message) {
            const msgSessionId = data.message.sessionId

            // 用户端：自动关联到当前会话
            if (role !== 'admin' && msgSessionId && msgSessionId !== 'undefined') {
              if (!currentSessionId.value) {
                currentSessionId.value = msgSessionId
                saveCurrentSession(msgSessionId)
              }
            }

            // ★ 管理员：非当前会话的消息，只存localStorage不显示
            if (role === 'admin' && currentSessionId.value && msgSessionId !== currentSessionId.value) {
              const otherMsgs = loadMessagesFromLocal(msgSessionId)
              const exists = otherMsgs.find(m => m.id === data.message.id)
              if (!exists) {
                otherMsgs.push(data.message)
                saveMessagesToLocal(msgSessionId, otherMsgs)
              }
              if (data.type === 'chat_message') {
                unreadCount.value += 1
                playNotificationSound(data.message.sender)
              }
              return
            }

            // 当前会话消息
            const exists = messages.value.find(m => m.id === data.message.id)
            if (!exists) {
              messages.value.push(data.message)
              // ★ 保存到localStorage
              if (msgSessionId) saveMessagesToLocal(msgSessionId, messages.value)
            }

            // 收到对方消息：红点+1 + 提示音
            if (data.type === 'chat_message') {
              const sender = data.message.sender
              if ((role === 'admin' && sender === 'user') ||
                  (role !== 'admin' && (sender === 'admin' || sender === 'bot'))) {
                unreadCount.value += 1
                playNotificationSound(sender)
              }
            }
          }
          break

        // ★ 管理员收到完整会话列表（WebSocket推送，替代轮询）
        case 'sessions_list':
          if (role === 'admin' && data.sessions) {
            sessionList.value = data.sessions
            saveSessionListToLocal(data.sessions)
          }
          break

        case 'session_new':
          if (role === 'admin') {
            unreadCount.value += 1
            playNotificationSound('user')
          }
          break

        // ★ 用户收到自己的会话信息
        case 'user_session':
          if (role !== 'admin' && data.session) {
            currentSessionId.value = data.session.id
            sessionStatus.value = data.session.status
            adminName.value = data.session.adminName || ''
            saveCurrentSession(data.session.id)
            messages.value = loadMessagesFromLocal(data.session.id)
          }
          break

        case 'session_accepted':
          sessionStatus.value = 'active'
          adminName.value = data.adminName || ''
          if (data.sessionId) {
            currentSessionId.value = data.sessionId
            saveCurrentSession(data.sessionId)
          }
          messages.value.push({
            id: Date.now(), sender: 'system',
            content: `客服 ${data.adminName} 已为您服务`,
            contentType: 'system', createdAt: new Date().toISOString()
          })
          if (currentSessionId.value) saveMessagesToLocal(currentSessionId.value, messages.value)
          break

        case 'session_closed':
          sessionStatus.value = 'closed'
          messages.value.push({
            id: Date.now(), sender: 'system',
            content: '会话已结束',
            contentType: 'system', createdAt: new Date().toISOString()
          })
          if (currentSessionId.value) saveMessagesToLocal(currentSessionId.value, messages.value)
          break

        case 'system':
          messages.value.push({
            id: Date.now(), sender: 'system',
            content: data.message,
            contentType: 'system', createdAt: new Date().toISOString()
          })
          if (currentSessionId.value) saveMessagesToLocal(currentSessionId.value, messages.value)
          break

        case 'unread_count':
          unreadCount.value = data.count || 0
          break

        case 'chat_read_ok':
          if (role !== 'admin') unreadCount.value = 0
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
    const msg = { type: 'chat_send', content: content.trim(), contentType }
    if (sessionId) msg.sessionId = sessionId
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
    // 清除当前会话的本地消息
    if (currentSessionId.value) {
      localStorage.removeItem(STORAGE_PREFIX + currentSessionId.value)
    }
    messages.value = []
    sessionStatus.value = null
    adminName.value = ''
    currentSessionId.value = null
    saveCurrentSession(null)
  }

  // ========== 清除红点 ==========
  function clearUnread() {
    unreadCount.value = 0
  }

  // ========== ★ 管理员：切换会话（从localStorage加载） ==========
  function switchSession(sessionId) {
    if (!sessionId) return
    currentSessionId.value = sessionId
    saveCurrentSession(sessionId)
    messages.value = loadMessagesFromLocal(sessionId)
    markRead(sessionId)
  }

  // ========== 管理员：获取会话列表（从响应式变量，不再网络请求） ==========
  function fetchSessions() {
    return sessionList.value
  }

  return {
    connected,
    messages,
    unreadCount,
    sessionStatus,
    adminName,
    currentSessionId,
    sessionList,     // ★ 新增：管理员会话列表
    connect,
    disconnect,
    sendMessage,
    markRead,
    acceptSession,
    closeSession,
    fetchSessions,
    resetSession,
    clearUnread,
    switchSession    // ★ 新增：切换会话
  }
}
