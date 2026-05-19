<template>
  <Transition name="slide-right">
    <div class="chat-fullscreen">
      <!-- 顶部栏 -->
      <div class="chat-topbar">
        <button class="chat-back" @click="$emit('close')">←</button>
        <div class="chat-topbar-center">
          <span class="chat-title">在线客服</span>
          <span class="chat-status" :class="statusClass">{{ statusText }}</span>
        </div>
        <div style="width:44px"></div>
      </div>

      <!-- 快捷问题（无消息且未关闭时展示） -->
      <div v-if="messages.length === 0 && sessionStatus !== 'closed'" class="quick-area">
        <div class="quick-greeting">👋 您好，请问有什么可以帮您？</div>
        <div class="quick-list">
          <button class="quick-btn" @click="sendQuick('充值')">💰 充值问题</button>
          <button class="quick-btn" @click="sendQuick('规则')">🎮 游戏规则</button>
          <button class="quick-btn" @click="sendQuick('提现')">💸 提现问题</button>
          <button class="quick-btn" @click="sendQuick('账号')">🔒 账号问题</button>
          <button class="quick-btn" @click="sendQuick('转人工')">👩‍💼 转人工客服</button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div v-else class="chat-body" ref="chatBodyEl">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="msg-row"
          :class="{
            'msg-self': msg.sender === 'user',
            'msg-other': msg.sender === 'admin' || msg.sender === 'bot',
            'msg-system': msg.sender === 'system'
          }"
        >
          <!-- 系统消息 -->
          <div v-if="msg.sender === 'system'" class="sys-msg">{{ msg.content }}</div>

          <!-- 客服/bot消息（左侧） -->
          <template v-else-if="msg.sender === 'admin' || msg.sender === 'bot'">
            <div class="avatar" :class="msg.sender === 'bot' ? 'bot-av' : 'admin-av'">
              {{ msg.sender === 'bot' ? '🤖' : '🧑‍💼' }}
            </div>
            <div class="bubble-wrap">
              <div class="sender-label">{{ msg.senderName || (msg.sender === 'bot' ? '智能助手' : '客服') }}</div>
              <div class="bubble" :class="msg.sender === 'bot' ? 'bot-bubble' : 'other-bubble'">{{ msg.content }}</div>
              <div class="bubble-time">{{ formatTime(msg.createdAt) }}</div>
            </div>
          </template>

          <!-- 自己消息（右侧） -->
          <template v-else>
            <div class="bubble-wrap">
              <div class="bubble self-bubble">{{ msg.content }}</div>
              <div class="bubble-time right">{{ formatTime(msg.createdAt) }}</div>
            </div>
            <div class="avatar self-av">😊</div>
          </template>
        </div>

        <!-- 排队动画 -->
        <div v-if="sessionStatus === 'waiting' && !hasBotTalking" class="waiting-hint">
          <div class="dots"><span></span><span></span><span></span></div>
          <span>人工客服正在赶来...</span>
        </div>

        <!-- 会话已结束 + 重新咨询 -->
        <div v-if="sessionStatus === 'closed'" class="closed-area">
          <div class="closed-text">— 会话已结束 —</div>
          <button class="reconsult-btn" @click="reConsult">🔄 重新咨询</button>
        </div>
      </div>

      <!-- 底部输入栏 -->
      <div class="chat-input-bar" v-if="sessionStatus !== 'closed'">
        <input
          v-model="inputText"
          @keydown.enter="send"
          placeholder="输入消息或关键词..."
          :disabled="!connected"
        />
        <button class="send-btn" @click="send" :disabled="!inputText.trim() || !connected">发送</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useChat } from '../composables/useChat.js'

defineEmits(['close'])

const {
  connected, messages, sessionStatus, currentSessionId,
  connect: connectChat, sendMessage, markRead, resetSession
} = useChat()

const inputText = ref('')
const chatBodyEl = ref(null)

const statusClass = computed(() => {
  if (sessionStatus.value === 'active') return 'active'
  if (sessionStatus.value === 'waiting') return 'waiting'
  if (sessionStatus.value === 'closed') return 'closed'
  return 'offline'
})

const statusText = computed(() => {
  if (sessionStatus.value === 'active') return '客服服务中'
  if (sessionStatus.value === 'waiting') return '排队中'
  if (sessionStatus.value === 'closed') return '已结束'
  return '在线'
})

// 判断最近是否有bot在回复（避免排队动画和bot冲突）
const hasBotTalking = computed(() => {
  const last = messages.value[messages.value.length - 1]
  return last && last.sender === 'bot'
})

function send() {
  const text = inputText.value.trim()
  if (!text) return
  sendMessage(text)
  inputText.value = ''
}

function sendQuick(text) {
  sendMessage(text)
}

function reConsult() {
  resetSession()
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

watch(messages, () => {
  nextTick(() => {
    if (chatBodyEl.value) chatBodyEl.value.scrollTop = chatBodyEl.value.scrollHeight
  })
}, { deep: true })

onMounted(() => {
  connectChat()
  if (currentSessionId.value) markRead(currentSessionId.value)
})
</script>

<style scoped>
.chat-fullscreen {
  position: fixed; inset: 0; background: #f5f5f5;
  z-index: 200; display: flex; flex-direction: column;
}

/* 顶部栏 */
.chat-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 12px; background: #fff;
  border-bottom: 1px solid #e8e8e8; flex-shrink: 0;
}
.chat-back {
  width: 44px; height: 44px; border-radius: 50%;
  border: none; background: transparent; color: #333;
  font-size: 22px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.chat-back:active { background: rgba(0,0,0,0.05); }
.chat-topbar-center { display: flex; flex-direction: column; align-items: center; }
.chat-title { font-size: 17px; font-weight: 700; color: #333; }
.chat-status { font-size: 11px; margin-top: 1px; }
.chat-status.active { color: #1bb069; }
.chat-status.waiting { color: #f39c12; }
.chat-status.closed { color: #999; }
.chat-status.offline { color: #bbb; }

/* 快捷问题 */
.quick-area {
  flex: 1; padding: 30px 20px;
  display: flex; flex-direction: column; align-items: center;
}
.quick-greeting { font-size: 16px; color: #333; margin-bottom: 28px; text-align: center; }
.quick-list {
  width: 100%; max-width: 320px;
  display: flex; flex-direction: column; gap: 10px;
}
.quick-btn {
  width: 100%; padding: 14px 16px; border-radius: 12px;
  border: 1px solid #e0e0e0; background: #fff;
  color: #333; font-size: 15px; cursor: pointer;
  text-align: left; transition: background 0.15s;
}
.quick-btn:active { background: #f0f0f0; }

/* 消息列表 */
.chat-body {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.msg-row { display: flex; align-items: flex-start; gap: 8px; }
.msg-row.msg-self { flex-direction: row-reverse; }
.msg-row.msg-system { justify-content: center; }

/* 头像 */
.avatar {
  width: 36px; height: 36px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.admin-av { background: #e8f5e9; }
.bot-av { background: #e3f2fd; }
.self-av { background: #fff3e0; }

/* 气泡 */
.bubble-wrap { max-width: 70%; }
.sender-label {
  font-size: 11px; color: #999; margin-bottom: 3px; padding-left: 2px;
}
.bubble {
  padding: 10px 14px; border-radius: 8px;
  font-size: 14px; line-height: 1.6; word-break: break-word;
  white-space: pre-line;
}
.other-bubble {
  background: #fff; color: #333;
  border-top-left-radius: 2px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.bot-bubble {
  background: #e8f0fe; color: #333;
  border-top-left-radius: 2px;
}
.self-bubble {
  background: #1bb069; color: #fff;
  border-top-right-radius: 2px;
}
.bubble-time { font-size: 10px; color: #bbb; margin-top: 3px; padding: 0 4px; }
.bubble-time.right { text-align: right; }

/* 系统消息 */
.sys-msg {
  font-size: 12px; color: #999;
  padding: 4px 14px; background: rgba(0,0,0,0.03);
  border-radius: 12px;
}

/* 排队动画 */
.waiting-hint {
  display: flex; align-items: center; gap: 8px;
  justify-content: center; color: #999; font-size: 13px; padding: 8px 0;
}
.dots { display: flex; gap: 4px; }
.dots span {
  width: 5px; height: 5px; border-radius: 50%;
  background: #bbb; animation: dotBounce 1.4s infinite both;
}
.dots span:nth-child(1) { animation-delay: 0s; }
.dots span:nth-child(2) { animation-delay: 0.2s; }
.dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* 会话结束 + 重新咨询 */
.closed-area {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 20px 0;
}
.closed-text { font-size: 12px; color: #bbb; }
.reconsult-btn {
  padding: 10px 32px; border-radius: 22px;
  border: 1px solid #1bb069; background: #fff;
  color: #1bb069; font-size: 14px; font-weight: 600;
  cursor: pointer;
}
.reconsult-btn:active { background: #f0faf5; }

/* 输入栏 */
.chat-input-bar {
  display: flex; gap: 8px; padding: 10px 12px;
  background: #fff; border-top: 1px solid #e8e8e8; flex-shrink: 0;
}
.chat-input-bar input {
  flex: 1; background: #f5f5f5; border: 1px solid #e0e0e0;
  border-radius: 20px; padding: 10px 16px;
  color: #333; font-size: 14px; outline: none;
}
.chat-input-bar input:focus { border-color: #1bb069; }
.chat-input-bar input::placeholder { color: #bbb; }
.send-btn {
  padding: 0 22px; border-radius: 20px; border: none;
  background: #1bb069; color: #fff; font-size: 14px;
  font-weight: 600; cursor: pointer;
}
.send-btn:active:not(:disabled) { background: #17a05c; }
.send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* 过渡 */
.slide-right-enter-active,
.slide-right-leave-active { transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1); }
.slide-right-enter-from { transform: translateX(100%); }
.slide-right-leave-to { transform: translateX(100%); }

.chat-body::-webkit-scrollbar { width: 3px; }
.chat-body::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
</style>
