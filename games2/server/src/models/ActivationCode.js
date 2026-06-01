// src/models/ActivationCode.js
import mongoose from 'mongoose';

const ActivationCodeSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true // 统一转大写，防止大小写敏感问题
  },
  type: { 
    type: String, 
    enum: ['normal', 'super'], 
    required: true 
  },
  isUsed: { 
    type: Boolean, 
    default: false 
  },
  usedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null
  },
  usedAt: { 
    type: Date, 
    default: null 
  }
}, { 
  timestamps: true // 自动加上 createdAt 和 updatedAt
});

export default mongoose.model('ActivationCode', ActivationCodeSchema);
