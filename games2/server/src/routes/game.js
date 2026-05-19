/**
 * 巨人赛跑 - 游戏路由
 * 下注、余额查询、历史记录、积分明细
 * + 自动清理旧记录机制，防止数据库爆炸
 */
import { Router } from 'express';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ========== 概率配置 ==========
const PROB_RED = 0.45;
const PROB_BLUE = 0.45;
// 平局概率 = 0.10

// 赔率配置
const ODDS_WIN = 1.9;
const ODDS_DRAW = 9;

// 下注限制
const MIN_BET = 10;
const MAX_BET = 8000;

// ========== 数据清理配置 ==========
const MAX_BET_RECORDS = 100;       // 每个用户保留下注记录的最大条数
const MAX_TRANSACTION_RECORDS = 200; // 每个用户保留积分明细的最大条数

/**
 * 根据概率生成比赛结果
 */
function generateResult() {
  const rand = Math.random();
  if (rand < PROB_RED) return 'red';
  if (rand < PROB_RED + PROB_BLUE) return 'blue';
  return 'draw';
}

/**
 * 计算赔付
 */
function calculatePayout(choice, amount, result) {
  if (choice === result) {
    if (result === 'draw') {
      return Math.floor(amount * ODDS_DRAW);
    }
    return Math.floor(amount * ODDS_WIN);
  }
  return 0;
}

/**
 * POST /api/bet - 下注
 */
router.post('/bet', authMiddleware, async (req, res) => {
  try {
    const { choice, amount } = req.body;
    const userId = req.user.userId;
    console.log(`[下注] 用户=${req.user.phone}, 选择=${choice}, 金额=${amount}`);

    // 参数校验
    if (!['red', 'blue', 'draw'].includes(choice)) {
      return res.status(400).json({ error: '无效的下注选择' });
    }
    const betAmount = parseInt(amount);
    if (isNaN(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET) {
      return res.status(400).json({ error: `下注金额需在${MIN_BET}-${MAX_BET}之间` });
    }

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    if (user.banned) {
      return res.status(403).json({ error: '账号已被封禁，无法下注' });
    }
    if (user.balance < betAmount) {
      return res.status(400).json({ error: '积分不足' });
    }

    // 生成结果
    const result = generateResult();
    const payout = calculatePayout(choice, betAmount, result);
    const win = choice === result;
    const netChange = win ? (payout - betAmount) : -betAmount;

    // 扣除下注金额
    user.balance -= betAmount;
    // 如果赢了，加回赔付
    if (win) {
      user.balance += payout;
    }
    await user.save();

    // 创建下注记录
    const bet = await Bet.create({
      userId,
      choice,
      amount: betAmount,
      result,
      payout,
      netChange
    });

    // 记录积分明细 - 下注支出
    await Transaction.create({
      userId,
      type: 'bet_expense',
      amount: betAmount,
      balanceAfter: user.balance + (win ? payout : 0), // 扣除前的余额
      remark: `下注${choice === 'red' ? '红巨人' : choice === 'blue' ? '蓝巨人' : '平局'} ${betAmount}积分`,
      betId: bet._id
    });

    // 如果赢了，记录赢取收入
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

    // ================== [新增] 自动清理旧数据逻辑 ==================
    // 清理逻辑放在 try...catch 中，即使清理失败也不影响下注主流程的返回
    
    // 1. 清理下注记录
    try {
      const betCount = await Bet.countDocuments({ userId });
      if (betCount > MAX_BET_RECORDS) {
        // 计算需要删除的多余条数
        const excessCount = betCount - MAX_BET_RECORDS;
        // 找到最旧的需要删除的记录ID
        const oldestBets = await Bet.find({ userId })
          .sort({ createdAt: 1 }) // 按时间正序，最旧的在前面
          .limit(excessCount)
          .select('_id');
        
        if (oldestBets.length > 0) {
          const idsToDelete = oldestBets.map(b => b._id);
          await Bet.deleteMany({ _id: { $in: idsToDelete } });
          console.log(`[清理] 用户 ${user.phone} 删除了 ${idsToDelete.length} 条旧下注记录`);
        }
      }
    } catch (cleanErr) {
      console.error(`[清理] 下注记录清理失败: ${cleanErr.message}`);
    }

    // 2. 清理积分明细
    try {
      const txCount = await Transaction.countDocuments({ userId });
      if (txCount > MAX_TRANSACTION_RECORDS) {
        const excessCount = txCount - MAX_TRANSACTION_RECORDS;
        const oldestTx = await Transaction.find({ userId })
          .sort({ createdAt: 1 })
          .limit(excessCount)
          .select('_id');
        
        if (oldestTx.length > 0) {
          const idsToDelete = oldestTx.map(t => t._id);
          await Transaction.deleteMany({ _id: { $in: idsToDelete } });
          console.log(`[清理] 用户 ${user.phone} 删除了 ${idsToDelete.length} 条旧积分明细`);
        }
      }
    } catch (cleanErr) {
      console.error(`[清理] 积分明细清理失败: ${cleanErr.message}`);
    }
    // ============================================================

    console.log(`[下注] 结果: ${result}, 赢=${win}, 赔付=${payout}, 净变化=${netChange}, 余额=${user.balance}`);
    res.json({ result, win, payout, balance: user.balance, netChange, betId: bet._id });

  } catch (err) {
    console.error(`[下注] 错误: ${err.message}`);
    res.status(500).json({ error: '下注失败，请稍后重试' });
  }
});

/**
 * GET /api/balance - 查询余额
 */
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('balance');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({ balance: user.balance });
  } catch (err) {
    console.error(`[余额] 错误: ${err.message}`);
    res.status(500).json({ error: '获取余额失败' });
  }
});

/**
 * GET /api/history - 获取下注历史（修改为近100把，配合前端走势图）
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    // 将最大限制从 50 修改为 100，默认也为 100
    const limit = Math.min(parseInt(req.query.limit) || 100, 100);
    const list = await Bet.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ list });
  } catch (err) {
    console.error(`[历史] 错误: ${err.message}`);
    res.status(500).json({ error: '获取历史记录失败' });
  }
});

/**
 * GET /api/transactions - 获取积分明细
 */
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const list = await Transaction.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ list });
  } catch (err) {
    console.error(`[积分明细] 错误: ${err.message}`);
    res.status(500).json({ error: '获取积分明细失败' });
  }
});

export default router;
