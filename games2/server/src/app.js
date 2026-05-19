/**
 * 巨人赛跑 - 后端服务入口 v3.6
 * [安全加固] 修复严重漏洞：环境变量管理、CORS白名单、Helmet安全头
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv'; // 必须在最前面加载环境变量
import rateLimit from 'express-rate-limit';
import helmet from 'helmet'; // 修复 5.2 缺少安全响应头

import { connectDB } from './config/db.js';
import { initSystemPool } from './config/systemPool.js';

import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import adminRoutes from './routes/admin.js';
import pointingGameRoutes from './routes/pointingGame.js';

// 必须在所有操作之前执行 config，加载 .env 文件
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 修复 2.3：CORS 域名白名单限制
// ==========================================
const whitelist = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL // 从环境变量读取生产环境域名
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // !origin 允许 Postman 等非浏览器工具直接请求
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[安全拦截] 不允许的跨域请求来源: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

// 修复 3.4：请求频率限制
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// 中间件注册
// ==========================================
app.use(helmet()); // 修复 5.2：自动添加安全响应头 (XSS防护、点击劫持防护等)
app.use(cors(corsOptions)); // 使用严格 CORS 配置
app.use(express.json());
app.use(morgan('combined'));
app.use('/api', apiLimiter);

// 路由注册
app.use('/api', authRoutes);
app.use('/api', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pointing', pointingGameRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function start() {
  try {
    await connectDB();
    await initSystemPool();

    app.listen(PORT, () => {
      console.log('==========================================');
      console.log('🏇 巨人赛跑 & 点兵点将 后端服务已启动');
      console.log(`🚀 地址：http://localhost:${PORT}`);
      console.log(`🛡️ CORS 白名单：${whitelist.join(', ')}`);
      console.log(`🛡️ 安全响应头：已启用 (Helmet)`);
      console.log(`⏱️ 频率限制：每IP每分钟 60 次请求`);
      console.log('------------------------------------------');
      console.log('🎮 [巨人赛跑] 参数配置:');
      console.log('   赔率：红蓝1.9倍 / 平局9倍');
      console.log('------------------------------------------');
      console.log('⚔️ [点兵点将] 参数配置:');
      console.log('   性别：男将 / 女将 (赔率1.9倍)');
      console.log('   角色：武力4(2.7倍) / 武力3(3.4倍) / 武力2(4.9倍) / 武力1(8.0倍)');
      console.log('------------------------------------------');
      console.log('🛡️ [智能风控引擎 V2] 已就绪:');
      console.log('   ⚪ 白名单 [isWhitelisted]：绝对豁免，系统避让');
      console.log('   ⚫ 黑名单 [isHighRisk]：极端针对，赢钱必翻盘');
      console.log('   📊 系统动态：今日/历史盈亏自动评级，养猪/抓鼠/止血策略');
      console.log('==========================================');
    });
  } catch (err) {
    console.error(`[启动失败] ${err.message}`);
    process.exit(1);
  }
}

start();
