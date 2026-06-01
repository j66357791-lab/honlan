// server/src/routes/climbWall.js
import { Router } from 'express';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import { climbWallConfig } from '../config/climbWall.js';

const router = Router();

// 兑换限流：1秒最多1次
const exchangeLimiter = rateLimit({
  windowMs: 1000,
  max: 1,
  message: { error: '兑换操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ★ 辅助函数：获取北京时间当天的日期字符串
const getBeijingTodayStr = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const beijingTime = new Date(utc + (8 * 3600000));
  return `${beijingTime.getFullYear()}-${String(beijingTime.getMonth() + 1).padStart(2, '0')}-${String(beijingTime.getDate()).padStart(2, '0')}`;
};

// 获取爬墙活动状态与配置
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('balance crystal climbWallLevel lastClimbWallDate');
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const today = getBeijingTodayStr();
    let currentLevel = user.climbWallLevel;

    if (user.lastClimbWallDate !== today) {
      currentLevel = 0;
      await User.updateOne({ _id: user._id }, { $set: { climbWallLevel: 0, lastClimbWallDate: today } });
    }

    res.json({
      balance: user.balance,
      crystal: user.crystal,
      currentLevel: currentLevel,
      config: climbWallConfig.levels // 返回全部5级配置
    });
  } catch (err) {
    console.error('[爬墙状态] 错误:', err.message);
    res.status(500).json({ error: '获取状态失败' });
  }
});

// 执行爬墙兑换
router.post('/exchange', authMiddleware, exchangeLimiter, async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = getBeijingTodayStr();

    // 1. 原子性重置跨天等级（如果跨天了，直接重置为0）
    await User.updateOne(
      { _id: userId, lastClimbWallDate: { $ne: today } },
      { $set: { climbWallLevel: 0, lastClimbWallDate: today } }
    );

    // 2. 读取当前用户状态
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const currentLevel = user.climbWallLevel;
    const nextLevel = currentLevel + 1;
    const targetConfig = climbWallConfig.levels.find(l => l.level === nextLevel);

    if (!targetConfig) {
      return res.status(400).json({ error: '已达到最高阶梯' });
    }

    if (user.balance < targetConfig.costPoint) {
      return res.status(400).json({ error: `积分不足，需要 ${targetConfig.costPoint.toLocaleString()} 积分` });
    }

    // 3. ★ 核心修复：使用无事务的 findOneAndUpdate 单文档原子操作，天然防并发！
    const updatedUser = await User.findOneAndUpdate(
      { 
        _id: userId, 
        balance: { $gte: targetConfig.costPoint },
        climbWallLevel: currentLevel, // 乐观锁：必须当前等级没变才能扣费
        lastClimbWallDate: today
      },
      { 
        $inc: { balance: -targetConfig.costPoint, crystal: targetConfig.rewardCrystal }, 
        $set: { climbWallLevel: nextLevel } 
      },
      { new: true, runValidators: true }
    );

    // 如果返回 null，说明并发时被其他请求抢先了，或者余额不足
    if (!updatedUser) {
      return res.status(400).json({ error: '兑换失败，积分不足或已兑换过该等级' });
    }

    // 4. 异步记录流水（不影响主流程，即使流水写入失败，余额和等级也是对的）
    Transaction.create([
      { userId, type: 'climb_wall_expense', amount: targetConfig.costPoint, balanceAfter: updatedUser.balance, currency: 'point', gameType: 'climbwall', remark: `爬墙第${nextLevel}级，消耗积分` },
      { userId, type: 'climb_wall_income', amount: targetConfig.rewardCrystal, balanceAfter: updatedUser.crystal, currency: 'crystal', gameType: 'climbwall', remark: `爬墙第${nextLevel}级，获得晶石` }
    ]).catch(err => console.error('流水记录失败:', err.message));

    res.json({
      success: true,
      message: `成功兑换第${nextLevel}级`,
      data: {
        balance: updatedUser.balance,
        crystal: updatedUser.crystal,
        currentLevel: updatedUser.climbWallLevel
      }
    });
  } catch (err) {
    console.error('[爬墙兑换] 错误:', err.message);
    res.status(500).json({ error: '兑换失败，请稍后重试' });
  }
});

export default router;
