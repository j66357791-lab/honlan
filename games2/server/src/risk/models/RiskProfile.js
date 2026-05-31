import mongoose from 'mongoose';

const riskProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  isWhitelisted: { type: Boolean, default: false, index: true },
  isHighRisk: { type: Boolean, default: false, index: true },
  isInternal: { type: Boolean, default: false, index: true },
  blacklistReason: { type: String, default: '' },
  riskScore: { type: Number, default: 0, min: 0, max: 100 },
  todayProfit: { type: Number, default: 0 },
  todayBetCount: { type: Number, default: 0 },
  todayWinCount: { type: Number, default: 0 },
  todayTotalBet: { type: Number, default: 0 },
  todayMaxBet: { type: Number, default: 0 },
  yesterdayProfit: { type: Number, default: 0 },
  yesterdayBetCount: { type: Number, default: 0 },
  consecutiveWins: { type: Number, default: 0 },
  consecutiveLosses: { type: Number, default: 0 },
  historyProfit: { type: Number, default: 0 },
  totalBetAmount: { type: Number, default: 0 },
  totalPayoutAmount: { type: Number, default: 0 },
  totalBetCount: { type: Number, default: 0 },
  totalWinCount: { type: Number, default: 0 },
  riskIndex: { type: Number, default: 0, min: 0, max: 100 },
  lastBetAt: { type: Date, default: null },
  lastSettleDate: { type: String, default: '' },
  pointingArbitrageScore: { type: Number, default: 0 },
  racingArbitrageScore: { type: Number, default: 0 },
  lastRacingBetAmount: { type: Number, default: 0 },
  lastRacingChoice: { type: String, default: null },
  hourlyStats: [{ hour: String, profit: Number, betCount: Number, winCount: Number }]
}, { timestamps: true, collection: 'risk_profiles' });

riskProfileSchema.index({ riskScore: -1 });
riskProfileSchema.index({ lastSettleDate: 1 });

// ★ 核心修复：结算方法
riskProfileSchema.methods.settle = function({ betAmount, payout, won, gameId }) {
  // ★★★ 修复致命Bug：净收益就是 派彩 - 下注，不管输赢这都是数学上的真实净值变化 ★★★
  const netChange = payout - betAmount; 
  
  this.todayProfit += netChange;
  this.todayBetCount += 1;
  this.todayTotalBet += betAmount;
  this.todayMaxBet = Math.max(this.todayMaxBet, betAmount);
  if (won) this.todayWinCount += 1;

  if (won) {
    this.consecutiveWins += 1;
    this.consecutiveLosses = 0;
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
  this.yesterdayProfit = this.todayProfit;
  this.yesterdayBetCount = this.todayBetCount;
  this.historyProfit += this.todayProfit;
  this.todayProfit = 0;
  this.todayBetCount = 0;
  this.todayWinCount = 0;
  this.todayTotalBet = 0;
  this.todayMaxBet = 0;
  this.consecutiveWins = 0;
  this.consecutiveLosses = 0;
  this.riskIndex = 0;
  this.lastSettleDate = todayStr;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 13);
  this.hourlyStats = this.hourlyStats.filter(h => h.hour >= cutoff);
  return this;
};

export default mongoose.model('RiskProfile', riskProfileSchema);
