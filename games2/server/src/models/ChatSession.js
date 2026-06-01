import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  userName: { type: String, default: '' },
  adminId: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
  adminName: { type: String, default: '' },
  status: { type: String, enum: ['waiting', 'active', 'closed'], default: 'waiting' },
  userUnread: { type: Number, default: 0 },
  adminUnread: { type: Number, default: 0 },
  lastMessage: { type: String, default: '' },
  lastMessageTime: { type: Date, default: Date.now }
  // 移除了手动定义的 createdAt 和 updatedAt，由 timestamps: true 接管
}, { timestamps: true });

// 客服端查询：按状态+更新时间
chatSessionSchema.index({ status: 1, updatedAt: -1 });
// 用户端查询：按用户ID找活跃会话
chatSessionSchema.index({ userId: 1, status: 1 });
// 🚀 新增：客服查询分配给自己的会话
chatSessionSchema.index({ adminId: 1, status: 1 });

export default mongoose.model('ChatSession', chatSessionSchema);
