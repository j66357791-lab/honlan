// src/app.js
import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import { initRiskModule, riskDailyReset } from './risk/index.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import adminRoutes from './routes/admin.js';
import pointingGameRoutes from './routes/pointingGame.js';
import chatRoutes from './routes/chat.js';
import { createChatGateway } from './ws/chatGateway.js';
import matchGameRoutes from './routes/matchGame.js';
import announcementRoutes from './routes/announcement.js';
import { fillPools } from './services/BoardPool.js'; // ★ 引入棋盘池填充函数
import climbWallRoutes from './routes/climbWall.js';
import redPacketRoutes from './routes/redPacket.js';
import transferRoutes from './routes/transfer.js';

dotenv.config();

// [修复] 生产环境绝对不能吃掉 error 和 warn，否则出问题就是瞎子
if (process.env.NODE_ENV === 'production') {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  // console.warn 和 console.error 必须保留！或者替换成正规的日志库
}

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

const whitelist = ['http://localhost:5173', 'http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean);
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

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('combined'));
app.use('/api', apiLimiter);

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// 路由挂载
app.use('/api', authRoutes);
// [建议] 如果 riskDailyReset 内部没有做防重入限制，每次 API 请求都触发可能消耗性能，未来建议改为 node-cron 定时任务
app.use('/api', riskDailyReset); 
app.use('/api', gameRoutes);
app.use('/api/climb-wall', climbWallRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pointing', pointingGameRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/match', matchGameRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/redpacket', redPacketRoutes);
app.use('/api/transfer', transferRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ★★★ [新增] 全局错误处理中间件，必须放在所有路由之后 ★★★
// 捕获路由中未处理的 async 错误，防止请求挂起或服务崩溃
app.use((err, req, res, next) => {
  console.error('[全局未捕获异常]', err.stack || err);
  res.status(500).json({ error: '服务器内部错误，请稍后再试' });
});

async function start() {
  try {
    await connectDB();
    await initRiskModule();
    // ★★★ 新增：数据库连接成功后，预生成消消乐棋盘池 ★★★
    await fillPools();

    const server = http.createServer(app);
    const chatGateway = createChatGateway(server);

    server.listen(PORT, () => {
      console.log('==========================================');
      console.log('🏇 巨人赛跑 & ⚔️ 点兵点将 后端服务已启动');
      console.log(`🚀 地址：http://localhost:${PORT}`);
      console.log(`🛡️ CORS 白名单：${whitelist.join(', ')}`);
      console.log(`🛡️ 安全响应头：已启用`);
      console.log(`🛡️ 信任代理：已启用`);
      console.log(`⏱️ 频率限制：每IP每分钟 60 次请求`);
      console.log(`🚫 API缓存：已强制禁用`);
      console.log('------------------------------------------');
      console.log('🎮 [巨人赛跑] 参数配置:');
      console.log(' 赔率：红方1.9倍 / 蓝方1.9倍 / 平局9倍');
      console.log(' 下注范围：10 ~ 8000');
      console.log(' 抽水：无');
      console.log('------------------------------------------');
      console.log('⚔️ [点兵点将] 参数配置:');
      console.log(' 普通(5倍)：赵云 / 秦良玉 / 马超 / 花木兰');
      console.log(' 特殊(10倍)：关羽');
      console.log(' 特殊(20倍)：张飞');
      console.log(' 特殊(30倍)：梁红玉');
      console.log(' 特殊(40倍)：穆桂英');
      console.log(' 抽水：固定5%（仅对净盈利部分收取）');
      console.log('------------------------------------------');
      console.log('🧩 [消消乐] 参数配置:');
      console.log(' 门票：100 / 500 / 1000 / 5000 / 10000');
      console.log(' 抽水：10%（仅对净利润部分收取）');
      console.log(' 控奖：多级奖牌池预生成 + 动态 RTP 平衡');
      console.log(' 索引：单例累加统计，数据库极低压力');
      console.log(' RTP：动态锁定 85% ~ 105% 之间');
      console.log('------------------------------------------');
      console.log('🛡️ [智能风控引擎 V4] 已就绪:');
      console.log(' ⚪ 架构：事件采集 → 特征计算 → 规则匹配 → 动态控制 → 决策输出');
      console.log(' ⚫ 存储：RiskProfile(画像) / SystemPool(奖池) / RiskLog(日志)');
      console.log(' 📊 名单层：白名单豁免 / 黑名单压制 / 内部号保护');
      console.log(' 📊 个人层：暴利平衡 / 连胜打断 / 历史吸血鬼（联动池子）');
      console.log(' 📊 行为层：鸡贼下注 / 对冲套利吸尘器 / 5倍全覆盖');
      console.log(' 📊 仇恨层：诱导大奖 → 强诱导 → 暗箱反杀（点兵/巨人各一套）');
      console.log(' 📊 系统层：危急吸血 / 重度压制 / 轻度止损 / 丰收放水');
      console.log(' 📊 安抚层：连败安慰（防流失）');
      console.log('------------------------------------------');
      console.log('🔄 [四阶段动态吃分控制] 核心机制:');
      console.log(' eatProgress = 今日系统获得 / 今日系统发放');
      console.log(' ┌──────────────────────────────────────────────────┐');
      console.log(' │ KILL │ DECAY │ DORMANT │ FEED │');
      console.log(' │ <50% │ 50%~80% │ 80%~100% │ ≥100% │');
      console.log(' │ 规则全效 │ 线性衰减 │ 规则休眠 │ 主动放水 │');
      console.log(' │ impact=1 │ 1.0→0.0 │ impact=0 │ +5%~30%加成│');
      console.log(' └──────────────────────────────────────────────────┘');
      console.log(' ★ 吃分控制全部通过概率调整实现，抽水始终固定5%');
      console.log('------------------------------------------');
      console.log('💬 [客服系统] WebSocket 网关已就绪:');
      console.log(` 端点：ws://localhost:${PORT}/ws`);
      console.log(' 鉴权：JWT Token');
      console.log(' 功能：实时聊天 / 会话管理 / 未读推送');
      console.log('==========================================');
    });
  } catch (err) {
    console.error(`[启动失败] ${err.message}`);
    process.exit(1);
  }
}

start();
