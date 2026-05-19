/**
 * 客服系统 - WebSocket 网关 v2
 * [新增] 智能助手自动回复 + 转人工排队 + 重新咨询
 */
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage.js';
import ChatSession from '../models/ChatSession.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.error('[客服系统] 未配置 JWT_SECRET！');

// ==================== 自动回复规则 ====================
const AUTO_RULES = [
  { keywords: ['充值', '充钱', '怎么充', '如何充值', '充值积分', '上分', '充值多少'],
    reply: '💰 充值请联系人工客服处理，回复"转人工"即可为您服务。' },
  { keywords: ['规则', '怎么玩', '玩法', '游戏规则', '怎么下注', '赔率'],
    reply: '🎮 巨人赛跑：红/蓝1.9倍，平局9倍\n⚔️ 点兵点将：男/女将1.9倍，武力越低赔率越高\n需要详细说明请回复"转人工"。' },
  { keywords: ['提现', '提钱', '兑换', '怎么提', '下分', '兑换积分'],
    reply: '💸 提现请联系人工客服处理，回复"转人工"即可。' },
  { keywords: ['账号', '异常', '登录不了', '封号', '解封', '冻结', '被禁'],
    reply: '🔒 账号问题需人工核实，回复"转人工"联系客服。' },
  { keywords: ['人工', '转人工', '人工客服', '真人', '接线员', '客服'],
    reply: null },
];

const WELCOME_MSG = '👋 您好！我是智能助手，很高兴为您服务！\n\n快捷回复关键词：\n· "充值" → 充值问题\n· "规则" → 游戏规则\n· "提现" → 提现问题\n· "账号" → 账号问题\n\n需要人工客服请回复"转人工"';
const TRANSFER_MSG = '🔔 正在为您转接人工客服，请耐心等待...';
const DEFAULT_REPLY = '🤔 抱歉未能理解您的问题，回复"转人工"可联系人工客服。';

class ChatGateway {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.userClients = new Map();
    this.adminClients = new Map();
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
  }

  isValidObjectId(id) {
    return id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && id !== 'undefined';
  }

  // ==================== 自动回复匹配 ====================
  matchAutoReply(content) {
    for (const rule of AUTO_RULES) {
      for (const kw of rule.keywords) {
        if (content.includes(kw)) {
          return rule.reply; // null 表示转人工
        }
      }
    }
    return false; // 没匹配到
  }

  // ==================== 发送Bot消息 ====================
  async sendBotMessage(session, content) {
    const botMsg = await ChatMessage.create({
      sessionId: String(session._id),
      sender: 'bot',
      senderId: new mongoose.Types.ObjectId(), // bot 专用 ID
      senderName: '智能助手',
      content,
      type: 'text'
    });

    const msgData = {
      type: 'chat_message',
      message: {
        id: String(botMsg._id),
        sessionId: String(session._id),
        sender: 'bot',
        senderId: '0',
        senderName: '智能助手',
        content: botMsg.content,
        contentType: 'text',
        createdAt: botMsg.createdAt
      }
    };

    // 推送给用户
    this.sendToClient(this.userClients, String(session.userId), msgData);
    // 推送给已接入的客服
    if (session.adminId) {
      this.sendToClient(this.adminClients, String(session.adminId), msgData);
    }

    // 更新会话（bot消息不影响未读计数）
    session.lastMessage = content.substring(0, 50);
    session.lastMessageTime = new Date();
    session.updatedAt = new Date();
    await session.save();
  }

  // ==================== 发送系统提示 ====================
  async sendSystemTip(session, content) {
    const sysMsg = await ChatMessage.create({
      sessionId: String(session._id),
      sender: 'system',
      senderId: new mongoose.Types.ObjectId(),
      senderName: '系统',
      content,
      type: 'system'
    });

    const msgData = {
      type: 'chat_message',
      message: {
        id: String(sysMsg._id),
        sessionId: String(session._id),
        sender: 'system',
        senderId: '0',
        senderName: '系统',
        content: sysMsg.content,
        contentType: 'system',
        createdAt: sysMsg.createdAt
      }
    };

    this.sendToClient(this.userClients, String(session.userId), msgData);
    this.broadcastToAdmins(msgData);
  }

  // ==================== 连接与鉴权 ====================
  async handleConnection(ws, req) {
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const token = params.get('token');
    if (!token) { ws.close(4001); return; }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      ws.userId = String(decoded.userId);
      ws.userRole = decoded.role || 'user';
      ws.userName = ws.userRole === 'admin' ? '客服' : (decoded.phone || '');
    } catch {
      ws.close(4003); return;
    }

    const pool = ws.userRole === 'admin' ? this.adminClients : this.userClients;
    pool.set(ws.userId, ws);
    console.log(`[客服系统] ${ws.userRole === 'admin' ? '管理员' : '用户'} ${ws.userName}(${ws.userId}) 已连接`);

    if (ws.userRole === 'admin') this.notifyWaitingUsers();
    this.sendUnreadCount(ws);

    ws.on('message', (raw) => this.handleMessage(ws, raw));
    ws.on('close', () => this.handleDisconnect(ws));
    ws.on('error', (err) => console.error(`[客服系统] 错误: ${err.message}`));
  }

  handleDisconnect(ws) {
    const pool = ws.userRole === 'admin' ? this.adminClients : this.userClients;
    pool.delete(ws.userId);
  }

  // ==================== 消息路由 ====================
  async handleMessage(ws, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    try {
      switch (msg.type) {
        case 'chat_send': await this.handleChatSend(ws, msg); break;
        case 'chat_read': await this.handleChatRead(ws, msg); break;
        case 'session_accept': await this.handleSessionAccept(ws, msg); break;
        case 'session_close': await this.handleSessionClose(ws, msg); break;
      }
    } catch (err) {
      console.error(`[客服系统] 异常 type=${msg.type}:`, err.message);
      ws.send(JSON.stringify({ type: 'error', message: '处理异常' }));
    }
  }

  // ==================== 发消息 [核心] ====================
  async handleChatSend(ws, msg) {
    const { content, contentType = 'text', sessionId } = msg;
    if (!content || !content.trim()) return;

    let session;
    let isNewSession = false;

    if (ws.userRole === 'admin') {
      // 管理员必须指定 sessionId
      if (!sessionId || !this.isValidObjectId(sessionId)) {
        ws.send(JSON.stringify({ type: 'error', message: '需指定会话' })); return;
      }
      session = await ChatSession.findById(sessionId);
      if (!session || session.status !== 'active') {
        ws.send(JSON.stringify({ type: 'error', message: '会话无效' })); return;
      }
    } else {
      // 用户自动查找/创建会话（支持重新咨询）
      session = await ChatSession.findOne({
        userId: ws.userId,
        status: { $in: ['waiting', 'active'] }
      });
      if (!session) {
        session = await ChatSession.create({
          userId: ws.userId, userName: ws.userName, status: 'waiting'
        });
        isNewSession = true;
        this.broadcastToAdmins({
          type: 'session_new',
          session: {
            id: String(session._id), userId: String(session.userId),
            userName: session.userName, status: 'waiting',
            adminUnread: 0, createdAt: session.createdAt
          }
        });
      }
    }

    // 保存消息
    const chatMsg = await ChatMessage.create({
      sessionId: String(session._id),
      sender: ws.userRole === 'admin' ? 'admin' : 'user',
      senderId: ws.userId, senderName: ws.userName,
      content: content.trim(), type: contentType
    });

    session.lastMessage = content.trim().substring(0, 50);
    session.lastMessageTime = new Date();
    if (ws.userRole === 'user') session.adminUnread += 1;
    else session.userUnread += 1;
    session.updatedAt = new Date();
    await session.save();

    const broadcast = {
      type: 'chat_message',
      message: {
        id: String(chatMsg._id), sessionId: String(session._id),
        sender: chatMsg.sender, senderId: String(chatMsg.senderId),
        senderName: chatMsg.senderName, content: chatMsg.content,
        contentType: chatMsg.type, createdAt: chatMsg.createdAt
      }
    };

    // 转发
    if (ws.userRole === 'user') {
      if (session.adminId) {
        this.sendToClient(this.adminClients, String(session.adminId), broadcast);
      } else {
        this.broadcastToAdmins(broadcast);
      }
    } else {
      this.sendToClient(this.userClients, String(session.userId), broadcast);
    }
    ws.send(JSON.stringify({ ...broadcast, type: 'chat_message_sent' }));

    // ========== 智能助手自动回复（仅用户 + 未被人工接入时） ==========
    if (ws.userRole === 'user' && !session.adminId) {
      // 新会话先发欢迎语
      if (isNewSession) {
        await this.sendBotMessage(session, WELCOME_MSG);
      }

      // 关键词匹配
      const reply = this.matchAutoReply(content.trim());
      if (reply === null) {
        // 转人工
        await this.sendSystemTip(session, TRANSFER_MSG);
        console.log(`[客服系统] 用户 ${session.userName} 请求转人工`);
      } else if (reply) {
        await this.sendBotMessage(session, reply);
      } else if (!isNewSession) {
        // 没匹配到关键词（非新会话才发默认回复）
        await this.sendBotMessage(session, DEFAULT_REPLY);
      }
    }
  }

  // ==================== 标记已读 ====================
  async handleChatRead(ws, msg) {
    const { sessionId } = msg;
    if (!sessionId || !this.isValidObjectId(sessionId)) return;
    const session = await ChatSession.findById(sessionId);
    if (!session) return;

    if (ws.userRole === 'user') {
      session.userUnread = 0;
      await ChatMessage.updateMany({ sessionId, sender: 'admin', read: false }, { read: true });
      await ChatMessage.updateMany({ sessionId, sender: 'bot', read: false }, { read: true });
    } else {
      session.adminUnread = 0;
      await ChatMessage.updateMany({ sessionId, sender: 'user', read: false }, { read: true });
    }
    await session.save();
    ws.send(JSON.stringify({ type: 'chat_read_ok', sessionId }));
  }

  // ==================== 客服接入 ====================
  async handleSessionAccept(ws, msg) {
    if (ws.userRole !== 'admin') return;
    const { sessionId } = msg;
    if (!sessionId || !this.isValidObjectId(sessionId)) return;

    const session = await ChatSession.findById(sessionId);
    if (!session) return;
    if (session.status === 'active' && String(session.adminId) !== ws.userId) {
      ws.send(JSON.stringify({ type: 'error', message: '已被其他客服接入' })); return;
    }

    session.adminId = ws.userId;
    session.adminName = ws.userName;
    session.status = 'active';
    session.updatedAt = new Date();
    await session.save();

    this.sendToClient(this.userClients, String(session.userId), {
      type: 'session_accepted', adminName: ws.userName, sessionId: String(session._id)
    });

    // 发送系统提示：人工已接入
    await this.sendSystemTip(session, `客服已为您服务`);

    this.broadcastToAdmins({
      type: 'session_update',
      session: { id: String(session._id), userId: String(session.userId), userName: session.userName, adminId: String(session.adminId), adminName: session.adminName, status: 'active' }
    });

    console.log(`[客服系统] 客服已接入用户 ${session.userName}`);
  }

  // ==================== 关闭会话 ====================
  async handleSessionClose(ws, msg) {
    const { sessionId } = msg;
    if (!sessionId || !this.isValidObjectId(sessionId)) return;
    const session = await ChatSession.findById(sessionId);
    if (!session) return;

    session.status = 'closed';
    session.updatedAt = new Date();
    await session.save();

    this.sendToClient(this.userClients, String(session.userId), {
      type: 'session_closed', sessionId: String(session._id)
    });
    this.broadcastToAdmins({
      type: 'session_update', session: { id: String(session._id), status: 'closed' }
    });
  }

  // ==================== 内部方法 ====================
  async notifyWaitingUsers() {
    try {
      const list = await ChatSession.find({ status: 'waiting' });
      for (const s of list) {
        this.sendToClient(this.userClients, String(s.userId), {
          type: 'system', message: '客服已上线，正在为您分配...'
        });
      }
    } catch {}
  }

  async sendUnreadCount(ws) {
    let count = 0;
    try {
      if (ws.userRole === 'admin') {
        const r = await ChatSession.aggregate([
          { $match: { status: { $in: ['waiting', 'active'] } } },
          { $group: { _id: null, total: { $sum: '$adminUnread' } } }
        ]);
        count = r[0]?.total || 0;
      } else {
        const s = await ChatSession.findOne({ userId: ws.userId, status: { $in: ['waiting', 'active'] } });
        count = s?.userUnread || 0;
      }
    } catch {}
    try { ws.send(JSON.stringify({ type: 'unread_count', count })); } catch {}
  }

  sendToClient(pool, id, data) {
    const t = pool.get(String(id));
    if (t && t.readyState === WebSocket.OPEN) {
      try { t.send(JSON.stringify(data)); } catch {}
    }
  }

  broadcastToAdmins(data) {
    const raw = JSON.stringify(data);
    for (const [, ws] of this.adminClients) {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(raw); } catch {}
      }
    }
  }
}

export function createChatGateway(server) { return new ChatGateway(server); }
