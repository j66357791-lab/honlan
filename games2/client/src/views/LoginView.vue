<template>
  <Suspense>
    <template #default>
      <div class="login-page">
        <div class="login-bg" style="background-image: url('/assets/images/bg_login.png')"></div>
        <div class="login-container">
          <div class="logo-area">
            <!-- 移除logo图片，只保留文字 -->
            <h1 class="app-title">大满贯</h1>
            <p class="app-subtitle">如你想玩，满贯到手</p>
          </div>
          <div class="form-card">
            <div class="tab-bar">
              <div class="tab-item" :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</div>
              <div class="tab-item" :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</div>
            </div>
            <form @submit.prevent="handleSubmit" class="login-form">
              <div class="input-group">
                <label class="input-label">手机号</label>
                <input v-model="phone" type="tel" class="input-field" placeholder="请输入手机号" maxlength="11" autocomplete="tel" />
              </div>
              <div class="input-group">
                <label class="input-label">密码</label>
                <input v-model="password" type="password" class="input-field" placeholder="请输入密码（至少6位）" autocomplete="current-password" />
              </div>
              <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
              <button type="submit" class="btn btn-gold submit-btn" :disabled="loading">
                {{ loading ? '请稍候...' : (mode === 'login' ? '登 录' : '注 册') }}
              </button>
            </form>
            <div class="login-hint">
              {{ mode === 'login' ? '没有账号？' : '已有账号？' }}
              <span class="link" @click="mode = mode === 'login' ? 'register' : 'login'">
                {{ mode === 'login' ? '去注册' : '去登录' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #fallback>
      <SkeletonLogin />
    </template>
  </Suspense>
</template>

<script setup>
import { ref, onMounted } from 'vue'  // ✅ 记得加上 onMounted
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import SkeletonLogin from '../components/SkeletonLogin.vue' // 引入登录骨架屏组件

const router = useRouter()
const { login, register } = useAuth()

const mode = ref('login')
const phone = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  errorMsg.value = ''
  if (!phone.value || !/^1[3-9]\d{9}$/.test(phone.value)) {
    errorMsg.value = '请输入正确的手机号'; return
  }
  if (!password.value || password.value.length < 6) {
    errorMsg.value = '密码至少6位'; return
  }
  loading.value = true
  try {
    const fn = mode.value === 'login' ? login : register
    const data = await fn(phone.value, password.value)
    // 根据角色跳转
    if (data.user.role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/')
    }
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}

// 预加载登录背景图
onMounted(() => {
  const bgImage = new Image()
  bgImage.src = '/assets/images/bg_login.png'
})
</script>

<style scoped>
.login-page { 
  min-height:100vh; 
  position:relative; 
  display:flex; 
  align-items:center; 
  justify-content:center; 
  overflow:hidden;
}

/* 背景图样式优化 */
.login-bg { 
  position:absolute; 
  inset:0; 
  background-image: url('/assets/images/bg_login.png'); 
  background-size: 150%; 
  background-position: center; 
  opacity:0.8; 
  filter: brightness(0.95); /* 稍微调暗背景，让前景更突出 */
}

/* 登录容器动画 */
.login-container { 
  position:relative; 
  z-index:1; 
  width:100%; 
  padding:24px; 
  animation: fadeIn 1.2s ease-out;
}

/* 标题动画 */
.logo-area { 
  text-align:center; 
  margin-bottom:32px; 
  animation: titleBounce 1.5s ease-out;
}

/* 标题文字动画 */
.app-title {
  font-size:28px; 
  font-weight:900; 
  color:var(--color-gold); 
  text-shadow:0 0 20px var(--color-gold-glow); 
  display: flex;
  justify-content: center;
  gap: 10px;
}

/* 每个字的动画 */
.app-title span {
  display: inline-block;
  animation: letterShake 0.6s ease-out forwards;
  opacity: 0;
  transform: translateY(20px);
}

/* 第一个字 */
.app-title span:nth-child(1) {
  animation-delay: 0.2s;
}

/* 第二个字 */
.app-title span:nth-child(2) {
  animation-delay: 0.4s;
}

/* 第三个字 */
.app-title span:nth-child(3) {
  animation-delay: 0.6s;
}

.app-subtitle { 
  font-size:14px; 
  color:var(--color-text-dim); 
  margin-top:4px; 
  animation: fadeIn 1.8s ease-out;
}

/* 登录框样式优化 */
.form-card { 
  background:rgba(255,255,255,0.15); /* 更透明，更贴合背景 */
  backdrop-filter: blur(10px); /* 毛玻璃效果 */
  border-radius:16px; 
  padding:24px; 
  border:1px solid rgba(255,255,255,0.1);
  box-shadow: 0 8px 32px rgba(0,0,0,0.1); /* 柔和阴影 */
  animation: slideUp 1s ease-out;
}

.tab-bar { 
  display:flex; 
  gap:4px; 
  background:rgba(255,255,255,0.05); 
  border-radius:10px; 
  padding:3px; 
  margin-bottom:20px;
  animation: fadeIn 1.2s ease-out;
}

.tab-item { 
  flex:1; 
  text-align:center; 
  padding:10px; 
  font-size:15px; 
  font-weight:600; 
  border-radius:8px; 
  cursor:pointer; 
  transition:all 0.2s; 
  color:var(--color-text-dim);
}

.tab-item.active { 
  background:linear-gradient(135deg,#ff6b35,#ff3b3b); 
  color:white; 
  box-shadow:0 2px 10px rgba(255,59,59,0.4);
}

.login-form { 
  display:flex; 
  flex-direction:column; 
  gap:16px;
  animation: fadeIn 1.4s ease-out;
}

.input-group { 
  display:flex; 
  flex-direction:column; 
  gap:6px;
}

.input-label { 
  font-size:13px; 
  font-weight:500; 
  color:var(--color-text-dim);
}

.input-field { 
  width:100%; 
  height:46px; 
  padding:0 14px; 
  background:rgba(255,255,255,0.08); /* 更透明 */
  border:1px solid rgba(255,255,255,0.2); /* 更透明边框 */
  border-radius:10px; 
  color:var(--color-text); 
  font-size:15px; 
  outline:none; 
  transition:border-color 0.2s;
  backdrop-filter: blur(5px);
}

.input-field:focus { 
  border-color:var(--color-gold); 
  box-shadow:0 0 0 2px rgba(255,215,0,0.15);
}

.input-field::placeholder { 
  color:rgba(255,255,255,0.4); /* 更淡的占位符 */
}

.error-msg { 
  color:var(--color-danger); 
  font-size:13px; 
  text-align:center; 
  padding:4px 0;
  animation: shake 0.5s ease-out;
}

.submit-btn { 
  width:100%; 
  height:50px; 
  font-size:17px; 
  font-weight:700; 
  border-radius:12px; 
  letter-spacing:2px; 
  margin-top:4px;
  animation: fadeIn 1.6s ease-out;
}

.login-hint { 
  text-align:center; 
  margin-top:16px; 
  font-size:13px; 
  color:var(--color-text-dim);
  animation: fadeIn 2s ease-out;
}

.link { 
  color:var(--color-gold); 
  cursor:pointer; 
  font-weight:600;
  animation: fadeIn 2.2s ease-out;
}

/* 动画定义 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(30px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes titleBounce {
  0% { 
    opacity: 0;
    transform: scale(0.8);
  }
  50% { 
    transform: scale(1.05);
  }
  100% { 
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes letterShake {
  0% { 
    opacity: 0;
    transform: translateY(20px) rotate(0deg);
  }
  50% { 
    transform: translateY(-10px) rotate(-5deg);
  }
  100% { 
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
</style>
