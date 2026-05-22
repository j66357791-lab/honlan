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
  todayDate: { type: String, default: '' },
  // 🚀 新增：记录管理员人工加/扣款总额，给统计页用，避免全表扫描
  totalAdminAdd: { type: Number, default: 0 },
  totalAdminSub: { type: Number, default: 0 }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

systemPoolSchema.virtual('profitRate').get(function() {
  return this.totalBet > 0 ? this.netProfit / this.totalBet : 0;
});

systemPoolSchema.virtual('eatProgress').get(function() {
  if (!this.todayPayout || this.todayPayout <= 0) return 2.0;
  return Math.max(0, this.todayBet / this.todayPayout);
});

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
