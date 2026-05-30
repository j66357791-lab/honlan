import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['bet_expense', 'bet_win', 'admin_add', 'admin_sub'], required: true },
  amount: { type: Number, required: true, min: 0 },
  balanceAfter: { type: Number, required: true },
  remark: { type: String, default: '' },
  betId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bet', default: null },
  // 🚀 新增：游戏类型，之前遗漏了，导致点兵明细查不到
  // ★★★ 修复：新增 'match' 支持消消乐游戏流水 ★★★
  gameType: { 
    type: String, 
    enum: ['giant', 'pointing', 'match'], 
    default: 'giant' 
  }
}, { timestamps: true });

// 🚀 新增：核心索引，加速用户查流水和管理员统计
transactionSchema.index({ userId: 1, gameType: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });

export default mongoose.model('Transaction', transactionSchema);
