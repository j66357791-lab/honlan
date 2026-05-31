import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^1[3-9]\d{9}$/,
    },
    uid: {
      type: String,
      unique: true,
      sparse: true,
    },
    nickname: {
      type: String,
      default: '',
      trim: true,
      maxlength: 12,
    },
    avatar: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    nameChangedAt: {
      type: Date,
      default: null,
    },
    registerIp: {
      type: String,
      default: '',
    },
    password: {
      type: String,
      required: true,
    },
    isPasswordHashed: {
      type: Boolean,
      default: false,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    crystal: {
      type: Number,
      default: 0,
      min: 0,
    },
    climbWallLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    // ★ 新增：已领取的红包档位数组 (存 level，如 [1, 2] 表示领过1档和2档)
    claimedRedPackets: {
      type: [Number],
      default: [],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    banned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: '',
    },
    isHighRisk: {
      type: Boolean,
      default: false,
    },
    isWhitelisted: {
      type: Boolean,
      default: false,
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
    todayProfit: {
      type: Number,
      default: 0,
    },
    totalBetAmount: {
      type: Number,
      default: 0,
    },
    totalPayoutAmount: {
      type: Number,
      default: 0,
    },
    riskIndex: {
      type: Number,
      default: 0,
      min: 0,
      max: 30,
    },
    lastSettleDate: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        if (ret.phone) {
          ret.phone = ret.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
        }
        delete ret.password;
        delete ret.isPasswordHashed;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

userSchema.virtual('historyProfit').get(function () {
  return this.totalPayoutAmount - this.totalBetAmount - this.todayProfit;
});

export default mongoose.model('User', userSchema);
