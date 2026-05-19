/**
 * 巨人赛跑 - 积分明细模型
 * 记录所有积分变动：下注支出、赢取收入、管理员调整
 */
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // 变动类型
  type: {
    type: String,
    enum: ['bet_expense', 'bet_win', 'admin_add', 'admin_sub'],
    required: true
  },
  // 变动金额（正数）
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  // 变动后余额
  balanceAfter: {
    type: Number,
    required: true
  },
  // 备注
  remark: {
    type: String,
    default: ''
  },
  // 关联的下注记录ID（如果是下注相关）
  betId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bet',
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('Transaction', transactionSchema);
