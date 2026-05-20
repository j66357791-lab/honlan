import mongoose from 'mongoose';

const riskProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  
  // ====== 名单标记 ======
  isWhitelisted: { type: Boolean, default: false, index: true },
  isHighRisk: { type: Boolean, default: false, index: true },
  isInternal: { type: Boolean, default: false, index: true },
  whitelistReason: { type: String, default: '' },
  blacklistReason: { type: String, default: '' },
  whitelistAt: { type: Date, default: null },
  blacklistAt: { type: Date, default: null },
  
  // ====== 实时特征 ======
  riskScore: { type: Number, default: 0, min: 0, max: 100 },
  riskLevel: { type: String, enum: ['LOW','MEDIUM','HIGH','EXTREME'], default: 'LOW' },
  
  // 今日维度
  todayProfit: { type: Number, default: 0 },
  todayBetCount: { type: Number, default: 0 },
  todayWinCount: { type: Number, default: 0 },
  todayTotalBet: { type: Number, default: 0 },
  todayMaxBet: { type: Number, default: 0 },
  
  // 连胜连败
  consecutiveWins: { type: Number, default: 0 },
  consecutiveLosses: { type: Number, default: 0 },
  todayMaxConsecutiveWins: { type: Number, default: 0 },
  
  // 历史维度
  historyProfit: { type: Number, default: 0 },
  totalBetAmount: { type: Number, default: 0 },
  totalPayoutAmount: { type: Number, default: 0 },
  totalBetCount: { type: Number, default: 0 },
  totalWinCount: { type: Number, default: 0 },
  
  // 行为标签
  riskIndex: { type: Number, default: 0, min: 0, max: 100 },
  
  // 时间戳
  lastBetAt: { type: Date, default: null },
  lastSettleDate: { type: String, default: '' },
  
  // ====== ★ 新增：仇恨值系统 ★ ======
  pointingArbitrageScore: { type: Number, default: 0 },
  racingArbitrageScore: { type: Number, default: 0 },
  
  // ====== ★ 新增：巨人行为记忆 ★ ======
  lastRacingBetAmount: { type: Number, default: 0 },
  lastRacingChoice: { type: String, default: null },
  
  // ====== 滑动窗口 ======
  hourlyStats: [{
    hour: String,
    profit: Number,
    betCount: Number,
    winCount: Number
  }]
}, { 
  timestamps: true, 
  collection: 'risk_profiles' 
});

riskProfileSchema.index({ riskScore: -1 });
riskProfileSchema.index({ lastSettleDate: 1 });

riskProfileSchema.methods.settle = function({ betAmount, payout, won, gameId }) {
  const netChange = won ? (payout - betAmount) : -betAmount;
  this.todayProfit += netChange;
  this.todayBetCount += 1;
  this.todayTotalBet += betAmount;
  this.todayMaxBet = Math.max(this.todayMaxBet, betAmount);
  if (won) this.todayWinCount += 1;
  
  if (won) {
    this.consecutiveWins += 1;
    this.consecutiveLosses = 0;
    this.todayMaxConsecutiveWins = Math.max(this.todayMaxConsecutiveWins, this.consecutiveWins);
  } else {
    this.consecutiveLosses += 1;
    this.consecutiveWins = 0;
  }
  
  this.totalBetAmount += betAmount;
  this.totalPayoutAmount += payout;
  this.totalBetCount += 1;
  if (won) this.totalWinCount += 1;
  this.lastBetAt = new Date();
  
  if (gameId === 'giant_racing') {
    this.lastRacingBetAmount = betAmount;
  }
  
  return this;
};

riskProfileSchema.methods.resetDaily = function(todayStr) {
  this.historyProfit += this.todayProfit;
  this.todayProfit = 0;
  this.todayBetCount = 0;
  this.todayWinCount = 0;
  this.todayTotalBet = 0;
  this.todayMaxBet = 0;
  this.consecutiveWins = 0;
  this.consecutiveLosses = 0;
  this.todayMaxConsecutiveWins = 0;
  this.riskIndex = 0;
  this.lastSettleDate = todayStr;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 13);
  this.hourlyStats = this.hourlyStats.filter(h => h.hour >= cutoff);
  return this;
};

riskProfileSchema.methods.getDerivedFeatures = function() {
  return {
    avgBetToday: this.todayBetCount > 0 ? Math.round(this.todayTotalBet / this.todayBetCount) : 0,
    winRateToday: this.todayBetCount > 0 ? this.todayWinCount / this.todayBetCount : 0,
    lifetimeWinRate: this.totalBetCount > 0 ? this.totalWinCount / this.totalBetCount : 0,
    todayROI: this.todayTotalBet > 0 ? this.todayProfit / this.todayTotalBet : 0,
    lifetimeROI: this.totalBetAmount > 0 ? (this.totalPayoutAmount - this.totalBetAmount) / this.totalBetAmount : 0,
    recent3hProfit: this._getRecentHourlyProfit(3),
  };
};

riskProfileSchema.methods._getRecentHourlyProfit = function(hours) {
  const now = new Date();
  let profit = 0;
  for (let i = 0; i < hours; i++) {
    const hourKey = new Date(now - i * 3600000).toISOString().slice(0, 13);
    const stat = this.hourlyStats.find(h => h.hour === hourKey);
    if (stat) profit += stat.profit;
  }
  return profit;
};

export default mongoose.model('RiskProfile', riskProfileSchema);
