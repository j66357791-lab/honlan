/**
 * 巨人赛跑 - 后端服务入口 v3.8
 * [v3.8] 新增客服系统 WebSocket 支持
 * [安全加固] 环境变量管理、CORS白名单、Helmet安全头、Trust Proxy
 */
import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import { initSystemPool } from './config/systemPool.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import adminRoutes from './routes/admin.js';
import pointingGameRoutes from './routes/pointingGame.js';
import chatRoutes from './routes/chat.js';
import { createChatGateway } from './ws/chatGateway.js';

// 必须在最前面加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 修复反向代理环境下的 IP 识别问题
// ==========================================
app.set('trust proxy', 1);

// ==========================================
// CORS 域名白名单限制
// ==========================================
const whitelist = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[安全拦截] 不允许的跨域请求来源: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

// 请求频率限制
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
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('combined'));
app.use('/api', apiLimiter);

// ==========================================
// 路由注册
// ==========================================
app.use('/api', authRoutes);
app.use('/api', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pointing', pointingGameRoutes);
app.use('/api/chat', chatRoutes);   // ← 新增：客服系统 REST 路由

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ==========================================
// 启动服务
// ==========================================
async function start() {
  try {
    await connectDB();
    await initSystemPool();

    // 创建 HTTP Server（替代 app.listen，以支持 WebSocket 升级）
    const server = http.createServer(app);

    // 初始化客服系统 WebSocket 网关
    const chatGateway = createChatGateway(server);

    server.listen(PORT, () => {
      console.log('==========================================');
      console.log('🏇 巨人赛跑 & 点兵点将 后端服务已启动');
      console.log(`🚀 地址：http://localhost:${PORT}`);
      console.log(`🛡️ CORS 白名单：${whitelist.join(', ')}`);
      console.log(`🛡️ 安全响应头：已启用 (Helmet)`);
      console.log(`🛡️ 信任代理：已启用 (Trust Proxy)`);
      console.log(`⏱️ 频率限制：每IP每分钟 60 次请求`);
      console.log('------------------------------------------');
      console.log('🎮 [巨人赛跑] 参数配置:');
      console.log('    赔率：红蓝1.9倍 / 平局9倍');
      console.log('------------------------------------------');
      console.log('⚔️ [点兵点将] 参数配置:');
      console.log('    性别：男将 / 女将 (赔率1.9倍)');
      console.log('    角色：武力4(2.7倍) / 武力3(3.4倍) / 武力2(4.9倍) / 武力1(8.0倍)');
      console.log('------------------------------------------');
      console.log('🛡️ [智能风控引擎 V2] 已就绪:');
      console.log('    ⚪ 白名单 [isWhitelisted]：绝对豁免，系统避让');
      console.log('    ⚫ 黑名单 [isHighRisk]：极端针对，赢钱必翻盘');
      console.log('    📊 系统动态：今日/历史盈亏自动评级，养猪/抓鼠/止血策略');
      console.log('------------------------------------------');
      console.log('💬 [客服系统] WebSocket 网关已就绪:');
      console.log(`    端点：ws://localhost:${PORT}/ws`);
      console.log('    鉴权：JWT Token (复用现有认证体系)');
      console.log('    功能：实时聊天 / 会话管理 / 未读推送');
      console.log('==========================================');
    });
  } catch (err) {
    console.error(`[启动失败] ${err.message}`);
    process.exit(1);
  }
}

start();
