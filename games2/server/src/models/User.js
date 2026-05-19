/**
 * 巨人赛跑 - 用户模型 V2
 * [V2] 新增 uid / nickname / avatar / nameChangedAt，支持隐私保护
 */
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: /^1[3-9]\d{9}$/
  },

  // ====== 新增：身份标识字段 ======
  uid: {
    type: String,
    unique: true,
    sparse: true  // 允许旧用户暂时为空，迁移后补全
  },
  nickname: {
    type: String,
    default: '',
    trim: true,
    maxlength: 12
    // 不设 minlength，因为旧用户 nickname 可能为空
    // 昵称长度验证由 auth.js 路由层负责（2-12字符）
  },
  avatar: {
    type: Number,
    default: 1,
    min: 1,
    max: 5  // 对应5个预设头像
  },
  nameChangedAt: {
    type: Date,
    default: null  // null 表示从未改过，可以立即修改
  },

  // ====== 原有字段 ======
  registerIp: { type: String, default: '' },
  password: { type: String, required: true },
  balance: { type: Number, default: 0, min: 0 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  banned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
  isHighRisk: { type: Boolean, default: false },
  isWhitelisted: { type: Boolean, default: false },
  todayProfit: { type: Number, default: 0 },
  totalBetAmount: { type: Number, default: 0 },
  totalPayoutAmount: { type: Number, default: 0 },
  riskIndex: { type: Number, default: 0, min: 0, max: 30 },
  lastSettleDate: { type: String, default: '' }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    // ★ 关键：toJSON 时自动脱敏手机号
    transform: function(doc, ret) {
      if (ret.phone) {
        ret.phone = ret.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      }
      return ret;
    }
  },
  toObject: { virtuals: true }
});

userSchema.virtual('historyProfit').get(function() {
  return (this.totalPayoutAmount - this.totalBetAmount) - this.todayProfit;
});

export default mongoose.model('User', userSchema);
