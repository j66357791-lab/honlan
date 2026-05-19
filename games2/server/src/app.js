/**
 * 巨人赛跑 - 后端服务入口 v3.1
 * Express ES6 + Mongoose + JWT + 日志
 * 适配 Zeabur 部署：动态端口 + 移除硬编码凭证
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import adminRoutes from './routes/admin.js';
import pointingGameRoutes from './routes/pointingGame.js';

const app = express();

// ========== 动态端口（Zeabur 会自动注入 process.env.PORT） ==========
const PORT = process.env.PORT || 3000;

// ========== 中间件 ==========
app.use(cors());
app.use(express.json());
// HTTP请求日志（生产环境推荐使用 combined 格式）
app.use(morgan('combined'));

// ========== 路由 ==========
app.use('/api', authRoutes);
app.use('/api', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pointing', pointingGameRoutes);

// 健康检查（Zeabur 可以此路径检测服务状态）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ========== 启动服务 ==========
async function start() {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log('========================================');
      console.log(`🏇 巨人赛跑后端服务已启动`);
      console.log(`   地址：http://localhost:${PORT}`);
      console.log(`   概率：红45% / 蓝45% / 平局10%`);
      console.log(`   赔率：红蓝1.9倍 / 平局9倍`);
      console.log('========================================');
    });
  } catch (err) {
    console.error(`[启动失败] ${err.message}`);
    process.exit(1);
  }
}

start();
