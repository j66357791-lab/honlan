// src/risk/rules.js

/**
 * 规则定义格式：
 * {
 * id: 唯一标识
 * name: 可读名称
 * description: 详细描述
 * priority: 优先级（数字越大越先执行）
 * gameIds: 适用游戏（null = 全局）
 * condition: (context) => boolean 匹配条件
 * action: (context) => Partial<RiskDecision> 生成决策片段
 * }
 */
export const RULES = [
  // =====================================================
  // 第零层：名单规则（最高优先级，绝对执行）
  // =====================================================
  {
    id: 'R001',
    name: '白名单豁免',
    description: '白名单用户不受任何风控干预',
    priority: 1000,
    gameIds: null,
    condition: (ctx) => ctx.user.isWhitelisted,
    action: (ctx) => ({
      action: 'PASS',
      modifier: null,
      constraints: {},
      reason: 'WHITELIST_EXEMPT',
    })
  },
  {
    id: 'R003',
    name: '内部账号保护',
    description: '内部测试账号使用基础概率，不受系统杀数影响，但需遵守基本投注限制防止脚本攻击',
    priority: 999,
    gameIds: null,
    condition: (ctx) => ctx.user.isInternal,
    action: (ctx) => ({
      action: 'PASS',
      modifier: null,
      constraints: {
        maxBetOverride: 5000,
        cooldownSeconds: 1,
      },
      reason: 'INTERNAL_ACCOUNT_PROFILE',
    })
  },
  {
    id: 'R002',
    name: '黑名单压制',
    description: '黑名单用户押注项概率大幅降低',
    priority: 998,
    gameIds: null,
    condition: (ctx) => ctx.user.isHighRisk,
    action: (ctx) => ({
      action: 'ADJUST',
      modifier: { _all: 0.2 },
      constraints: { maxBetOverride: 500 },
      reason: 'BLACKLIST_SUPPRESS',
    })
  },

  // =====================================================
  // 第一层：止损规则（保护平台）
  // =====================================================
  {
    id: 'R101',
    name: '今日暴利压制',
    description: '今日赢利超过阈值，逐级打压',
    priority: 100,
    gameIds: null,
    condition: (ctx) => ctx.user.todayProfit > 5000,
    action: (ctx) => {
      const profit = ctx.user.todayProfit;
      let factor = 1.0;
      if (profit > 30000) factor = 0.2;
      else if (profit > 20000) factor = 0.35;
      else if (profit > 10000) factor = 0.5;
      else if (profit > 5000) factor = 0.7;
      return { action: 'ADJUST', modifier: { _all: factor }, reason: `DAILY_PROFIT_OVERFLOW(${profit})` };
    }
  },
  {
    id: 'R102',
    name: '连胜打断',
    description: '连续赢超过N局，触发概率压制',
    priority: 90,
    gameIds: null,
    condition: (ctx) => ctx.user.consecutiveWins >= 5,
    action: (ctx) => {
      const wins = ctx.user.consecutiveWins;
      let factor = 1.0;
      if (wins >= 10) factor = 0.15;
      else if (wins >= 7) factor = 0.3;
      else if (wins >= 5) factor = 0.5;
      return { action: 'ADJUST', modifier: { _all: factor }, reason: `CONSECUTIVE_WINS(${wins})` };
    }
  },
  {
    id: 'R103',
    name: '历史吸血鬼',
    description: '长期盈利用户持续压制',
    priority: 80,
    gameIds: null,
    condition: (ctx) => {
      const hp = ctx.user.historyProfit + ctx.user.todayProfit;
      return hp > 20000 && ctx.user.totalBetAmount > 50000;
    },
    action: (ctx) => {
      const totalProfit = ctx.user.historyProfit + ctx.user.todayProfit;
      let factor = 1.0;
      if (totalProfit > 100000) factor = 0.2;
      else if (totalProfit > 50000) factor = 0.4;
      else if (totalProfit > 20000) factor = 0.6;
      return { action: 'ADJUST', modifier: { _all: factor }, reason: `HISTORY_VAMPIRE(${totalProfit})` };
    }
  },

  // =====================================================
  // 第二层：行为异常规则
  // =====================================================
  {
    id: 'R201',
    name: '鸡贼下注',
    description: '小额试水+频繁赢利，风险指数飙升',
    priority: 70,
    gameIds: null,
    condition: (ctx) => {
      return ctx.current.betAmount < 200 && ctx.user.todayProfit > 3000 && ctx.user.todayBetCount > 10;
    },
    action: (ctx) => ({ action: 'ADJUST', modifier: { _all: 0.6 }, reason: 'SNEAKY_BET_PATTERN' })
  },
  // ★ 修改 R202：对冲套利，提高吸尘器权重
  {
    id: 'R202',
    name: '对冲套利检测',
    description: '同一局多面下注套利（针对点兵点将多选）',
    priority: 75,
    gameIds: ['pointing_game'],
    condition: (ctx) => {
      return ctx.current.coverageRate > 0.6;
    },
    action: (ctx) => ({ 
      action: 'ADJUST', 
      modifier: { _all: 0.7, emptyWeightFactor: 4.0 }, // ★ 未下注英雄权重提4倍
      reason: 'HEDGE_BETTING_DETECTED' 
    })
  },
  // ★ 新增 R203：5倍全覆盖反杀（3个5倍以上）
  {
    id: 'R203',
    name: '5倍全覆盖反杀',
    description: '玩家押3个及以上5倍英雄，大幅提高未下注英雄权重，启动吸尘器模式',
    priority: 76, // 比 R202 高一点
    gameIds: ['pointing_game'],
    condition: (ctx) => {
      // 覆盖率 > 0.375 (即3个5倍)
      return ctx.current.coverageRate > 0.375 && ctx.user.todayProfit > 1000;
    },
    action: (ctx) => {
      let factor = 2.0; // 基础2倍吸尘
      if (ctx.user.todayProfit > 10000) factor = 4.0;
      if (ctx.user.todayProfit > 30000) factor = 8.0;
      if (ctx.current.coverageRate > 0.6) factor *= 1.5; // 4个5倍，再乘1.5
      
      return { 
        action: 'ADJUST', 
        modifier: { emptyWeightFactor: factor }, // 只提权未下注的，不压下注的，体验更自然
        reason: `FULL_5X_COVERAGE(EW:${factor})` 
      };
    }
  },

  // =====================================================
  // ★★★ 第2.5层：仇恨值博弈规则（诱导与反杀） ★★★
  // =====================================================
  // --- 点兵点将仇恨规则 ---
  {
    id: 'P-HATE-30',
    name: '点兵-诱导大奖(仇恨30+)',
    description: '玩家连续多选5倍套利，仇恨达到30，开始提高大奖概率引诱其改变策略',
    priority: 62,
    gameIds: ['pointing_game'],
    condition: (ctx) => ctx.user.arbitrageScore >= 30 && ctx.user.arbitrageScore < 50,
    action: (ctx) => ({
      action: 'ADJUST',
      modifier: { normal: 0.8, special: 1.2, _specialHeroWeights: { '关羽': 0.5, '张飞': 1.0, '梁红玉': 2.0, '穆桂英': 3.0 } },
      reason: `POINTING_LURE_HIGH_ODDS(Hate:${ctx.user.arbitrageScore})`
    })
  },
  {
    id: 'P-HATE-50',
    name: '点兵-强诱导大奖(仇恨50+)',
    description: '仇恨达到50，极高概率开出30/40倍大奖，进行强烈视觉刺激',
    priority: 63,
    gameIds: ['pointing_game'],
    condition: (ctx) => ctx.user.arbitrageScore >= 50 && ctx.user.arbitrageScore < 70,
    action: (ctx) => ({
      action: 'ADJUST',
      modifier: { normal: 0.6, special: 1.4, _specialHeroWeights: { '关羽': 0.2, '张飞': 0.5, '梁红玉': 3.0, '穆桂英': 5.0 } },
      reason: `POINTING_HEAVY_LURE(Hate:${ctx.user.arbitrageScore})`
    })
  },
  {
    id: 'P-HATE-70',
    name: '点兵-暗箱反杀(仇恨70+)',
    description: '仇恨爆表，直接触发暗箱操作，强制开出对平台最有利（玩家最亏）的结果',
    priority: 64,
    gameIds: ['pointing_game'],
    condition: (ctx) => ctx.user.arbitrageScore >= 70,
    action: (ctx) => ({
      action: 'ADJUST',
      modifier: { normal: 0.1, special: 1.9 },
      constraints: { forceMinPayout: true }, // ★ 核心暗箱指令：强制寻找最低赔付结果
      reason: `POINTING_DARK_BOX_KILL(Hate:${ctx.user.arbitrageScore})`
    })
  },

  // --- 巨人赛跑仇恨规则 ---
  {
    id: 'R-HATE-30',
    name: '巨人-顺势杀(仇恨30+)',
    description: '玩家死磕单边，压低其下注选项的概率',
    priority: 62,
    gameIds: ['giant_racing'],
    condition: (ctx) => ctx.user.arbitrageScore >= 30 && ctx.user.arbitrageScore < 50 && ctx.current.isStuckBet,
    action: (ctx) => {
      const stuckChoice = ctx.current.lastRacingChoice;
      const modifier = { red: 1.0, blue: 1.0, draw: 1.0 };
      if (stuckChoice === 'red') modifier.red = 0.6;
      else if (stuckChoice === 'blue') modifier.blue = 0.6;
      return { action: 'ADJUST', modifier, reason: `RACING_FOLLOW_KILL(Hate:${ctx.user.arbitrageScore}, Against:${stuckChoice})` };
    }
  },
  {
    id: 'R-HATE-50',
    name: '巨人-极限施压(仇恨50+)',
    description: '大幅压低其死磕选项的概率，制造极端连黑',
    priority: 63,
    gameIds: ['giant_racing'],
    condition: (ctx) => ctx.user.arbitrageScore >= 50 && ctx.user.arbitrageScore < 70 && ctx.current.isStuckBet,
    action: (ctx) => {
      const stuckChoice = ctx.current.lastRacingChoice;
      const modifier = { red: 1.0, blue: 1.0, draw: 1.0 };
      if (stuckChoice === 'red') modifier.red = 0.2;
      else if (stuckChoice === 'blue') modifier.blue = 0.2;
      return { action: 'ADJUST', modifier, reason: `RACING_HEAVY_PRESS(Hate:${ctx.user.arbitrageScore}, Against:${stuckChoice})` };
    }
  },
  {
    id: 'R-HATE-70',
    name: '巨人-暗箱反向(仇恨70+)',
    description: '仇恨爆表，直接触发暗箱操作，强制开出反向结果',
    priority: 64,
    gameIds: ['giant_racing'],
    condition: (ctx) => ctx.user.arbitrageScore >= 70,
    action: (ctx) => ({
      action: 'ADJUST',
      modifier: { red: 1.0, blue: 1.0, draw: 1.0 },
      constraints: { forceOpposite: true }, // ★ 核心暗箱指令：强制反向开奖
      reason: `RACING_DARK_BOX_REVERSE(Hate:${ctx.user.arbitrageScore})`
    })
  },

  // =====================================================
  // 第三层：系统池规则（全局调控 - 止损防破，放水防暴）
  // =====================================================
  {
    id: 'R301-CRITICAL',
    name: '系统危急-极限吸血',
    description: '系统池严重亏损，极限压制特殊概率，40倍几乎不开',
    priority: 55,
    gameIds: null,
    condition: (ctx) => ctx.system.profitRate < -0.15,
    action: (ctx) => {
      const betAmount = ctx.current.betAmount;
      let factor = 0.15;
      if (betAmount >= 5000) factor = 0.03;
      else if (betAmount >= 2000) factor = 0.06;
      else if (betAmount >= 1000) factor = 0.10;
      const specialHeroWeights = {};
      if (ctx.current.gameId === 'pointing_game') {
        specialHeroWeights['关羽'] = 1.0;
        specialHeroWeights['张飞'] = 0.3;
        specialHeroWeights['梁红玉'] = 0.1;
        specialHeroWeights['穆桂英'] = 0.01;
      }
      return { action: 'ADJUST', modifier: { _all: factor, special: 0.2, _specialHeroWeights: specialHeroWeights }, reason: `SYSTEM_CRITICAL_DRAIN(Bet:${betAmount})` };
    }
  },
  {
    id: 'R301-SEVERE',
    name: '系统重度亏损-强杀大额',
    description: '系统池中度亏损，压制特殊概率及高倍英雄',
    priority: 52,
    gameIds: null,
    condition: (ctx) => ctx.system.profitRate >= -0.15 && ctx.system.profitRate < -0.10,
    action: (ctx) => {
      const betAmount = ctx.current.betAmount;
      let factor = 0.3;
      if (betAmount >= 5000) factor = 0.10;
      else if (betAmount >= 2000) factor = 0.15;
      else if (betAmount >= 1000) factor = 0.20;
      const specialHeroWeights = {};
      if (ctx.current.gameId === 'pointing_game') {
        specialHeroWeights['关羽'] = 1.0;
        specialHeroWeights['张飞'] = 0.5;
        specialHeroWeights['梁红玉'] = 0.3;
        specialHeroWeights['穆桂英'] = 0.1;
      }
      return { action: 'ADJUST', modifier: { _all: factor, special: 0.5, _specialHeroWeights: specialHeroWeights }, reason: `SYSTEM_SEVERE_SUPPRESS(Bet:${betAmount})` };
    }
  },
  {
    id: 'R301',
    name: '系统轻度止损',
    description: '系统池轻度亏损，微调特殊概率',
    priority: 50,
    gameIds: null,
    condition: (ctx) => ctx.system.profitRate >= -0.10 && ctx.system.profitRate < -0.03,
    action: (ctx) => {
      const rate = ctx.system.profitRate;
      const betAmount = ctx.current.betAmount;
      let baseFactor = 1.0;
      if (rate < -0.07) baseFactor = 0.5;
      else if (rate < -0.05) baseFactor = 0.65;
      else if (rate < -0.03) baseFactor = 0.8;
      if (betAmount >= 5000) baseFactor *= 0.6;
      else if (betAmount >= 2000) baseFactor *= 0.7;
      else if (betAmount >= 1000) baseFactor *= 0.8;
      const specialHeroWeights = {};
      if (ctx.current.gameId === 'pointing_game' && rate < -0.07) {
        specialHeroWeights['穆桂英'] = 0.5;
        specialHeroWeights['梁红玉'] = 0.7;
      }
      return { action: 'ADJUST', modifier: { _all: baseFactor, special: 0.8, _specialHeroWeights: specialHeroWeights }, reason: `SYSTEM_BLEEDING(${(rate * 100).toFixed(1)}%, Bet:${betAmount})` };
    }
  },
  {
    id: 'R302-LIGHT',
    name: '系统轻度丰收-微弱放水',
    description: '系统池开始盈利，仅给小额微调体验，大额继续微杀当肥料',
    priority: 45,
    gameIds: null,
    condition: (ctx) => ctx.system.profitRate >= 0.10 && ctx.system.profitRate < 0.30,
    action: (ctx) => {
      const betAmount = ctx.current.betAmount;
      let factor = 1.0;
      if (betAmount < 500) factor = 1.05;
      else if (betAmount < 1000) factor = 1.02;
      else if (betAmount < 2000) factor = 0.98;
      else factor = 0.90;
      return { action: 'ADJUST', modifier: { _all: factor, special: 1.1 }, reason: `SYSTEM_LIGHT_FEEDING(Bet:${betAmount})` };
    }
  },
  {
    id: 'R302-MODERATE',
    name: '系统中度丰收-明显放水',
    description: '系统池利润丰厚，小额玩家爽，大额依然严防死守',
    priority: 42,
    gameIds: null,
    condition: (ctx) => ctx.system.profitRate >= 0.30 && ctx.system.profitRate < 0.60,
    action: (ctx) => {
      const betAmount = ctx.current.betAmount;
      let factor = 1.0;
      if (betAmount < 500) factor = 1.08;
      else if (betAmount < 1000) factor = 1.03;
      else if (betAmount < 2000) factor = 0.95;
      else factor = 0.85;
      return { action: 'ADJUST', modifier: { _all: factor, special: 1.3 }, reason: `SYSTEM_MODERATE_FEEDING(Bet:${betAmount})` };
    }
  },
  {
    id: 'R302-HEAVY',
    name: '系统极度丰收-精准狂欢',
    description: '系统池赚爆了，小鱼狂欢，巨鲸必须死',
    priority: 40,
    gameIds: null,
    condition: (ctx) => ctx.system.profitRate >= 0.60,
    action: (ctx) => {
      const betAmount = ctx.current.betAmount;
      let factor = 1.0;
      if (betAmount < 500) factor = 1.10;
      else if (betAmount < 1000) factor = 1.04;
      else if (betAmount < 2000) factor = 0.92;
      else factor = 0.80;
      return { action: 'ADJUST', modifier: { _all: factor, special: 1.5 }, reason: `SYSTEM_HEAVY_CARNIVAL(Bet:${betAmount})` };
    }
  },

  // =====================================================
  // 第四层：新用户保护（养猪）
  // =====================================================
  {
    id: 'R402',
    name: '连败安慰',
    description: '连输太多给点甜头，防止流失',
    priority: 25,
    gameIds: null,
    condition: (ctx) => ctx.user.consecutiveLosses >= 5,
    action: (ctx) => ({ action: 'ADJUST', modifier: { _all: 1.4, special: 2.0 }, reason: 'LOSING_STREAK_COMFORT' })
  },
];

/**
 * 规则执行器
 */
export function executeRules(context) {
  const sortedRules = [...RULES]
    .filter(r => r.gameIds === null || r.gameIds.includes(context.current.gameId))
    .sort((a, b) => b.priority - a.priority);

  let finalAction = 'PASS';
  let finalModifier = {};
  let finalConstraints = {};
  let triggeredRules = [];
  let reasons = [];

  for (const rule of sortedRules) {
    if (!rule.condition(context)) continue;

    const result = rule.action(context);
    triggeredRules.push({ ruleId: rule.id, ruleName: rule.name });
    reasons.push(result.reason || rule.id);

    // 遇到绝对通行或拦截，直接中断
    if (result.action === 'PASS' || result.action === 'BLOCK') {
      return {
        action: result.action,
        modifier: result.modifier,
        constraints: result.constraints || {},
        triggeredRules,
        reason: reasons.join(' + ')
      };
    }

    // 累积概率修正
    if (result.action === 'ADJUST' && result.modifier) {
      finalAction = 'ADJUST';
      if (result.modifier._all) {
        for (const key of Object.keys(context.current.baseProb || {})) {
          finalModifier[key] = (finalModifier[key] || 1.0) * result.modifier._all;
        }
      } else {
        for (const [key, val] of Object.entries(result.modifier)) {
          // ★ 保留 emptyWeightFactor，不归入常规概率键
          if (key !== '_all' && key !== '_specialHeroWeights' && key !== 'emptyWeightFactor') {
            finalModifier[key] = (finalModifier[key] || 1.0) * val;
          }
        }
      }
      // 合并特殊英雄权重
      if (result.modifier._specialHeroWeights) {
        if (!finalModifier._specialHeroWeights) finalModifier._specialHeroWeights = {};
        for (const [heroName, weightFactor] of Object.entries(result.modifier._specialHeroWeights)) {
          finalModifier._specialHeroWeights[heroName] = (finalModifier._specialHeroWeights[heroName] || 1.0) * weightFactor;
        }
      }
      // ★ 合并吸尘器权重 (取最大值，因为越多规则触发说明越需要吸尘)
      if (result.modifier.emptyWeightFactor) {
        finalModifier.emptyWeightFactor = Math.max(finalModifier.emptyWeightFactor || 1.0, result.modifier.emptyWeightFactor);
      }
    }

    // 累积约束条件
    if (result.constraints) {
      // ★ 透传暗箱指令
      if (result.constraints.forceMinPayout) finalConstraints.forceMinPayout = true;
      if (result.constraints.forceOpposite) finalConstraints.forceOpposite = true;
      if (result.constraints.maxBetOverride) {
        finalConstraints.maxBetOverride = finalConstraints.maxBetOverride ? Math.min(finalConstraints.maxBetOverride, result.constraints.maxBetOverride) : result.constraints.maxBetOverride;
      }
      if (result.constraints.cooldownSeconds) {
        finalConstraints.cooldownSeconds = finalConstraints.cooldownSeconds ? Math.max(finalConstraints.cooldownSeconds, result.constraints.cooldownSeconds) : result.constraints.cooldownSeconds;
      }
    }
  }

  return {
    action: finalAction,
    modifier: Object.keys(finalModifier).length > 0 ? finalModifier : null,
    constraints: finalConstraints,
    triggeredRules,
    reason: reasons.join(' + ')
  };
}
