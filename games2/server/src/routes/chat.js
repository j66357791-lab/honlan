/**
 * 客服系统 - REST 路由 v2
 * [v2] 精简版：移除消息历史和会话列表接口（改用WebSocket推送）
 * 仅保留管理员查询用户信息接口
 */
import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/chat/user/:userId
 * 管理员查询指定用户信息（余额等）
 */
router.get('/user/:userId', adminMiddleware, async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.params.userId)
      .select('phone balance todayProfit isHighRisk isWhitelisted banned');
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

export default router;
