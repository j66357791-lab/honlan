/**
 * 巨人赛跑 - 后端服务入口 v3.0
 * Express ES6 + Mongoose + JWT + 管理员后台 + 日志
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ========== 中间件 ==========
app.use(cors());
app.use(express.json());
// HTTP请求日志
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// ========== 路由 ==========
app.use('/api', authRoutes);
app.use('/api', gameRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ========== 初始化管理员账号 ==========
async function initAdmin() {
  try {
    const adminPhone = '18679012034';
    const adminPassword = '628727';
    const existing = await User.findOne({ phone: adminPhone });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        phone: adminPhone,
        password: hashedPassword,
        balance: 999999,
        role: 'admin'
      });
      console.log(`[初始化] 管理员账号已创建: ${adminPhone}`);
    } else {
      // 确保现有管理员角色正确
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log(`[初始化] 已将 ${adminPhone} 升级为管理员`);
      } else {
        console.log(`[初始化] 管理员账号已存在: ${adminPhone}`);
      }
    }
  } catch (err) {
    console.error(`[初始化] 创建管理员失败: ${err.message}`);
  }
}

// ========== 启动服务 ==========
async function start() {
  await connectDB();
  await initAdmin();

  app.listen(PORT, () => {
    console.log('========================================');
    console.log(`🏇 巨人赛跑后端服务已启动`);
    console.log(`   地址：http://localhost:${PORT}`);
    console.log(`   概率：红45% / 蓝45% / 平局10%`);
    console.log(`   赔率：红蓝1.9倍 / 平局9倍`);
    console.log(`   管理员：18679012034 / 628727`);
    console.log('========================================');
  });
}

start();
