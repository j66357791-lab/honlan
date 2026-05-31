// server/src/routes/redPacket.js
import { Router } from 'express';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';
import { redPacketConfig } from '../config/redPacket.js';
import mongoose from 'mongoose';
import crypto from 'crypto';

const router = Router();

// 获取红包状态
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const currentTurnover = user.totalBetAmount || 0; // 当前可用流水

    // ★ 核心修改：不再判断是否已领取，只判断流水够不够扣除
    const configs = redPacketConfig.map(cfg => {
      const isAvailable = currentTurnover >= cfg.requiredTurnover;
      return {
        level: cfg.level,
        name: cfg.name,
        requiredTurnover: cfg.requiredTurnover,
        status: isAvailable ? 'available' : 'locked' // 只有可领和锁定两种状态
      };
    });

    res.json({
      currentTurnover,
      crystal: user.crystal || 0,
      configs
    });
  } catch (err) {
    console.error('[红包状态]', err);
    res.status(500).json({ error: '获取红包状态失败' });
  }
});

// 抽取红包（核心逻辑：按概率计算结果，扣除流水，可重复领取）
router.post('/claim', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { level } = req.body;
    const cfg = redPacketConfig.find(c => c.level === level);
    if (!cfg) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: '无效的红包档位' });
    }

    // 核心逻辑：根据概率数组抽取
    const rand = crypto.randomInt(1, 10001) / 10000; 
    let cumulativeProb = 0;
    let rewardIndex = 0; 
    for (let i = 0; i < cfg.probs.length; i++) {
      cumulativeProb += cfg.probs[i];
      if (rand <= cumulativeProb) {
        rewardIndex = i;
        break;
      }
    }

    // 获取对应的奖池金额（底层放大1000倍）
    const rewardAmount = cfg.redPackets[rewardIndex];

    // ★ 核心修改：原子操作扣除流水 + 发放奖励，防止并发超额领取
    const updatedUser = await User.findOneAndUpdate(
      { 
        _id: req.user.userId, 
        totalBetAmount: { $gte: cfg.requiredTurnover } // 确保流水够扣
      },
      { 
        $inc: { 
          totalBetAmount: -cfg.requiredTurnover, // 扣除对应流水
          crystal: rewardAmount                  // 增加晶石
        }
      },
      { new: true, session, runValidators: true }
    );

    if (!updatedUser) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: '流水不足，无法领取该档位红包' });
    }

    // 记录流水 (可选，但推荐)
    await Transaction.create([{
      userId: updatedUser._id,
      type: 'redpacket_claim',
      amount: rewardAmount,
      balanceAfter: updatedUser.crystal,
      currency: 'crystal',
      gameType: 'redpacket',
      remark: `领取${cfg.name}，消耗流水${cfg.requiredTurnover}`
    }], { session, ordered: true });

    await session.commitTransaction();
    session.endSession();

    res.json({ 
      success: true, 
      rewardCrystal: rewardAmount, 
      crystal: updatedUser.crystal,
      currentTurnover: updatedUser.totalBetAmount // 返回最新流水供前端更新状态
    });

  } catch (err) {
    try { await session.abortTransaction(); } catch {}
    session.endSession();
    console.error('[红包抽取]', err);
    res.status(500).json({ error: '抽取失败' });
  }
});

export default router;
