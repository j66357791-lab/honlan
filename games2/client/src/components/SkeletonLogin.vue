//登录页面骨架屏
<template>
  <div class="skeleton-login">
    <!-- 背景图占位符 -->
    <div class="skeleton-login-bg"></div>
    
    <!-- 登录容器占位符 -->
    <div class="skeleton-login-container">
      <!-- logo占位符 -->
      <div class="skeleton-logo"></div>
      
      <!-- 表单占位符 -->
      <div class="skeleton-form">
        <div class="skeleton-input"></div>
        <div class="skeleton-input"></div>
        <div class="skeleton-button"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.skeleton-login-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

.skeleton-login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 24px;
  animation: fadeIn 1.2s ease-out;
}

.skeleton-logo {
  text-align: center;
  margin-bottom: 32px;
  animation: titleBounce 1.5s ease-out;
}

.skeleton-logo::before {
  content: '';
  width: 120px;
  height: 40px;
  background: #e0e0e0;
  border-radius: 8px;
  animation: loading 1.5s infinite;
  display: inline-block;
}

.skeleton-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeIn 1.4s ease-out;
}

.skeleton-input {
  width: 100%;
  height: 46px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 10px;
  animation: loading 1.5s infinite;
}

.skeleton-button {
  width: 100%;
  height: 50px;
  background: rgba(255,215,0,0.2);
  border-radius: 12px;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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
</style>
