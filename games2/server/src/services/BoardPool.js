// src/services/BoardPool.js 
import crypto from 'crypto'; 
import MatchStats from '../models/MatchStats.js'; 
import appLogger from '../utils/logger.js'; // ★ 引入日志调度局

// ========== 基础池子配置 (得分区间基于门票100) ========== 
// ★ 扩大容量：确保大池子有足够的缓冲 
const POOL_CONFIG = [ 
  { tier: 'none', minScore: 0, maxScore: 30, capacity: 300 }, 
  { tier: 'small', minScore: 31, maxScore: 80, capacity: 300 }, 
  { tier: 'normal', minScore: 81, maxScore: 120, capacity: 200 }, 
  { tier: 'medium', minScore: 121, maxScore: 300, capacity: 100 }, 
  { tier: 'jackpot',minScore: 301, maxScore: 1000,capacity: 40 } 
]; 

const REFILL_THRESHOLD = 0.8; // ★ 水位线：低于80%触发异步补充 
const REFILL_LOCKS = {}; // ★ 补充防重入锁 

// ★★★ 动态概率表 (根据当前系统 RTP 自动切换) ★★★ 
const RTP_TABLES = { 
  STARVE: { none: 0.45, small: 0.35, normal: 0.12, medium: 0.07, jackpot: 0.01 }, // 系统大亏，急需吃分 
  BALANCE:{ none: 0.30, small: 0.35, normal: 0.20, medium: 0.12, jackpot: 0.03 }, // 正常健康状态 (目标RTP 95%) 
  FEED: { none: 0.15, small: 0.30, normal: 0.25, medium: 0.20, jackpot: 0.10 } // 系统大赚，主动放水 
}; 

const pools = {}; 
POOL_CONFIG.forEach(cfg => pools[cfg.tier] = []); 

let simulateGameFn = null; 
let currentRTP = 0.95; // 内存中实时追踪的 RTP 

export function initBoardPool(simulateGame) { 
  simulateGameFn = simulateGame; 
} 

// ★ 改造1：异步分块预热，不阻塞服务启动 
export async function fillPools() { 
  if (!simulateGameFn) throw new Error('必须先调用 initBoardPool'); 
  
  appLogger.debug('🧩 [消消乐] 开始异步预热棋盘池...'); // ★ 降级为debug
  
  // 启动时从数据库加载上次统计，初始化内存 RTP 
  const stats = await MatchStats.findById('global'); 
  if (stats && stats.totalWagered > 0) { 
    currentRTP = stats.totalPayout / stats.totalWagered; 
  } 
  appLogger.debug(`🧩 [消消乐] 当前历史 RTP: ${(currentRTP * 100).toFixed(2)}%`); // ★ 降级为debug
  
  // 异步分块填充，不卡死主线程 
  for (const cfg of POOL_CONFIG) { 
    let generated = 0; 
    let attempts = 0; 
    const fillTask = async () => { 
      while (generated < cfg.capacity && attempts < cfg.capacity * 100) { 
        attempts++; 
        const seed = crypto.randomBytes(8).toString('hex'); 
        const result = simulateGameFn(100, seed); 
        if (result.totalScore >= cfg.minScore && result.totalScore <= cfg.maxScore) { 
          pools[cfg.tier].push(result); 
          generated++; 
        } 
        // ★ 每生成5个棋盘，让出一次主线程，确保HTTP请求不被阻塞 
        if (attempts % 5 === 0) await new Promise(resolve => setImmediate(resolve)); 
      } 
      appLogger.debug(` ✅ [${cfg.tier}] 池子预热完成: ${generated}/${cfg.capacity}`); // ★ 降级为debug
    }; 
    fillTask(); // 发起异步任务，不 await 死等 
  } 
} 

// 获取当前应该使用的概率表 
function getCurrentProbTable() { 
  if (currentRTP > 1.05) return RTP_TABLES.STARVE; // 发出超5%，开始挨饿 
  if (currentRTP < 0.85) return RTP_TABLES.FEED; // 赚超15%，开始喂食 
  return RTP_TABLES.BALANCE; // 正常区间 
} 

// 动态抽签 
export function drawTier() { 
  const table = getCurrentProbTable(); 
  const rand = Math.random(); 
  let cumulativeProb = 0; 
  for (const tier in table) { 
    cumulativeProb += table[tier]; 
    if (rand < cumulativeProb) return tier; 
  } 
  return 'none'; 
} 

// ★ 改造2：取棋盘 + 水位线检查 
export function getBoard(tier) { 
  const pool = pools[tier]; 
  if (pool.length > 0) { 
    const boardData = pool.shift(); 
    checkAndRefill(tier); // 取走后立刻检查水位，低了就补 
    return boardData; 
  } 
  // 降级获取：当前池子空了，按优先级拿相邻池子的 
  const tierOrder = ['normal', 'small', 'medium', 'none', 'jackpot']; 
  for (const fallbackTier of tierOrder) { 
    if (pools[fallbackTier].length > 0) { 
      const boardData = pools[fallbackTier].shift(); 
      checkAndRefill(fallbackTier); 
      return boardData; 
    } 
  } 
  
  appLogger.warn('消消乐棋盘池全空！无法提供棋盘'); // ★ 异常情况提权为warn，控制台亮黄字
  return null; // ★ 全空！交给路由层快速失败 
} 

// 更新内存实时 RTP (由路由层每次下注后调用) 
export function updateLiveRTP(wagered, payout) { 
  const alpha = 0.05; // 平滑系数，防止剧烈波动 
  const instantRTP = payout / wagered; 
  currentRTP = currentRTP * (1 - alpha) + instantRTP * alpha; 
} 

// ★ 改造3：水位线驱动的异步批量补充 
function checkAndRefill(tier) { 
  const cfg = POOL_CONFIG.find(c => c.tier === tier); 
  if (!cfg) return; 
  const currentSize = pools[tier].length; 
  const thresholdSize = Math.floor(cfg.capacity * REFILL_THRESHOLD); 
  
  // 如果当前存量小于80%水位线，且没有被锁住（正在补充），则发起补充 
  if (currentSize < thresholdSize && !REFILL_LOCKS[tier]) { 
    REFILL_LOCKS[tier] = true; // 加锁 
    setImmediate(async () => { 
      try { 
        let attempts = 0; 
        // 一次性补满到100% 
        while (pools[tier].length < cfg.capacity && attempts < cfg.capacity * 2) { 
          attempts++; 
          const seed = crypto.randomBytes(8).toString('hex'); 
          const result = simulateGameFn(100, seed); 
          if (result.totalScore >= cfg.minScore && result.totalScore <= cfg.maxScore) { 
            pools[tier].push(result); 
          } 
          // ★ 补充时也要让出主线程，每10个让一次 
          if (attempts % 10 === 0) await new Promise(resolve => setImmediate(resolve)); 
        } 
      } finally { 
        REFILL_LOCKS[tier] = false; // 释放锁 
      } 
    }); 
  } 
}
