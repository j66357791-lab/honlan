import { Router } from 'express';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';
import crypto from 'crypto';
import { getGiantRacingProb, updateSystemProfit } from '../config/systemPool.js';
import { evaluateRisk } from '../utils/riskEngine.js';

const router = Router();

const ODDS_WIN = 1.9;
const ODDS_DRAW = 9;
const MIN_BET = 10;
const MAX_BET = 8000;
const MAX_BET_RECORDS = 100;
const MAX_TRANSACTION_RECORDS = 200;

function generateBaseResult() {
  const prob = getGiantRacingProb();
  const rand = crypto.randomInt(100);
  if (rand < prob.red * 100) return 'red';
  if (rand < (prob.red + prob.blue) * 100) return 'blue';
  return 'draw';
}

function calculatePayout(choice, amount, result) {
  if (choice === result) {
    return result === 'draw' ? Math.floor(amount * ODDS_DRAW) : Math.floor(amount * ODDS_WIN);
  }
  return 0;
}

router.post('/bet', authMiddleware, async (req, res) => {
  try {
    const { choice, amount } = req.body;
    const userId = req.user.userId;

    if (!['red', 'blue', 'draw'].includes(choice)) return res.status(400).json({ error: '无效的下注选择' });

    const betAmount = parseInt(amount);
    if (isNaN(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET) return res.status(400).json({ error: `下注金额需在${MIN_BET}-${MAX_BET}之间` });

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

    let result = generateBaseResult();
    const isBaseWin = (choice === result);

    const riskAction = evaluateRisk(user, betAmount, isBaseWin);

    if (riskAction === 'FORCE_LOSE' && isBaseWin) {
      if (result === 'draw') result = crypto.randomInt(2) === 0 ? 'red' : 'blue';
      else result = result === 'red' ? 'blue' : 'red';
    } else if (riskAction === 'FORCE_WIN' && !isBaseWin) {
      result = choice;
    }

    const payout = calculatePayout(choice, betAmount, result);
    const win = choice === result;
    const netChange = win ? (payout - betAmount) : -betAmount;

    updateSystemProfit(netChange);

    if (win) {
      await User.updateOne({ _id: userId }, { $inc: { balance: payout } });
      user.balance += payout;
    }

    // 更新风控追踪数据
    const updateFields = {
      $inc: { 
        totalBetAmount: betAmount, 
        totalPayoutAmount: payout,
        todayProfit: netChange
      }
    };
    
    // [日志增强] 针对鸡贼玩家，增加风险指数并打印警告
    if (riskAction === 'NORMAL' && win && user.todayProfit > 5000 && user.historyProfit > 5000 && betAmount < 1000) {
      const oldIndex = user.riskIndex || 0;
      const newIndex = Math.min(oldIndex + 10, 30);
      updateFields.$inc.riskIndex = 10;
      console.warn(`🚨 [风控升级] 玩家 ${user.phone} 频繁小额赢利！风险指数 +10% -> 当前 ${newIndex}%`);
    }
    
    await User.updateOne({ _id: userId }, updateFields);

    const bet = await Bet.create({ userId, choice, amount: betAmount, result, payout, netChange });

    await Transaction.create({
      userId, type: 'bet_expense', amount: betAmount,
      balanceAfter: user.balance - (win ? payout : 0),
      remark: `下注${choice === 'red' ? '红巨人' : choice === 'blue' ? '蓝巨人' : '平局'} ${betAmount}积分`,
      betId: bet._id
    });

    if (win) {
      await Transaction.create({
        userId, type: 'bet_win', amount: payout, balanceAfter: user.balance,
        remark: `赢得${choice === 'draw' ? '平局' : (choice === 'red' ? '红巨人' : '蓝巨人')}赔付 ${payout}积分`,
        betId: bet._id
      });
    }

    try {
      const betCount = await Bet.countDocuments({ userId });
      if (betCount > MAX_BET_RECORDS) { await Bet.deleteMany({ _id: { $in: (await Bet.find({ userId }).sort({ createdAt: 1 }).limit(betCount - MAX_BET_RECORDS).select('_id')).map(b => b._id) } }); }
    } catch (e) {}
    try {
      const txCount = await Transaction.countDocuments({ userId });
      if (txCount > MAX_TRANSACTION_RECORDS) { await Transaction.deleteMany({ _id: { $in: (await Transaction.find({ userId }).sort({ createdAt: 1 }).limit(txCount - MAX_TRANSACTION_RECORDS).select('_id')).map(t => t._id) } }); }
    } catch (e) {}

    res.json({ result, win, payout, balance: user.balance, netChange, betId: bet._id });
  } catch (err) {
    console.error(`[下注] 错误: ${err.message}`);
    res.status(500).json({ error: '下注失败，请稍后重试' });
  }
});

router.get('/balance', authMiddleware, async (req, res) => { const u = await User.findById(req.user.userId).select('balance'); res.json({ balance: u?.balance }); });
router.get('/history', authMiddleware, async (req, res) => { res.json({ list: await Bet.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(100) }); });
router.get('/transactions', authMiddleware, async (req, res) => { res.json({ list: await Transaction.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(50) }); });

export default router;
