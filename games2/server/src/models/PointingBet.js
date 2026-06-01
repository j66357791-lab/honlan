import mongoose from 'mongoose';

const pointingBetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roundId: { type: String, index: true },
  bets: [{
    choice: { type: String, required: true },
    amount: { type: Number, required: true, min: 10 }
  }],
  totalAmount: { type: Number, required: true },
  resultType: { type: String, enum: ['normal', 'all_survived', 'all_eliminated'], required: true },
  survivedCharacters: [{ type: String }],
  totalPayout: { type: Number, default: 0 },
  netChange: { type: Number, default: 0 }
}, { timestamps: true });

// 30天自动清理
pointingBetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
// 🚀 新增：用户查走势图的极速复合索引
pointingBetSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('PointingBet', pointingBetSchema);
