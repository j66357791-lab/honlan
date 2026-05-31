import mongoose from 'mongoose'

const { Schema } = mongoose

const AnnouncementSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    // 公告类型：activity=活动宣传 / notice=系统通知 / update=版本更新
    type: {
      type: String,
      enum: ['activity', 'notice', 'update'],
      default: 'activity'
    },
    // 状态：draft=草稿 / active=发布 / expired=已过期
    status: {
      type: String,
      enum: ['draft', 'active', 'expired'],
      default: 'draft'
    },
    // 操作按钮配置
    linkAction: {
      type: String,
      default: ''   // 'activity' | '/game/giant' | 等路由路径
    },
    linkText: {
      type: String,
      default: ''
    },
    // 优先级，数字越大越靠前
    priority: {
      type: Number,
      default: 0
    },
    // 定时发布
    publishAt: {
      type: Date,
      default: null
    },
    // 定时过期
    expireAt: {
      type: Date,
      default: null
    },
    // 创建者（管理员）
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
)

// 索引：查询活跃公告时加速
AnnouncementSchema.index({ status: 1, priority: -1, publishAt: -1 })
AnnouncementSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 }) // TTL，过期自动删除（可选）

export default mongoose.model('Announcement', AnnouncementSchema)
