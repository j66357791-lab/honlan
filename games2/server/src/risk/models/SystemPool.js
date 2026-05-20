import mongoose from 'mongoose';

const systemPoolSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },

  // 累计数据
  totalBet:    { type: Number, default: 0 },
  totalPayout: { type: Number, default: 0 },
  netProfit:   { type: Number, default: 0 },

  // 今日数据
  todayBet:    { type: Number, default: 0 },
  todayPayout: { type: Number, default: 0 },
  todayProfit: { type: Number, default: 0 },
  todayDate:   { type: String, default: '' },

  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'system_pools'
});

systemPoolSchema.virtual('profitRate').get(function() {
  return this.totalBet > 0 ? this.netProfit / this.totalBet : 0;
});

systemPoolSchema.virtual('todayProfitRate').get(function() {
  return this.todayBet > 0 ? this.todayProfit / this.todayBet : 0;
});

/**
 * 结算一局
 */
systemPoolSchema.methods.settle = function(betAmount, payout) {
  const netChange = betAmount - payout;  // 注意：系统盈亏 = 下注 - 派彩

  this.totalBet += betAmount;
  this.totalPayout += payout;
  this.netProfit += netChange;

  this.todayBet += betAmount;
  this.todayPayout += payout;
  this.todayProfit += netChange;

  this.updatedAt = new Date();
  return this;
};

/**
 * 跨日重置
 */
systemPoolSchema.methods.resetDaily = function(todayStr) {
  this.todayBet = 0;
  this.todayPayout = 0;
  this.todayProfit = 0;
  this.todayDate = todayStr;
  this.updatedAt = new Date();
  return this;
};

export default mongoose.model('SystemPool', systemPoolSchema);
