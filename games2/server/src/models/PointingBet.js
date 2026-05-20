/**
 * 点兵点将 - 下注记录模型
 */
import mongoose from 'mongoose';

const pointingBetSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  
  // 下注明细 (只保留角色下注)
  bets: [{
    // ★ 已删除 type 字段，因为不再区分性别和角色
    choice: { type: String, required: true }, // 角色名
    amount: { type: Number, required: true, min: 10 }
  }],
  
  totalAmount: { type: Number, required: true }, // 总下注金额
  
  // 开奖结果
  resultType: { type: String, enum: ['normal', 'all_survived', 'all_eliminated'], required: true },
  survivedCharacters: [{ type: String }], // 存活的角色名单
  
  // 结算
  totalPayout: { type: Number, default: 0 }, // 总派彩
  netChange: { type: Number, default: 0 } // 净盈亏
}, { 
  timestamps: true 
});

export default mongoose.model('PointingBet', pointingBetSchema);
