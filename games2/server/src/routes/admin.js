/**
 * 巨人赛跑 - 管理员路由
 * 用户管理：列表、封禁/解封、调整积分
 * 数据统计：下注流水
 */
import { Router } from 'express';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/admin/users - 获取所有用户列表
 */
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    console.log(`[管理员] 获取用户列表: ${users.length}个用户`);
    res.json({ users });
  } catch (err) {
    console.error(`[管理员] 获取用户列表错误: ${err.message}`);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

/**
 * POST /api/admin/ban - 封禁用户
 * body: { userId, reason }
 */
router.post('/ban', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, reason } = req.body;
    console.log(`[管理员] 封禁用户: userId=${userId}, 原因=${reason}`);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ error: '不能封禁管理员' });
    }

    user.banned = true;
    user.banReason = reason || '违反平台规则';
    await user.save();

    res.json({ message: '用户已封禁', user: { id: user._id, phone: user.phone, banned: user.banned, banReason: user.banReason } });
  } catch (err) {
    console.error(`[管理员] 封禁错误: ${err.message}`);
    res.status(500).json({ error: '封禁操作失败' });
  }
});

/**
 * POST /api/admin/unban - 解封用户
 * body: { userId }
 */
router.post('/unban', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    console.log(`[管理员] 解封用户: userId=${userId}`);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    user.banned = false;
    user.banReason = '';
    await user.save();

    res.json({ message: '用户已解封', user: { id: user._id, phone: user.phone, banned: false } });
  } catch (err) {
    console.error(`[管理员] 解封错误: ${err.message}`);
    res.status(500).json({ error: '解封操作失败' });
  }
});

/**
 * POST /api/admin/adjust-balance - 调整用户积分
 * body: { userId, amount, type: 'add'|'sub', remark }
 */
router.post('/adjust-balance', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, amount, type, remark } = req.body;
    const adjustAmount = parseInt(amount);
    console.log(`[管理员] 调整积分: userId=${userId}, type=${type}, amount=${adjustAmount}`);

    if (!['add', 'sub'].includes(type)) {
      return res.status(400).json({ error: 'type 必须是 add 或 sub' });
    }
    if (isNaN(adjustAmount) || adjustAmount <= 0) {
      return res.status(400).json({ error: '金额必须大于0' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 计算新余额
    let newBalance;
    if (type === 'add') {
      newBalance = user.balance + adjustAmount;
    } else {
      newBalance = Math.max(0, user.balance - adjustAmount);
    }

    user.balance = newBalance;
    await user.save();

    // 记录积分明细
    await Transaction.create({
      userId,
      type: type === 'add' ? 'admin_add' : 'admin_sub',
      amount: adjustAmount,
      balanceAfter: newBalance,
      remark: remark || `管理员${type === 'add' ? '增加' : '扣除'}${adjustAmount}积分`
    });

    console.log(`[管理员] 积分调整完成: ${user.phone}, 新余额=${newBalance}`);
    res.json({
      message: `已${type === 'add' ? '增加' : '扣除'} ${adjustAmount} 积分`,
      user: { id: user._id, phone: user.phone, balance: newBalance }
    });
  } catch (err) {
    console.error(`[管理员] 调整积分错误: ${err.message}`);
    res.status(500).json({ error: '调整积分失败' });
  }
});

/**
 * GET /api/admin/bets - 获取所有下注记录
 */
router.get('/bets', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const bets = await Bet.find()
      .populate('userId', 'phone')
      .sort({ createdAt: -1 })
      .limit(limit);
    console.log(`[管理员] 获取下注流水: ${bets.length}条记录`);
    res.json({ bets });
  } catch (err) {
    console.error(`[管理员] 获取下注流水错误: ${err.message}`);
    res.status(500).json({ error: '获取下注流水失败' });
  }
});

export default router;
