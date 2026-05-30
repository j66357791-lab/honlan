/**
 * 客服系统 - 会话模型
 * 每个用户同一时间只有一个活跃会话
 */
import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
  // 用户ID
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  // 用户名称（冗余存储，方便客服列表展示）
  userName: { type: String, default: '' },
  // 客服（管理员）ID，null 表示尚未接入
  adminId: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
  // 客服名称
  adminName: { type: String, default: '' },
  // 会话状态
  status: { type: String, enum: ['waiting', 'active', 'closed'], default: 'waiting' },
  // 用户未读数
  userUnread: { type: Number, default: 0 },
  // 客服未读数
  adminUnread: { type: Number, default: 0 },
  // 最后一条消息（预览用）
  lastMessage: { type: String, default: '' },
  lastMessageTime: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 客服端查询：按状态+更新时间
chatSessionSchema.index({ status: 1, updatedAt: -1 });
// 用户端查询：按用户ID找活跃会话
chatSessionSchema.index({ userId: 1, status: 1 });

export default mongoose.model('ChatSession', chatSessionSchema);
