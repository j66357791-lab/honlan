import mongoose from 'mongoose';

const matchStatsSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' }, // 固定ID，保证全库只有一条记录
  totalWagered: { type: Number, default: 0 },
  totalPayout: { type: Number, default: 0 },
  totalGames: { type: Number, default: 0 }
}, { timestamps: true }); // 🚀 优化：用自带时间戳替代手动 updatedAt

export default mongoose.model('MatchStats', matchStatsSchema);
