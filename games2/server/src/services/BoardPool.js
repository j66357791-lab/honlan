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
  STARVE: { none: 0.45, small: 0.35, normal: 0.12, medium: 0.07, jackpot: 0.01 }, // 系统大亏，急需吃分
  BALANCE:{ none: 0.30, small: 0.35, normal: 0.20, medium: 0.12, jackpot: 0.03 }, // 正常健康状态 (目标RTP 95%)
  FEED:   { none: 0.15, small: 0.30, normal: 0.25, medium: 0.20, jackpot: 0.10 }  // 系统大赚，主动放水
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
  appLogger.info('🧩 [消消乐] 开始异步预热棋盘池...');

  // 启动时从数据库加载上次统计，初始化内存 RTP
  const stats = await MatchStats.findById('global');
  if (stats && stats.totalWagered > 0) {
    currentRTP = stats.totalPayout / stats.totalWagered;
  }
  appLogger.info(`🧩 [消消乐] 当前历史 RTP: ${(currentRTP * 100).toFixed(2)}%`);

  // ★★★ 核心改造：顺序填充池子，确保启动时池子是满的 ★★★
  for (const cfg of POOL_CONFIG) {
    let generated = 0;
    let attempts = 0;
    
    // 循环直到当前档位填满
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

// 获取当前应该使用的概率表
function getCurrentProbTable() {
  if (currentRTP > 1.05) return RTP_TABLES.STARVE; // 发出超5%，开始挨饿
  if (currentRTP < 0.85) return RTP_TABLES.FEED;   // 赚超15%，开始喂食
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

  appLogger.warn('消消乐棋盘池全空！无法提供棋盘');
  return null; // ★ 全空！交给路由层快速失败
}

// 更新内存实时 RTP (由路由层每次下注后调用)
export function updateLiveRTP(wagered, payout) {
  const alpha = 0.05; // 平滑系数，防止剧烈波动
  const instantRTP = payout / wagered;
  currentRTP = currentRTP * (1 - alpha) + instantRTP * alpha;
}

// ★★★ 改造3：水位线驱动的后台持续补充（不阻塞主线程的绝对核心） ★★★
function checkAndRefill(tier) {
  const cfg = POOL_CONFIG.find(c => c.tier === tier);
  if (!cfg) return;

  const currentSize = pools[tier].length;
  const thresholdSize = Math.floor(cfg.capacity * REFILL_THRESHOLD);

  // 如果存量高于水位线，或者已经有补充任务在跑，就不重复触发
  if (currentSize >= thresholdSize || REFILL_LOCKS[tier]) return;

  // 加锁，标记该档位正在补充
  REFILL_LOCKS[tier] = true;

  // ★ 使用立即执行的异步函数，在后台默默运行
  (async () => {
    try {
      // 只要没补满，就一直补
      while (pools[tier].length < cfg.capacity) {
        let attempts = 0;
        let added = false;
        
        // 尝试生成一个符合区间的棋盘（最多尝试100次防死循环）
        while (attempts < 100) {
          attempts++;
          const seed = crypto.randomBytes(8).toString('hex');
          const result = simulateGameFn(100, seed);
          
          if (result.totalScore >= cfg.minScore && result.totalScore <= cfg.maxScore) {
            pools[tier].push(result);
            added = true;
            break; // 成功补入1个，跳出内部循环
          }
        }

        // 如果尝试100次都没生成出符合条件的（可能是区间配置太苛刻），报错并跳出
        if (!added) {
          appLogger.error(`[消消乐] 档位 ${tier} 尝试100次无法生成符合条件棋盘，请检查得分区间配置！`);
          break; 
        }

        // ★★★ 关键保命符：每成功补入1个棋盘，主动让出主线程 10ms ★★★
        // 这保证了即使补充任务跑得再欢，用户的 HTTP 请求也能插队处理，绝不卡顿
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (err) {
      appLogger.error(`[消消乐] 补充池子异常: ${err.message}`);
    } finally {
      // 无论成功还是异常，最终一定要释放锁
      REFILL_LOCKS[tier] = false;
    }
  })();
}
