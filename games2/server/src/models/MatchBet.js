import mongoose from 'mongoose';

const matchBetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roundId: { type: String, required: true },
  ticketPrice: { type: Number, default: 100, min: [100, '门票最低100'] },
  totalScore: { type: Number, default: 0 },
  netProfit: { type: Number, default: 0 },
  waves: { type: Number, default: 0 },
  // ★★★ 风控核心：种子存证，占用极小，可随时复现完整对局 ★★★
  initSeed: { type: String, required: true }, // 初始棋盘种子
  newBlockSeeds: { type: [String], default: [] } // 每波新方块的种子数组
}, { timestamps: true });

// ★★★ 添加高效索引，大幅提升查询速度 ★★★
matchBetSchema.index({ userId: 1, createdAt: -1 }); // 用户查记录
matchBetSchema.index({ createdAt: -1 });            // 后台查近期
matchBetSchema.index({ initSeed: 1 }, { unique: false }); // 种子查重

export default mongoose.model('MatchBet', matchBetSchema);
