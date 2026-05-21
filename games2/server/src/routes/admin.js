/**
 * 巨人赛跑 - 管理员路由
 * [修复] 内部账号切换、黑白名单切换 - 强制同步状态，消灭 undefined
 */
import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import PointingBet from '../models/PointingBet.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import RiskProfile from '../risk/models/RiskProfile.js';
import SystemPool from '../risk/models/SystemPool.js';

const router = Router();

// ========== 统计与奖池 ==========
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const balanceStats = await User.aggregate([{ $group: { _id: null, totalBalance: { $sum: '$balance' } } }]);
    const totalPlayerBalance = balanceStats.length > 0 ? balanceStats[0].totalBalance : 0;

    const adminAddStats = await Transaction.aggregate([{ $match: { type: 'admin_add' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const adminSubStats = await Transaction.aggregate([{ $match: { type: 'admin_sub' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalAdminAdd = adminAddStats.length > 0 ? adminAddStats[0].total : 0;
    const totalAdminSub = adminSubStats.length > 0 ? adminSubStats[0].total : 0;

    const pool = await SystemPool.findOne({ key: 'default' });
    const totalSystemBet = pool?.totalBet || 0;
    const totalSystemPayout = pool?.totalPayout || 0;
    const systemProfit = pool?.netProfit || 0;

    const totalUsers = await User.countDocuments({ role: 'user' });

    res.json({ totalUsers, totalPlayerBalance, totalAdminAdd, totalAdminSub, totalSystemBet, totalSystemPayout, systemProfit });
  } catch (err) {
    res.status(500).json({ error: '获取统计失败' });
  }
});

router.get('/pool', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const pool = await SystemPool.findOne({ key: 'default' });
    res.json({ currentProfit: pool?.netProfit || 0, message: '当前系统奖池净收益（正=系统赚，负=系统亏）' });
  } catch (err) {
    res.status(500).json({ error: '查询奖池失败' });
  }
});

/**
 * ★ GET /api/admin/db-stats - 获取数据库容量与集合统计
 */
router.get('/db-stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const stats = await db.stats({ scale: 1024 * 1024 }); // 转换为 MB
    
    // 获取关键集合的行数
    const userCount = await User.countDocuments();
    const betCount = await Bet.countDocuments();
    const pointingBetCount = await PointingBet.countDocuments();
    const transactionCount = await Transaction.countDocuments();
    const riskLogCount = await mongoose.models.RiskLog ? await mongoose.models.RiskLog.countDocuments() : 0;

    res.json({
      dbSizeMB: stats.dataSize.toFixed(2),       // 数据大小
      storageSizeMB: stats.storageSize.toFixed(2), // 磁盘占用
      indexSizeMB: stats.indexSize.toFixed(2),     // 索引大小
      collections: [
        { name: 'Users', count: userCount },
        { name: 'Bets (巨人)', count: betCount },
        { name: 'PointingBets (点兵)', count: pointingBetCount },
        { name: 'Transactions (流水)', count: transactionCount },
        { name: 'RiskLogs (风控日志)', count: riskLogCount }
      ]
    });
  } catch (err) {
    console.error('[管理员] 获取数据库状态失败:', err);
    res.status(500).json({ error: '获取数据库状态失败' });
  }
});

router.post('/pool/adjust', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { type, amount, remark } = req.body;
    const adjustAmount = parseInt(amount);
    if (!['add', 'sub'].includes(type)) return res.status(400).json({ error: 'type 必须是 add 或 sub' });
    if (isNaN(adjustAmount) || adjustAmount <= 0) return res.status(400).json({ error: '金额必须大于0' });

    const pool = await SystemPool.findOne({ key: 'default' });
    if (!pool) return res.status(404).json({ error: '奖池不存在' });

    const delta = type === 'add' ? adjustAmount : -adjustAmount;
    pool.netProfit += delta;
    await pool.save();

    res.json({ message: `已${type === 'add' ? '增加' : '扣除'}奖池 ${adjustAmount} 积分`, currentProfit: pool.netProfit });
  } catch (err) {
    res.status(400).json({ error: err.message || '调整奖池失败' });
  }
});

// ========== 风控与账号权限管理 ==========

/**
 * POST /api/admin/toggle-risk - 切换黑名单
 */
router.post('/toggle-risk', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'userId 无效' });
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const user = await User.findById(userObjectId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const newHighRisk = !user.isHighRisk;
    const newWhitelisted = newHighRisk ? false : user.isWhitelisted; // 加入黑名单则移出白名单

    await User.updateOne({ _id: userObjectId }, { $set: { isHighRisk: newHighRisk, isWhitelisted: newWhitelisted } });
    await RiskProfile.updateOne({ userId: userObjectId }, { $set: { isHighRisk: newHighRisk, isWhitelisted: newWhitelisted } }, { upsert: true });

    res.json({ message: `用户 ${user.phone} 已${newHighRisk ? '加入黑名单' : '移出黑名单'}`, isHighRisk: newHighRisk });
  } catch (err) {
    res.status(500).json({ error: '操作失败' });
  }
});

/**
 * POST /api/admin/toggle-whitelist - 切换白名单
 */
router.post('/toggle-whitelist', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'userId 无效' });
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const user = await User.findById(userObjectId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const newWhitelisted = !user.isWhitelisted;
    const newHighRisk = newWhitelisted ? false : user.isHighRisk; // 加入白名单则移出黑名单

    await User.updateOne({ _id: userObjectId }, { $set: { isWhitelisted: newWhitelisted, isHighRisk: newHighRisk } });
    await RiskProfile.updateOne({ userId: userObjectId }, { $set: { isWhitelisted: newWhitelisted, isHighRisk: newHighRisk } }, { upsert: true });

    res.json({ message: `用户 ${user.phone} 已${newWhitelisted ? '加入白名单' : '移出白名单'}`, isWhitelisted: newWhitelisted });
  } catch (err) {
    res.status(500).json({ error: '操作失败' });
  }
});

/**
 * ★ POST /api/admin/toggle-internal - 切换内部测试账号
 * [修复] 以 User 表为准，强制同步 RiskProfile，彻底解决 undefined 问题
 */
router.post('/toggle-internal', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'userId 无效' });
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const user = await User.findById(userObjectId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const newInternal = !user.isInternal;

    // 强制同步两张表
    await User.updateOne({ _id: userObjectId }, { $set: { isInternal: newInternal } });
    await RiskProfile.updateOne({ userId: userObjectId }, { $set: { isInternal: newInternal } }, { upsert: true });

    console.log(`[toggle-internal] 用户 ${user.phone} isInternal 已强制设为: ${newInternal}`);

    res.json({
      message: `用户 ${user.phone} 已${newInternal ? '设为内部账号(免风控/不污染系统池)' : '恢复为普通账号'}`,
      isInternal: newInternal
    });
  } catch (err) {
    console.error('[toggle-internal] 错误:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// ========== 核弹级清理按钮 ==========

/**
 * ★ POST /api/admin/reset-bets - 一键清空对局数据
 */
router.post('/reset-bets', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('[管理员] 执行一键清空对局数据...');
    await Bet.deleteMany({});
    await PointingBet.deleteMany({});
    await Transaction.deleteMany({});
    console.log('[管理员] 对局记录已清空！');
    res.json({ message: '对局记录和积分流水已全部清空' });
  } catch (err) {
    console.error(`[管理员] 清空对局错误: ${err.message}`);
    res.status(500).json({ error: '清空对局失败' });
  }
});

/**
 * ★ POST /api/admin/reset-profits - 一键清空盈亏与风控数据
 */
router.post('/reset-profits', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('[管理员] 执行一键清空盈亏与风控数据...');
    await User.updateMany({}, { $set: { balance: 0, isHighRisk: false, isWhitelisted: false, isInternal: false, riskIndex: 0, todayProfit: 0, totalBetAmount: 0, totalPayoutAmount: 0, lastSettleDate: '' } });
    await RiskProfile.deleteMany({});
    await SystemPool.updateOne({ key: 'default' }, { $set: { totalBet: 0, totalPayout: 0, netProfit: 0, todayBet: 0, todayPayout: 0, todayProfit: 0 } });
    console.log('[管理员] 盈亏与风控数据已清空，系统池归零！');
    res.json({ message: '所有用户余额归零，风控状态重置，系统奖池归零' });
  } catch (err) {
    console.error(`[管理员] 清空盈亏错误: ${err.message}`);
    res.status(500).json({ error: '清空盈亏失败' });
  }
});

/**
 * POST /api/admin/reset-data - [终极核弹] 清空一切
 */
router.post('/reset-data', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('[管理员] 执行恢复出厂设置...');
    await Bet.deleteMany({});
    await PointingBet.deleteMany({});
    await Transaction.deleteMany({});
    await RiskProfile.deleteMany({});
    await SystemPool.updateOne({ key: 'default' }, { $set: { totalBet: 0, totalPayout: 0, netProfit: 0, todayBet: 0, todayPayout: 0, todayProfit: 0 } });
    await User.updateMany({}, { $set: { balance: 0, isHighRisk: false, isWhitelisted: false, isInternal: false, riskIndex: 0, todayProfit: 0, totalBetAmount: 0, totalPayoutAmount: 0, lastSettleDate: '' } });
    console.log('[管理员] 数据已全部清空！');
    res.json({ message: '游戏数据、风控数据、余额已全部清空，恢复出厂状态' });
  } catch (err) {
    console.error(`[管理员] 清空数据错误: ${err.message}`);
    res.status(500).json({ error: '清空数据失败' });
  }
});

// ========== 用户与流水管理 ==========

router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

router.post('/ban', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.role === 'admin') return res.status(400).json({ error: '不能封禁管理员' });
    user.banned = true;
    user.banReason = reason || '违反平台规则';
    await user.save();
    res.json({ message: '用户已封禁' });
  } catch (err) {
    res.status(500).json({ error: '封禁操作失败' });
  }
});

router.post('/unban', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    user.banned = false;
    user.banReason = '';
    await user.save();
    res.json({ message: '用户已解封' });
  } catch (err) {
    res.status(500).json({ error: '解封操作失败' });
  }
});

router.post('/adjust-balance', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, amount, type, remark } = req.body;
    const adjustAmount = parseInt(amount);
    if (!['add', 'sub'].includes(type)) return res.status(400).json({ error: 'type 必须是 add 或 sub' });
    if (isNaN(adjustAmount) || adjustAmount <= 0) return res.status(400).json({ error: '金额必须大于0' });

    const updateOperation = type === 'add' ? { $inc: { balance: adjustAmount } } : { $inc: { balance: -adjustAmount } };
    const filter = type === 'sub' ? { _id: userId, balance: { $gte: adjustAmount } } : { _id: userId };
    const user = await User.findOneAndUpdate(filter, updateOperation, { new: true });

    if (!user) {
      const existUser = await User.findById(userId);
      if (!existUser) return res.status(404).json({ error: '用户不存在' });
      return res.status(400).json({ error: '用户积分不足，扣除失败' });
    }

    await Transaction.create({
      userId,
      type: type === 'add' ? 'admin_add' : 'admin_sub',
      amount: adjustAmount,
      balanceAfter: user.balance,
      remark: remark || `管理员${type === 'add' ? '增加' : '扣除'}${adjustAmount}积分`
    });

    res.json({ message: `已${type === 'add' ? '增加' : '扣除'} ${adjustAmount} 积分`, newBalance: user.balance });
  } catch (err) {
    res.status(500).json({ error: '调整积分失败' });
  }
});

router.get('/bets', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const giantBets = await Bet.find().populate('userId', 'phone').sort({ createdAt: -1 }).limit(limit);
    const pointingBets = await PointingBet.find().populate('userId', 'phone').sort({ createdAt: -1 }).limit(limit);
    res.json({ bets: [...giantBets, ...pointingBets].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit) });
  } catch (err) {
    res.status(500).json({ error: '获取下注流水失败' });
  }
});

/**
 * PUT /api/admin/user-profile - 管理员修改用户资料
 */
router.put('/user-profile', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, nickname, avatar } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    if (nickname !== undefined) {
      if (nickname.trim().length < 2 || nickname.trim().length > 12) return res.status(400).json({ error: '昵称长度需在2-12个字符之间' });
      const bannedWords = ['管理员', '官方', '客服', '系统', 'admin', 'system'];
      if (bannedWords.some(w => nickname.toLowerCase().includes(w))) return res.status(400).json({ error: '昵称包含敏感词汇' });
      user.nickname = nickname.trim();
    }

    if (avatar !== undefined) {
      if (!Number.isInteger(avatar) || avatar < 1 || avatar > 5) return res.status(400).json({ error: '头像编号需为1-5的整数' });
      user.avatar = avatar;
    }

    await user.save();
    console.log(`[管理员-修改资料] 目标uid=${user.uid}, nickname=${user.nickname}, avatar=${user.avatar}, 操作者=${req.user.uid || req.user.userId}`);
    res.json({
      message: '用户资料修改成功',
      user: { id: user._id, uid: user.uid, nickname: user.nickname, avatar: user.avatar, phone: user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }
    });
  } catch (err) {
    console.error(`[管理员-修改资料] 错误: ${err.message}`);
    res.status(500).json({ error: '修改用户资料失败' });
  }
});

export default router;
