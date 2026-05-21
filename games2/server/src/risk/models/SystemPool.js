// src/risk/models/SystemPool.js
import mongoose from 'mongoose';

const systemPoolSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  totalBet: { type: Number, default: 0 },
  totalPayout: { type: Number, default: 0 },
  netProfit: { type: Number, default: 0 },
  todayBet: { type: Number, default: 0 },
  todayPayout: { type: Number, default: 0 },
  todayProfit: { type: Number, default: 0 },
  todayDate: { type: String, default: '' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

systemPoolSchema.virtual('profitRate').get(function() {
  return this.totalBet > 0 ? this.netProfit / this.totalBet : 0;
});

// ★★★ 核心修改：吃分进度 = 今日获得 / 今日发放 ★★★
// 0 = 一分没吃回来（最大压力）
// 1 = 收支持平
// 1+ = 系统盈利（可放水）
systemPoolSchema.virtual('eatProgress').get(function() {
  if (!this.todayPayout || this.todayPayout <= 0) return 2.0; // 没发分，视为吃够了
  return Math.max(0, this.todayBet / this.todayPayout);
});

// ★★★ 派生字段：吃分压力 0~1（供动态抽水使用）★★★
// eatProgress=0 → pressure=1.0（极限吃分压力）
// eatProgress=1 → pressure=0.0（无压力）
// eatProgress>1 → pressure=0.0（系统盈利）
systemPoolSchema.virtual('eatPressure').get(function() {
  if (!this.todayPayout || this.todayPayout <= 0) return 0;
  return Math.max(0, 1 - this.todayBet / this.todayPayout);
});

systemPoolSchema.methods.settle = function(betAmount, payout) {
  const netChange = betAmount - payout;
  this.totalBet += betAmount;
  this.totalPayout += payout;
  this.netProfit += netChange;
  this.todayBet += betAmount;
  this.todayPayout += payout;
  this.todayProfit += netChange;
};

systemPoolSchema.methods.resetDaily = function(todayStr) {
  this.todayBet = 0;
  this.todayPayout = 0;
  this.todayProfit = 0;
  this.todayDate = todayStr;
};

export default mongoose.model('SystemPool', systemPoolSchema);
