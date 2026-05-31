import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: [
      'bet_expense', 'bet_win', 'admin_add', 'admin_sub', 
      'climb_wall_expense', 'climb_wall_income', 
      'crystal_transfer_out',   // 转出 (扣本金+手续费)
      'crystal_transfer_in',    // 转入 (只加本金)
      'crystal_transfer_fee'    // 手续费明细 (可选，方便后台对账)
    ], 
    required: true 
  },
  amount: { type: Number, required: true, min: 0 },
  balanceAfter: { type: Number, required: true },
  currency: { type: String, enum: ['point', 'crystal'], default: 'point' },
  remark: { type: String, default: '' },
  // ★ 新增：转增订单号，方便溯源一笔转账的进出账
  tradeNo: { type: String, index: true, default: null },
  // ★ 新增：手续费金额
  fee: { type: Number, default: 0, min: 0 },
  betId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bet', default: null },
  gameType: { type: String, enum: ['giant', 'pointing', 'match', 'climbwall', 'transfer'], default: 'giant' }
}, { timestamps: true });

transactionSchema.index({ userId: 1, gameType: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });

export default mongoose.model('Transaction', transactionSchema);
