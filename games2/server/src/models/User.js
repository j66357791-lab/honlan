/**
 * 巨人赛跑 - 用户模型 V2
 * [V2] 新增 uid / nickname / avatar / nameChangedAt，支持隐私保护
 * [V3] 新增 isInternal 内部测试账号标识
 * [V4] 新增 isPasswordHashed 支持明文密码平滑迁移，修复 S-14 密码泄露
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
    sparse: true // 允许旧用户暂时为空，迁移后补全
  },
  nickname: {
    type: String,
    default: '',
    trim: true,
    maxlength: 12
  },
  avatar: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  },
  nameChangedAt: {
    type: Date,
    default: null
  },
  // ====== 原有字段 ======
  registerIp: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    required: true
  },
  // ★ 新增：密码哈希标识，用于平滑迁移 (修复 S-02)
  isPasswordHashed: {
    type: Boolean,
    default: false
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  banned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: ''
  },
  // ====== 风控与内部字段 ======
  isHighRisk: {
    type: Boolean,
    default: false
  },
  isWhitelisted: {
    type: Boolean,
    default: false
  },
  isInternal: {
    type: Boolean,
    default: false
  }, // ★ 新增：内部测试账号标记
  todayProfit: {
    type: Number,
    default: 0
  },
  totalBetAmount: {
    type: Number,
    default: 0
  },
  totalPayoutAmount: {
    type: Number,
    default: 0
  },
  riskIndex: {
    type: Number,
    default: 0,
    min: 0,
    max: 30
  },
  lastSettleDate: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      if (ret.phone) {
        ret.phone = ret.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      }
      // ★ 修复 S-14：无论如何都不在 API 响应中返回密码及哈希标识
      delete ret.password;
      delete ret.isPasswordHashed;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

userSchema.virtual('historyProfit').get(function() {
  return (this.totalPayoutAmount - this.totalBetAmount) - this.todayProfit;
});

export default mongoose.model('User', userSchema);
