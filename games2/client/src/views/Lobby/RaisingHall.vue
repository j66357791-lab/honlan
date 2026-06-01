<template>
  <div class="raising-hall">
    <!-- 顶部导航 -->
    <header class="page-header">
      <!-- 这里的 router 现在可以在下面 script 里找到了 -->
      <button class="back-btn" @click="router.back()">←</button>
      <h1 class="page-title">🌱 养成大厅</h1>
      <div class="placeholder"></div>
    </header>

    <!-- 游戏列表 -->
    <div class="content-body">
      <!-- 星梦小镇入口卡片 -->
      <div class="lobby-entry-card" @click="router.push('/game/xingmeng')">
        <div class="entry-icon">✨</div>
        <div class="entry-info">
          <h3>星梦小镇</h3>
          <p>打造你的梦想家园</p>
        </div>
        <div class="entry-arrow">›</div>
      </div>

      <!-- 占位卡片 -->
      <div class="lobby-entry-card disabled">
        <div class="entry-icon">🚧</div>
        <div class="entry-info">
          <h3>更多游戏</h3>
          <p>敬请期待...</p>
        </div>
        <div class="entry-arrow">›</div>
      </div>
    </div>
  </div>
</template>

<!-- ★ 重点：这里必须有 script setup，并且导入 router -->
<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.raising-hall {
  min-height: 100vh;
  background: #fdfbf7;
  padding-top: env(safe-area-inset-top, 0px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 248, 220, 0.7);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(212, 175, 55, 0.15);
}

.back-btn {
  font-size: 24px;
  background: none;
  border: none;
  padding: 0 8px;
  cursor: pointer;
  color: #555;
}

.page-title {
  font-size: 18px;
  font-weight: 800;
  margin: 0;
  color: #333;
}

.placeholder {
  width: 40px;
}

.content-body {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 复用大厅入口卡片样式，保持视觉统一 */
.lobby-entry-card {
  width: 100%;
  background: rgba(255, 248, 220, 0.85);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
  backdrop-filter: blur(5px);
}

.lobby-entry-card:active {
  transform: scale(0.98);
  background: rgba(255, 248, 220, 0.95);
  border-color: #d4af37;
}

.lobby-entry-card.disabled {
  opacity: 0.6;
  background: rgba(240, 240, 240, 0.5);
  border: 1px dashed rgba(150, 150, 150, 0.4);
  cursor: not-allowed;
}

.entry-icon {
  font-size: 42px;
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(212, 175, 55, 0.15);
}

.entry-info {
  flex: 1;
}

.entry-info h3 {
  margin: 0 0 6px;
  font-size: 18px;
  color: #333;
  font-weight: 800;
}

.entry-info p {
  margin: 0;
  font-size: 13px;
  color: #888;
}

.entry-arrow {
  font-size: 32px;
  color: #d4af37;
  font-weight: bold;
}
</style>
