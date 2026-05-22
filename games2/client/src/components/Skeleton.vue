//大厅骨架-加载缓冲
<template>
  <div class="skeleton">
    <!-- 背景图占位符（灰色渐变动画） -->
    <div class="skeleton-bg"></div>
    
    <!-- 顶部用户信息栏占位符 -->
    <header class="skeleton-header">
      <div class="skeleton-user">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-name"></div>
        <div class="skeleton-balance"></div>
      </div>
      <div class="skeleton-settings"></div>
    </header>
    
    <!-- Tab内容区占位符（游戏卡片） -->
    <div class="skeleton-content">
      <div class="skeleton-game-card" v-for="i in 2" :key="i"></div>
    </div>
    
    <!-- 底部导航栏占位符 -->
    <nav class="skeleton-nav">
      <div class="skeleton-nav-item" v-for="i in 4" :key="i"></div>
    </nav>
  </div>
</template>

<script setup>
</script>

<style scoped>
.skeleton-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 248, 220, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 0 0 12px 12px;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.skeleton-user {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #555;
}

.skeleton-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e0e0e0;
  animation: loading 1.5s infinite;
}

.skeleton-name {
  width: 60px;
  height: 14px;
  background: #e0e0e0;
  border-radius: 4px;
  animation: loading 1.5s infinite;
}

.skeleton-balance {
  width: 80px;
  height: 14px;
  background: #e0e0e0;
  border-radius: 4px;
  animation: loading 1.5s infinite;
}

.skeleton-settings {
  width: 24px;
  height: 24px;
  background: #e0e0e0;
  border-radius: 8px;
  animation: loading 1.5s infinite;
}

.skeleton-content {
  flex: 1;
  padding: 20px 16px;
  padding-bottom: 68px;
}

.skeleton-game-card {
  width: 100%;
  max-width: 400px;
  margin: 0 auto 16px;
  background: rgba(255, 248, 220, 0.8);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  backdrop-filter: blur(5px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.skeleton-game-card::before {
  content: '';
  width: 40px;
  height: 40px;
  background: #e0e0e0;
  border-radius: 50%;
  animation: loading 1.5s infinite;
}

.skeleton-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  height: 58px;
  background: rgba(255, 248, 220, 0.92);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(212, 175, 55, 0.2);
  z-index: 100;
}

.skeleton-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
}

.skeleton-nav-item::before {
  content: '';
  width: 20px;
  height: 20px;
  background: #e0e0e0;
  border-radius: 50%;
  animation: loading 1.5s infinite;
}

.skeleton-nav-item::after {
  content: '';
  width: 10px;
  height: 10px;
  background: #e0e0e0;
  border-radius: 2px;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
