<template> 
  <div class="match-lobby"> 
    <!-- ★ 1. 加载界面 --> 
    <GameLoader 
      :show="currentView === 'loading'" 
      :progress="progress" 
      :current-name="currentName" 
      :total-count="totalCount" 
      :done-count="doneCount" 
      :loaded="resourceLoaded" 
      @start="enterLobby" 
    /> 
    
    <!-- ★ 2. 大厅主界面 --> 
    <div v-if="currentView === 'lobby'" class="lobby-content"> 
      <!-- 顶部 --> 
      <header class="lobby-header"> 
        <button class="back-btn" @click="$router.push('/')">←</button> 
        <h1 class="lobby-title">🧩 消消乐</h1> 
        <button class="sound-toggle" @click="toggleSound"> 
          {{ soundEnabled ? '🔊' : '🔇' }} 
        </button> 
      </header> 
      
      <!-- 余额条 --> 
      <div class="balance-bar"> 
        <span class="bb-label">积分</span> 
        <span class="bb-value">💰 {{ displayBalance.toLocaleString() }}</span> 
      </div> 
      
      <!-- 玩法选择 --> 
      <div class="mode-list"> 
        <!-- 糖果屋 (可进入) --> 
        <div class="mode-card mode-available" @click="enterGame1"> 
          <div class="mc-left"> 
            <div class="mc-icon candy-icon">🍬</div> 
            <div class="mc-info"> 
              <h3 class="mc-name">糖果屋</h3> 
              <p class="mc-desc">经典三消，轻松解压</p> 
            </div> 
          </div> 
          <div class="mc-right"> 
            <span class="mc-arrow">›</span> 
          </div> 
        </div> 
        
        <!-- 缤纷乱斗 (开发中) --> 
        <div class="mode-card mode-dev" @click="showDevToast"> 
          <div class="mc-left"> 
            <div class="mc-icon battle-icon">⚔️</div> 
            <div class="mc-info"> 
              <h3 class="mc-name">缤纷乱斗</h3> 
              <p class="mc-desc">多人对战，激烈竞争</p> 
            </div> 
          </div> 
          <div class="mc-right"> 
            <span class="dev-tag">开发中</span> 
          </div> 
        </div> 
        
        <!-- 锁定占位 --> 
        <div class="mode-card mode-locked"> 
          <div class="mc-left"> 
            <div class="mc-icon locked-icon">🔒</div> 
            <div class="mc-info"> 
              <h3 class="mc-name">敬请期待</h3> 
              <p class="mc-desc">更多玩法即将解锁</p> 
            </div> 
          </div> 
          <div class="mc-right"> 
            <span class="lock-tag">未开放</span> 
          </div> 
        </div> 
      </div> 
      
      <!-- 底部提示 --> 
      <div class="lobby-footer"> 
        <p>💡 选择玩法开始游戏</p> 
      </div> 
    </div> 
    
    <!-- ★ 3. 游戏界面入口 --> 
    <MatchGame1 v-if="currentView === 'game1'" @back="backToLobby" /> 
    
    <!-- Toast 提示 --> 
    <div class="toast-wrap"> 
      <Transition name="toast"> 
        <div v-if="toastMsg" class="toast-item">{{ toastMsg }}</div> 
      </Transition> 
    </div> 
  </div> 
</template> 

<script setup> 
import { ref, onMounted, onUnmounted } from 'vue' 
import { useAuth } from '../composables/useAuth.js' 
import { useMatchSound } from '../composables/useMatchSound.js' 
import { useResourceLoader } from '../composables/useResourceLoader.js' 
import { matchResources } from '../config/matchResources.js' 
import GameLoader from '../components/GameLoader.vue' 
import MatchGame1 from '../components/match/MatchGame1.vue' 

const { displayBalance, refreshUser, fetchBalance } = useAuth() 
const { soundEnabled, initBGM, stopBGM, toggleSound } = useMatchSound() 
const { progress, currentName, loaded: resourceLoaded, totalCount, doneCount, startLoading } = useResourceLoader() 

const currentView = ref('loading') 
const toastMsg = ref('') 
let toastTimer = null 

function enterLobby() { 
  currentView.value = 'lobby' 
} 
function enterGame1() { 
  currentView.value = 'game1' 
} 
function backToLobby() { 
  currentView.value = 'lobby' 
} 
function showDevToast() { 
  toastMsg.value = '缤纷乱斗正在开发中，敬请期待！' 
  clearTimeout(toastTimer) 
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2000) 
} 

onMounted(async () => { 
  initBGM() 
  refreshUser() 
  fetchBalance() 
  await startLoading(matchResources) 
}) 
onUnmounted(() => { stopBGM() }) 
</script> 

<style scoped> 
/* 🌸 大厅粉色可爱系 - 极致清晰版 🌸 */
:root {
  --pink-primary: #FF6B9D;
  --text-super-dark: #2D1020;   /* 极深紫黑，用于最核心的标题和余额 */
  --text-dark: #4A2030;     
  --text-light: #6D4555;    
}
.match-lobby { 
  min-height: 100vh; min-height: 100dvh; color: var(--text-dark); 
  background: linear-gradient(rgba(255, 240, 245, 0.9), rgba(255, 240, 245, 0.9)), url('/assets/images/match/ui/jiazaiye-bg.png');
  background-size: cover; background-position: center; background-repeat: no-repeat; background-attachment: fixed; 
} 

.lobby-header { 
  display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; 
  background: #ffffff; /* 彻底改成纯白底，拒绝半透明 */
  border-bottom: 2px solid rgba(255, 192, 203, 0.5); /* 加粗粉色下边框 */
  position: sticky; top: 0; z-index: 10; 
} 
.back-btn { 
  background: rgba(255, 107, 157, 0.1); border: 1px solid rgba(255, 107, 157, 0.3); 
  color: var(--text-super-dark); border-radius: 12px; width: 32px; height: 32px; font-size: 18px; 
  cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;
} 
.lobby-title { 
  font-size: 20px; font-weight: 900; 
  color: var(--text-super-dark);  /* 使用极深紫黑，绝对清晰 */
  margin: 0; 
} 
.sound-toggle { 
  background: rgba(255, 107, 157, 0.1); border: 1px solid rgba(255, 107, 157, 0.3); 
  font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 12px; 
} 

.balance-bar { 
  display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 16px; margin: 16px 16px 0; 
  background: #ffffff; /* 彻底改成纯白底 */
  border: 2px solid rgba(255, 192, 203, 0.5); border-radius: 16px; 
  box-shadow: 0 4px 12px rgba(255, 107, 157, 0.15); 
} 
.bb-label { font-size: 14px; color: var(--text-light); font-weight: 700; } 
.bb-value { 
  font-size: 22px; font-weight: 900; 
  color: var(--text-super-dark);  /* 使用极深紫黑，绝对清晰 */
} 

.mode-list { padding: 20px 16px; display: flex; flex-direction: column; gap: 14px; } 
.mode-card { 
  display: flex; align-items: center; justify-content: space-between; padding: 18px 16px; border-radius: 18px; 
  border: 1px solid rgba(255, 255, 255, 0.8); background: rgba(255, 255, 255, 0.95);  
  transition: all 0.2s; box-shadow: 0 4px 12px rgba(255, 107, 157, 0.1); 
} 
.mode-available { 
  background: linear-gradient(135deg, rgba(255, 107, 157, 0.9), rgba(255, 194, 209, 0.9)); 
  border-color: rgba(255, 107, 157, 0.6); cursor: pointer; color: #fff; 
} 
.mode-available:active { transform: scale(0.97); background: linear-gradient(135deg, rgba(255, 107, 157, 1), rgba(255, 194, 209, 1)); box-shadow: 0 2px 8px rgba(255, 107, 157, 0.4); } 
.mode-dev { background: rgba(255, 255, 255, 0.95); border-color: rgba(167, 139, 250, 0.4); cursor: pointer; } 
.mode-dev:active { transform: scale(0.97); } 
.mode-locked { background: rgba(255, 255, 255, 0.7); border-color: rgba(200, 180, 190, 0.4); opacity: 0.85; } 
.mc-left { display: flex; align-items: center; gap: 14px; } 
.mc-icon { width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0; background: rgba(255, 255, 255, 0.8); } 
.candy-icon { background: rgba(255, 255, 255, 0.4); border: 1px solid rgba(255, 255, 255, 0.5); } 
.battle-icon { background: linear-gradient(135deg, rgba(167, 139, 250, 0.2), rgba(196, 181, 253, 0.2)); border: 1px solid rgba(167, 139, 250, 0.4); } 
.locked-icon { background: rgba(220, 200, 210, 0.3); border: 1px solid rgba(220, 200, 210, 0.4); } 
.mc-info h3 { margin: 0 0 4px; font-size: 16px; font-weight: 700; color: inherit; } 
.mc-info p { margin: 0; font-size: 12px; } 
.mode-available .mc-info h3 { color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.mode-available .mc-info p { color: rgba(255, 255, 255, 0.95); font-weight: 500; }
.mode-dev .mc-info h3 { color: #5B21B6; }  
.mode-dev .mc-info p { color: #6D28D9; font-weight: 500; } 
.mode-locked .mc-info h3 { color: #6D4555; }
.mode-locked .mc-info p { color: #8A6275; }
.mc-right { display: flex; align-items: center; } 
.mc-arrow { font-size: 24px; color: rgba(255, 255, 255, 0.9); font-weight: bold; } 
.dev-tag { font-size: 11px; padding: 4px 12px; border-radius: 20px; background: rgba(124, 58, 237, 0.15); color: #5B21B6; font-weight: 600; border: 1px solid rgba(124, 58, 237, 0.3); } 
.lock-tag { font-size: 11px; padding: 4px 12px; border-radius: 20px; background: rgba(100, 60, 80, 0.1); color: #6D4555; font-weight: 600; } 
.lobby-footer { text-align: center; padding: 20px; } 
.lobby-footer p { margin: 0; font-size: 12px; color: var(--text-dark); font-weight: 600; }  
.toast-wrap { position: fixed; top: 60px; left: 50%; transform: translateX(-50%); z-index: 9999; } 
.toast-item { background: #ffffff; color: var(--text-super-dark); padding: 12px 24px; border-radius: 30px; font-size: 14px; font-weight: 600; border: 1px solid rgba(255, 107, 157, 0.3); white-space: nowrap; box-shadow: 0 8px 20px rgba(255, 107, 157, 0.2); } 
.toast-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); } 
.toast-leave-active { transition: all 0.2s ease; } 
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-20px) scale(0.9); } 
</style>
