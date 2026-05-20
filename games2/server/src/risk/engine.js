// src/risk/engine.js
import RiskProfile from './models/RiskProfile.js';
import RiskLog from './models/RiskLog.js';
import SystemPool from './models/SystemPool.js';
import { RULES, executeRules } from './rules.js';
import { generateTraceId } from './config.js';
import User from '../models/User.js';

class RiskEngine {
  constructor() {
    this._poolCache = null;
    this._poolCacheTime = 0;
  }

  async evaluate(event) {
    const traceId = generateTraceId(event.userId);
    let profile = await this._getOrCreateProfile(event.userId);
    const today = new Date().toISOString().slice(0, 10);
    if (profile.lastSettleDate !== today) {
      profile.resetDaily(today);
    }

    const pool = await this._getPool();
    const betAmount = event.payload.betAmount;
    const profitRate = pool.profitRate;

    // ==========================================
    // ★★★ 动态计算仇恨值 (V3.1 加速版) ★★★
    // ==========================================
    let isArbitrage = false;
    let isMartingale = false;
    let isStuckBet = false;

    if (event.gameId === 'pointing_game') {
      let score = profile.pointingArbitrageScore || 0;
      const betDistribution = event.payload.betDistribution || {};
      const specialNames = ['关羽', '张飞', '梁红玉', '穆桂英'];
      let normalBetCount = 0;
      let specialBetCount = 0;

      for (const [name, amount] of Object.entries(betDistribution)) {
        if (amount > 0) {
          if (specialNames.includes(name)) specialBetCount++;
          else normalBetCount++;
        }
      }

      const totalCovered = normalBetCount + specialBetCount;
      let increment = 0;
      if (totalCovered === 1) increment = 1;
      else if (totalCovered === 2) increment = 3;
      else if (totalCovered === 3) increment = 5;
      else if (totalCovered >= 4) increment = 8;

      isArbitrage = totalCovered >= 2;

      if (betAmount >= 3000) increment *= 3;
      else if (betAmount >= 1000) increment *= 2;

      score = Math.min(100, score + increment);
      profile.pointingArbitrageScore = score;

    } else if (event.gameId === 'giant_racing') {
      let score = profile.racingArbitrageScore || 0;
      const currentChoice = event.payload.choices[0];
      
      if (profile.lastRacingChoice && currentChoice === profile.lastRacingChoice) {
        isStuckBet = true;
        if (profile.lastRacingBetAmount > 0 && betAmount >= profile.lastRacingBetAmount * 1.5) {
          isMartingale = true;
          score += 5;
        } else {
          score += 2;
        }
        
        if (profile.consecutiveLosses >= 3) {
          score += 5; 
        }
      } else {
        score = Math.max(0, score - 5);
      }

      if (betAmount >= 3000) score += 10;
      else if (betAmount >= 1000) score += 5;

      score = Math.min(100, score);
      profile.racingArbitrageScore = score;
      profile.lastRacingChoice = currentChoice;
      profile.lastRacingBetAmount = betAmount;
    }

    await profile.save();

    const context = this._buildContext(profile, pool, event);

    if (event.gameId === 'pointing_game') {
      context.user.arbitrageScore = profile.pointingArbitrageScore || 0;
      context.current.isArbitragePattern = isArbitrage;
    } else if (event.gameId === 'giant_racing') {
      context.user.arbitrageScore = profile.racingArbitrageScore || 0;
      context.current.isMartingale = isMartingale;
      context.current.isStuckBet = isStuckBet;
      context.current.lastRacingChoice = profile.lastRacingChoice;
    }

    const rawDecision = executeRules(context);
    const decision = this._normalizeDecision(rawDecision, event);
    decision.riskScore = this._calculateRiskScore(context, decision);
    decision.poolProfit = pool.netProfit;

    console.log(`[风控评估] ${event.gameId === 'pointing_game' ? '⚔️点兵' : '🏃巨人'} | 用户:${event.userId.toString().slice(-4)} | 下注:${betAmount} | 连败:${profile.consecutiveLosses} | 池:${(profitRate * 100).toFixed(1)}% | 仇恨:${context.user.arbitrageScore} | 决策:${decision.action} | 触发:${decision.reason} | 修正:${JSON.stringify(decision.modifier)} | 约束:${JSON.stringify(decision.constraints)}`);

    this._logDecision(traceId, event, context, decision).catch(() => {});
    return decision;
  }

  async settle(settleInfo) {
    const { userId, betAmount, payout, won, gameId } = settleInfo;
    const profile = await this._getOrCreateProfile(userId);
    const today = new Date().toISOString().slice(0, 10);
    if (profile.lastSettleDate !== today) profile.resetDaily(today);

    profile.settle({ betAmount, payout, won, gameId });

    const hourKey = new Date().toISOString().slice(0, 13);
    const hourStat = profile.hourlyStats.find(h => h.hour === hourKey);
    if (hourStat) {
      hourStat.profit += (won ? payout - betAmount : -betAmount);
      hourStat.betCount += 1;
      if (won) hourStat.winCount += 1;
    } else {
      profile.hourlyStats.push({
        hour: hourKey,
        profit: won ? payout - betAmount : -betAmount,
        betCount: 1,
        winCount: won ? 1 : 0
      });
    }

    profile.riskScore = this._calculateProfileRiskScore(profile);
    profile.riskLevel = this._scoreToLevel(profile.riskScore);

    // ==========================================
    // ★★★ 仇恨值衰减机制 (V3.1 - 修复NaN) ★★★
    // ==========================================
    if (gameId === 'pointing_game') {
      const currentScore = profile.pointingArbitrageScore || 0; // ★ 兜底防NaN
      if (won) {
        const netProfit = payout - betAmount;
        if (netProfit > betAmount * 2) {
          profile.pointingArbitrageScore = Math.max(0, currentScore - 10);
          console.log(`[风控结算] 🎉 点兵开出大奖，仇恨衰减至 ${profile.pointingArbitrageScore}`);
        } else if (netProfit > 0) {
          profile.pointingArbitrageScore = Math.max(0, currentScore - 2);
        }
      } else if (!won) {
        profile.pointingArbitrageScore = Math.max(0, currentScore - 1);
      }
    } else if (gameId === 'giant_racing') {
      const currentScore = profile.racingArbitrageScore || 0; // ★ 兜底防NaN
      if (won && payout > betAmount * 1.5) {
        profile.racingArbitrageScore = Math.max(0, currentScore - 15);
        console.log(`[风控结算] 🎉 巨人倍投成功，仇恨衰减至 ${profile.racingArbitrageScore}`);
      } else if (!won) {
        profile.racingArbitrageScore = Math.max(0, currentScore - 2);
      }
    }

    await profile.save();

    if (profile.isInternal) {
      console.log(`[风控结算] ✅ 内部账号 ${userId} 流水不计入系统池`);
      return;
    }
    console.log(`[风控结算] ⚠️ 普通账号 ${userId} 流水计入系统池`);

    const pool = await this._getPool();
    pool.settle(betAmount, payout);
    await pool.save();
    this._poolCache = pool;
    this._poolCacheTime = Date.now();

    this._backfillLog(settleInfo).catch(() => {});
  }

  // ★★★ 核心修复：去掉归一化，返回绝对权重概率 ★★★
  applyModifier(baseProb, modifier) {
    if (!modifier) return baseProb;
    const result = {};
    for (const [key, prob] of Object.entries(baseProb)) {
      if (key === '_specialHeroWeights' || key === 'emptyWeightFactor') continue;
      const factor = modifier[key] !== undefined ? modifier[key] : (modifier._all || 1.0);
      result[key] = prob * factor;
    }
    // ★ 不再归一化！让路由层根据游戏特性自己处理（点兵吸尘器 / 巨人定向压制）
    return result;
  }

  applyBankruptcyProtection(probMap, netLossMap, maxNetLossTolerance) {
    let needReallocate = 0;
    const safeProbMap = { ...probMap };

    for (const [result, netLoss] of Object.entries(netLossMap)) {
      if (netLoss > maxNetLossTolerance && safeProbMap[result] > 0) {
        console.log(`[破产保护] 🛑 结果 [${result}] 系统净亏损 ${netLoss} 超出单局容忍度 ${maxNetLossTolerance}，强制归零！`);
        needReallocate += safeProbMap[result];
        safeProbMap[result] = 0;
      }
    }

    if (needReallocate > 0) {
      const safeTotalProb = Object.values(safeProbMap).reduce((s, p) => s + p, 0);
      if (safeTotalProb > 0) {
        for (const result of Object.keys(safeProbMap)) {
          safeProbMap[result] += needReallocate * (safeProbMap[result] / safeTotalProb);
        }
      } else {
        return null; 
      }
    }
    return safeProbMap;
  }

  // ==================== 内部方法 ====================
  async _getOrCreateProfile(userId) {
    let profile = await RiskProfile.findOne({ userId });
    if (!profile) {
      const user = await User.findById(userId);
      profile = new RiskProfile({ userId, isInternal: user?.isInternal || false });
      await profile.save();
    }
    if (profile.isInternal === undefined || profile.isInternal === null) {
      const user = await User.findById(userId);
      profile.isInternal = user?.isInternal || false;
      await profile.save();
    }
    return profile;
  }

  async _getPool() {
    if (this._poolCache && Date.now() - this._poolCacheTime < 5000) {
      return this._poolCache;
    }
    let pool = await SystemPool.findOne({ key: 'default' });
    if (!pool) {
      pool = new SystemPool({ key: 'default' });
      await pool.save();
    }
    this._poolCache = pool;
    this._poolCacheTime = Date.now();
    return pool;
  }

  _buildContext(profile, pool, event) {
    const derived = profile.getDerivedFeatures();
    return {
      user: {
        id: profile.userId,
        isWhitelisted: profile.isWhitelisted,
        isHighRisk: profile.isHighRisk,
        isInternal: profile.isInternal,
        riskScore: profile.riskScore,
        todayProfit: profile.todayProfit,
        todayBetCount: profile.todayBetCount,
        todayWinCount: profile.todayWinCount,
        todayTotalBet: profile.todayTotalBet,
        todayMaxBet: profile.todayMaxBet,
        consecutiveWins: profile.consecutiveWins,
        consecutiveLosses: profile.consecutiveLosses,
        todayMaxConsecutiveWins: profile.todayMaxConsecutiveWins,
        historyProfit: profile.historyProfit,
        totalBetAmount: profile.totalBetAmount,
        totalPayoutAmount: profile.totalPayoutAmount,
        totalBetCount: profile.totalBetCount,
        totalWinCount: profile.totalWinCount,
        riskIndex: profile.riskIndex,
        lastBetAt: profile.lastBetAt,
        lastSettleDate: profile.lastSettleDate,
        arbitrageScore: 0,
        ...derived
      },
      system: {
        poolProfit: pool.netProfit,
        poolTotalBet: pool.totalBet,
        profitRate: pool.profitRate,
        todayPoolProfit: pool.todayProfit,
        todayPoolBet: pool.todayBet
      },
      current: {
        gameId: event.gameId,
        betAmount: event.payload.betAmount,
        choices: event.payload.choices,
        baseProb: event.payload.baseProb,
        coverageRate: event.payload.coverageRate || 0,
        betDistribution: event.payload.betDistribution || {},
        isArbitragePattern: false,
        isMartingale: false,
        isStuckBet: false,
        lastRacingChoice: null
      }
    };
  }

  _normalizeDecision(raw, event) {
    return {
      action: raw.action,
      modifier: raw.modifier,
      constraints: raw.constraints || {},
      triggeredRules: raw.triggeredRules || [],
      reason: raw.reason || ''
    };
  }

  _calculateRiskScore(context, decision) {
    let score = 0;
    if (context.user.todayProfit > 5000) score += 25;
    else if (context.user.todayProfit > 2000) score += 15;
    else if (context.user.todayProfit > 500) score += 5;

    if (context.user.consecutiveWins >= 5) score += 20;
    else if (context.user.consecutiveWins >= 3) score += 10;

    const totalProfit = context.user.historyProfit + context.user.todayProfit;
    if (totalProfit > 20000) score += 25;
    else if (totalProfit > 5000) score += 10;

    if (context.current.betAmount < 200 && context.user.todayProfit > 1000) score += 15;
    if (context.user.isHighRisk) score += 30;

    return Math.min(score, 100);
  }

  _calculateProfileRiskScore(profile) {
    let score = 0;
    const totalProfit = profile.historyProfit + profile.todayProfit;
    if (profile.isHighRisk) score += 40;
    if (profile.todayProfit > 5000) score += 20;
    if (totalProfit > 20000) score += 20;
    if (profile.consecutiveWins >= 5) score += 10;
    if (profile.riskIndex >= 30) score += 10;
    return Math.min(score, 100);
  }

  _scoreToLevel(score) {
    if (score >= 70) return 'EXTREME';
    if (score >= 45) return 'HIGH';
    if (score >= 20) return 'MEDIUM';
    return 'LOW';
  }

  async _logDecision(traceId, event, context, decision) {
    try {
      await RiskLog.create({
        traceId,
        userId: event.userId,
        gameId: event.gameId,
        event: {
          type: event.type,
          betAmount: event.payload.betAmount,
          choices: event.payload.choices,
          baseProb: event.payload.baseProb
        },
        contextSnapshot: {
          riskScore: decision.riskScore,
          todayProfit: context.user.todayProfit,
          historyProfit: context.user.historyProfit,
          consecutiveWins: context.user.consecutiveWins,
          poolProfitRate: context.system.profitRate
        },
        decision: {
          action: decision.action,
          modifier: decision.modifier,
          constraints: decision.constraints,
          triggeredRules: decision.triggeredRules,
          reason: decision.reason
        }
      });
    } catch (err) {
      console.error('[风控日志] 写入失败:', err.message);
    }
  }

  async _backfillLog(settleInfo) {
    try {
      const log = await RiskLog.findOne({
        userId: settleInfo.userId,
        gameId: settleInfo.gameId,
        actualResult: null
      }).sort({ createdAt: -1 });

      if (log) {
        log.actualResult = settleInfo.won ? 'WIN' : 'LOSE';
        log.actualPayout = settleInfo.payout;
        log.wasCorrect = log.decision.action === 'PASS' ? true : (settleInfo.won ? false : true);
        await log.save();
      }
    } catch (err) {}
  }
}

const engine = new RiskEngine();
export default engine;
