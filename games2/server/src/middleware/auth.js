/**
 * 巨人赛跑 - JWT 认证中间件
 * 校验 Authorization: Bearer <token>
 */
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'giant_racing_jwt_secret_2024';

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
    console.log(`[认证] Token验证失败: ${err.message}`);
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
