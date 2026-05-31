<template>
  <!-- 加载界面：当 loaded 为 false 时显示 -->
  <div v-if="!loaded" class="loading-screen">
    <div class="loading-content">
      <!-- 标题 -->
      <h1 class="title">游戏资源初始化中...</h1>
      
      <!-- 当前加载的文件名 -->
      <p class="current-file">{{ currentName || '准备中...' }}</p>
      
      <!-- 进度条容器 -->
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
      </div>
      
      <!-- 百分比文字 -->
      <p class="progress-text">{{ progress }}%</p>
    </div>
  </div>

  <!-- 正式内容：当 loaded 为 true 时显示路由视图 -->
  <!-- ★ 修改：用 template 包裹，以便挂载全局悬浮红包 -->
  <template v-else>
    <router-view />
    <!-- ★ 全局悬浮红包组件 -->
    <RedPacketFloat />
  </template>
</template>

<script setup>
import { onMounted } from 'vue'
// 引入资源加载器
import { useResourceLoader } from './composables/useResourceLoader'
// 引入资源清单
import { preloadAssets } from './config/preloadAssets'
// ★ 引入全局悬浮红包组件
import RedPacketFloat from './components/RedPacketFloat.vue'

// 获取加载器的状态和方法
const { progress, currentName, loaded, startLoading } = useResourceLoader()

// 页面挂载后（即网页一打开），立即开始加载资源
onMounted(() => {
  startLoading(preloadAssets)
})
</script>

<style scoped>
/* 全屏加载遮罩层 */
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #1a1b2e; /*以此深色背景为例，你可以换成你喜欢的加载图 */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999; /* 保证在最顶层 */
  font-family: sans-serif;
  color: white;
}

.loading-content {
  width: 300px;
  text-align: center;
}

.title {
  font-size: 20px;
  margin-bottom: 10px;
  font-weight: normal;
  opacity: 0.9;
}

/* 当前文件名：防止太长溢出 */
.current-file {
  font-size: 12px;
  color: #8fa1b3;
  margin-bottom: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 18px; /* 固定高度防止抖动 */
}

/* 进度条背景槽 */
.progress-container {
  width: 100%;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

/* 进度条本体 */
.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #42b983, #35495e); /* Vue 绿色渐变 */
  transition: width 0.1s linear; /* 让进度条跳动平滑一点 */
  border-radius: 4px;
}

.progress-text {
  font-size: 14px;
  font-weight: bold;
  color: #42b983;
}
</style>
