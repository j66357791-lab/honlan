// src/routes/pointingGame.js
import { Router } from 'express';
import User from '../models/User.js';
import PointingBet from '../models/PointingBet.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';
import crypto from 'crypto';
import riskEngine from '../risk/engine.js';

const router = Router();

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

const SPECIAL_HERO_BASE_WEIGHTS = {
  '关羽': 10,
  '张飞': 5,
  '梁红玉': 2,
  '穆桂英': 1
};

router.post('/bet', authMiddleware, async (req, res) => {
  try {
    const { bets } = req.body;
    const userId = req.user.userId;

    if (!bets || bets.length === 0)
      return res.status(400).json({ error: '请至少选择一项下注' });

    let totalAmount = 0;
    for (const b of bets) {
      const amt = parseInt(b.amount);
      if (isNaN(amt) || amt <= 0)
        return res.status(400).json({ error: '单注金额必须为大于0的整数' });
      b.amount = amt;
      totalAmount += amt;
    }

    if (totalAmount < 10)
      return res.status(400).json({ error: '下注总额最少10积分' });

    // ==========================================
    // 🚀 风控 V3 接入
    // ==========================================
    const baseProb = { normal: 0.92, special: 0.07 };
    const totalChoices = new Set(bets.map(b => b.choice)).size;
    const coverageRate = totalChoices / 8;

    const betDistribution = {};
    for (const b of bets) {
      betDistribution[b.choice] = (betDistribution[b.choice] || 0) + b.amount;
    }

    const decision = await riskEngine.evaluate({
      type: 'BET',
      userId,
      gameId: 'pointing_game',
      payload: { betAmount: totalAmount, choices: bets.map(b => b.choice), baseProb, coverageRate, betDistribution }
    });

    // ★ 去掉 maxBetOverride 拦截，不再拒绝下注
    // 只保留冷却时间检查（防脚本）
    if (decision.constraints.cooldownSeconds && decision.constraints.cooldownSeconds > 0) {
      const lastBet = await PointingBet.findOne({ userId }).sort({ createdAt: -1 });
      if (lastBet) {
        const nextAllowedTime = new Date(lastBet.createdAt.getTime() + decision.constraints.cooldownSeconds * 1000);
        if (new Date() < nextAllowedTime) {
          return res.status(400).json({ error: '操作过于频繁，请稍后再试' });
        }
      }
    }

    if (decision.action === 'BLOCK') {
      return res.status(400).json({ error: `风控拦截: ${decision.reason}` });
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, banned: false, balance: { $gte: totalAmount } },
      { $inc: { balance: -totalAmount } },
      { new: true }
    );

    if (!user) {
      const c = await User.findById(userId);
      if (!c) return res.status(404).json({ error: '用户不存在' });
      if (c.banned) return res.status(403).json({ error: '账号已被封禁' });
      return res.status(400).json({ error: '积分不足' });
    }

    // ==========================================
    // 🚀 使用风控概率生成游戏结果
    // ==========================================
    let gameResult;

    if (decision.constraints.forceMinPayout) {
      console.log(`[点兵暗箱] 🕵️‍♂️ 触发强制最低赔付机制！`);
      let minPayout = Infinity;
      let bestResult = null;

      for (const hero of CHARACTERS) {
        let p = 0;
        for (const bet of bets) {
          if (bet.choice === hero.name) p += Math.floor(bet.amount * hero.odds);
        }
        if (p < minPayout) {
          minPayout = p;
          bestResult = { resultType: 'normal', survivedCharacters: [hero.name] };
        }
      }

      if (0 < minPayout) {
        minPayout = 0;
        bestResult = { resultType: 'all_eliminated', survivedCharacters: [] };
      }

      gameResult = bestResult;
      console.log(`[点兵暗箱] 🎯 强制开出结果: ${JSON.stringify(gameResult)}, 预计赔付: ${minPayout}`);
    } else {
      const finalProb = riskEngine.applyModifier(baseProb, decision.modifier);
      const specialHeroWeights = decision.modifier?._specialHeroWeights || {};
      const emptyWeightFactor = decision.modifier?.emptyWeightFactor || 1.0;
      const rand = crypto.randomInt(10000) / 10000;
      
      const netLossMap = {};
      let allSurvivedPayout = 0;
      const fullProbMap = {
        'all_eliminated': 0.005,
        'all_survived': 0.005,
      };

      const userChoices = bets.map(b => b.choice);

      CHARACTERS.forEach(c => {
        let p = 0;
        for (const bet of bets) {
          if (bet.choice === c.name) p += Math.floor(bet.amount * c.odds);
        }
        
        allSurvivedPayout += p; 
        netLossMap[c.name] = p - totalAmount; 

        const isEmpty = !userChoices.includes(c.name);

        if (c.tier === 'normal') {
          const weight = isEmpty ? emptyWeightFactor : 1.0;
          fullProbMap[c.name] = (1 / 4) * finalProb.normal * 0.99 * weight;
        } else {
          const baseW = SPECIAL_HERO_BASE_WEIGHTS[c.name] || 1;
          const modW = specialHeroWeights[c.name] || 1.0;
          const totalSpecWeight = CHARACTERS.filter(x => x.tier === 'special').reduce((sum, x) => {
            const bw = SPECIAL_HERO_BASE_WEIGHTS[x.name] || 1;
            const mw = specialHeroWeights[x.name] || 1.0;
            return sum + (bw * mw);
          }, 0);
          const weightRatio = (baseW * modW) / (totalSpecWeight || 1);
          const weight = isEmpty ? emptyWeightFactor : 1.0;
          fullProbMap[c.name] = weightRatio * finalProb.special * 0.99 * weight;
        }
      });

      // 归一化概率
      const totalProb = Object.values(fullProbMap).reduce((s, p) => s + p, 0);
      for (const key of Object.keys(fullProbMap)) {
        fullProbMap[key] = fullProbMap[key] / totalProb;
      }

      netLossMap['all_survived'] = allSurvivedPayout - totalAmount;
      netLossMap['all_eliminated'] = 0 - totalAmount;

      // ★★★ 破产保护：容忍度跟池子盈利额挂钩 ★★★
      const poolProfit = decision.poolProfit || 0;
      let maxNetLossTolerance;
      
      if (poolProfit > 0) {
        maxNetLossTolerance = Math.max(5000, poolProfit * 0.15);
      } else if (poolProfit > -20000) {
        maxNetLossTolerance = 10000;
      } else if (poolProfit > -50000) {
        maxNetLossTolerance = 5000;
      } else {
        maxNetLossTolerance = 3000;
      }

      const safeProbMap = riskEngine.applyBankruptcyProtection(fullProbMap, netLossMap, maxNetLossTolerance);

      if (!safeProbMap) {
        gameResult = { resultType: 'all_eliminated', survivedCharacters: [] };
        console.log(`[点兵结果] 💀 破产保护兜底：强制全暗杀！`);
      } else {
        let cumulative = 0;
        let targetResult = 'all_eliminated'; 
        for (const [resultKey, prob] of Object.entries(safeProbMap)) {
          cumulative += prob;
          if (rand < cumulative) {
            targetResult = resultKey;
            break;
          }
        }

        if (targetResult === 'all_eliminated') {
          gameResult = { resultType: 'all_eliminated', survivedCharacters: [] };
          console.log(`[点兵结果] 💀 触发全暗杀！`);
        } else if (targetResult === 'all_survived') {
          gameResult = { resultType: 'all_survived', survivedCharacters: CHARACTERS.map(c => c.name) };
          console.log(`[点兵结果] 🎉 触发全存活！`);
        } else {
          gameResult = { resultType: 'normal', survivedCharacters: [targetResult] };
          const hero = CHARACTERS.find(c => c.name === targetResult);
          console.log(`[点兵结果] 🎯 开出: ${targetResult} (${hero?.odds}倍)`);
        }
      }
    }

    // ==========================================
    // 计算赔付
    // ==========================================
    let totalPayout = 0;
    bets.forEach(bet => {
      let winAmount = 0;
      if (gameResult.resultType === 'all_survived') {
        const hero = CHARACTERS.find(c => c.name === bet.choice);
        if (hero) winAmount = bet.amount * hero.odds;
      } else if (gameResult.resultType === 'normal') {
        if (gameResult.survivedCharacters.includes(bet.choice)) {
          const hero = CHARACTERS.find(c => c.name === bet.choice);
          if (hero) winAmount = bet.amount * hero.odds;
        }
      }
      totalPayout += Math.floor(winAmount);
    });

    const netChange = totalPayout - totalAmount;
    const win = totalPayout > 0;

    if (totalPayout > 0) {
      await User.updateOne({ _id: userId }, { $inc: { balance: totalPayout } });
      user.balance += totalPayout;
    }

    const choiceSummary = bets.map(b => b.choice).join('+');
    const betRecord = await PointingBet.create({
      userId,
      bets,
      totalAmount,
      resultType: gameResult.resultType,
      survivedCharacters: gameResult.survivedCharacters,
      totalPayout,
      netChange,
      choiceSummary
    });

    const balanceAfterExpense = user.balance - totalPayout;
    await Transaction.create({
      userId,
      type: 'bet_expense',
      amount: totalAmount,
      balanceAfter: balanceAfterExpense,
      remark: `点兵点将下注 ${totalAmount}积分`,
      betId: betRecord._id,
      gameType: 'pointing'
    });

    if (totalPayout > 0) {
      await Transaction.create({
        userId,
        type: 'bet_win',
        amount: totalPayout,
        balanceAfter: user.balance,
        remark: `点兵点将赢取 ${totalPayout}积分`,
        betId: betRecord._id,
        gameType: 'pointing'
      });
    }

    await riskEngine.settle({
      userId,
      gameId: 'pointing_game',
      betAmount: totalAmount,
      payout: totalPayout,
      won: win,
      choices: bets.map(b => b.choice)
    });

    res.json({ result: gameResult, payout: totalPayout, netChange, balance: user.balance });
  } catch (err) {
    console.error(`[点兵点将] ${err.message}`);
    res.status(500).json({ error: '下注失败' });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const rawBets = await PointingBet.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    const history = rawBets.map(bet => {
      let result;
      if (bet.resultType === 'all_survived') {
        result = 'all_survived';
      } else if (bet.resultType === 'all_eliminated') {
        result = 'all_eliminated';
      } else {
        result = bet.survivedCharacters.length > 0 ? bet.survivedCharacters[0] : 'unknown';
      }
      return {
        _id: bet._id,
        choice: bet.choiceSummary || (bet.bets.length > 0 ? bet.bets[0].choice : ''),
        amount: bet.totalAmount,
        result,
        netChange: bet.netChange,
        createdAt: bet.createdAt
      };
    });
    res.json({ history });
  } catch (err) {
    console.error(`[点兵历史] ${err.message}`);
    res.status(500).json({ error: '获取记录失败' });
  }
});

router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const list = await Transaction.find({
      userId: req.user.userId,
      remark: { $regex: '点兵点将' }
    })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ list });
  } catch (err) {
    console.error(`[点兵明细] ${err.message}`);
    res.status(500).json({ error: '获取明细失败' });
  }
});

export default router;
