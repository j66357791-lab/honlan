/**
 * 巨人赛跑 - 认证路由 V2
 * [V2] 注册自动生成UID/昵称，登录/me返回脱敏信息，新增修改昵称/头像接口
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// ========== 工具函数：生成唯一8位UID ==========
async function generateUniqueUid() {
  const MAX_RETRIES = 20;
  for (let i = 0; i < MAX_RETRIES; i++) {
    // 生成 10000000 ~ 99999999 的8位数字
    const uid = String(Math.floor(10000000 + Math.random() * 90000000));
    const exists = await User.findOne({ uid });
    if (!exists) return uid;
  }
  throw new Error('UID生成失败：重试次数耗尽，请联系管理员');
}

// ========== 工具函数：格式化用户公开信息 ==========
function formatPublicUser(user) {
  return {
    id: user._id,
    uid: user.uid,
    nickname: user.nickname,
    avatar: user.avatar,
    phone: user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    balance: user.balance,
    role: user.role,
    banned: user.banned,
    banReason: user.banReason,
    nameChangedAt: user.nameChangedAt,
    createdAt: user.createdAt
  };
}

// ========== 防刷：注册限流 ==========
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: '注册过于频繁，请1小时后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ========== 修改昵称限流（防刷接口本身，不是30天限制） ==========
const nicknameLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1分钟
  max: 3,               // 最多3次请求（业务逻辑还会卡30天）
  message: { error: '操作过于频繁' },
});

/**
 * POST /api/register - 注册
 * ★ 自动生成UID + 默认昵称 + 默认头像
 */
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body;
    const clientIp = req.ip;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: '请输入正确的手机号' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(400).json({ error: '该手机号已注册' });
    }

    // ★ 生成唯一UID
    const uid = await generateUniqueUid();

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      phone,
      password: hashedPassword,
      uid,                                    // ★ 自动分配的8位UID
      nickname: `玩家${uid.slice(-4)}`,       // ★ 默认昵称：玩家+UID后4位
      avatar: 1,                              // ★ 默认1号头像
      balance: 0,
      role: 'user',
      registerIp: clientIp
    });

    const token = generateToken({
      userId: user._id,
      uid: user.uid,        // ★ Token里也带上uid
      phone: user.phone,
      role: user.role
    });

    console.log(`[注册] 注册成功: phone=${phone}, uid=${uid}, nickname=玩家${uid.slice(-4)}`);

    res.status(201).json({
      token,
      user: formatPublicUser(user)
    });
  } catch (err) {
    console.error(`[注册] 错误: ${err.message}`);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

/**
 * POST /api/login - 登录
 * ★ 返回脱敏手机号 + uid/nickname/avatar
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

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

    // ★ 兼容旧用户：如果登录时还没有uid，自动补全
    if (!user.uid) {
      user.uid = await generateUniqueUid();
      user.nickname = user.nickname || `玩家${user.uid.slice(-4)}`;
      user.avatar = user.avatar || 1;
      await user.save();
      console.log(`[登录-迁移] 旧用户补全: uid=${user.uid}`);
    }

    const token = generateToken({
      userId: user._id,
      uid: user.uid,
      phone: user.phone,
      role: user.role
    });

    res.json({
      token,
      user: formatPublicUser(user)
    });
  } catch (err) {
    console.error(`[登录] 错误: ${err.message}`);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

/**
 * GET /api/me - 获取当前用户信息
 * ★ 返回脱敏手机号
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // ★ 兼容旧用户
    if (!user.uid) {
      user.uid = await generateUniqueUid();
      user.nickname = user.nickname || `玩家${user.uid.slice(-4)}`;
      user.avatar = user.avatar || 1;
      await user.save();
    }

    res.json({ user: formatPublicUser(user) });
  } catch (err) {
    console.error(`[用户信息] 错误: ${err.message}`);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

/**
 * PUT /api/profile/nickname - 修改昵称
 * ★ 普通用户30天只能改1次
 */
router.put('/profile/nickname', authMiddleware, nicknameLimiter, async (req, res) => {
  try {
    const { nickname } = req.body;

    // 校验昵称
    if (!nickname || nickname.trim().length < 2 || nickname.trim().length > 12) {
      return res.status(400).json({ error: '昵称长度需在2-12个字符之间' });
    }

    // ★ 敏感词过滤（简单版，后续可扩展）
    const bannedWords = ['管理员', '官方', '客服', '系统', 'admin', 'system'];
    if (bannedWords.some(w => nickname.toLowerCase().includes(w))) {
      return res.status(400).json({ error: '昵称包含敏感词汇' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // ★ 30天限制检查（仅普通用户）
    if (user.role !== 'admin' && user.nameChangedAt) {
      const daysSinceLastChange = Math.floor(
        (Date.now() - new Date(user.nameChangedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastChange < 30) {
        const remainingDays = 30 - daysSinceLastChange;
        return res.status(429).json({
          error: `昵称30天内只能修改一次，还需等待${remainingDays}天`,
          remainingDays,
          nextChangeDate: new Date(
            new Date(user.nameChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000
          ).toISOString()
        });
      }
    }

    // 更新昵称
    user.nickname = nickname.trim();
    user.nameChangedAt = new Date();
    await user.save();

    console.log(`[昵称修改] uid=${user.uid}, 新昵称=${user.nickname}, 角色=${user.role}`);

    res.json({
      message: '昵称修改成功',
      nickname: user.nickname,
      nameChangedAt: user.nameChangedAt
    });
  } catch (err) {
    console.error(`[昵称修改] 错误: ${err.message}`);
    res.status(500).json({ error: '修改昵称失败' });
  }
});

/**
 * PUT /api/profile/avatar - 修改头像
 * ★ 普通用户只能在1-5号预设头像中选择，可随时更换
 */
router.put('/profile/avatar', authMiddleware, async (req, res) => {
  try {
    const { avatar } = req.body;

    if (!avatar || !Number.isInteger(avatar) || avatar < 1 || avatar > 5) {
      return res.status(400).json({ error: '头像编号需为1-5的整数' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    user.avatar = avatar;
    await user.save();

    console.log(`[头像修改] uid=${user.uid}, 新头像=${avatar}`);

    res.json({
      message: '头像修改成功',
      avatar: user.avatar
    });
  } catch (err) {
    console.error(`[头像修改] 错误: ${err.message}`);
    res.status(500).json({ error: '修改头像失败' });
  }
});

export default router;
