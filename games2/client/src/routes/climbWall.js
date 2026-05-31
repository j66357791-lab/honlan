// src/routes/climbWall.js
import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import { climbWallConfig } from '../config/climbWall.js';

const router = Router();

// 兑换限流：1秒最多1次，防止连点
const exchangeLimiter = rateLimit({
  windowMs: 1000,
  max: 1,
  message: { error: '兑换操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ★ 辅助函数：获取当天的日期字符串 (如 2026-05-31)
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 获取爬墙活动状态与配置
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('balance crystal climbWallLevel lastClimbWallDate');
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const today = getTodayStr();
    let currentLevel = user.climbWallLevel;

    // ★ 如果日期不是今天，说明跨天了，重置等级为0
    if (user.lastClimbWallDate !== today) {
      currentLevel = 0;
      await User.updateOne({ _id: user._id }, { $set: { climbWallLevel: 0, lastClimbWallDate: today } });
    }

    res.json({
      balance: user.balance,
      crystal: user.crystal / 1000,
      currentLevel: currentLevel,
      config: climbWallConfig.levels.map(l => ({
        level: l.level,
        costPoint: l.costPoint,
        rewardCrystal: l.rewardCrystal / 1000
      }))
    });
  } catch (err) {
    console.error('[爬墙状态] 错误:', err.message);
    res.status(500).json({ error: '获取状态失败' });
  }
});

// 执行爬墙兑换
router.post('/exchange', authMiddleware, exchangeLimiter, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user.userId;
    const today = getTodayStr();
    
    let user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ error: '用户不存在' });
    }

    // ★ 兑换时也要检查跨天重置
    let currentLevel = user.climbWallLevel;
    if (user.lastClimbWallDate !== today) {
      currentLevel = 0;
      // 原子更新重置等级和日期
      user = await User.findOneAndUpdate(
        { _id: userId },
        { $set: { climbWallLevel: 0, lastClimbWallDate: today } },
        { new: true, session }
      );
      currentLevel = 0;
    }

    const nextLevel = currentLevel + 1;
    const targetConfig = climbWallConfig.levels.find(l => l.level === nextLevel);

    if (!targetConfig) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: '已达到最高阶梯' });
    }

    if (user.balance < targetConfig.costPoint) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: `积分不足，需要 ${targetConfig.costPoint} 积分` });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, balance: { $gte: targetConfig.costPoint } },
      {
        $inc: { balance: -targetConfig.costPoint, crystal: targetConfig.rewardCrystal },
        $set: { climbWallLevel: nextLevel, lastClimbWallDate: today } // ★ 记录今天已兑换
      },
      { new: true, session, runValidators: true }
    );

    if (!updatedUser) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: '兑换失败，积分不足或状态异常' });
    }

    const balanceAfterPoint = updatedUser.balance;
    const balanceAfterCrystal = updatedUser.crystal;

    // ★ 修复：添加 ordered: true
    await Transaction.create([
      {
        userId,
        type: 'climb_wall_expense',
        amount: targetConfig.costPoint,
        balanceAfter: balanceAfterPoint,
        currency: 'point',
        gameType: 'climbwall',
        remark: `爬墙第${nextLevel}级，消耗积分`
      },
      {
        userId,
        type: 'climb_wall_income',
        amount: targetConfig.rewardCrystal,
        balanceAfter: balanceAfterCrystal,
        currency: 'crystal',
        gameType: 'climbwall',
        remark: `爬墙第${nextLevel}级，获得晶石`
      }
    ], { session, ordered: true });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `成功兑换第${nextLevel}级`,
      data: {
        balance: updatedUser.balance,
        crystal: updatedUser.crystal / 1000,
        currentLevel: updatedUser.climbWallLevel
      }
    });
  } catch (err) {
    try { await session.abortTransaction(); } catch {}
    session.endSession();
    console.error('[爬墙兑换] 错误:', err.message);
    res.status(500).json({ error: '兑换失败，请稍后重试' });
  }
});

export default router;
