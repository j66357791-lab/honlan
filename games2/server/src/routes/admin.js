/**
 * 巨人赛跑 - 管理员路由
 * [新增] 切换白名单、一键清空测试数据
 */
import { Router } from 'express';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import PointingBet from '../models/PointingBet.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { getSystemProfit, adjustSystemPoolManually, resetSystemPool } from '../config/systemPool.js';

const router = Router();

// ... 保留原有的 /stats, /pool, /pool/adjust 路由 ...
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const balanceStats = await User.aggregate([{ $group: { _id: null, totalBalance: { $sum: '$balance' } } }]);
    const totalPlayerBalance = balanceStats.length > 0 ? balanceStats[0].totalBalance : 0;
    const adminAddStats = await Transaction.aggregate([{ $match: { type: 'admin_add' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const adminSubStats = await Transaction.aggregate([{ $match: { type: 'admin_sub' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalAdminAdd = adminAddStats.length > 0 ? adminAddStats[0].total : 0;
    const totalAdminSub = adminSubStats.length > 0 ? adminSubStats[0].total : 0;
    const giantStats = await Bet.aggregate([{ $group: { _id: null, totalBet: { $sum: '$amount' }, totalPayout: { $sum: '$payout' } } }]);
    const pointingStats = await PointingBet.aggregate([{ $group: { _id: null, totalBet: { $sum: '$totalAmount' }, totalPayout: { $sum: '$totalPayout' } } }]);
    const totalSystemBet = (giantStats[0]?.totalBet || 0) + (pointingStats[0]?.totalBet || 0);
    const totalSystemPayout = (giantStats[0]?.totalPayout || 0) + (pointingStats[0]?.totalPayout || 0);
    const systemProfit = totalSystemBet - totalSystemPayout;
    const totalUsers = await User.countDocuments({ role: 'user' });
    res.json({ totalUsers, totalPlayerBalance, totalAdminAdd, totalAdminSub, totalSystemBet, totalSystemPayout, systemProfit });
  } catch (err) { res.status(500).json({ error: '获取统计失败' }); }
});
router.get('/pool', authMiddleware, adminMiddleware, async (req, res) => {
  try { res.json({ currentProfit: getSystemProfit(), message: '当前系统奖池净收益（正=系统赚，负=系统亏）' }); } catch (err) { res.status(500).json({ error: '查询奖池失败' }); }
});
router.post('/pool/adjust', authMiddleware, adminMiddleware, async (req, res) => {
  try { const { type, amount, remark } = req.body; const result = adjustSystemPoolManually({ type, amount, remark }); res.json({ message: `已${type === 'add' ? '增加' : '扣除'}奖池 ${amount} 积分`, currentProfit: result.currentProfit }); } catch (err) { res.status(400).json({ error: err.message || '调整奖池失败' }); }
});

/**
 * POST /api/admin/toggle-risk - 切换用户高风险标记 (黑名单)
 */
router.post('/toggle-risk', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.role === 'admin') return res.status(400).json({ error: '不能标记管理员' });

    user.isHighRisk = !user.isHighRisk; 
    // 互斥逻辑：如果拉黑，自动取消白名单
    if (user.isHighRisk) user.isWhitelisted = false;
    
    await user.save();
    res.json({ 
      message: `用户 ${user.phone} 已${user.isHighRisk ? '加入黑名单(极端针对)' : '移出黑名单(恢复系统风控)'}`, 
      isHighRisk: user.isHighRisk 
    });
  } catch (err) { res.status(500).json({ error: '操作失败' }); }
});

/**
 * POST /api/admin/toggle-whitelist - [新增] 切换用户白名单标记 (免死金牌)
 */
router.post('/toggle-whitelist', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.role === 'admin') return res.status(400).json({ error: '管理员默认不受限制' });

    user.isWhitelisted = !user.isWhitelisted; 
    // 互斥逻辑：如果加白名单，自动取消黑名单
    if (user.isWhitelisted) user.isHighRisk = false;

    await user.save();
    res.json({ 
      message: `用户 ${user.phone} 已${user.isWhitelisted ? '加入白名单(免除一切风控)' : '移出白名单(恢复系统风控)'}`, 
      isWhitelisted: user.isWhitelisted 
    });
  } catch (err) { res.status(500).json({ error: '操作失败' }); }
});

/**
 * POST /api/admin/reset-data - [核弹按钮] 清空所有游戏数据，重新开始
 * [更新] 同时清空风控标记和追踪数据
 */
router.post('/reset-data', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('[管理员] 执行清空游戏数据操作...');

    await Bet.deleteMany({});
    await PointingBet.deleteMany({});
    await Transaction.deleteMany({});

    // 重置所有风控状态和余额
    await User.updateMany({}, { 
      $set: { 
        balance: 0, 
        isHighRisk: false, 
        isWhitelisted: false,
        riskIndex: 0,
        todayProfit: 0,
        totalBetAmount: 0,
        totalPayoutAmount: 0,
        lastSettleDate: ''
      } 
    });

    resetSystemPool();

    console.log('[管理员] 游戏数据已全部清空，风控状态重置，奖池归零！');
    res.json({ message: '游戏数据已清空，所有用户余额归零，风控状态重置，系统奖池归零' });
  } catch (err) {
    console.error(`[管理员] 清空数据错误: ${err.message}`);
    res.status(500).json({ error: '清空数据失败' });
  }
});

// ... 保留原有的 /users, /ban, /unban, /adjust-balance, /bets 路由 ...
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try { const users = await User.find().select('-password').sort({ createdAt: -1 }); res.json({ users }); } catch (err) { res.status(500).json({ error: '获取用户列表失败' }); }
});
router.post('/ban', authMiddleware, adminMiddleware, async (req, res) => {
  try { const { userId, reason } = req.body; const user = await User.findById(userId); if (!user) return res.status(404).json({ error: '用户不存在' }); if (user.role === 'admin') return res.status(400).json({ error: '不能封禁管理员' }); user.banned = true; user.banReason = reason || '违反平台规则'; await user.save(); res.json({ message: '用户已封禁' }); } catch (err) { res.status(500).json({ error: '封禁操作失败' }); }
});
router.post('/unban', authMiddleware, adminMiddleware, async (req, res) => {
  try { const { userId } = req.body; const user = await User.findById(userId); if (!user) return res.status(404).json({ error: '用户不存在' }); user.banned = false; user.banReason = ''; await user.save(); res.json({ message: '用户已解封' }); } catch (err) { res.status(500).json({ error: '解封操作失败' }); }
});
router.post('/adjust-balance', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, amount, type, remark } = req.body; const adjustAmount = parseInt(amount);
    if (!['add', 'sub'].includes(type)) return res.status(400).json({ error: 'type 必须是 add 或 sub' });
    if (isNaN(adjustAmount) || adjustAmount <= 0) return res.status(400).json({ error: '金额必须大于0' });
    const updateOperation = type === 'add' ? { $inc: { balance: adjustAmount } } : { $inc: { balance: -adjustAmount } };
    const filter = type === 'sub' ? { _id: userId, balance: { $gte: adjustAmount } } : { _id: userId };
    const user = await User.findOneAndUpdate(filter, updateOperation, { new: true });
    if (!user) { const existUser = await User.findById(userId); if (!existUser) return res.status(404).json({ error: '用户不存在' }); return res.status(400).json({ error: '用户积分不足，扣除失败' }); }
    await Transaction.create({ userId, type: type === 'add' ? 'admin_add' : 'admin_sub', amount: adjustAmount, balanceAfter: user.balance, remark: remark || `管理员${type === 'add' ? '增加' : '扣除'}${adjustAmount}积分` });
    res.json({ message: `已${type === 'add' ? '增加' : '扣除'} ${adjustAmount} 积分`, newBalance: user.balance });
  } catch (err) { res.status(500).json({ error: '调整积分失败' }); }
});
router.get('/bets', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const giantBets = await Bet.find().populate('userId', 'phone').sort({ createdAt: -1 }).limit(limit);
    const pointingBets = await PointingBet.find().populate('userId', 'phone').sort({ createdAt: -1 }).limit(limit);
    res.json({ bets: [...giantBets, ...pointingBets].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit) });
  } catch (err) { res.status(500).json({ error: '获取下注流水失败' }); }
});

/**
 * PUT /api/admin/user-profile - 管理员修改用户资料
 * ★ 管理员无30天限制，可自由修改昵称/头像/UID
 */
router.put('/user-profile', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, nickname, avatar } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 修改昵称（管理员不受30天限制，不更新nameChangedAt）
    if (nickname !== undefined) {
      if (nickname.trim().length < 2 || nickname.trim().length > 12) {
        return res.status(400).json({ error: '昵称长度需在2-12个字符之间' });
      }
      const bannedWords = ['管理员', '官方', '客服', '系统', 'admin', 'system'];
      if (bannedWords.some(w => nickname.toLowerCase().includes(w))) {
        return res.status(400).json({ error: '昵称包含敏感词汇' });
      }
      user.nickname = nickname.trim();
      // ★ 管理员修改不记录nameChangedAt，不影响用户自己的30天计时
    }

    // 修改头像
    if (avatar !== undefined) {
      if (!Number.isInteger(avatar) || avatar < 1 || avatar > 5) {
        return res.status(400).json({ error: '头像编号需为1-5的整数' });
      }
      user.avatar = avatar;
    }

    await user.save();

    console.log(`[管理员-修改资料] 目标uid=${user.uid}, nickname=${user.nickname}, avatar=${user.avatar}, 操作者=${req.user.uid || req.user.userId}`);

    res.json({
      message: '用户资料修改成功',
      user: {
        id: user._id,
        uid: user.uid,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      }
    });
  } catch (err) {
    console.error(`[管理员-修改资料] 错误: ${err.message}`);
    res.status(500).json({ error: '修改用户资料失败' });
  }
});

export default router;
