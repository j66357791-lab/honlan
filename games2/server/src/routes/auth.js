/**
 * 巨人赛跑 - 认证路由 V2
 * [V4] 终极修复 S-02：密码明文迁移 + 自动修正标记，清理调试日志
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
    crystal: user.crystal || 0,             // ★ 新增：返回晶石原始值
    totalBetAmount: user.totalBetAmount || 0, // ★ 新增：返回流水原始值
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

// ========== 修改昵称限流 ==========
const nicknameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: '操作过于频繁' },
});

/**
 * POST /api/register - 注册
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

    const uid = await generateUniqueUid();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      phone,
      password: hashedPassword,
      isPasswordHashed: true,
      uid,
      nickname: `玩家${uid.slice(-4)}`,
      avatar: 1,
      balance: 0,
      role: 'user',
      registerIp: clientIp
    });

    const token = generateToken({ userId: user._id, uid: user.uid, phone: user.phone, role: user.role });
    console.log(`[注册] 注册成功: phone=${phone}, uid=${uid}`);

    res.status(201).json({ token, user: formatPublicUser(user) });
  } catch (err) {
    console.error(`[注册] 错误: ${err.message}`);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

/**
 * POST /api/login - 登录 (★ 终极版：惰性迁移 + 标记自愈 ★)
 */
router.post('/login', async (req, res) => {
  try {
    // 兼容前端可能传 username 的情况
    let { phone, password } = req.body;
    if (!phone && req.body.username) {
      phone = req.body.username;
    }

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

    let isMatch = false;

    // 判断密码长相：如果是 $2 开头，说明已经是 bcrypt 哈希
    const passwordLooksHashed = user.password && user.password.startsWith('$2');

    if (user.isPasswordHashed === true || passwordLooksHashed) {
      // 1. 新用户 或 标记正确的老用户：走标准 bcrypt 验证
      isMatch = await bcrypt.compare(password, user.password);

      // ★ 自动修正标记：如果密码是哈希，但标记不是 true，就补上
      if (isMatch && user.isPasswordHashed !== true) {
        user.isPasswordHashed = true;
        await user.save();
        console.log(`[安全迁移] 用户 ${user.phone} 的密码标记已自动修正为 true`);
      }
    } else {
      // 2. 真正的老用户明文验证逻辑
      isMatch = (password === user.password);
      if (isMatch) {
        // 明文验证通过，升级为哈希密码
        user.password = await bcrypt.hash(password, 10);
        user.isPasswordHashed = true;
        await user.save();
        console.log(`[安全迁移] 用户 ${user.phone} 的明文密码已升级为哈希加密`);
      }
    }

    if (!isMatch) {
      return res.status(400).json({ error: '手机号或密码错误' });
    }

    // 兼容旧用户：补全 UID
    if (!user.uid) {
      user.uid = await generateUniqueUid();
      user.nickname = user.nickname || `玩家${user.uid.slice(-4)}`;
      user.avatar = user.avatar || 1;
      await user.save();
    }

    const token = generateToken({ userId: user._id, uid: user.uid, phone: user.phone, role: user.role });
    res.json({ token, user: formatPublicUser(user) });
  } catch (err) {
    console.error(`[登录] 系统错误: ${err.message}`);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

/**
 * GET /api/me - 获取当前用户信息
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -isPasswordHashed');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

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
 */
router.put('/profile/nickname', authMiddleware, nicknameLimiter, async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname || nickname.trim().length < 2 || nickname.trim().length > 12) {
      return res.status(400).json({ error: '昵称长度需在2-12个字符之间' });
    }

    const bannedWords = ['管理员', '官方', '客服', '系统', 'admin', 'system'];
    if (bannedWords.some(w => nickname.toLowerCase().includes(w))) {
      return res.status(400).json({ error: '昵称包含敏感词汇' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

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

    user.nickname = nickname.trim();
    user.nameChangedAt = new Date();
    await user.save();

    res.json({ message: '昵称修改成功', nickname: user.nickname, nameChangedAt: user.nameChangedAt });
  } catch (err) {
    console.error(`[昵称修改] 错误: ${err.message}`);
    res.status(500).json({ error: '修改昵称失败' });
  }
});

/**
 * PUT /api/profile/avatar - 修改头像
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

    res.json({ message: '头像修改成功', avatar: user.avatar });
  } catch (err) {
    console.error(`[头像修改] 错误: ${err.message}`);
    res.status(500).json({ error: '修改头像失败' });
  }
});

export default router;
