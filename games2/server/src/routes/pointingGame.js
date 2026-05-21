// src/routes/pointingGame.js
import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import PointingBet from '../models/PointingBet.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';
import crypto from 'crypto';
import riskEngine from '../risk/engine.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// ========== 游戏配置 ==========
const SERVICE_FEE = 0.05;
const POINTING_MIN_BET = 10;
const POINTING_MAX_BET = 50000; // 单注上限
const POINTING_MAX_TOTAL = 100000; // 总注上限
const MAX_COVERAGE = 6; // 最多同时下注6个角色（防买8个稳赚）

const CHARACTERS = [
  { name: '赵云', tier: 'normal', odds: 5 },
  { name: '秦良玉', tier: 'normal', odds: 5 },
  { name: '马超', tier: 'normal', odds: 5 },
  { name: '花木兰', tier: 'normal', odds: 5 },
  { name: '关羽', tier: 'special', odds: 10 },
  { name: '张飞', tier: 'special', odds: 20 },
  { name: '梁红玉', tier: 'special', odds: 30 },
  { name: '穆桂英', tier: 'special', odds: 40 }
];

const BASE_PROB_MAP = {
  '赵云': 0.20,
  '秦良玉': 0.20,
  '马超': 0.20,
  '花木兰': 0.20,
  '关羽': 0.08,
  '张飞': 0.05,
  '梁红玉': 0.03,
  '穆桂英': 0.02,
  'all_eliminated': 0.01,
  'all_survived': 0.01
};

const VALID_CHARACTER_NAMES = CHARACTERS.map(c => c.name);

// ★ 下注限流：1秒最多3次
const betLimiter = rateLimit({
  windowMs: 1000,
  max: 3,
  message: { error: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/characters', authMiddleware, (req, res) => {
  try {
    const charList = CHARACTERS.map(c => ({ name: c.name, odds: c.odds, prob: BASE_PROB_MAP[c.name] || 0 }));
    res.json({
      characters: charList,
      specialEvents: { all_eliminated: BASE_PROB_MAP.all_eliminated, all_survived: BASE_PROB_MAP.all_survived },
      feeRate: SERVICE_FEE
    });
  } catch (err) {
    res.status(500).json({ error: '获取角色列表失败' });
  }
});

// ========== 下注接口 ==========
router.post('/bet', authMiddleware, betLimiter, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { bets } = req.body || {};
    const userId = req.user.userId;

    // ==========================================
    // 1. 严格校验
    // ==========================================
    if (!Array.isArray(bets) || bets.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: '请至少选择一项下注' });
    }

    for (const b of bets) {
      if (!b || typeof b !== 'object' || !b.choice || !b.amount) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: '下注参数格式错误' });
      }
    }

    let totalAmount = 0;
    const betDistribution = {};
    const userChoices = [];

    for (const b of bets) {
      const amt = parseInt(b.amount);
      // ★ 严格金额校验
      if (isNaN(amt) || amt < POINTING_MIN_BET || amt > POINTING_MAX_BET) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: `单注金额需在${POINTING_MIN_BET}-${POINTING_MAX_BET}之间` });
      }
      // ★ 校验选项必须是合法角色
      if (!VALID_CHARACTER_NAMES.includes(b.choice)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: `无效选项: ${b.choice}` });
      }
      b.amount = amt;
      totalAmount += amt;
      betDistribution[b.choice] = (betDistribution[b.choice] || 0) + amt;
      if (!userChoices.includes(b.choice)) userChoices.push(b.choice);
    }

    // ★ 总额上限
    if (totalAmount > POINTING_MAX_TOTAL) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: `总下注额不能超过${POINTING_MAX_TOTAL}` });
    }

    const coverageCount = userChoices.length;

    // ★ 覆盖率硬限制：最多买6个，防止买8个稳赚
    if (coverageCount > MAX_COVERAGE) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: `最多同时下注${MAX_COVERAGE}个角色` });
    }

    // ==========================================
    // 2. 原子扣款（带事务）
    // ==========================================
    const user = await User.findOneAndUpdate(
      { _id: userId, banned: false, balance: { $gte: totalAmount } },
      { $inc: { balance: -totalAmount } },
      { new: true, session }
    );

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      const checkUser = await User.findById(userId);
      if (!checkUser) return res.status(404).json({ error: '用户不存在' });
      if (checkUser.banned) return res.status(403).json({ error: '账号已被封禁' });
      return res.status(400).json({ error: '积分不足' });
    }

    // ==========================================
    // 3. 风控评估
    // ==========================================
    const decision = await riskEngine.evaluate({
      type: 'BET',
      userId,
      gameId: 'pointing_game',
      payload: { betAmount: totalAmount, choices: userChoices, baseProbMap: BASE_PROB_MAP, coverageRate: coverageCount / 8, betDistribution }
    });

    if (decision.action === 'BLOCK') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: `风控拦截: ${decision.reason}` });
    }

    // ==========================================
    // 4. 概率计算 + 非对称调整
    // ==========================================
    const initialModifier = decision.modifier || {};
    const finalProbMap = { ...BASE_PROB_MAP };
    const heroKeys = CHARACTERS.map(c => c.name);
    const allHeroFactors = heroKeys.map(k => initialModifier[k]).filter(f => f !== undefined);
    const isAllSame = allHeroFactors.length === heroKeys.length && allHeroFactors.every(f => f === allHeroFactors[0]);

    if (isAllSame && allHeroFactors[0] !== 1.0) {
      const factor = allHeroFactors[0];
      // 下注的英雄：压低
      for (const choice of userChoices) {
        if (finalProbMap[choice] !== undefined) {
          finalProbMap[choice] *= factor;
        }
      }
      // 未下注的英雄：抬高（反向补偿）
      const unchosenKeys = heroKeys.filter(k => !userChoices.includes(k));
      const reverseFactor = 1.0 / factor;
      for (const k of unchosenKeys) {
        if (finalProbMap[k] !== undefined) {
          finalProbMap[k] *= reverseFactor;
        }
      }
      // 特殊事件跟随调整
      if (finalProbMap['all_survived'] !== undefined) {
        finalProbMap['all_survived'] *= factor;
      }
      if (finalProbMap['all_eliminated'] !== undefined) {
        finalProbMap['all_eliminated'] *= reverseFactor;
      }
      // special 因子叠加
      if (initialModifier.special !== undefined) {
        const specialFactor = initialModifier.special / factor;
        for (const hero of ['关羽', '张飞', '梁红玉', '穆桂英']) {
          if (finalProbMap[hero] !== undefined) {
            finalProbMap[hero] *= specialFactor;
          }
        }
      }
    } else {
      for (const key of Object.keys(finalProbMap)) {
        let factor = 1.0;
        if (initialModifier[key] !== undefined) {
          factor = initialModifier[key];
        } else {
          const isSpecial = ['关羽', '张飞', '梁红玉', '穆桂英'].includes(key);
          if (isSpecial && initialModifier.special !== undefined) factor = initialModifier.special;
          if (!isSpecial && initialModifier.normal !== undefined) factor = initialModifier.normal;
        }
        finalProbMap[key] *= factor;
      }
    }

    // 特殊英雄权重
    if (initialModifier._specialHeroWeights) {
      for (const [hero, weight] of Object.entries(initialModifier._specialHeroWeights)) {
        if (finalProbMap[hero] !== undefined) finalProbMap[hero] *= weight;
      }
    }

    // 空位权重（吸尘器模式）
    if (initialModifier.emptyWeightFactor && initialModifier.emptyWeightFactor > 1) {
      const ewf = initialModifier.emptyWeightFactor;
      const emptyKeys = Object.keys(BASE_PROB_MAP).filter(k => !userChoices.includes(k) && k !== 'all_survived');
      for (const ek of emptyKeys) {
        finalProbMap[ek] *= ewf;
      }
    }

    // 大R安抚 / 防套利
    const userNetLoss = decision.context?.user?.userNetLoss || 0;
    let maxPotentialPayout = 0;
    for (const choice of userChoices) {
      const hero = CHARACTERS.find(c => c.name === choice);
      if (hero) maxPotentialPayout += (betDistribution[choice] || 0) * hero.odds;
    }

    if (userNetLoss > 10000 && maxPotentialPayout <= userNetLoss * 0.5) {
      finalProbMap['穆桂英'] *= 1.5;
      finalProbMap['梁红玉'] *= 1.5;
      finalProbMap['all_survived'] *= 2.0;
    } else if (userNetLoss <= 0 && coverageCount >= 6) {
      finalProbMap['穆桂英'] = 0;
      finalProbMap['梁红玉'] = 0;
      finalProbMap['张飞'] = 0;
      finalProbMap['all_survived'] = 0;
      finalProbMap['all_eliminated'] *= 5;
    }

    // 四阶段放水控制
    const eatPhase = decision.eatPhase || 'KILL';
    const gameImpact = decision.gameImpact ?? 1.0;
    if (eatPhase === 'FEED' && gameImpact < 0) {
      const feedBoost = Math.abs(gameImpact);
      finalProbMap['穆桂英'] *= (1.0 + feedBoost * 2.0);
      finalProbMap['梁红玉'] *= (1.0 + feedBoost * 1.5);
      finalProbMap['张飞'] *= (1.0 + feedBoost * 1.0);
      finalProbMap['关羽'] *= (1.0 + feedBoost * 0.5);
      for (const choice of userChoices) {
        if (finalProbMap[choice] !== undefined) {
          finalProbMap[choice] *= (1.0 + feedBoost * 0.5);
        }
      }
      finalProbMap['all_eliminated'] *= (1.0 - feedBoost * 0.5);
    }

    // 归一化
    const totalProb = Object.values(finalProbMap).reduce((s, p) => s + p, 0);
    if (totalProb <= 0) {
      finalProbMap['赵云'] = 0.25;
      finalProbMap['秦良玉'] = 0.25;
      finalProbMap['马超'] = 0.25;
      finalProbMap['花木兰'] = 0.25;
    } else {
      for (const key of Object.keys(finalProbMap)) finalProbMap[key] /= totalProb;
    }

    // ==========================================
    // 5. 抽奖
    // ==========================================
    const random = crypto.randomInt(1, 100001) / 100000;
    let cumulativeProb = 0;
    let resultKey = 'all_eliminated';

    for (const [key, prob] of Object.entries(finalProbMap)) {
      cumulativeProb += prob;
      if (random <= cumulativeProb) {
        resultKey = key;
        break;
      }
    }

    let resultType = 'normal';
    let survivedCharacters = [];

    if (resultKey === 'all_survived') {
      resultType = 'all_survived';
      survivedCharacters = CHARACTERS.map(c => c.name);
    } else if (resultKey === 'all_eliminated') {
      resultType = 'all_eliminated';
    } else {
      survivedCharacters = [resultKey];
    }

    // ==========================================
    // 6. 结算与固定5%抽水
    // ==========================================
    let totalPayout = 0;

    if (resultType === 'all_survived') {
      for (const b of bets) {
        const hero = CHARACTERS.find(c => c.name === b.choice);
        if (hero) totalPayout += b.amount * hero.odds;
      }
    } else if (resultType === 'normal') {
      for (const b of bets) {
        if (survivedCharacters.includes(b.choice)) {
          const hero = CHARACTERS.find(c => c.name === b.choice);
          if (hero) totalPayout += b.amount * hero.odds;
        }
      }
    }

    if (decision.constraints?.forceMinPayout && totalPayout <= 0) {
      totalPayout = Math.floor(totalAmount * 0.3);
    }

    let feeDeducted = 0;
    if (totalPayout > totalAmount) {
      const netProfit = totalPayout - totalAmount;
      feeDeducted = Math.ceil(netProfit * SERVICE_FEE);
      totalPayout -= feeDeducted;
    }

    totalPayout = Math.floor(totalPayout);
    const netChange = totalPayout - totalAmount;
    const balanceAfterBet = user.balance; // user.balance 已扣除 totalAmount

    // ★ 原子加钱（带事务）
    if (totalPayout > 0) {
      await User.updateOne({ _id: userId }, { $inc: { balance: totalPayout } }, { session });
    }

    // ★ 所有写操作带 session
    await Transaction.create([{
      userId, type: 'bet_expense', amount: totalAmount, balanceAfter: balanceAfterBet,
      remark: `点兵下注 ${totalAmount} 积分`, gameType: 'pointing'
    }], { session });

    if (totalPayout > 0) {
      await Transaction.create([{
        userId, type: 'bet_win', amount: totalPayout, balanceAfter: balanceAfterBet + totalPayout,
        remark: `点兵赢取 ${totalPayout} 积分 (服务费:${feeDeducted})`, gameType: 'pointing'
      }], { session });
    }

    await PointingBet.create([{
      userId, roundId: crypto.randomUUID(), bets: bets.map(b => ({ choice: b.choice, amount: b.amount })),
      totalAmount, resultType, survivedCharacters, totalPayout, netChange
    }], { session });

    // ★ 提交事务
    await session.commitTransaction();
    session.endSession();

    // 风控结算（异步）
    riskEngine.settle(userId, 'pointing_game', totalAmount, totalPayout, {
      choices: userChoices, coverageRate: coverageCount / 8
    }).catch(() => {});

    // ★ 不返回 _risk 风控信息
    res.json({
      message: totalPayout > 0 ? '恭喜获胜！' : '很遗憾未中',
      result: { resultType, survivedCharacters },
      totalPayout, feeDeducted, netChange,
      balance: balanceAfterBet + totalPayout,
      balanceAfter: balanceAfterBet + totalPayout
    });

  } catch (err) {
    try { await session.abortTransaction(); } catch {}
    session.endSession();
    console.error('[点兵下注错误]', err);
    res.status(500).json({ error: '下注失败，请稍后重试' });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const records = await PointingBet.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(limit);
    res.json({ history: records });
  } catch (err) {
    res.status(500).json({ error: '获取历史记录失败' });
  }
});

// ========== 🚀 新增：点兵点将专属积分明细接口 ==========
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    // 只查询属于点兵点将游戏的流水记录
    const list = await Transaction.find({ 
      userId: req.user.userId,
      gameType: 'pointing' 
    }).sort({ createdAt: -1 }).limit(limit);
    
    res.json({ list });
  } catch (err) {
    console.error('[点兵积分明细错误]', err);
    res.status(500).json({ error: '获取积分明细失败' });
  }
});

export default router;
