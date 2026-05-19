/**
 * 客服系统 - 聊天消息模型
 */
import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  // 会话ID，关联 ChatSession
  sessionId: { type: String, required: true, index: true },
  // 发送者类型
  sender: { type: String, enum: ['user', 'admin', 'system', 'bot'], required: true },
  // 发送者ID
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  // 发送者名称
  senderName: { type: String, default: '' },
  // 消息内容
  content: { type: String, required: true },
  // 消息类型
  type: { type: String, enum: ['text', 'image', 'system'], default: 'text' },
  // 是否已读
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// 按会话+时间查询最频繁，建复合索引
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
