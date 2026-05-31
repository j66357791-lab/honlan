// server/src/routes/redPacket.js
import { Router } from 'express';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { redPacketConfig } from '../config/redPacket.js';
import crypto from 'crypto';

const router = Router();

// 获取红包状态（不返回奖池数据，前端写死展示）
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const currentTurnover = user.totalBetAmount || 0;
    const claimed = user.claimedRedPackets || []; 

    const configs = redPacketConfig.map(cfg => {
      const isClaimed = claimed.includes(cfg.level);
      const isAvailable = !isClaimed && currentTurnover >= cfg.requiredTurnover;
      
      return {
        level: cfg.level,
        name: cfg.name,
        requiredTurnover: cfg.requiredTurnover,
        status: isClaimed ? 'claimed' : (isAvailable ? 'available' : 'locked')
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

// 抽取红包（核心逻辑：按概率计算结果）
router.post('/claim', authMiddleware, async (req, res) => {
  try {
    const { level } = req.body;
    const cfg = redPacketConfig.find(c => c.level === level);
    if (!cfg) return res.status(400).json({ error: '无效的红包档位' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    if (!user.claimedRedPackets) user.claimedRedPackets = [];

    // 校验1：是否已领取
    if (user.claimedRedPackets.includes(level)) {
      return res.status(400).json({ error: '该档位红包已领取' });
    }

    // 校验2：流水是否达标
    const currentTurnover = user.totalBetAmount || 0;
    if (currentTurnover < cfg.requiredTurnover) {
      return res.status(400).json({ error: '流水未达标' });
    }

    // 核心逻辑：根据概率数组抽取
    const rand = crypto.randomInt(1, 10001) / 10000; // 生成0.0001~1.0000的随机数
    let cumulativeProb = 0;
    let rewardIndex = 0; // 默认保底抽中第一个（最小金额）

    for (let i = 0; i < cfg.probs.length; i++) {
      cumulativeProb += cfg.probs[i];
      if (rand <= cumulativeProb) {
        rewardIndex = i;
        break;
      }
    }

    // 获取对应的奖池金额（底层放大1000倍）
    const rewardAmount = cfg.redPackets[rewardIndex];

    // 发放奖励（直接加整数，避免浮点误差）
    user.crystal = (user.crystal || 0) + rewardAmount;
    user.claimedRedPackets.push(level);
    await user.save();

    res.json({
      success: true,
      rewardCrystal: rewardAmount, // 返回底层整数（如100代表0.1晶石）
      crystal: user.crystal        // 返回最新总晶石
    });

  } catch (err) {
    console.error('[红包抽取]', err);
    res.status(500).json({ error: '抽取失败' });
  }
});

export default router;
