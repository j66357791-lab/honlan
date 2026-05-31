// src/routes/transfer.js
import { Router } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// 转增限流：1分钟最多5次
const transferLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: '操作过于频繁，请稍后再试' },
});

// 核心安全：基于 userId 的查询防刷
const checkLimitMap = new Map();
const MAX_CHECK_PER_HOUR = 20;

// 生成订单号: TF + 年月日时分秒 + 4位随机数
function generateTradeNo() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = crypto.randomInt(1000, 9999);
  return `TF${dateStr}${rand}`;
}

// ========== 1. 查询目标用户信息 (用于校对) ==========
router.post('/check-target', authMiddleware, async (req, res) => {
  try {
    const { account } = req.body;
    const userId = req.user.userId;

    // 1. 防刷拦截
    const now = Date.now();
    let userRecord = checkLimitMap.get(userId) || { count: 0, resetTime: now + 3600000 };
    if (now > userRecord.resetTime) {
        userRecord = { count: 0, resetTime: now + 3600000 };
    }
    if (userRecord.count >= MAX_CHECK_PER_HOUR) {
        return res.status(429).json({ error: `校验查询过于频繁，每小时最多查询${MAX_CHECK_PER_HOUR}次` });
    }
    userRecord.count++;
    checkLimitMap.set(userId, userRecord);

    // 2. 参数校验
    if (!account) return res.status(400).json({ error: '请输入对方UID或手机号' });
    
    const user = await User.findOne({
      $or: [{ uid: account }, { phone: account }]
    }).select('uid nickname'); // 不返回 phone

    if (!user) return res.status(404).json({ error: '该用户不存在' });
    if (user._id.equals(userId)) return res.status(400).json({ error: '不能转增给自己' });

    // 3. 返回校对信息
    res.json({ uid: user.uid, nickname: user.nickname });
  } catch (err) {
    console.error('[check-target 错误]', err);
    res.status(500).json({ error: '查询失败' });
  }
});

// ========== 2. 执行晶石转增 ==========
router.post('/crystal', authMiddleware, transferLimiter, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { targetAccount, amount } = req.body;
    const fromUserId = req.user.userId;

    // 1. 参数校验
    if (!targetAccount || amount === undefined || amount === null) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: '缺少目标账号或转增数量' });
    }

    const transferAmount = parseFloat(amount);
    
    // 校验：必须是数字，最小1起转
    if (isNaN(transferAmount) || transferAmount < 1) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: '转增数量必须是大于等于1的数字' });
    }

    // 校验：最多允许两位小数
    const decimalPart = transferAmount.toString().split('.')[1];
    if (decimalPart && decimalPart.length > 2) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: '转增数量最多支持两位小数' });
    }

    // 2. 计算手续费 (5%，精确到小数点后两位，四舍五入)
    const fee = Math.round(transferAmount * 0.05 * 100) / 100;
    const totalCost = Math.round((transferAmount + fee) * 100) / 100; // 防止浮点数精度丢失

    // 3. 原子扣减转出方 (本金+手续费)
    const fromUser = await User.findOneAndUpdate(
      { _id: fromUserId, banned: false, crystal: { $gte: totalCost } },
      { $inc: { crystal: -totalCost } },
      { new: true, session }
    );

    if (!fromUser) {
      await session.abortTransaction(); session.endSession();
      const checkUser = await User.findById(fromUserId);
      if (!checkUser) return res.status(404).json({ error: '用户不存在' });
      if (checkUser.banned) return res.status(403).json({ error: '账号已被封禁' });
      return res.status(400).json({ error: `晶石不足，需支付${totalCost.toFixed(2)}(含手续费${fee.toFixed(2)})` });
    }

    // 4. 查找接收方并原子增加 (只加本金)
    const toUser = await User.findOneAndUpdate(
      { uid: targetAccount, banned: false },
      { $inc: { crystal: transferAmount } },
      { new: true, session }
    );

    if (!toUser) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ error: '接收方不存在或已被封禁' });
    }

    if (toUser._id.equals(fromUserId)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: '不能转增给自己' });
    }

    // 5. 生成同一订单号，绑定双方流水
    const tradeNo = generateTradeNo();

    // 6. 记录流水
    await Transaction.create([
      {
        userId: fromUser._id,
        type: 'crystal_transfer_out',
        amount: totalCost,
        fee: fee,
        balanceAfter: fromUser.crystal,
        currency: 'crystal',
        remark: `转增给UID:${toUser.uid} ${transferAmount.toFixed(2)}晶石 (手续费${fee.toFixed(2)})`,
        gameType: 'transfer',
        tradeNo
      },
      {
        userId: toUser._id,
        type: 'crystal_transfer_in',
        amount: transferAmount,
        fee: 0,
        balanceAfter: toUser.crystal,
        currency: 'crystal',
        remark: `来自UID:${fromUser.uid}的转增`,
        gameType: 'transfer',
        tradeNo
      }
    ], { session });

    // 7. 提交事务
    await session.commitTransaction();
    session.endSession();

    res.json({ 
      message: '转增成功', 
      crystal: fromUser.crystal,
      fee,
      tradeNo
    });

  } catch (err) {
    try { await session.abortTransaction(); } catch {}
    session.endSession();
    console.error('[晶石转增错误]', err);
    res.status(500).json({ error: '转增失败，请稍后重试' });
  }
});

export default router;
