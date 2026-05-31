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

// 🚀 优化：用户查自己下注记录的极速复合索引
betSchema.index({ userId: 1, createdAt: -1 });
// 🚀 优化：后台排序索引
betSchema.index({ createdAt: -1 });
// 🚀 优化：30天自动清理历史下注数据，节省空间
betSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model('Bet', betSchema);
