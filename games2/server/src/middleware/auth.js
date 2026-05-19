/**
 * 巨人赛跑 - JWT 认证中间件
 * [安全修复] 移除硬编码密钥，改用环境变量，并增加密钥存在性校验
 */
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// 从环境变量读取密钥，切勿再写死在代码里
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('[认证] 错误：未在环境变量中配置 JWT_SECRET，服务无法安全启动！');
  process.exit(1); // 缺少密钥直接退出，防止生成无效Token
}

/**
 * 生成 JWT Token
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * 验证 JWT Token 中间件
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, phone, role }
    next();
  } catch (err) {
    // [安全修复] 避免向后端泄露过多验证细节，生产环境可只返回统一提示
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

/**
 * 管理员权限中间件
 */
export function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '权限不足，需要管理员权限' });
  }
  next();
}
