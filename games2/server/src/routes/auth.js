/**
 * 巨人赛跑 - 认证路由
 * 登录、注册、获取当前用户信息
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/register - 注册
 * body: { phone, password }
 */
router.post('/register', async (req, res) => {
  try {
    const { phone, password } = req.body;
    console.log(`[注册] 收到注册请求: phone=${phone}`);

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

    // 创建用户
    const user = await User.create({
      phone,
      password: hashedPassword,
      balance: 0,
      role: 'user'
    });

    // 生成Token
    const token = generateToken({
      userId: user._id,
      phone: user.phone,
      role: user.role
    });

    console.log(`[注册] 注册成功: ${phone}, userId=${user._id}`);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        phone: user.phone,
        balance: user.balance,
        role: user.role,
        banned: user.banned
      }
    });
  } catch (err) {
    console.error(`[注册] 错误: ${err.message}`);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

/**
 * POST /api/login - 登录
 * body: { phone, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    console.log(`[登录] 收到登录请求: phone=${phone}`);

    if (!phone || !password) {
      return res.status(400).json({ error: '请输入手机号和密码' });
    }

    // 查找用户
    const user = await User.findOne({ phone });
    if (!user) {
      console.log(`[登录] 用户不存在: ${phone}`);
      return res.status(400).json({ error: '手机号或密码错误' });
    }

    // 检查封禁
    if (user.banned) {
      console.log(`[登录] 用户已封禁: ${phone}, 原因: ${user.banReason}`);
      return res.status(403).json({ error: `账号已被封禁${user.banReason ? '：' + user.banReason : ''}` });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[登录] 密码错误: ${phone}`);
      return res.status(400).json({ error: '手机号或密码错误' });
    }

    // 生成Token
    const token = generateToken({
      userId: user._id,
      phone: user.phone,
      role: user.role
    });

    console.log(`[登录] 登录成功: ${phone}, role=${user.role}`);
    res.json({
      token,
      user: {
        id: user._id,
        phone: user.phone,
        balance: user.balance,
        role: user.role,
        banned: user.banned
      }
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
        id: user._id,
        phone: user.phone,
        balance: user.balance,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(`[用户信息] 错误: ${err.message}`);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

export default router;
