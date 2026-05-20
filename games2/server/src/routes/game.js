// src/routes/game.js
import { Router } from 'express';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';
import crypto from 'crypto';
import riskEngine from '../risk/engine.js';

const router = Router();

const ODDS_WIN = 1.9;
const ODDS_DRAW = 9;
const MIN_BET = 10;
const MAX_BET = 8000;
const MAX_BET_RECORDS = 100;
const MAX_TRANSACTION_RECORDS = 200;

router.post('/bet', authMiddleware, async (req, res) => {
  try {
    const { choice, amount } = req.body;
    const userId = req.user.userId;

    if (!['red', 'blue', 'draw'].includes(choice))
      return res.status(400).json({ error: '无效的下注选择' });

    const betAmount = parseInt(amount);
    if (isNaN(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET)
      return res.status(400).json({ error: `下注金额需在${MIN_BET}-${MAX_BET}之间` });

    // ==========================================
    // 🚀 风控 V3 接入
    // ==========================================
    const baseProb = { red: 0.45, blue: 0.45, draw: 0.10 };

    const decision = await riskEngine.evaluate({
      type: 'BET',
      userId,
      gameId: 'giant_racing',
      payload: {
        betAmount,
        choices: [choice],
        baseProb,
        odds: { red: ODDS_WIN, blue: ODDS_WIN, draw: ODDS_DRAW }
      }
    });

    if (decision.constraints.maxBetOverride && betAmount > decision.constraints.maxBetOverride) {
      return res.status(400).json({ error: `本局下注限额为 ${decision.constraints.maxBetOverride} 积分` });
    }

    if (decision.constraints.cooldownSeconds && decision.constraints.cooldownSeconds > 0) {
      const lastBet = await Bet.findOne({ userId }).sort({ createdAt: -1 });
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
      { _id: userId, banned: false, balance: { $gte: betAmount } },
      { $inc: { balance: -betAmount } },
      { new: true }
    );

    if (!user) {
      const checkUser = await User.findById(userId);
      if (!checkUser) return res.status(404).json({ error: '用户不存在' });
      if (checkUser.banned) return res.status(403).json({ error: '账号已被封禁，无法下注' });
      return res.status(400).json({ error: '积分不足' });
    }

    // ==========================================
    // 🚀 使用风控概率生成游戏结果
    // ==========================================
    let result;

    if (decision.constraints.forceOpposite) {
      console.log(`[巨人暗箱] 🕵️‍♂️ 触发强制反向开奖机制！玩家死磕选项: ${choice}`);
      if (choice === 'red') {
        result = 'blue';
      } else if (choice === 'blue') {
        result = 'red';
      } else {
        result = crypto.randomInt(2) === 0 ? 'red' : 'blue';
      }
      console.log(`[巨人暗箱] 🎯 强制开出结果: ${result}`);
    } else {
      // ★★★ 核心修复：将风控的 _all 因子转换为定向压制 + 吸尘器提权 ★★★
      let finalProb = { red: 0.45, blue: 0.45, draw: 0.10 };
      
      if (decision.modifier) {
        const allFactor = decision.modifier._all || 1.0;
        
        if (allFactor < 1.0) {
          // 风控要求压低概率，我们只压低玩家押的，把概率转移给没押的（吸尘器）
          finalProb[choice] *= allFactor;
          const otherChoices = ['red', 'blue', 'draw'].filter(c => c !== choice);
          const boostFactor = 1.0 + (1.0 - allFactor) * 0.8; // 提权幅度
          otherChoices.forEach(c => {
            finalProb[c] *= boostFactor;
          });
        } else {
          // 如果有特定选项的修正（比如仇恨规则压红提蓝）
          for (const [key, val] of Object.entries(decision.modifier)) {
            if (finalProb[key] !== undefined) {
              finalProb[key] *= val;
            }
          }
        }
      }

      // 归一化
      const totalP = finalProb.red + finalProb.blue + finalProb.draw;
      finalProb.red /= totalP;
      finalProb.blue /= totalP;
      finalProb.draw /= totalP;
      
      // ★★★ 破产保护校验（动态容忍度） ★★★
      const poolProfit = decision.poolProfit || 0;
      let baseTolerance = 20000;
      if (poolProfit < -50000) baseTolerance = 3000;   // 池子大亏，极度敏感
      else if (poolProfit < -20000) baseTolerance = 5000;
      else if (poolProfit < 0) baseTolerance = 10000;
      
      const poolBasedTolerance = Math.max(0, poolProfit * 0.2); 
      const maxNetLossTolerance = baseTolerance + poolBasedTolerance;

      const netLossMap = {
        red: choice === 'red' ? Math.floor(betAmount * ODDS_WIN) - betAmount : -betAmount,
        blue: choice === 'blue' ? Math.floor(betAmount * ODDS_WIN) - betAmount : -betAmount,
        draw: choice === 'draw' ? Math.floor(betAmount * ODDS_DRAW) - betAmount : -betAmount
      };

      const probMap = { red: finalProb.red, blue: finalProb.blue, draw: finalProb.draw };

      const safeProbMap = riskEngine.applyBankruptcyProtection(probMap, netLossMap, maxNetLossTolerance);

      const rand = crypto.randomInt(10000) / 10000;
      let cumulative = 0;
      result = 'draw'; 
      
      if (safeProbMap) {
        for (const [key, prob] of Object.entries(safeProbMap)) {
          cumulative += prob;
          if (rand < cumulative) {
            result = key;
            break;
          }
        }
      } else {
        result = choice === 'red' ? 'blue' : (choice === 'blue' ? 'red' : (crypto.randomInt(2) === 0 ? 'red' : 'blue'));
        console.log(`[巨人结果] 🛑 破产保护兜底：强制开出反向结果 ${result}`);
      }
    }

    // ==========================================
    // 计算赔付与结算
    // ==========================================
    const payout = calculatePayout(choice, betAmount, result);
    const win = (choice === result);
    const netChange = win ? (payout - betAmount) : -betAmount;

    if (win) {
      await User.updateOne({ _id: userId }, { $inc: { balance: payout } });
      user.balance += payout;
    }

    const bet = await Bet.create({
      userId,
      choice,
      amount: betAmount,
      result,
      payout,
      netChange
    });

    await Transaction.create({
      userId,
      type: 'bet_expense',
      amount: betAmount,
      balanceAfter: user.balance - (win ? payout : 0),
      remark: `下注${choice === 'red' ? '红巨人' : choice === 'blue' ? '蓝巨人' : '平局'} ${betAmount}积分`,
      betId: bet._id
    });

    if (win) {
      await Transaction.create({
        userId,
        type: 'bet_win',
        amount: payout,
        balanceAfter: user.balance,
        remark: `赢得${choice === 'draw' ? '平局' : (choice === 'red' ? '红巨人' : '蓝巨人')}赔付 ${payout}积分`,
        betId: bet._id
      });
    }

    // ==========================================
    // 🚀 风控 V3 结算
    // ==========================================
    await riskEngine.settle({
      userId,
      gameId: 'giant_racing',
      betAmount,
      payout,
      won: win,
      choices: [choice]
    });

    // ==========================================
    // 清理老旧记录
    // ==========================================
    try {
      const betCount = await Bet.countDocuments({ userId });
      if (betCount > MAX_BET_RECORDS) {
        await Bet.deleteMany({
          _id: {
            $in: (await Bet.find({ userId }).sort({ createdAt: 1 }).limit(betCount - MAX_BET_RECORDS).select('_id')).map(b => b._id)
          }
        });
      }
    } catch (e) {}
    try {
      const txCount = await Transaction.countDocuments({ userId });
      if (txCount > MAX_TRANSACTION_RECORDS) {
        await Transaction.deleteMany({
          _id: {
            $in: (await Transaction.find({ userId }).sort({ createdAt: 1 }).limit(txCount - MAX_TRANSACTION_RECORDS).select('_id')).map(t => t._id)
          }
        });
      }
    } catch (e) {}

    res.json({ result, win, payout, balance: user.balance, netChange, betId: bet._id });
  } catch (err) {
    console.error(`[下注] 错误: ${err.message}`);
    res.status(500).json({ error: '下注失败，请稍后重试' });
  }
});

function calculatePayout(choice, amount, result) {
  if (choice === result) {
    return result === 'draw' ? Math.floor(amount * ODDS_DRAW) : Math.floor(amount * ODDS_WIN);
  }
  return 0;
}

router.get('/balance', authMiddleware, async (req, res) => {
  const u = await User.findById(req.user.userId).select('balance');
  res.json({ balance: u?.balance });
});

router.get('/history', authMiddleware, async (req, res) => {
  res.json({ list: await Bet.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(100) });
});

router.get('/transactions', authMiddleware, async (req, res) => {
  res.json({ list: await Transaction.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(50) });
});

export default router;
