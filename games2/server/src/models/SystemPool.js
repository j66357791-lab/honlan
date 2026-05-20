import mongoose from 'mongoose';

const systemPoolSchema = new mongoose.Schema({
  key: { 
    type: String, 
    unique: true, 
    default: 'default' 
  },
  totalBet: { type: Number, default: 0 },
  totalPayout: { type: Number, default: 0 },
  netProfit: { type: Number, default: 0 }, // 系统净收益 = totalBet - totalPayout
  todayBet: { type: Number, default: 0 },
  todayPayout: { type: Number, default: 0 },
  todayProfit: { type: Number, default: 0 }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：全局收益率
systemPoolSchema.virtual('profitRate').get(function() {
  return this.totalBet > 0 ? this.netProfit / this.totalBet : 0;
});

/**
 * 结算一局游戏，更新系统池数据
 */
systemPoolSchema.methods.settle = function(betAmount, payout) {
  this.totalBet += betAmount;
  this.totalPayout += payout;
  this.netProfit += (betAmount - payout); // 系统赚的 = 玩家下注 - 玩家赢走
  
  this.todayBet += betAmount;
  this.todayPayout += payout;
  this.todayProfit += (betAmount - payout);
};

export default mongoose.model('SystemPool', systemPoolSchema);
