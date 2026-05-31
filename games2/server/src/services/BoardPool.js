import crypto from 'crypto';
import MatchStats from '../models/MatchStats.js';

// ========== 基础池子配置 (得分区间基于门票100) ==========
const POOL_CONFIG = [
  { tier: 'none',   minScore: 0,   maxScore: 30,  capacity: 15 },
  { tier: 'small',  minScore: 31,  maxScore: 80,  capacity: 15 },
  { tier: 'normal', minScore: 81,  maxScore: 120, capacity: 10 },
  { tier: 'medium', minScore: 121, maxScore: 300, capacity: 5  },
  { tier: 'jackpot',minScore: 301, maxScore: 1000,capacity: 2  }
];

// ★★★ 动态概率表 (根据当前系统 RTP 自动切换) ★★★
const RTP_TABLES = {
  STARVE:  { none: 0.45, small: 0.35, normal: 0.12, medium: 0.07, jackpot: 0.01 }, // 系统大亏，急需吃分
  BALANCE: { none: 0.30, small: 0.35, normal: 0.20, medium: 0.12, jackpot: 0.03 }, // 正常健康状态 (目标RTP 95%)
  FEED:    { none: 0.15, small: 0.30, normal: 0.25, medium: 0.20, jackpot: 0.10 }  // 系统大赚，主动放水
};

const pools = {};
POOL_CONFIG.forEach(cfg => pools[cfg.tier] = []);

let simulateGameFn = null;
let currentRTP = 0.95; // 内存中实时追踪的 RTP

export function initBoardPool(simulateGame) {
  simulateGameFn = simulateGame;
}

// 启动时预生成棋盘
export async function fillPools() {
  if (!simulateGameFn) throw new Error('必须先调用 initBoardPool');
  console.log('🧩 [消消乐] 开始预生成棋盘池...');
  const promises = POOL_CONFIG.map(async (cfg) => {
    let generated = 0, attempts = 0;
    while (generated < cfg.capacity && attempts < cfg.capacity * 100) {
      attempts++;
      const seed = crypto.randomBytes(8).toString('hex');
      const result = simulateGameFn(100, seed);
      if (result.totalScore >= cfg.minScore && result.totalScore <= cfg.maxScore) {
        pools[cfg.tier].push(result);
        generated++;
      }
    }
    console.log(` ✅ [${cfg.tier}] 池子已装填: ${generated}/${cfg.capacity}`);
  });
  await Promise.all(promises);

  // 启动时从数据库加载上次统计，初始化内存 RTP
  const stats = await MatchStats.findById('global');
  if (stats && stats.totalWagered > 0) {
    currentRTP = stats.totalPayout / stats.totalWagered;
  }
  console.log(`🧩 [消消乐] 棋盘池预生成完毕！当前历史 RTP: ${(currentRTP * 100).toFixed(2)}%`);
}

// 获取当前应该使用的概率表
function getCurrentProbTable() {
  if (currentRTP > 1.05) return RTP_TABLES.STARVE;  // 发出超5%，开始挨饿
  if (currentRTP < 0.85) return RTP_TABLES.FEED;    // 赚超15%，开始喂食
  return RTP_TABLES.BALANCE;                        // 正常区间
}

// 动态抽签
// 动态抽签
export function drawTier() {
  const table = getCurrentProbTable();
  const rand = Math.random();
  let cumulativeProb = 0;
  for (const tier in table) {
    cumulativeProb += table[tier];
    // ★ 修复：改为严格小于，防止浮点数精度导致最后一个池子抽不到
    if (rand < cumulativeProb) return tier; 
  }
  return 'none';
}


// 获取棋盘并异步补充
export function getBoard(tier) {
  const pool = pools[tier];
  if (pool.length > 0) {
    const boardData = pool.shift();
    refillTier(tier); // 异步补充
    return boardData;
  }

  // 降级获取：当前池子空了，按优先级拿相邻池子的
  const tierOrder = ['normal', 'small', 'medium', 'none', 'jackpot'];
  for (const fallbackTier of tierOrder) {
    if (pools[fallbackTier].length > 0) {
      const boardData = pools[fallbackTier].shift();
      refillTier(fallbackTier);
      return boardData;
    }
  }
  return null; // 全空兜底
}

// 更新内存实时 RTP (由路由层每次下注后调用)
export function updateLiveRTP(wagered, payout) {
  const alpha = 0.05; // 平滑系数，防止剧烈波动
  const instantRTP = payout / wagered;
  currentRTP = currentRTP * (1 - alpha) + instantRTP * alpha;
}

// 异步补充棋盘
function refillTier(tier) {
  const cfg = POOL_CONFIG.find(c => c.tier === tier);
  if (!cfg) return;
  setImmediate(async () => {
    let attempts = 0;
    while (pools[tier].length < cfg.capacity && attempts < 200) {
      attempts++;
      const seed = crypto.randomBytes(8).toString('hex');
      const result = simulateGameFn(100, seed);
      if (result.totalScore >= cfg.minScore && result.totalScore <= cfg.maxScore) {
        pools[tier].push(result);
      }
    }
  });
}
