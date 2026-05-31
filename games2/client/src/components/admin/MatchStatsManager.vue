<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content wide">
      <div class="modal-header">
        <h3>🍬 消消乐数据中心</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <!-- 核心数据大盘 -->
      <div class="stats-grid" v-if="stats">
        <div class="stat-card green">
          <div class="stat-label">总投入积分</div>
          <div class="stat-value">{{ formatNum(stats.totalWagered) }}</div>
        </div>
        <div class="stat-card red">
          <div class="stat-label">总产出积分</div>
          <div class="stat-value">{{ formatNum(stats.totalPayout) }}</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-label">对局总数</div>
          <div class="stat-value">{{ stats.totalGames }}</div>
        </div>
        <div class="stat-card" :class="rtpColor">
          <div class="stat-label">当前历史 RTP</div>
          <div class="stat-value">{{ (stats.currentRTP * 100).toFixed(2) }}%</div>
          <div class="stat-sub">{{ rtpStatus }}</div>
        </div>
      </div>
      <div v-else class="loading">加载统计数据中...</div>

      <!-- 高分对局排查 -->
      <div class="section-title">🏆 高分对局排查 (Top 20)</div>
      <div class="table-wrapper">
        <table v-if="topGames.length > 0">
          <thead>
            <tr>
              <th>用户</th>
              <th>门票</th>
              <th>总得分</th>
              <th>净利润</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="game in topGames" :key="game._id" :class="{'win-row': game.netProfit > 0}">
              <td>{{ game.userId?.phone || '未知' }}</td>
              <td>{{ game.ticketPrice }}</td>
              <td>{{ game.totalScore }}</td>
              <td :class="game.netProfit >= 0 ? 'text-green' : 'text-red'">
                {{ game.netProfit >= 0 ? '+' : '' }}{{ game.netProfit }}
              </td>
              <td>{{ formatTime(game.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">暂无对局数据</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuth } from '../../composables/useAuth.js' // 确保路径正确

const emit = defineEmits(['close'])

const { user } = useAuth() // 假设你的 useAuth 里有 token 或 api 封装
const stats = ref(null)
const topGames = ref([])

// 获取基础统计
const fetchStats = async () => {
  try {
    const token = localStorage.getItem('token'); // 获取鉴权 token
    const res = await fetch('/api/admin/match/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) stats.value = await res.json();
  } catch (err) {
    console.error('获取消消乐统计失败', err);
  }
}

// 获取高分对局
const fetchTopGames = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/match/top-games?limit=20', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) topGames.value = await res.json().then(d => d.topGames || []);
  } catch (err) {
    console.error('获取高分对局失败', err);
  }
}

onMounted(() => {
  fetchStats();
  fetchTopGames();
})

// RTP 颜色和状态动态计算
const rtpColor = computed(() => {
  if (!stats.value) return '';
  const rtp = stats.value.currentRTP;
  if (rtp > 1.05) return 'danger';  // 超过105% 红色警报
  if (rtp < 0.85) return 'feed';    // 低于85% 绿色放水
  return 'normal';                   // 90-105 正常
})

const rtpStatus = computed(() => {
  if (!stats.value) return '';
  const rtp = stats.value.currentRTP;
  if (rtp > 1.05) return '⚠️ 系统亏损，控奖紧缩中';
  if (rtp < 0.85) return '💰 系统盈利，放水喂食中';
  return '🛡️ 正常波动区间';
})

// 工具函数
const formatNum = (num) => num ? num.toLocaleString() : '0';
const formatTime = (t) => t ? new Date(t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
</script>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7); z-index: 100;
  display: flex; align-items: center; justify-content: center;
  padding: 10px;
}
.modal-content {
  background: #161b22; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; width: 100%; color: #e0e0e0;
  max-height: 90vh; display: flex; flex-direction: column;
}
.modal-content.wide { max-width: 600px; } /* 表格稍宽一点 */

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.modal-header h3 { margin: 0; font-size: 18px; font-weight: 800; color: #ff6b9d; }
.close-btn { background: none; border: none; color: #888; font-size: 24px; cursor: pointer; }
.close-btn:hover { color: #fff; }

/* 数据大盘 Grid */
.stats-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 10px; padding: 15px;
}
.stat-card {
  background: #0d1117; border-radius: 10px; padding: 12px;
  border-left: 4px solid #555;
}
.stat-label { font-size: 12px; color: #888; margin-bottom: 4px; }
.stat-value { font-size: 20px; font-weight: 800; }
.stat-sub { font-size: 10px; margin-top: 4px; opacity: 0.8; }

/* 状态颜色 */
.stat-card.green { border-color: #2ecc71; color: #2ecc71; }
.stat-card.red { border-color: #e74c3c; color: #e74c3c; }
.stat-card.blue { border-color: #3498db; color: #3498db; }
.stat-card.normal { border-color: #f0c040; color: #f0c040; }
.stat-card.danger { border-color: #e74c3c; color: #e74c3c; background: rgba(231,76,60,0.1); }
.stat-card.feed { border-color: #2ecc71; color: #2ecc71; background: rgba(46,204,113,0.1); }

/* 表格区域 */
.section-title { padding: 0 15px; font-size: 14px; font-weight: 700; margin: 5px 0 10px; color: #f0c040; }
.table-wrapper { padding: 0 15px 15px; overflow-y: auto; flex: 1; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { text-align: left; color: #888; padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.1); }
td { padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.win-row { background: rgba(46, 204, 113, 0.05); }

.text-green { color: #2ecc71; font-weight: 700; }
.text-red { color: #e74c3c; font-weight: 700; }

.loading, .empty-state { text-align: center; color: #888; padding: 30px; font-size: 14px; }
</style>
