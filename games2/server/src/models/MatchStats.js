import mongoose from 'mongoose';

const matchStatsSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' }, // 固定ID，保证全库只有一条记录
  totalWagered: { type: Number, default: 0 }, // 总投入
  totalPayout: { type: Number, default: 0 },  // 总发出
  totalGames: { type: Number, default: 0 },   // 总局数
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('MatchStats', matchStatsSchema);
