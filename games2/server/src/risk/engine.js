// src/risk/engine.js
import RiskProfile from './models/RiskProfile.js';
import SystemPool from './models/SystemPool.js';
import { executeRules } from './rules.js';

class RiskEngine {
  constructor() {
    this.profileCache = new Map();
    this.poolCache = { data: null, expiry: 0 };
  }

  async evaluate({ type, userId, gameId, payload }) {
    try {
      const userProfile = await this._getProfile(userId);
      const pool = await this._getPool();
      const context = this._buildContext(userProfile, pool, payload);

      // 1. 规则引擎原始决策
      const baseDecision = executeRules(context);

      // 2. ★★★ 核心动态吃分控制 ★★★
      const eatProgress = context.system.eatProgress || 0;
      const finalDecision = this._applyImpactFactor(baseDecision, eatProgress);

      return { ...finalDecision, context };
    } catch (err) {
      console.error('[风控引擎] 评估异常:', err);
      return {
        action: 'ALLOW',
        modifier: {},
        constraints: {},
        reason: '引擎异常保底放行',
        context: {},
        eatPhase: 'DORMANT',
        eatProgress: 0,
        gameImpact: 0
      };
    }
  }

  /**
   * ★★★ 四阶段动态吃分控制 ★★★
   * 
   * eatProgress = 今日获得/今日发放
   * 
   * 阶段一 KILL    (< 0.5)  : 规则100%生效，全力压制
   * 阶段二 DECAY   (0.5~0.8): 规则影响力从100%线性衰减到0%
   * 阶段三 DORMANT (0.8~1.0): 规则完全休眠，纯放行
   * 阶段四 FEED    (≥ 1.0) : 反向放水，主动提升玩家胜率
   */
  _applyImpactFactor(decision, eatProgress) {
    const baseReason = decision.reason || '';
    const hasModifier = decision.modifier && Object.keys(decision.modifier).length > 0;

    // =====================================================
    // 阶段一：KILL — 吃分进度 < 50%，规则全力生效
    // =====================================================
    if (eatProgress < 0.5) {
      return {
        ...decision,
        eatProgress,
        eatPhase: 'KILL',
        gameImpact: 1.0,  // 规则100%力度
        reason: `${baseReason} [进度:${(eatProgress * 100).toFixed(0)}%, 阶段:全力压制]`
      };
    }

    // =====================================================
    // 阶段二：DECAY — 吃分进度 50%~80%，规则线性衰减
    //   0.5 → impactFactor=1.0 (规则全效)
    //   0.8 → impactFactor=0.0 (规则失效)
    // =====================================================
    if (eatProgress < 0.8) {
      const impactFactor = 1.0 - (eatProgress - 0.5) / 0.3;

      if (!hasModifier) {
        return {
          ...decision,
          eatProgress,
          eatPhase: 'DECAY',
          gameImpact: impactFactor,
          reason: `${baseReason} [进度:${(eatProgress * 100).toFixed(0)}%, 阶段:衰减, 力度:${(impactFactor * 100).toFixed(0)}%]`
        };
      }

      // 缩放 modifier 中所有概率因子，向1.0(中性)靠拢
      const newModifier = {};
      for (const [key, val] of Object.entries(decision.modifier)) {
        if (key === '_specialHeroWeights') {
          // 特殊英雄权重：同样缩放
          const newWeights = {};
          for (const [hero, w] of Object.entries(val)) {
            newWeights[hero] = 1.0 + (w - 1.0) * impactFactor;
          }
          newModifier._specialHeroWeights = newWeights;
        } else if (key === 'emptyWeightFactor') {
          // 空位权重：向1.0靠拢
          newModifier.emptyWeightFactor = 1.0 + (val - 1.0) * impactFactor;
        } else {
          // 普通概率因子：向1.0靠拢
          newModifier[key] = 1.0 + (val - 1.0) * impactFactor;
        }
      }

      return {
        action: decision.action,
        modifier: newModifier,
        constraints: decision.constraints,
        eatProgress,
        eatPhase: 'DECAY',
        gameImpact: impactFactor,
        reason: `${baseReason} [进度:${(eatProgress * 100).toFixed(0)}%, 阶段:衰减, 力度:${(impactFactor * 100).toFixed(0)}%]`
      };
    }

    // =====================================================
    // 阶段三：DORMANT — 吃分进度 80%~100%，规则完全休眠
    // =====================================================
    if (eatProgress < 1.0) {
      return {
        action: 'ALLOW',
        modifier: {},
        constraints: decision.constraints,
        eatProgress,
        eatPhase: 'DORMANT',
        gameImpact: 0.0,
        triggeredRules: decision.triggeredRules,
        reason: `${baseReason} [进度:${(eatProgress * 100).toFixed(0)}%, 阶段:休眠]`
      };
    }

    // =====================================================
    // 阶段四：FEED — 吃分进度 ≥ 100%，主动放水
    //   超额越多，放水力度越大（有上限防失控）
    // =====================================================
    const overfeed = eatProgress - 1.0;
    // feedBoost: 0.0 → 0.30 (上限30%加成)
    // 1.0 → 0.04, 1.5 → 0.20, 2.0 → 0.30
    const feedBoost = Math.min(0.30, overfeed * 0.35);

    return {
      action: 'ALLOW',
      modifier: {},
      constraints: decision.constraints,
      eatProgress,
      eatPhase: 'FEED',
      gameImpact: -feedBoost,  // 负值 = 放水信号
      triggeredRules: decision.triggeredRules,
      reason: `${baseReason} [进度:${(eatProgress * 100).toFixed(0)}%, 阶段:放水, 加成:${(feedBoost * 100).toFixed(0)}%]`
    };
  }

  /**
   * ★★★ 结算方法：修正参数格式 + 更新仇恨值 ★★★
   */
  async settle(userId, gameId, betAmount, payoutAmount, details = {}) {
    try {
      const profile = await this._getProfile(userId, true);
      const isWin = payoutAmount > betAmount;

      // 1. 更新基础统计
      profile.settle({ betAmount, payout: payoutAmount, won: isWin, gameId });

      // 2. ★ 更新仇恨值/套利分 ★
      if (gameId === 'pointing_game') {
        const coverage = details.coverageRate || 0;
        if (coverage > 0.5) {
          // 多面下注，增加套利嫌疑
          profile.pointingArbitrageScore += Math.ceil(coverage * 25);
        } else if (coverage > 0.25) {
          profile.pointingArbitrageScore += Math.ceil(coverage * 10);
        }
        if (!isWin) {
          // 输了减仇恨，防止误杀
          profile.pointingArbitrageScore = Math.max(0, profile.pointingArbitrageScore - 8);
        }
        // 上限100
        profile.pointingArbitrageScore = Math.min(100, profile.pointingArbitrageScore);
      }

      if (gameId === 'giant_racing') {
        // 更新上一次选择（用于判断死磕）
        const choices = details.choices || [];
        if (choices.length === 1) {
          profile.lastRacingChoice = choices[0];
          // 连续同一边，增加套利分
          if (details.isStuckBet) {
            profile.racingArbitrageScore += 15;
          } else {
            profile.racingArbitrageScore += 5;
          }
        } else if (choices.length > 1) {
          // 多面下注重置单边追踪
          profile.lastRacingChoice = null;
        }
        if (!isWin) {
          profile.racingArbitrageScore = Math.max(0, profile.racingArbitrageScore - 8);
        }
        profile.racingArbitrageScore = Math.min(100, profile.racingArbitrageScore);
      }

      await profile.save();
      this.profileCache.set(userId, { data: profile, expiry: Date.now() + 5000 });

      // 3. 更新系统池
      const profitDelta = betAmount - payoutAmount;
      await SystemPool.updateOne(
        { key: 'default' },
        {
          $inc: {
            totalBet: betAmount,
            totalPayout: payoutAmount,
            netProfit: profitDelta,
            todayBet: betAmount,
            todayPayout: payoutAmount,
            todayProfit: profitDelta
          }
        }
      );
      this.poolCache.expiry = 0; // 强制刷新池子缓存
    } catch (err) {
      console.error('[风控引擎] 结算异常:', err);
    }
  }

  /**
   * ★★★ 构建上下文：补全缺失字段 ★★★
   */
  _buildContext(userProfile, pool, payload) {
    // 自动检测是否为"死磕"下注
    const lastRacingChoice = userProfile.lastRacingChoice || payload.lastRacingChoice || null;
    const currentChoices = payload.choices || [];
    const isStuckBet = payload.isStuckBet !== undefined
      ? payload.isStuckBet
      : (lastRacingChoice &&
         currentChoices.length === 1 &&
         currentChoices[0] === lastRacingChoice);

    // 用户净亏损（正数=亏了，负数=赚了）
    const userNetLoss = -(userProfile.historyProfit + userProfile.todayProfit);

    return {
      userId: userProfile.userId,
      user: {
        isHighRisk: userProfile.isHighRisk,
        isWhitelisted: userProfile.isWhitelisted,
        isInternal: userProfile.isInternal,
        todayProfit: userProfile.todayProfit || 0,
        todayBetCount: userProfile.todayBetCount || 0,
        todayTotalBet: userProfile.todayTotalBet || 0,
        totalBetAmount: userProfile.totalBetAmount || 0,
        totalPayoutAmount: userProfile.totalPayoutAmount || 0,
        consecutiveWins: userProfile.consecutiveWins || 0,
        consecutiveLosses: userProfile.consecutiveLosses || 0,
        historyProfit: userProfile.historyProfit || 0,
        // ★ 补全：用户净亏损（大R安抚/防套利需要）
        userNetLoss: userNetLoss,
        // ★ 补全：仇恨值（按游戏分开）
        arbitrageScore: (userProfile.pointingArbitrageScore || 0) + (userProfile.racingArbitrageScore || 0),
        pointingArbitrageScore: userProfile.pointingArbitrageScore || 0,
        racingArbitrageScore: userProfile.racingArbitrageScore || 0,
        lastRacingChoice: lastRacingChoice
      },
      system: {
        netProfit: pool.netProfit || 0,
        profitRate: pool.profitRate || 0,
        poolProfit: pool.netProfit || 0,
        // ★ 统一键名：同时提供两个派生值
        eatProgress: pool.eatProgress || 0,    // 原始进度 0~1+
        eatPressure: pool.eatPressure || 0      // 压力值 0~1（供动态抽水用）
      },
      current: {
        betAmount: payload.betAmount || 0,
        choices: currentChoices,
        gameId: payload.gameId || 'unknown',
        coverageRate: payload.coverageRate || 0,
        betDistribution: payload.betDistribution || {},
        baseProb: payload.baseProbMap || payload.baseProb || {},
        // ★ 自动检测死磕
        isStuckBet: isStuckBet,
        lastRacingChoice: lastRacingChoice
      }
    };
  }

  // ========== 破产保护（巨人赛跑专用）==========
  applyBankruptcyProtection(probMap, netLossMap, maxTolerance) {
    const totalExpectedLoss = Object.entries(probMap).reduce(
      (sum, [k, p]) => sum + p * Math.max(0, netLossMap[k]), 0
    );
    if (totalExpectedLoss <= maxTolerance) return probMap;

    // 逐步调整：削减高亏损结果的概率，补偿到低亏损结果
    const adjusted = { ...probMap };
    const safeKeys = Object.entries(netLossMap)
      .filter(([, loss]) => loss <= maxTolerance * 0.5)
      .map(([k]) => k);

    if (safeKeys.length === 0) return null; // 无法保护

    const dangerKeys = Object.entries(netLossMap)
      .filter(([, loss]) => loss > maxTolerance)
      .map(([k]) => k);

    let rescuedProb = 0;
    for (const dk of dangerKeys) {
      rescuedProb += adjusted[dk] * 0.5;
      adjusted[dk] *= 0.5;
    }
    for (const sk of safeKeys) {
      adjusted[sk] += rescuedProb / safeKeys.length;
    }

    // 归一化
    const total = Object.values(adjusted).reduce((s, p) => s + p, 0);
    for (const k of Object.keys(adjusted)) adjusted[k] /= total;
    return adjusted;
  }

  // ========== 工具方法（供游戏路由调用）==========
  applyModifier(baseProbMap, modifier) {
    if (!modifier || Object.keys(modifier).length === 0) return baseProbMap;
    const adjustedMap = {};
    for (const [key, baseProb] of Object.entries(baseProbMap)) {
      let factor = 1.0;
      if (modifier[key] !== undefined) factor = modifier[key];
      else if (key !== 'all_survived' && key !== 'all_eliminated') {
        const isSpecial = ['关羽', '张飞', '梁红玉', '穆桂英'].includes(key);
        if (isSpecial && modifier.special !== undefined) factor = modifier.special;
        if (!isSpecial && modifier.normal !== undefined) factor = modifier.normal;
      }
      adjustedMap[key] = baseProb * factor;
    }
    if (modifier._specialHeroWeights) {
      for (const [heroName, weightFactor] of Object.entries(modifier._specialHeroWeights)) {
        if (adjustedMap[heroName] !== undefined) adjustedMap[heroName] *= weightFactor;
      }
    }
    const totalProb = Object.values(adjustedMap).reduce((s, p) => s + p, 0);
    if (totalProb <= 0) return { '赵云': 0.25, '秦良玉': 0.25, '马超': 0.25, '花木兰': 0.25 };
    const finalMap = {};
    for (const key of Object.keys(adjustedMap)) finalMap[key] = adjustedMap[key] / totalProb;
    return finalMap;
  }

  // ========== 缓存方法 ==========
  async _getProfile(userId, forceRefresh = false) {
    const cached = this.profileCache.get(userId);
    if (!forceRefresh && cached && cached.expiry > Date.now()) return cached.data;
    let profile = await RiskProfile.findOne({ userId });
    if (!profile) profile = await RiskProfile.create({ userId });
    this.profileCache.set(userId, { data: profile, expiry: Date.now() + 5000 });
    return profile;
  }

  async _getPool(forceRefresh = false) {
    if (!forceRefresh && this.poolCache.data && this.poolCache.expiry > Date.now()) return this.poolCache.data;
    let pool = await SystemPool.findOne({ key: 'default' });
    if (!pool) pool = await SystemPool.create({ key: 'default', netProfit: 0, totalBet: 0, totalPayout: 0 });
    this.poolCache = { data: pool, expiry: Date.now() + 5000 };
    return pool;
  }
}

export default new RiskEngine();
