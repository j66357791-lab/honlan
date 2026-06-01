// src/routes/membership.js
import { Router } from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth.js';
import { MEMBERSHIP_CONFIG } from '../config/membership.js';
import User from '../models/User.js';
import ActivationCode from '../models/ActivationCode.js';
import Transaction from '../models/Transaction.js';

const router = Router();

// ★ 辅助函数：获取北京时间当天的日期字符串 (严格对齐零点跨天)
const getBeijingTodayStr = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const beijingTime = new Date(utc + (8 * 3600000));
  return `${beijingTime.getFullYear()}-${String(beijingTime.getMonth() + 1).padStart(2, '0')}-${String(beijingTime.getDate()).padStart(2, '0')}`;
};

// ========== 1. 获取会员卡状态 ==========
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const today = getBeijingTodayStr();
    const now = new Date();

    // ★ 彻底独立判断 VIP 状态
    const isVipActive = user.vipExpireAt && user.vipExpireAt > now;
    const canClaimVip = isVipActive && user.vipLastClaimDate !== today;

    // ★ 彻底独立判断 SVIP 状态
    const isSvipActive = user.svipExpireAt && user.svipExpireAt > now;
    const canClaimSvip = isSvipActive && user.svipLastClaimDate !== today;

    res.json({
      vip: { 
        type: 'normal', 
        expireAt: user.vipExpireAt, 
        canClaim: canClaimVip 
      },
      svip: { 
        type: 'super', 
        expireAt: user.svipExpireAt, 
        canClaim: canClaimSvip 
      },
      balance: user.balance
    });
  } catch (err) {
    console.error('[会员状态查询错误]', err);
    res.status(500).json({ error: '查询失败' });
  }
});

// ========== 2. 激活会员卡 ==========
router.post('/activate', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { code: inputCode } = req.body;
    if (!inputCode) return res.status(400).json({ error: '请输入激活码' });

    const code = inputCode.trim().toUpperCase(); // 统转大写
    const userId = req.user.userId;

    // 1. 原子核销激活码
    const activationCode = await ActivationCode.findOneAndUpdate(
      { code, isUsed: false },
      { isUsed: true, usedBy: userId, usedAt: new Date() },
      { new: true, session }
    );

    if (!activationCode) {
      await session.abortTransaction();
      return res.status(400).json({ error: '激活码无效或已被使用' });
    }

    const targetConfig = MEMBERSHIP_CONFIG[activationCode.type];
    const user = await User.findById(userId).session(session);

    // 2. ★ 独立计算到期时间 (VIP和SVIP各自叠加，互不干扰)
    const targetExpireField = activationCode.type === 'super' ? 'svipExpireAt' : 'vipExpireAt';
    let baseTime = Date.now();

    // 如果当前对应类型的卡未过期，则在现有到期时间上叠加
    if (user[targetExpireField] && user[targetExpireField] > new Date()) {
      baseTime = user[targetExpireField].getTime();
    }
    const newExpireAt = new Date(baseTime + targetConfig.durationDays * 24 * 3600 * 1000);

    // 3. ★ 只更新对应的独立字段，废弃旧字段写入，避免串扰
    const updateData = {
      [targetExpireField]: newExpireAt
    };

    await User.updateOne({ _id: userId }, { $set: updateData }, { session });

    await session.commitTransaction();
    res.json({ message: '激活成功', type: activationCode.type, expireAt: newExpireAt });
  } catch (err) {
    await session.abortTransaction();
    console.error('[会员激活错误]', err);
    res.status(500).json({ error: '激活失败，请稍后重试' });
  } finally {
    session.endSession();
  }
});

// ========== 3. 领取每日奖励 ==========
router.post('/claim', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = getBeijingTodayStr();
    
    // ★ 前端必须传入要领取的类型: 'vip' 或 'svip'
    const { type } = req.body; 
    if (!['vip', 'svip'].includes(type)) {
      return res.status(400).json({ error: '领取类型参数错误' });
    }

    const expireField = type === 'svip' ? 'svipExpireAt' : 'vipExpireAt';
    const claimField = type === 'svip' ? 'svipLastClaimDate' : 'vipLastClaimDate';
    const configType = type === 'svip' ? 'super' : 'normal'; // 映射到配置里的 key

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    // ★ 直接检查对应的独立字段是否有效
    if (!user[expireField] || user[expireField] < new Date()) {
      const typeName = type === 'svip' ? '超级会员' : '普通会员';
      return res.status(400).json({ error: `您不是${typeName}或${typeName}已过期` });
    }

    // ★ 直接检查对应的独立字段今天是否已领
    if (user[claimField] === today) {
      return res.status(400).json({ error: '今日奖励已领取，请勿重复操作' });
    }

    const config = MEMBERSHIP_CONFIG[configType];
    const reward = config.dailyReward;

    // ★ 核心防并发：使用 findOneAndUpdate + 条件更新
    // 只有当对应的卡今天没领过时，才能更新成功
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, [claimField]: { $ne: today } }, // 关键防并发锁：对应的卡今天没领过
      { 
        $inc: { balance: reward }, 
        $set: { [claimField]: today } // 领取后立刻打上今日标记
      },
      { new: true }
    );

    // 如果返回 null，说明条件不满足（今天已经领过了，或者并发请求冲进来了）
    if (!updatedUser) {
      return res.status(400).json({ error: '今日该月卡奖励已领取，请勿重复操作' });
    }

    // 异步记录流水
    Transaction.create({
      userId,
      type: 'membership_daily_claim',
      amount: reward,
      balanceAfter: updatedUser.balance,
      currency: 'point',
      gameType: 'membership',
      remark: `${config.name}每日奖励`
    }).catch(err => console.error('会员领取流水记录失败:', err));

    res.json({ message: '领取成功', reward, newBalance: updatedUser.balance });
  } catch (err) {
    console.error('[会员领取错误]', err);
    res.status(500).json({ error: '领取失败，请稍后重试' });
  }
});

export default router;
