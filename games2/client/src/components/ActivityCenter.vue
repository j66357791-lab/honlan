<template>
  <div class="activity-panel">
    <h2>🎉 活动中心</h2>
    <div class="activity-placeholder">
      <div class="activity-icon">🎊</div>
      <div class="activity-text">精彩活动即将上线</div>
      <div class="activity-sub">敬请期待...</div>
    </div>
  </div>
</template>

<script setup>
// 活动中心占位组件
</script>

<style scoped>
.activity-panel {
  padding: 20px 16px;
}
.activity-panel h2 {
  font-size: 20px;
  color: #d4af37;
  margin-bottom: 16px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.activity-placeholder {
  text-align: center;
  padding: 60px 0;
  background: rgba(255, 248, 220, 0.75);
  border-radius: 14px;
  border: 1px solid rgba(212, 175, 55, 0.2);
}
.activity-icon {
  font-size: 56px;
  margin-bottom: 12px;
}
.activity-text {
  font-size: 17px;
  color: #d4af37;
  font-weight: 600;
}
.activity-sub {
  font-size: 13px;
  color: #999;
  margin-top: 6px;
}
</style>
