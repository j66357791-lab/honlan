/**
 * 巨人赛跑 - 认证路由
 * [安全加固] 增加注册IP频率限制，防止刷号骗取初始积分
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit'; // 引入限流

const router = Router();

// ========== 防刷机制：注册接口限流 ==========
// 同一个IP，1小时内最多只能注册3次
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3,
  message: { error: '注册过于频繁，请1小时后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/register - 注册
 */
router.post('/register', registerLimiter, async (req, res) => { // 加上 registerLimiter
  try {
    const { phone, password } = req.body;
    const clientIp = req.ip; // 记录注册IP
    console.log(`[注册] 收到注册请求: phone=${phone}, IP=${clientIp}`);

    // 校验手机号格式
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: '请输入正确的手机号' });
    }

    // 校验密码长度
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    // 检查手机号是否已注册
    const existing = await User.findOne({ phone });
    if (existing) {
      console.log(`[注册] 手机号已注册: ${phone}`);
      return res.status(400).json({ error: '该手机号已注册' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户 (默认 balance: 0，不送初始积分，防刷)
    const user = await User.create({
      phone,
      password: hashedPassword,
      balance: 0,
      role: 'user',
      registerIp: clientIp // [风控] 记录注册IP，方便后续查同IP多号
    });

    // 生成Token
    const token = generateToken({ userId: user._id, phone: user.phone, role: user.role });
    console.log(`[注册] 注册成功: ${phone}, userId=${user._id}`);

    res.status(201).json({
      token,
      user: { id: user._id, phone: user.phone, balance: user.balance, role: user.role, banned: user.banned }
    });
  } catch (err) {
    console.error(`[注册] 错误: ${err.message}`);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

/**
 * POST /api/login - 登录
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    console.log(`[登录] 收到登录请求: phone=${phone}`);

    if (!phone || !password) {
      return res.status(400).json({ error: '请输入手机号和密码' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ error: '手机号或密码错误' });
    }

    if (user.banned) {
      return res.status(403).json({ error: `账号已被封禁${user.banReason ? '：' + user.banReason : ''}` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: '手机号或密码错误' });
    }

    const token = generateToken({ userId: user._id, phone: user.phone, role: user.role });
    console.log(`[登录] 登录成功: ${phone}, role=${user.role}`);
    res.json({
      token,
      user: { id: user._id, phone: user.phone, balance: user.balance, role: user.role, banned: user.banned }
    });
  } catch (err) {
    console.error(`[登录] 错误: ${err.message}`);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

/**
 * GET /api/me - 获取当前用户信息
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({
      user: {
        id: user._id, phone: user.phone, balance: user.balance, role: user.role,
        banned: user.banned, banReason: user.banReason, createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(`[用户信息] 错误: ${err.message}`);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

export default router;
