// src/risk/rules.js

export const RULES = [
  // =====================================================
  // 第零层：名单规则（不变）
  // =====================================================
  {
    id: 'R001', name: '白名单豁免',
    description: '白名单用户不受任何风控干预',
    priority: 1000, gameIds: null,
    condition: (ctx) => ctx.user.isWhitelisted,
    action: (ctx) => ({ action: 'PASS', modifier: null, constraints: {}, reason: 'WHITELIST_EXEMPT' })
  },
  {
    id: 'R003', name: '内部账号保护',
    description: '内部测试账号使用基础概率',
    priority: 999, gameIds: null,
    condition: (ctx) => ctx.user.isInternal,
    action: (ctx) => ({ action: 'PASS', modifier: null, constraints: { cooldownSeconds: 1 }, reason: 'INTERNAL_ACCOUNT_PROFILE' })
  },
  {
    id: 'R002', name: '黑名单压制',
    description: '黑名单用户强杀概率',
    priority: 998, gameIds: null,
    condition: (ctx) => ctx.user.isHighRisk,
    action: (ctx) => ({ action: 'ADJUST', modifier: { _all: 0.2 }, constraints: {}, reason: 'BLACKLIST_SUPPRESS' })
  },

  // =====================================================
  // 第一层：个人风控规则（★ 全部跟池子联动 ★）
  // =====================================================
  {
    id: 'R101',
    name: '今日暴利平衡',
    description: '池子亏损时赢2000就管，池子盈利时赢5000才管，力度随池子连续变化',
    priority: 100,
    gameIds: null,
    condition: (ctx) => {
      const profit = ctx.user.todayProfit;
      const poolRate = ctx.system.profitRate;
      // ★ 池子越亏，触发门槛越低
      if (poolRate < -0.10) return profit > 1000;
      if (poolRate < -0.05) return profit > 2000;
      if (poolRate < 0) return profit > 3000;
      if (poolRate < 0.15) return profit > 5000;
      return profit > 8000; // 池子赚很多，门槛放宽
    },
    action: (ctx) => {
      const profit = ctx.user.todayProfit;
      const totalBet = ctx.user.todayTotalBet || 1;
      const betCount = ctx.user.todayBetCount || 1;
      const roi = profit / totalBet;
      const betAmount = ctx.current.betAmount;
      const poolRate = ctx.system.profitRate;

      // ① 盈利规模影响
      const profitImpact = 1 - 1 / (1 + profit / 15000);

      // ② ROI影响
      const roiImpact = Math.min(1, Math.pow(Math.max(0, roi), 0.7));

      // ③ 局数置信度
      const confidence = Math.min(1, Math.log(betCount + 1) / Math.log(101));

      // ④ 下注额修正
      let betAdjust = 1.0;
      if (betAmount >= 3000) {
        betAdjust = 0.6 + Math.min(0.7, Math.max(0, roi - 0.2)) * 1.4;
      }

      // ⑤ ★★★ 池子态度（核心改动：连续函数，亏损时放大威胁，盈利时缩小威胁）★★★
      // poolRate=-0.15→2.5(极度敌视), -0.05→1.5(敌视), 0→1.0(中性), +0.20→0.6(宽容), +0.50→0.38(放水)
      let poolAttitude;
      if (poolRate < 0) {
        poolAttitude = 1 + Math.abs(poolRate) * 10; // 亏损放大
      } else {
        poolAttitude = 1 / (1 + poolRate * 2);      // 盈利缩小
      }

      // ====== 综合威胁系数 ======
      const threat = (profitImpact * 0.3 + roiImpact * confidence * 0.7) * betAdjust * poolAttitude;

      // ====== 映射到概率因子 ======
      const factor = Math.max(0.15, 1 - threat * 0.85);

      return {
        action: 'ADJUST',
        modifier: { _all: factor },
        constraints: {},
        reason: `R101_ALGO(P:${profit}, ROI:${(roi*100).toFixed(0)}%, N:${betCount}, Pool:${(poolRate*100).toFixed(0)}%, T:${threat.toFixed(2)}, F:${factor.toFixed(2)})`
      };
    }
  },
  {
    id: 'R102',
    name: '连胜平衡+冷却',
    description: '池子亏损时3连胜就管，池子盈利时5连胜才管',
    priority: 90,
    gameIds: null,
    condition: (ctx) => {
      const wins = ctx.user.consecutiveWins;
      const poolRate = ctx.system.profitRate;
      if (poolRate < -0.10) return wins >= 3;
      if (poolRate < -0.05) return wins >= 4;
      if (poolRate < 0.10) return wins >= 5;
      return wins >= 7;
    },
    action: (ctx) => {
      const wins = ctx.user.consecutiveWins;
      const poolRate = ctx.system.profitRate;

      // ★ 池子越亏，压得越重
      let poolSeverity = 1.0;
      if (poolRate < -0.10) poolSeverity = 1.8;
      else if (poolRate < -0.05) poolSeverity = 1.4;
      else if (poolRate < 0) poolSeverity = 1.2;
      else if (poolRate > 0.20) poolSeverity = 0.6;

      let baseFactor = 1.0;
      if (wins >= 10) baseFactor = 0.4;
      else if (wins >= 7) baseFactor = 0.6;
      else if (wins >= 5) baseFactor = 0.75;
      else if (wins >= 3) baseFactor = 0.85;

      // 因子：基础压低 × 池子严重度（poolSeverity>1会压更低，<1会抬回来）
      let factor = 1 - (1 - baseFactor) * poolSeverity;
      factor = Math.max(0.15, Math.min(1.0, factor));

      let cooldown = 0;
      if (wins >= 7) cooldown = 3;
      else if (wins >= 5) cooldown = 2;
      else if (wins >= 3) cooldown = 1;

      return {
        action: 'ADJUST',
        modifier: { _all: factor },
        constraints: { cooldownSeconds: cooldown },
        reason: `R102_WIN_STREAK(W:${wins}, Pool:${(poolRate*100).toFixed(0)}%, F:${factor.toFixed(2)}, CD:${cooldown}s)`
      };
    }
  },
  {
    id: 'R103',
    name: '历史吸血鬼平衡',
    description: '池子亏损时历史盈利>5000就管，池子盈利时>20000才管',
    priority: 80,
    gameIds: null,
    condition: (ctx) => {
      const hp = ctx.user.historyProfit + ctx.user.todayProfit;
      const poolRate = ctx.system.profitRate;
      if (!ctx.user.totalBetAmount || ctx.user.totalBetAmount < 50000) return false;
      if (poolRate < -0.10) return hp > 5000;
      if (poolRate < -0.05) return hp > 10000;
      if (poolRate < 0.10) return hp > 20000;
      return hp > 40000;
    },
    action: (ctx) => {
      const totalProfit = ctx.user.historyProfit + ctx.user.todayProfit;
      const poolRate = ctx.system.profitRate;

      // ★ 池子态度
      let poolSeverity = 1.0;
      if (poolRate < -0.10) poolSeverity = 2.0;
      else if (poolRate < -0.05) poolSeverity = 1.5;
      else if (poolRate < 0) poolSeverity = 1.2;
      else if (poolRate > 0.20) poolSeverity = 0.6;

      let baseFactor = 1.0;
      if (totalProfit > 100000) baseFactor = 0.3;
      else if (totalProfit > 50000) baseFactor = 0.45;
      else if (totalProfit > 20000) baseFactor = 0.6;
      else if (totalProfit > 10000) baseFactor = 0.75;
      else if (totalProfit > 5000) baseFactor = 0.85;

      let factor = 1 - (1 - baseFactor) * poolSeverity;
      factor = Math.max(0.15, Math.min(1.0, factor));

      return {
        action: 'ADJUST',
        modifier: { _all: factor },
        constraints: {},
        reason: `R103_VAMPIRE(P:${totalProfit}, Pool:${(poolRate*100).toFixed(0)}%, F:${factor.toFixed(2)})`
      };
    }
  },

  // =====================================================
  // 第二层：行为异常规则（★ 也跟池子联动 ★）
  // =====================================================
  {
    id: 'R201',
    name: '鸡贼下注平衡',
    description: '小额试水+频繁赢利，池子亏损时更严格',
    priority: 70,
    gameIds: null,
    condition: (ctx) => {
      const poolRate = ctx.system.profitRate;
      // ★ 池子亏损时，利润>1500就管；盈利时>3000才管
      const profitThreshold = poolRate < 0 ? 1500 : 3000;
      return ctx.current.betAmount < 200 && ctx.user.todayProfit > profitThreshold && ctx.user.todayBetCount > 10;
    },
    action: (ctx) => {
      const poolRate = ctx.system.profitRate;
      let factor = 0.7;
      if (poolRate < -0.10) factor = 0.5;
      else if (poolRate < -0.05) factor = 0.6;
      else if (poolRate > 0.15) factor = 0.85;

      return { action: 'ADJUST', modifier: { _all: factor }, constraints: {}, reason: `R201_SNEAKY(F:${factor}, Pool:${(poolRate*100).toFixed(0)}%)` };
    }
  },
  {
    id: 'R202', name: '对冲套利吸尘器',
    description: '同一局多面下注套利，启动吸尘器模式提高未下注英雄权重',
    priority: 75, gameIds: ['pointing_game'],
    condition: (ctx) => ctx.current.coverageRate > 0.6,
    action: (ctx) => ({ action: 'ADJUST', modifier: { emptyWeightFactor: 4.0 }, reason: 'HEDGE_BETTING_VACUUM(EW:4)' })
  },
  {
    id: 'R203', name: '5倍全覆盖吸尘器',
    description: '玩家押3个及以上5倍英雄，启动吸尘器模式',
    priority: 76, gameIds: ['pointing_game'],
    condition: (ctx) => (ctx.current.coverageRate > 0.25 && ctx.user.todayProfit > 5000) || (ctx.current.coverageRate > 0.375),
    action: (ctx) => {
      let factor = 2.0;
      if (ctx.user.todayProfit > 10000) factor = 4.0;
      if (ctx.user.todayProfit > 30000) factor = 8.0;
      if (ctx.current.coverageRate > 0.6) factor *= 1.5;
      return { action: 'ADJUST', modifier: { emptyWeightFactor: factor }, reason: `FULL_5X_COVERAGE_VACUUM(EW:${factor})` };
    }
  },

  // =====================================================
  // 第2.5层：仇恨值博弈规则（不变）
  // =====================================================
  {
    id: 'P-HATE-30', name: '点兵-诱导大奖(仇恨30+)',
    description: '玩家连续多选5倍套利，提高大奖概率引诱其改变策略',
    priority: 62, gameIds: ['pointing_game'],
    condition: (ctx) => ctx.user.arbitrageScore >= 30 && ctx.user.arbitrageScore < 50,
    action: (ctx) => ({
      action: 'ADJUST',
      modifier: { normal: 0.8, special: 1.2, _specialHeroWeights: { '关羽': 0.5, '张飞': 1.0, '梁红玉': 2.0, '穆桂英': 3.0 } },
      reason: `POINTING_LURE_HIGH_ODDS(Hate:${ctx.user.arbitrageScore})`
    })
  },
  {
    id: 'P-HATE-50', name: '点兵-强诱导大奖(仇恨50+)',
    description: '仇恨达到50，极高概率开出30/40倍大奖',
    priority: 63, gameIds: ['pointing_game'],
    condition: (ctx) => ctx.user.arbitrageScore >= 50 && ctx.user.arbitrageScore < 70,
    action: (ctx) => ({
      action: 'ADJUST',
      modifier: { normal: 0.6, special: 1.4, _specialHeroWeights: { '关羽': 0.2, '张飞': 0.5, '梁红玉': 3.0, '穆桂英': 5.0 } },
      reason: `POINTING_HEAVY_LURE(Hate:${ctx.user.arbitrageScore})`
    })
  },
  {
    id: 'P-HATE-70', name: '点兵-暗箱反杀(仇恨70+)',
    description: '仇恨爆表，强制开出对平台最有利的结果',
    priority: 64, gameIds: ['pointing_game'],
    condition: (ctx) => ctx.user.arbitrageScore >= 70,
    action: (ctx) => ({
      action: 'ADJUST',
      modifier: { normal: 0.1, special: 1.9 },
      constraints: { forceMinPayout: true },
      reason: `POINTING_DARK_BOX_KILL(Hate:${ctx.user.arbitrageScore})`
    })
  },
  {
    id: 'R-HATE-30', name: '巨人-顺势杀(仇恨30+)',
    description: '玩家死磕单边，压低其下注选项的概率',
    priority: 62, gameIds: ['giant_racing'],
    condition: (ctx) => ctx.user.arbitrageScore >= 30 && ctx.user.arbitrageScore < 50 && ctx.current.isStuckBet,
    action: (ctx) => {
      const stuckChoice = ctx.current.lastRacingChoice;
      const modifier = { red: 1.0, blue: 1.0, draw: 1.0 };
      if (stuckChoice === 'red') modifier.red = 0.6;
      else if (stuckChoice === 'blue') modifier.blue = 0.6;
      return { action: 'ADJUST', modifier, constraints: {}, reason: `RACING_FOLLOW_KILL(Hate:${ctx.user.arbitrageScore}, Against:${stuckChoice})` };
    }
  },
  {
    id: 'R-HATE-50', name: '巨人-极限施压(仇恨50+)',
    description: '大幅压低其死磕选项的概率',
    priority: 63, gameIds: ['giant_racing'],
    condition: (ctx) => ctx.user.arbitrageScore >= 50 && ctx.user.arbitrageScore < 70 && ctx.current.isStuckBet,
    action: (ctx) => {
      const stuckChoice = ctx.current.lastRacingChoice;
      const modifier = { red: 1.0, blue: 1.0, draw: 1.0 };
      if (stuckChoice === 'red') modifier.red = 0.2;
      else if (stuckChoice === 'blue') modifier.blue = 0.2;
      return { action: 'ADJUST', modifier, constraints: {}, reason: `RACING_HEAVY_PRESS(Hate:${ctx.user.arbitrageScore}, Against:${stuckChoice})` };
    }
  },
  {
    id: 'R-HATE-70', name: '巨人-暗箱反向(仇恨70+)',
    description: '仇恨爆表，强制开出反向结果',
    priority: 64, gameIds: ['giant_racing'],
    condition: (ctx) => ctx.user.arbitrageScore >= 70,
    action: (ctx) => ({
      action: 'ADJUST',
      modifier: { red: 1.0, blue: 1.0, draw: 1.0 },
      constraints: { forceOpposite: true },
      reason: `RACING_DARK_BOX_REVERSE(Hate:${ctx.user.arbitrageScore})`
    })
  },

  // =====================================================
  // 第三层：系统池规则（不变，这是最后防线）
  // =====================================================
  {
    id: 'R301-CRITICAL', name: '系统危急-极限吸血',
    description: '系统池严重亏损，极限压制',
    priority: 55, gameIds: null,
    condition: (ctx) => ctx.system.profitRate < -0.15,
    action: (ctx) => {
      const betAmount = ctx.current.betAmount;
      let factor = 0.15;
      if (betAmount >= 5000) factor = 0.03;
      else if (betAmount >= 2000) factor = 0.06;
      else if (betAmount >= 1000) factor = 0.10;
      const specialHeroWeights = {};
      if (ctx.current.gameId === 'pointing_game') {
        specialHeroWeights['关羽'] = 1.0; specialHeroWeights['张飞'] = 0.3;
        specialHeroWeights['梁红玉'] = 0.1; specialHeroWeights['穆桂英'] = 0.01;
      }
      return { action: 'ADJUST', modifier: { _all: factor, special: 0.2, _specialHeroWeights: specialHeroWeights }, constraints: {}, reason: `SYSTEM_CRITICAL_DRAIN(Bet:${betAmount})` };
    }
  },
  {
    id: 'R301-SEVERE', name: '系统重度亏损-强杀大额',
    description: '系统池中度亏损，压制大额',
    priority: 52, gameIds: null,
    condition: (ctx) => ctx.system.profitRate >= -0.15 && ctx.system.profitRate < -0.10,
    action: (ctx) => {
      const betAmount = ctx.current.betAmount;
      let factor = 0.3;
      if (betAmount >= 5000) factor = 0.10;
      else if (betAmount >= 2000) factor = 0.15;
      else if (betAmount >= 1000) factor = 0.20;
      const specialHeroWeights = {};
      if (ctx.current.gameId === 'pointing_game') {
        specialHeroWeights['关羽'] = 1.0; specialHeroWeights['张飞'] = 0.5;
        specialHeroWeights['梁红玉'] = 0.3; specialHeroWeights['穆桂英'] = 0.1;
      }
      return { action: 'ADJUST', modifier: { _all: factor, special: 0.5, _specialHeroWeights: specialHeroWeights }, constraints: {}, reason: `SYSTEM_SEVERE_SUPPRESS(Bet:${betAmount})` };
    }
  },
  {
    id: 'R301', name: '系统轻度止损',
    description: '系统池轻度亏损，微调概率',
    priority: 50, gameIds: null,
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
        specialHeroWeights['穆桂英'] = 0.5; specialHeroWeights['梁红玉'] = 0.7;
      }
      return { action: 'ADJUST', modifier: { _all: baseFactor, special: 0.8, _specialHeroWeights: specialHeroWeights }, constraints: {}, reason: `SYSTEM_BLEEDING(${(rate * 100).toFixed(1)}%, Bet:${betAmount})` };
    }
  },
  {
    id: 'R302-LIGHT', name: '系统轻度丰收-安全垫放水',
    description: '池子盈利10%-30%，根据安全垫比例决定是否给大额放水',
    priority: 45, gameIds: null,
    condition: (ctx) => ctx.system.profitRate >= 0.10 && ctx.system.profitRate < 0.30,
    action: (ctx) => {
      const betAmount = ctx.current.betAmount;
      const poolProfit = ctx.system.poolProfit;
      if (betAmount < 500) return { action: 'ADJUST', modifier: { _all: 1.08, special: 1.2 }, constraints: {}, reason: `POOL_FEEDING_SMALL(Bet:${betAmount})` };
      const maxNetLoss = betAmount * 2;
      const safeRatio = poolProfit > 0 ? maxNetLoss / poolProfit : 999;
      if (safeRatio < 0.05) return { action: 'ADJUST', modifier: { _all: 1.05, special: 1.15 }, constraints: {}, reason: `POOL_RICH_FEEDING(Ratio:${(safeRatio*100).toFixed(1)}%, Bet:${betAmount})` };
      else if (safeRatio < 0.15) return { action: 'ADJUST', modifier: { _all: 1.0, special: 1.1 }, constraints: {}, reason: `POOL_OK_NEUTRAL(Ratio:${(safeRatio*100).toFixed(1)}%, Bet:${betAmount})` };
      else if (safeRatio < 0.30) return { action: 'ADJUST', modifier: { _all: 0.95, special: 1.0 }, constraints: {}, reason: `POOL_TIGHT_HOLD(Ratio:${(safeRatio*100).toFixed(1)}%, Bet:${betAmount})` };
      else return { action: 'ADJUST', modifier: { _all: 0.88, special: 0.9 }, constraints: {}, reason: `POOL_STILL_NEED(Ratio:${(safeRatio*100).toFixed(1)}%, Bet:${betAmount})` };
    }
  },
  {
    id: 'R302-MODERATE', name: '系统中度丰收-安全垫放水',
    description: '池子盈利30%-60%，安全垫更厚，放水更积极',
    priority: 42, gameIds: null,
    condition: (ctx) => ctx.system.profitRate >= 0.30 && ctx.system.profitRate < 0.60,
    action: (ctx) => {
      const betAmount = ctx.current.betAmount;
      const poolProfit = ctx.system.poolProfit;
      if (betAmount < 500) return { action: 'ADJUST', modifier: { _all: 1.12, special: 1.4 }, constraints: {}, reason: `POOL_FEAST_SMALL(Bet:${betAmount})` };
      if (betAmount < 1000) return { action: 'ADJUST', modifier: { _all: 1.05, special: 1.2 }, constraints: {}, reason: `POOL_FEAST_MID(Bet:${betAmount})` };
      const maxNetLoss = betAmount * 2;
      const safeRatio = poolProfit > 0 ? maxNetLoss / poolProfit : 999;
      if (safeRatio < 0.08) return { action: 'ADJUST', modifier: { _all: 1.08, special: 1.3 }, constraints: {}, reason: `POOL_VERY_RICH(Ratio:${(safeRatio*100).toFixed(1)}%, Bet:${betAmount})` };
      else if (safeRatio < 0.20) return { action: 'ADJUST', modifier: { _all: 1.02, special: 1.1 }, constraints: {}, reason: `POOL_SAFE_FEED(Ratio:${(safeRatio*100).toFixed(1)}%, Bet:${betAmount})` };
      else if (safeRatio < 0.40) return { action: 'ADJUST', modifier: { _all: 0.98, special: 1.0 }, constraints: {}, reason: `POOL_MODERATE_HOLD(Ratio:${(safeRatio*100).toFixed(1)}%, Bet:${betAmount})` };
      else return { action: 'ADJUST', modifier: { _all: 0.90, special: 0.9 }, constraints: {}, reason: `POOL_STILL_GREEDY(Ratio:${(safeRatio*100).toFixed(1)}%, Bet:${betAmount})` };
    }
  },
  {
    id: 'R302-HEAVY', name: '系统极度丰收-狂欢模式',
    description: '池子盈利>60%，小鱼狂欢，大鱼看安全垫',
    priority: 40, gameIds: null,
    condition: (ctx) => ctx.system.profitRate >= 0.60,
    action: (ctx) => {
      const betAmount = ctx.current.betAmount;
      const poolProfit = ctx.system.poolProfit;
      if (betAmount < 1000) return { action: 'ADJUST', modifier: { _all: 1.15, special: 1.6 }, constraints: {}, reason: `POOL_CARNIVAL(Bet:${betAmount})` };
      if (betAmount < 3000) return { action: 'ADJUST', modifier: { _all: 1.08, special: 1.3 }, constraints: {}, reason: `POOL_CARNIVAL_MID(Bet:${betAmount})` };
      const maxNetLoss = betAmount * 2;
      const safeRatio = poolProfit > 0 ? maxNetLoss / poolProfit : 999;
      if (safeRatio < 0.10) return { action: 'ADJUST', modifier: { _all: 1.10, special: 1.5 }, constraints: {}, reason: `POOL_MEGA_RICH(Ratio:${(safeRatio*100).toFixed(1)}%, Bet:${betAmount})` };
      else if (safeRatio < 0.25) return { action: 'ADJUST', modifier: { _all: 1.05, special: 1.2 }, constraints: {}, reason: `POOL_VERY_SAFE(Ratio:${(safeRatio*100).toFixed(1)}%, Bet:${betAmount})` };
      else if (safeRatio < 0.50) return { action: 'ADJUST', modifier: { _all: 1.0, special: 1.05 }, constraints: {}, reason: `POOL_OK_NEUTRAL(Ratio:${(safeRatio*100).toFixed(1)}%, Bet:${betAmount})` };
      else return { action: 'ADJUST', modifier: { _all: 0.92, special: 0.95 }, constraints: {}, reason: `POOL_CAREFUL(Ratio:${(safeRatio*100).toFixed(1)}%, Bet:${betAmount})` };
    }
  },

  // =====================================================
  // 第四层：连败安抚（不变）
  // =====================================================
  {
    id: 'R402', name: '连败安抚',
    description: '连败太多必须安抚防流失，大额概率回归中性，小额给安慰',
    priority: 25, gameIds: null,
    condition: (ctx) => ctx.user.consecutiveLosses >= 5,
    action: (ctx) => {
      const betAmount = ctx.current.betAmount;
      const losses = ctx.user.consecutiveLosses;
      if (betAmount >= 3000) {
        let cooldown = 2;
        if (losses >= 15) cooldown = 5;
        else if (losses >= 10) cooldown = 3;
        return { action: 'ADJUST', modifier: { _all: 1.0 }, constraints: { cooldownSeconds: cooldown }, reason: `HIGH_STAKE_LOSING_NEUTRAL(Losses:${losses}, CD:${cooldown}s)` };
      }
      const poolProfit = ctx.system.poolProfit || 0;
      let poolDiscount = 1.0;
      if (poolProfit < 0) poolDiscount = 0.5;
      let factor = 1.0;
      if (losses >= 15) factor = 1.6;
      else if (losses >= 10) factor = 1.4;
      else if (losses >= 5) factor = 1.2;
      factor = 1.0 + (factor - 1.0) * poolDiscount;
      const specialModifier = ctx.current.gameId === 'pointing_game' ? { _specialHeroWeights: { '关羽': 1.5, '张飞': 2.0 } } : {};
      return { action: 'ADJUST', modifier: { _all: factor, ...specialModifier }, constraints: {}, reason: `SMALL_STAKE_COMFORT(Losses:${losses}, Factor:${factor.toFixed(2)}, PoolDiscount:${poolDiscount})` };
    }
  },
];

/**
 * 规则执行器（不变）
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

    if (result.action === 'BLOCK') {
      if (result.constraints?.cooldownSeconds) {
        finalConstraints.cooldownSeconds = finalConstraints.cooldownSeconds
          ? Math.max(finalConstraints.cooldownSeconds, result.constraints.cooldownSeconds)
          : result.constraints.cooldownSeconds;
      }
      return { action: 'BLOCK', modifier: result.modifier, constraints: finalConstraints, triggeredRules, reason: reasons.join(' + ') };
    }

    if (result.action === 'PASS') {
      if (result.constraints?.cooldownSeconds) {
        finalConstraints.cooldownSeconds = finalConstraints.cooldownSeconds
          ? Math.max(finalConstraints.cooldownSeconds, result.constraints.cooldownSeconds)
          : result.constraints.cooldownSeconds;
      }
      continue;
    }

    if (result.action === 'ADJUST' && result.modifier) {
      finalAction = 'ADJUST';
      if (result.modifier._all) {
        for (const key of Object.keys(context.current.baseProb || {})) {
          finalModifier[key] = (finalModifier[key] || 1.0) * result.modifier._all;
        }
      } else {
        for (const [key, val] of Object.entries(result.modifier)) {
          if (key !== '_all' && key !== '_specialHeroWeights' && key !== 'emptyWeightFactor') {
            finalModifier[key] = (finalModifier[key] || 1.0) * val;
          }
        }
      }
      if (result.modifier._specialHeroWeights) {
        if (!finalModifier._specialHeroWeights) finalModifier._specialHeroWeights = {};
        for (const [heroName, weightFactor] of Object.entries(result.modifier._specialHeroWeights)) {
          finalModifier._specialHeroWeights[heroName] = (finalModifier._specialHeroWeights[heroName] || 1.0) * weightFactor;
        }
      }
      if (result.modifier.emptyWeightFactor) {
        finalModifier.emptyWeightFactor = Math.max(finalModifier.emptyWeightFactor || 1.0, result.modifier.emptyWeightFactor);
      }
    }

    if (result.constraints) {
      if (result.constraints.forceMinPayout) finalConstraints.forceMinPayout = true;
      if (result.constraints.forceOpposite) finalConstraints.forceOpposite = true;
      if (result.constraints.cooldownSeconds) {
        finalConstraints.cooldownSeconds = finalConstraints.cooldownSeconds
          ? Math.max(finalConstraints.cooldownSeconds, result.constraints.cooldownSeconds)
          : result.constraints.cooldownSeconds;
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
