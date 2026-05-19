/**
 * 巨人赛跑 - 用户模型
 * 字段：手机号、密码、余额、角色、封禁状态、积分明细
 */
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // 手机号作为登录账号，唯一
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: /^1[3-9]\d{9}$/
  },
  // bcrypt加密密码
  password: {
    type: String,
    required: true
  },
  // 积分余额，初始0（不再赠送）
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  // 角色：user / admin
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // 封禁状态
  banned: {
    type: Boolean,
    default: false
  },
  // 封禁原因
  banReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export default mongoose.model('User', userSchema);
