// server/src/routes/redPacket.js
import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';
import { redPacketConfig } from '../config/redPacket.js';
import crypto from 'crypto';

const router = Router();

// 获取红包状态
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const currentTurnover = user.totalBetAmount || 0;
    const configs = redPacketConfig.map(cfg => {
      const isAvailable = currentTurnover >= cfg.requiredTurnover;
      return {
        level: cfg.level,
        name: cfg.name,
        requiredTurnover: cfg.requiredTurnover,
        status: isAvailable ? 'available' : 'locked'
      };
    });

    res.json({ currentTurnover, crystal: user.crystal || 0, configs });
  } catch (err) {
    console.error('[红包状态]', err);
    res.status(500).json({ error: '获取红包状态失败' });
  }
});

// 抽取红包
router.post('/claim', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { level } = req.body;
    const cfg = redPacketConfig.find(c => c.level === level);
    if (!cfg) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: '无效的红包档位' });
    }

    // 1. 按概率抽取（适配新的配置结构）
    const rand = crypto.randomInt(1, 10001) / 10000;
    let cumulativeProb = 0;
    let rewardAmount = 0;
    
    for (let i = 0; i < cfg.redPackets.length; i++) {
      cumulativeProb += cfg.redPackets[i].prob;
      if (rand <= cumulativeProb) {
        rewardAmount = cfg.redPackets[i].amount; // 直接取出命中的 amount
        break;
      }
    }

    // 2. 扣流水 + 发晶石（原子操作）
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user.userId, totalBetAmount: { $gte: cfg.requiredTurnover } },
      { $inc: { totalBetAmount: -cfg.requiredTurnover, crystal: rewardAmount } },
      { new: true, session, runValidators: true }
    );

    if (!updatedUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: '流水不足，无法领取该档位红包' });
    }

    // 3. 写流水
    await Transaction.create([
      {
        userId: updatedUser._id,
        type: 'redpacket_claim',
        amount: rewardAmount,
        balanceAfter: updatedUser.crystal,
        currency: 'crystal',
        gameType: 'redpacket',
        remark: `领取${cfg.name}，消耗流水${cfg.requiredTurnover}`
      }
    ], { session, ordered: true });

    await session.commitTransaction();
    session.endSession();
    
    res.json({ 
      success: true, 
      rewardCrystal: rewardAmount, 
      crystal: updatedUser.crystal, 
      currentTurnover: updatedUser.totalBetAmount 
    });
    
  } catch (err) {
    try { await session.abortTransaction(); } catch {}
    session.endSession();
    console.error('[红包抽取] 详细错误:', err);
    res.status(500).json({ error: '抽取失败', detail: err.message });
  }
});

export default router;
