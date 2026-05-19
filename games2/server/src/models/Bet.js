/**
 * 巨人赛跑 - 下注记录模型
 * 字段：用户ID、选择、金额、结果、赔付、净变化
 */
import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // 下注选择：red / blue / draw
  choice: {
    type: String,
    enum: ['red', 'blue', 'draw'],
    required: true
  },
  // 下注金额
  amount: {
    type: Number,
    required: true,
    min: 10,
    max: 8000
  },
  // 比赛结果：red / blue / draw
  result: {
    type: String,
    enum: ['red', 'blue', 'draw'],
    required: true
  },
  // 赔付金额
  payout: {
    type: Number,
    default: 0
  },
  // 净变化（正=赢，负=输）
  netChange: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('Bet', betSchema);
