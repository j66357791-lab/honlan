/** * 点兵点将 - 下注记录模型 (一单制 + 30天自动清理) */
import mongoose from 'mongoose';

const pointingBetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roundId: { type: String, index: true }, 
  bets: [{ 
    choice: { type: String, required: true }, // 英雄名
    amount: { type: Number, required: true, min: 10 } // 单注金额
  }],
  totalAmount: { type: Number, required: true }, // 总下注
  resultType: { type: String, enum: ['normal', 'all_survived', 'all_eliminated'], required: true },
  survivedCharacters: [{ type: String }], // 存活英雄
  totalPayout: { type: Number, default: 0 }, // 实际派彩（已扣抽水）
  netChange: { type: Number, default: 0 } // 盈亏
}, { timestamps: true });

// 🚀 核心：30天后自动物理删除，解决容量焦虑
pointingBetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model('PointingBet', pointingBetSchema);
