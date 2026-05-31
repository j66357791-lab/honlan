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

// 获取爬墙活动状态与配置
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('balance crystal climbWallLevel');
    if (!user) return res.status(404).json({ error: '用户不存在' });

    res.json({
      balance: user.balance,
      // 晶石返回给前端时除以1000还原真实值
      crystal: user.crystal / 1000,
      currentLevel: user.climbWallLevel,
      // 配置也除以1000给前端展示
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
    const user = await User.findById(userId).session(session);

    if (!user) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ error: '用户不存在' });
    }

    const nextLevel = user.climbWallLevel + 1;
    const targetConfig = climbWallConfig.levels.find(l => l.level === nextLevel);

    // 检查是否已通关
    if (!targetConfig) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: '已达到最高阶梯' });
    }

    // 检查积分是否足够
    if (user.balance < targetConfig.costPoint) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: `积分不足，需要 ${targetConfig.costPoint} 积分` });
    }

    // ★ 核心原子操作：扣积分、加晶石、更新等级 (带事务和验证器)
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, balance: { $gte: targetConfig.costPoint } },
      {
        $inc: { balance: -targetConfig.costPoint, crystal: targetConfig.rewardCrystal },
        $set: { climbWallLevel: nextLevel }
      },
      { new: true, session, runValidators: true }
    );

    if (!updatedUser) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: '兑换失败，积分不足或状态异常' });
    }

    // ★ 写入双流水记录
    const balanceAfterPoint = updatedUser.balance;
    const balanceAfterCrystal = updatedUser.crystal;

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
    ], { session });

    // 提交事务
    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `成功兑换第${nextLevel}级`,
      data: {
        balance: updatedUser.balance,
        crystal: updatedUser.crystal / 1000, // 返回前端除以1000
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
