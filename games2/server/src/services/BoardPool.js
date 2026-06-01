// src/services/BoardPool.js
import crypto from 'crypto';
import MatchStats from '../models/MatchStats.js';
import appLogger from '../utils/logger.js';

// ========== 基础池子配置 (得分区间基于门票100) ==========
const POOL_CONFIG = [
  { tier: 'none',   minScore: 0,   maxScore: 30,   capacity: 300 },
  { tier: 'small',  minScore: 31,  maxScore: 80,   capacity: 300 },
  { tier: 'normal', minScore: 81,  maxScore: 120,  capacity: 200 },
  { tier: 'medium', minScore: 121, maxScore: 300,  capacity: 100 },
  { tier: 'jackpot',minScore: 301, maxScore: 1000, capacity: 40 }
];

const REFILL_THRESHOLD = 0.8; // ★ 水位线：低于80%触发异步补充
const REFILL_LOCKS = {};       // ★ 补充防重入锁

// ★★★ 动态概率表 (根据当前系统 RTP 自动切换) ★★★
const RTP_TABLES = {
  STARVE: { none: 0.45, small: 0.35, normal: 0.12, medium: 0.07, jackpot: 0.01 },
  BALANCE:{ none: 0.30, small: 0.35, normal: 0.20, medium: 0.12, jackpot: 0.03 },
  FEED:   { none: 0.15, small: 0.30, normal: 0.25, medium: 0.20, jackpot: 0.10 }
};

const pools = {};
POOL_CONFIG.forEach(cfg => pools[cfg.tier] = []);

let simulateGameFn = null;
let currentRTP = 0.95; 

export function initBoardPool(simulateGame) {
  simulateGameFn = simulateGame;
}

// ★ 改造1：异步分块预热，不阻塞服务启动
export async function fillPools() {
  if (!simulateGameFn) throw new Error('必须先调用 initBoardPool');
  appLogger.info('🧩 [消消乐] 开始异步预热棋盘池...');

  const stats = await MatchStats.findById('global');
  if (stats && stats.totalWagered > 0) {
    currentRTP = stats.totalPayout / stats.totalWagered;
  }
  appLogger.info(`🧩 [消消乐] 当前历史 RTP: ${(currentRTP * 100).toFixed(2)}%`);

  // ★★★ 核心改造：顺序填充池子，确保启动时池子是满的 ★★★
  for (const cfg of POOL_CONFIG) {
    let generated = 0;
    let attempts = 0;
    
    while (generated < cfg.capacity && attempts < cfg.capacity * 100) {
      attempts++;
      const seed = crypto.randomBytes(8).toString('hex');
      const result = simulateGameFn(100, seed);
      
      if (result.totalScore >= cfg.minScore && result.totalScore <= cfg.maxScore) {
        pools[cfg.tier].push(result);
        generated++;
      }
      
      // ★ 每成功生成5个棋盘，让出主线程 10ms，防止启动时阻塞其他服务初始化
      if (generated % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    appLogger.info(` ✅ [${cfg.tier}] 池子预热完成: ${generated}/${cfg.capacity}`);
  }
  appLogger.info('🧩 [消消乐] 所有池子预热完毕！');
}

function getCurrentProbTable() {
  if (currentRTP > 1.05) return RTP_TABLES.STARVE; 
  if (currentRTP < 0.85) return RTP_TABLES.FEED;   
  return RTP_TABLES.BALANCE; 
}

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

export function getBoard(tier) {
  const pool = pools[tier];
  if (pool.length > 0) {
    const boardData = pool.shift();
    checkAndRefill(tier); 
    return boardData;
  }

  const tierOrder = ['normal', 'small', 'medium', 'none', 'jackpot'];
  for (const fallbackTier of tierOrder) {
    if (pools[fallbackTier].length > 0) {
      const boardData = pools[fallbackTier].shift();
      checkAndRefill(fallbackTier);
      return boardData;
    }
  }

  appLogger.warn('消消乐棋盘池全空！无法提供棋盘');
  return null; 
}

export function updateLiveRTP(wagered, payout) {
  const alpha = 0.05; 
  const instantRTP = payout / wagered;
  currentRTP = currentRTP * (1 - alpha) + instantRTP * alpha;
}

// ★★★ 改造3：水位线驱动的后台持续补充（不阻塞主线程的绝对核心） ★★★
function checkAndRefill(tier) {
  const cfg = POOL_CONFIG.find(c => c.tier === tier);
  if (!cfg) return;

  const currentSize = pools[tier].length;
  const thresholdSize = Math.floor(cfg.capacity * REFILL_THRESHOLD);

  if (currentSize >= thresholdSize || REFILL_LOCKS[tier]) return;

  REFILL_LOCKS[tier] = true;

  (async () => {
    try {
      while (pools[tier].length < cfg.capacity) {
        let attempts = 0;
        let added = false;
        
        while (attempts < 100) {
          attempts++;
          const seed = crypto.randomBytes(8).toString('hex');
          const result = simulateGameFn(100, seed);
          
          if (result.totalScore >= cfg.minScore && result.totalScore <= cfg.maxScore) {
            pools[tier].push(result);
            added = true;
            break; 
          }
        }

        if (!added) {
          appLogger.error(`[消消乐] 档位 ${tier} 尝试100次无法生成符合条件棋盘，请检查得分区间配置！`);
          break; 
        }

        // ★★★ 关键保命符：每成功补入1个棋盘，主动让出主线程 10ms ★★★
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (err) {
      appLogger.error(`[消消乐] 补充池子异常: ${err.message}`);
    } finally {
      REFILL_LOCKS[tier] = false;
    }
  })();
}
