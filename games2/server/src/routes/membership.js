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
    const user = await User.findById(req.user.userId).select('balance membershipType membershipExpireAt membershipLastClaimDate');
    if (!user) return res.status(404).json({ error: '用户不存在' });

    let canClaim = false;
    // 如果是会员且未过期
    if (user.membershipType !== 'none' && user.membershipExpireAt > new Date()) {
      const today = getBeijingTodayStr();
      // 判断今天是否已领 (用字符串比对，又快又准)
      if (user.membershipLastClaimDate !== today) {
        canClaim = true;
      }
    }

    res.json({
      type: user.membershipType,
      expireAt: user.membershipExpireAt,
      canClaim, // 前端根据此字段显示"领取"按钮
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

    // 1. 原子核销激活码：查找未使用的码，并瞬间标记为已使用（天然防并发，两人同激一码只有一人能成功）
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

    // 2. 业务拦截：超级会员不能被普通卡覆盖
    if (user.membershipType === 'super' && activationCode.type === 'normal') {
      await session.abortTransaction();
      // 注意：这里虽然拦截了，但激活码已经被标记为使用了。这是标准做法，防止恶意尝试破解。
      return res.status(400).json({ error: '您已是超级会员，无法激活普通月卡' });
    }

    // 3. 计算新的到期时间 (同类卡叠加逻辑)
    let baseTime = Date.now();
    // 如果当前是会员且未过期，则在现有到期时间上叠加
    if (user.membershipType !== 'none' && user.membershipExpireAt > new Date()) {
      baseTime = user.membershipExpireAt.getTime();
    }
    const newExpireAt = new Date(baseTime + targetConfig.durationDays * 24 * 3600 * 1000);

    // 4. 更新用户会员状态 (如果是普通升超级，type会被更新为super)
    user.membershipType = activationCode.type;
    user.membershipExpireAt = newExpireAt;
    await user.save({ session });

    await session.commitTransaction();
    res.json({ 
      message: '激活成功', 
      type: activationCode.type, 
      expireAt: newExpireAt 
    });

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

    // ★ 核心防并发：使用 findOneAndUpdate + 条件更新
    // 只有当用户是会员、未过期、且今天没领过(即 membershipLastClaimDate !== today) 时，才能更新成功
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    if (user.membershipType === 'none' || user.membershipExpireAt < new Date()) {
      return res.status(400).json({ error: '您不是会员或会员已过期' });
    }

    const config = MEMBERSHIP_CONFIG[user.membershipType];
    const reward = config.dailyReward;

    // 原子操作：增加积分，并立刻将今日标记写入数据库
    const updatedUser = await User.findOneAndUpdate(
      { 
        _id: userId, 
        membershipLastClaimDate: { $ne: today } // 关键防并发锁：今天没领过
      },
      { 
        $inc: { balance: reward }, 
        $set: { membershipLastClaimDate: today } // 领取后立刻打上今日标记
      },
      { new: true } // 返回更新后的数据
    );

    // 如果返回 null，说明条件不满足（今天已经领过了，或者并发请求冲进来了）
    if (!updatedUser) {
      return res.status(400).json({ error: '今日奖励已领取，请勿重复操作' });
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

    res.json({ 
      message: '领取成功', 
      reward, 
      newBalance: updatedUser.balance 
    });

  } catch (err) {
    console.error('[会员领取错误]', err);
    res.status(500).json({ error: '领取失败，请稍后重试' });
  }
});

export default router;
