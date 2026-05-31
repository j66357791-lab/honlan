<template>
  <div class="leisure-page">
    <!-- 顶部导航栏 (这是关键，用户需要这个返回大厅) -->
    <header class="page-header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="page-title">🎮 休闲中心</h1>
      <div class="placeholder"></div>
    </header>

    <!-- 游戏列表 -->
    <div class="game-list">
      <div class="game-card" @click="enterGiantRunner">
        <div class="game-icon">🏇</div>
        <div class="game-info">
          <h3>巨人赛跑</h3>
          <p>红蓝对决，平局高赔率！</p>
        </div>
      </div>

      <div class="game-card" @click="enterPointingGame">
        <div class="game-icon">🎲</div>
        <div class="game-info">
          <h3>点兵点将</h3>
          <p>策略与运气的考验</p>
        </div>
      </div>

      <div class="game-card" @click="enterMatchGame">
        <div class="game-icon">🧩</div>
        <div class="game-info">
          <h3>自动消消乐</h3>
          <p>自动消除，策略干预</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

// 路由跳转
const enterGiantRunner = () => router.push('/game/giant')
const enterPointingGame = () => router.push('/game/pointing')
const enterMatchGame = () => router.push('/game/match')

// 返回功能 (这是关键)
const goBack = () => router.back()
</script>

<style scoped>
.leisure-page {
  min-height: 100vh;
  background: #f5f5f7;
  color: #333;
  padding-top: env(safe-area-inset-top, 0px);
}

/* 顶部导航栏样式 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  font-size: 24px;
  background: none;
  border: none;
  padding: 0 8px;
  cursor: pointer;
}

.page-title {
  font-size: 18px;
  font-weight: 800;
  margin: 0;
}

.placeholder {
  width: 40px;
}

.game-list {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.game-card {
  width: 100%;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.1s;
}

.game-card:active {
  transform: scale(0.98);
}

.game-icon {
  font-size: 40px;
  color: #d4af37;
}

.game-info h3 {
  margin: 0 0 5px;
  font-size: 18px;
  color: #333;
}

.game-info p {
  margin: 0;
  font-size: 13px;
  color: #888;
}
</style>
