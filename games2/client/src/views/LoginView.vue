<template>
  <div class="login-page">
    <div class="login-bg" style="background-image: url('/assets/images/bg.01.png')"></div>
    <div class="login-container">
      <div class="logo-area">
        <img src="/assets/images/juese/honse/feitu1-idle_0.png" class="logo-giant" alt="" />
        <h1 class="app-title">巨人赛跑</h1>
        <p class="app-subtitle">选择你的巨人，赢取胜利</p>
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

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'

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
</script>

<style scoped>
.login-page { min-height:100vh; position:relative; display:flex; align-items:center; justify-content:center; }
.login-bg { position:absolute; inset:0; background-size:cover; background-position:center; opacity:0.3; }
.login-container { position:relative; z-index:1; width:100%; padding:24px; }
.logo-area { text-align:center; margin-bottom:32px; }
.logo-giant { width:80px; height:80px; object-fit:contain; filter:drop-shadow(0 0 12px rgba(255,59,59,0.5)); margin-bottom:12px; }
.app-title { font-size:28px; font-weight:900; color:var(--color-gold); text-shadow:0 0 20px var(--color-gold-glow); }
.app-subtitle { font-size:14px; color:var(--color-text-dim); margin-top:4px; }
.form-card { background:var(--color-panel); border-radius:16px; padding:24px; border:1px solid rgba(255,255,255,0.06); }
.tab-bar { display:flex; gap:4px; background:rgba(255,255,255,0.05); border-radius:10px; padding:3px; margin-bottom:20px; }
.tab-item { flex:1; text-align:center; padding:10px; font-size:15px; font-weight:600; border-radius:8px; cursor:pointer; transition:all 0.2s; color:var(--color-text-dim); }
.tab-item.active { background:linear-gradient(135deg,#ff6b35,#ff3b3b); color:white; box-shadow:0 2px 10px rgba(255,59,59,0.4); }
.login-form { display:flex; flex-direction:column; gap:16px; }
.input-group { display:flex; flex-direction:column; gap:6px; }
.input-label { font-size:13px; font-weight:500; color:var(--color-text-dim); }
.input-field { width:100%; height:46px; padding:0 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:var(--color-text); font-size:15px; outline:none; transition:border-color 0.2s; }
.input-field:focus { border-color:var(--color-gold); box-shadow:0 0 0 2px rgba(255,215,0,0.15); }
.input-field::placeholder { color:rgba(255,255,255,0.25); }
.error-msg { color:var(--color-danger); font-size:13px; text-align:center; padding:4px 0; }
.submit-btn { width:100%; height:50px; font-size:17px; font-weight:700; border-radius:12px; letter-spacing:2px; margin-top:4px; }
.login-hint { text-align:center; margin-top:16px; font-size:13px; color:var(--color-text-dim); }
.link { color:var(--color-gold); cursor:pointer; font-weight:600; }
</style>
