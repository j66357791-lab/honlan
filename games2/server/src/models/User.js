/**
 * 巨人赛跑 - 用户模型
 * [风控V2] 增加白名单、今日盈亏、历史盈亏、动态风险指数
 */
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, trim: true, match: /^1[3-9]\d{9}$/ },
  registerIp: { type: String, default: '' },
  password: { type: String, required: true },
  balance: { type: Number, default: 0, min: 0 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  banned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
  
  // 风控阶级字段
  isHighRisk: { type: Boolean, default: false },      // 黑名单：管理员手动高危标记
  isWhitelisted: { type: Boolean, default: false },   // 白名单：管理员手动豁免，系统绝对不干预

  // 风控追踪字段
  todayProfit: { type: Number, default: 0 },       
  totalBetAmount: { type: Number, default: 0 },    
  totalPayoutAmount: { type: Number, default: 0 }, 
  riskIndex: { type: Number, default: 0, min: 0, max: 30 }, 
  lastSettleDate: { type: String, default: '' }     

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual('historyProfit').get(function() {
  return (this.totalPayoutAmount - this.totalBetAmount) - this.todayProfit;
});

export default mongoose.model('User', userSchema);
