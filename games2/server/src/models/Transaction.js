// server/src/models/Transaction.js
import mongoose from 'mongoose'; 

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: [
      'bet_expense', 
      'bet_win', 
      'admin_add', 
      'admin_sub', 
      'climb_wall_expense', 
      'climb_wall_income', 
      'crystal_transfer_out', 
      'crystal_transfer_in', 
      'crystal_transfer_fee',
      'redpacket_claim' // ★ 新增：红包领取流水
    ], 
    required: true 
  },
  amount: { type: Number, required: true, min: 0 },
  balanceAfter: { type: Number, required: true },
  currency: { type: String, enum: ['point', 'crystal'], default: 'point' },
  remark: { type: String, default: '' },
  tradeNo: { type: String, index: true, default: null },
  fee: { type: Number, default: 0, min: 0 },
  betId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bet', default: null },
  gameType: { 
    type: String, 
    enum: ['giant', 'pointing', 'match', 'climbwall', 'transfer', 'redpacket'], // ★ 新增：redpacket
    default: 'giant' 
  }
}, { timestamps: true });

transactionSchema.index({ userId: 1, gameType: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });

export default mongoose.model('Transaction', transactionSchema);
