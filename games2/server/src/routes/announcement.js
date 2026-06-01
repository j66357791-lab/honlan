import express from 'express'
import Announcement from '../models/Announcement.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import appLogger from '../utils/logger.js' // ★ 新增：引入日志调度局

const router = express.Router()

// ========== 用户端 ==========

/**
 * GET /api/announcements
 * 用户获取当前生效的公告
 */
router.get('/', async (req, res) => {
  try {
    const now = new Date()
    const list = await Announcement.find({
      status: 'active',
      $and: [
        { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
        { $or: [{ expireAt: null }, { expireAt: { $gt: now } }] }
      ]
    })
      .sort({ priority: -1, createdAt: -1 })
      .select('title content type linkAction linkText status priority createdAt')
      .limit(10)
      .lean()
    res.json({ data: list })
  } catch (err) {
    appLogger.error('获取公告失败:', err) // ★ 修改
    res.status(500).json({ error: '获取公告失败' })
  }
})

// ========== 管理员端 ==========

/**
 * GET /api/announcements/admin/list
 * 管理员获取所有公告
 */
router.get('/admin/list', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, type, page = 1, pageSize = 20 } = req.query
    const filter = {}
    if (status) filter.status = status
    if (type) filter.type = type

    const total = await Announcement.countDocuments(filter)
    const list = await Announcement.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize))
      .populate('createdBy', 'nickname')
      .lean()

    res.json({ data: list, total, page: Number(page), pageSize: Number(pageSize) })
  } catch (err) {
    appLogger.error('管理-获取公告失败:', err) // ★ 修改
    res.status(500).json({ error: '获取公告失败' })
  }
})

/**
 * POST /api/announcements/admin/create
 * 管理员创建公告
 */
router.post('/admin/create', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      title,
      content,
      type = 'activity',
      status = 'draft',
      linkAction = '',
      linkText = '',
      priority = 0,
      publishAt = null,
      expireAt = null
    } = req.body

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' })
    }

    const announcement = await Announcement.create({
      title,
      content,
      type,
      status,
      linkAction,
      linkText,
      priority,
      publishAt: publishAt ? new Date(publishAt) : null,
      expireAt: expireAt ? new Date(expireAt) : null,
      createdBy: req.user.userId
    })

    res.json({ data: announcement, message: '创建成功' })
  } catch (err) {
    appLogger.error('创建公告失败:', err) // ★ 修改
    res.status(500).json({ error: '创建公告失败' })
  }
})

/**
 * PUT /api/announcements/admin/update/:id
 * 管理员修改公告
 */
router.put('/admin/update/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const allowedFields = [
      'title', 'content', 'type', 'status',
      'linkAction', 'linkText', 'priority',
      'publishAt', 'expireAt'
    ]
    const updates = {}
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        if (key === 'publishAt' || key === 'expireAt') {
          updates[key] = req.body[key] ? new Date(req.body[key]) : null
        } else {
          updates[key] = req.body[key]
        }
      }
    }

    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )

    if (!announcement) {
      return res.status(404).json({ error: '公告不存在' })
    }

    res.json({ data: announcement, message: '更新成功' })
  } catch (err) {
    appLogger.error('更新公告失败:', err) // ★ 修改
    res.status(500).json({ error: '更新公告失败' })
  }
})

/**
 * DELETE /api/announcements/admin/delete/:id
 * 管理员删除公告
 */
router.delete('/admin/delete/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id)
    if (!announcement) {
      return res.status(404).json({ error: '公告不存在' })
    }
    res.json({ message: '删除成功' })
  } catch (err) {
    appLogger.error('删除公告失败:', err) // ★ 修改
    res.status(500).json({ error: '删除公告失败' })
  }
})

/**
 * PUT /api/announcements/admin/toggle/:id
 * 快捷切换状态：draft↔active↔expired
 */
router.put('/admin/toggle/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
    if (!announcement) {
      return res.status(404).json({ error: '公告不存在' })
    }
    const statusMap = { draft: 'active', active: 'expired', expired: 'active' }
    announcement.status = statusMap[announcement.status] || 'draft'
    await announcement.save()
    res.json({ data: announcement, message: '状态已切换' })
  } catch (err) {
    appLogger.error('切换公告状态失败:', err) // ★ 修改
    res.status(500).json({ error: '操作失败' })
  }
})

export default router
