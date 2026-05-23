import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import PointingBet from '../models/PointingBet.js';
import MatchBet from '../models/MatchBet.js';           // ✅ 新增
import Transaction from '../models/Transaction.js';
import Announcement from '../models/Announcement.js';    // ✅ 新增
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import RiskProfile from '../risk/models/RiskProfile.js';
import SystemPool from '../risk/models/SystemPool.js';
import MatchStats from '../models/MatchStats.js';

const router = Router();

// ========== 统计与奖池 ==========

router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const balanceStats = await User.aggregate([
      { $match: { role: 'user' } },
      { $group: { _id: null, totalBalance: { $sum: '$balance' } } }
    ]);
    const totalPlayerBalance = balanceStats.length > 0 ? balanceStats[0].totalBalance : 0;
    const pool = await SystemPool.findOne({ key: 'default' });
    res.json({
      totalUsers,
      totalPlayerBalance,
      totalAdminAdd: pool?.totalAdminAdd || 0,
      totalAdminSub: pool?.totalAdminSub || 0,
      totalSystemBet: pool?.totalBet || 0,
      totalSystemPayout: pool?.totalPayout || 0,
      systemProfit: pool?.netProfit || 0
    });
  } catch (err) {
    res.status(500).json({ error: '获取统计失败' });
  }
});

router.get('/pool', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const pool = await SystemPool.findOne({ key: 'default' });
    res.json({
      currentProfit: pool?.netProfit || 0,
      message: '当前系统奖池净收益（正=系统赚，负=系统亏）'
    });
  } catch (err) {
    res.status(500).json({ error: '查询奖池失败' });
  }
});

router.get('/db-stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userCount = await User.countDocuments({ role: 'user' });
    const betCount = await Bet.countDocuments();
    const pointingBetCount = await PointingBet.countDocuments();
    const matchBetCount = await MatchBet.countDocuments();         // ✅ 新增
    const transactionCount = await Transaction.countDocuments();
    const announcementCount = await Announcement.countDocuments();  // ✅ 新增
    const riskLogCount = mongoose.models.RiskLog
      ? await mongoose.models.RiskLog.countDocuments()
      : 0;

    res.json({
      dbSizeMB: "0.00",
      storageSizeMB: "0.00",
      indexSizeMB: "1.00",
      collections: [
        { name: "Users", count: userCount },
        { name: "Bets (巨人)", count: betCount },
        { name: "PointingBets (点兵)", count: pointingBetCount },
        { name: "MatchBets (消消乐)", count: matchBetCount },       // ✅ 新增
        { name: "Transactions (流水)", count: transactionCount },
        { name: "Announcements (公告)", count: announcementCount },  // ✅ 新增
        { name: "RiskLogs (风控日志)", count: riskLogCount }
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

    res.json({
      message: `已${type === 'add' ? '增加' : '扣除'}奖池 ${adjustAmount} 积分`,
      currentProfit: pool.netProfit
    });
  } catch (err) {
    res.status(400).json({ error: err.message || '调整奖池失败' });
  }
});

// ========== 风控与账号权限管理 ==========

router.post('/toggle-risk', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'userId 无效' });
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(userObjectId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const newHighRisk = !user.isHighRisk;
    const newWhitelisted = newHighRisk ? false : user.isWhitelisted;

    await User.updateOne({ _id: userObjectId }, { $set: { isHighRisk: newHighRisk, isWhitelisted: newWhitelisted } });
    await RiskProfile.updateOne({ userId: userObjectId }, { $set: { isHighRisk: newHighRisk, isWhitelisted: newWhitelisted } }, { upsert: true });

    res.json({
      message: `用户 ${user.phone} 已${newHighRisk ? '加入黑名单' : '移出黑名单'}`,
      isHighRisk: newHighRisk
    });
  } catch (err) {
    res.status(500).json({ error: '操作失败' });
  }
});

router.post('/toggle-whitelist', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'userId 无效' });
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(userObjectId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const newWhitelisted = !user.isWhitelisted;
    const newHighRisk = newWhitelisted ? false : user.isHighRisk;

    await User.updateOne({ _id: userObjectId }, { $set: { isWhitelisted: newWhitelisted, isHighRisk: newHighRisk } });
    await RiskProfile.updateOne({ userId: userObjectId }, { $set: { isWhitelisted: newWhitelisted, isHighRisk: newHighRisk } }, { upsert: true });

    res.json({
      message: `用户 ${user.phone} 已${newWhitelisted ? '加入白名单' : '移出白名单'}`,
      isWhitelisted: newWhitelisted
    });
  } catch (err) {
    res.status(500).json({ error: '操作失败' });
  }
});

router.post('/toggle-internal', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'userId 无效' });
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(userObjectId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const newInternal = !user.isInternal;
    await User.updateOne({ _id: userObjectId }, { $set: { isInternal: newInternal } });
    await RiskProfile.updateOne({ userId: userObjectId }, { $set: { isInternal: newInternal } }, { upsert: true });

    res.json({
      message: `用户 ${user.phone} 已${newInternal ? '设为内部账号' : '恢复为普通账号'}`,
      isInternal: newInternal
    });
  } catch (err) {
    res.status(500).json({ error: '操作失败' });
  }
});

// ========== 核弹级清理按钮 ==========

router.post('/reset-bets', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Bet.deleteMany({});
    await PointingBet.deleteMany({});
    await MatchBet.deleteMany({});     // ✅ 新增：消消乐记录清理
    await Transaction.deleteMany({});
    res.json({ message: '所有游戏对局记录和积分流水已全部清空（含消消乐）' });
  } catch (err) {
    res.status(500).json({ error: '清空对局失败' });
  }
});

router.post('/reset-profits', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await User.updateMany({}, {
      $set: {
        balance: 0, isHighRisk: false, isWhitelisted: false,
        isInternal: false, riskIndex: 0, todayProfit: 0,
        totalBetAmount: 0, totalPayoutAmount: 0, lastSettleDate: ''
      }
    });
    await RiskProfile.deleteMany({});
    await SystemPool.updateOne({ key: 'default' }, {
      $set: {
        totalBet: 0, totalPayout: 0, netProfit: 0,
        todayBet: 0, todayPayout: 0, todayProfit: 0,
        totalAdminAdd: 0, totalAdminSub: 0
      }
    });
    res.json({ message: '所有用户余额归零，风控状态重置，系统奖池归零' });
  } catch (err) {
    res.status(500).json({ error: '清空盈亏失败' });
  }
});

router.post('/reset-data', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Bet.deleteMany({});
    await PointingBet.deleteMany({});
    await MatchBet.deleteMany({});         // ✅ 新增
    await Transaction.deleteMany({});
    await RiskProfile.deleteMany({});
    await Announcement.deleteMany({});      // ✅ 新增：清理公告
    await SystemPool.updateOne({ key: 'default' }, {
      $set: {
        totalBet: 0, totalPayout: 0, netProfit: 0,
        todayBet: 0, todayPayout: 0, todayProfit: 0,
        totalAdminAdd: 0, totalAdminSub: 0
      }
    });
    await User.updateMany({}, {
      $set: {
        balance: 0, isHighRisk: false, isWhitelisted: false,
        isInternal: false, riskIndex: 0, todayProfit: 0,
        totalBetAmount: 0, totalPayoutAmount: 0, lastSettleDate: ''
      }
    });
    res.json({ message: '游戏数据、风控数据、公告、余额已全部清空，恢复出厂状态' });
  } catch (err) {
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
      userId, type: type === 'add' ? 'admin_add' : 'admin_sub',
      amount: adjustAmount, balanceAfter: user.balance,
      remark: remark || `管理员${type === 'add' ? '增加' : '扣除'}${adjustAmount}积分`
    });

    const poolUpdateField = type === 'add' ? { $inc: { totalAdminAdd: adjustAmount } } : { $inc: { totalAdminSub: adjustAmount } };
    await SystemPool.updateOne({ key: 'default' }, poolUpdateField, { upsert: true });

    res.json({
      message: `已${type === 'add' ? '增加' : '扣除'} ${adjustAmount} 积分`,
      newBalance: user.balance
    });
  } catch (err) {
    res.status(500).json({ error: '调整积分失败' });
  }
});

router.get('/bets', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const giantBets = await Bet.find()
      .populate('userId', 'phone')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-bets -roundId -__v');

    const pointingBets = await PointingBet.find()
      .populate('userId', 'phone')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-bets -roundId -__v');

    // ✅ 新增：消消乐下注记录
    const matchBets = await MatchBet.find()
      .populate('userId', 'phone')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-newBlockSeeds -__v');

    res.json({
      bets: [...giantBets, ...pointingBets, ...matchBets]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
    });
  } catch (err) {
    res.status(500).json({ error: '获取下注流水失败' });
  }
});

router.put('/user-profile', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, nickname, avatar } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    if (nickname !== undefined) {
      if (nickname.trim().length < 2 || nickname.trim().length > 12)
        return res.status(400).json({ error: '昵称长度需在2-12个字符之间' });
      const bannedWords = ['管理员', '官方', '客服', '系统', 'admin', 'system'];
      if (bannedWords.some(w => nickname.toLowerCase().includes(w)))
        return res.status(400).json({ error: '昵称包含敏感词汇' });
      user.nickname = nickname.trim();
    }
    if (avatar !== undefined) {
      if (!Number.isInteger(avatar) || avatar < 1 || avatar > 5)
        return res.status(400).json({ error: '头像编号需为1-5的整数' });
      user.avatar = avatar;
    }
    await user.save();
    res.json({
      message: '用户资料修改成功',
      user: {
        id: user._id, uid: user.uid, nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      }
    });
  } catch (err) {
    res.status(500).json({ error: '修改用户资料失败' });
  }
});

// ========== ✅ 新增：公告快捷统计 ==========

router.get('/announcement-stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const total = await Announcement.countDocuments();
    const active = await Announcement.countDocuments({ status: 'active' });
    const draft = await Announcement.countDocuments({ status: 'draft' });
    const expired = await Announcement.countDocuments({ status: 'expired' });
    res.json({ total, active, draft, expired });
  } catch (err) {
    res.status(500).json({ error: '获取公告统计失败' });
  }
});

// ========== 消消乐：核心统计与 RTP ==========

// 1) 核心统计：总投入、总产出、总局数、RTP
router.get('/match/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const stats = await MatchStats.findById('global');
    if (!stats) {
      return res.json({
        totalWagered: 0,
        totalPayout: 0,
        totalGames: 0,
        currentRTP: 0,
        message: '暂无消消乐数据'
      });
    }

    const currentRTP = stats.totalWagered > 0 
      ? stats.totalPayout / stats.totalWagered 
      : 0;

    res.json({
      totalWagered: stats.totalWagered,   // 总投入
      totalPayout: stats.totalPayout,     // 总产出
      totalGames: stats.totalGames,       // 总局数
      currentRTP,                         // 当前历史 RTP
      updatedAt: stats.updatedAt
    });
  } catch (err) {
    console.error('[管理员] 获取消消乐统计失败:', err);
    res.status(500).json({ error: '获取消消乐统计失败' });
  }
});

// 2) 最近 N 局的 RTP 走势（按时间倒序，默认 50 局）
router.get('/match/rtp-history', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    // 按创建时间倒序取最近的对局
    const recentBets = await MatchBet.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('ticketPrice totalScore netProfit createdAt');

    // 计算每局的 RTP：payout / wagered
    const rtpHistory = recentBets.map(bet => {
      const wagered = bet.ticketPrice;
      const payout = bet.totalScore; // 注意：你的 totalScore 是派彩前还是派彩后？
      // 如果 totalScore 是含手续费的总额，则实际 payout = totalScore - fee
      // 这里暂时按 totalScore 作为 payout 来算，你可以根据实际字段调整
      const rtp = wagered > 0 ? payout / wagered : 0;
      return {
        createdAt: bet.createdAt,
        ticketPrice: wagered,
        totalScore: bet.totalScore,
        netProfit: bet.netProfit,
        rtp
      };
    });

    res.json({ limit, rtpHistory });
  } catch (err) {
    console.error('[管理员] 获取消消乐 RTP 历史失败:', err);
    res.status(500).json({ error: '获取 RTP 历史失败' });
  }
});

// 3) 最近的高分局（排查异常大奖）
router.get('/match/top-games', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const topGames = await MatchBet.find()
      .sort({ totalScore: -1 })  // 按总分降序
      .limit(limit)
      .populate('userId', 'phone')
      .select('ticketPrice totalScore netProfit waves createdAt');

    res.json({ limit, topGames });
  } catch (err) {
    console.error('[管理员] 获取消消乐高分对局失败:', err);
    res.status(500).json({ error: '获取高分对局失败' });
  }
});


export default router;
