import mongoose from 'mongoose';

const riskLogSchema = new mongoose.Schema({
  traceId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  gameId: { type: String, required: true, index: true },

  // 输入快照
  event: {
    type: { type: String, required: true },
    betAmount: Number,
    choices: [String],
    baseProb: mongoose.Schema.Types.Mixed,
  },

  // 上下文快照
  contextSnapshot: {
    riskScore: Number,
    todayProfit: Number,
    historyProfit: Number,
    consecutiveWins: Number,
    poolProfitRate: Number,
  },

  // 决策输出
  decision: {
    action: { type: String, enum: ['PASS','ADJUST','BLOCK','WARN'], required: true },
    modifier: mongoose.Schema.Types.Mixed,
    constraints: mongoose.Schema.Types.Mixed,
    triggeredRules: [{ ruleId: String, ruleName: String }],
    reason: String,
  },

  // 事后回填（结算后更新）
  actualResult: { type: String, default: null },
  actualPayout: { type: Number, default: null },
  wasCorrect: { type: Boolean, default: null },  // 风控决策是否正确

  createdAt: { type: Date, default: Date.now, expires: '90d' } // 90天自动清理
}, {
  collection: 'risk_logs'
});

riskLogSchema.index({ userId: 1, createdAt: -1 });
riskLogSchema.index({ gameId: 1, createdAt: -1 });
riskLogSchema.index({ 'decision.action': 1 });

export default mongoose.model('RiskLog', riskLogSchema);
