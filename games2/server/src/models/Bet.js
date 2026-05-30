import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roundId: { type: String, index: true },
  choice: { type: String, enum: ['red', 'blue', 'draw'], required: true },
  amount: { type: Number, required: true, min: 10, max: 8000 },
  result: { type: String, enum: ['red', 'blue', 'draw'], required: true },
  payout: { type: Number, default: 0 },
  netChange: { type: Number, default: 0 }
}, { timestamps: true });

// 🚀 新增：管理员后台查全服记录的排序索引
betSchema.index({ createdAt: -1 });

export default mongoose.model('Bet', betSchema);
