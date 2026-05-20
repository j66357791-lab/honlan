/**
 * 客服系统 - REST 路由
 * 提供：历史消息查询、会话列表查询
 * 鉴权复用现有 authMiddleware / adminMiddleware
 */
import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import ChatMessage from '../models/ChatMessage.js';
import ChatSession from '../models/ChatSession.js';

const router = express.Router();

// 所有聊天接口都需要登录
router.use(authMiddleware);

/**
 * GET /api/chat/history
 * 用户：获取自己的聊天历史
 * 管理员：按 sessionId 获取指定会话的历史（需传 sessionId 参数）
 */
router.get('/history', async (req, res) => {
  try {
    let session;

    if (req.user.role === 'admin') {
      // 管理员按 sessionId 查
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: '管理员需提供 sessionId 参数' });
      }
      session = await ChatSession.findById(sessionId);
    } else {
      // 普通用户找自己最近的活跃/已关闭会话
      session = await ChatSession.findOne({
        userId: req.user.userId,
        status: { $in: ['waiting', 'active', 'closed'] }
      }).sort({ createdAt: -1 });
    }

    if (!session) {
      return res.json({ messages: [], session: null });
    }

    const messages = await ChatMessage.find({
      sessionId: String(session._id)
    }).sort({ createdAt: 1 }).limit(200);

    res.json({
      messages,
      session: {
        id: String(session._id),
        status: session.status,
        adminName: session.adminName,
        userName: session.userName
      }
    });
  } catch (err) {
    console.error('[客服系统] 查询历史消息失败:', err.message);
    res.status(500).json({ error: '查询失败' });
  }
});

/**
 * GET /api/chat/sessions
 * 管理员专用：获取所有会话列表
 */
router.get('/sessions', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const sessions = await ChatSession.find(filter)
      .sort({ updatedAt: -1 })
      .limit(100);

    res.json({ sessions });
  } catch (err) {
    console.error('[客服系统] 查询会话列表失败:', err.message);
    res.status(500).json({ error: '查询失败' });
  }
});

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
