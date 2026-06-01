// src/app.js 
import express from 'express'; 
import http from 'http'; 
import cors from 'cors'; 
import morgan from 'morgan'; 
import dotenv from 'dotenv'; 
import rateLimit from 'express-rate-limit'; 
import helmet from 'helmet'; 
import jwt from 'jsonwebtoken'; // ★ 新增：用于维护模式识别管理员身份
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
import { fillPools } from './services/BoardPool.js'; 
import climbWallRoutes from './routes/climbWall.js'; 
import redPacketRoutes from './routes/redPacket.js'; 
import transferRoutes from './routes/transfer.js'; 
import membershipRoutes from './routes/membership.js'; 
// ★ 新增：引入我们写的智能日志工具 
import appLogger, { httpLogStream } from './utils/logger.js'; 

// ★★★ 全局维护模式开关 (默认关闭) ★★★
global.isMaintenanceMode = false;

dotenv.config(); 

// [修复] 生产环境绝对不能吃掉 error 和 warn，否则出问题就是瞎子 
// ★ 暂时保留这段，等后面我们把所有 console.log 都替换成 appLogger 后再删掉，稳字当头 
if (process.env.NODE_ENV === 'production') { 
  const noop = () => {}; 
  console.log = noop; 
  console.info = noop; 
  // console.warn 和 console.error 必须保留！或者替换成正规的日志库 
} 

const app = express(); 
const PORT = process.env.PORT || 3000; 

// ★★★ JWT 密钥 (请确保与 auth.js 中的密钥一致) ★★★
const JWT_SECRET = process.env.JWT_SECRET || 'giant_racing_jwt_secret_2024';

app.set('trust proxy', 1); 

const whitelist = ['http://localhost:5173', 'http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean); 
const corsOptions = { 
  origin: function (origin, callback) { 
    if (!origin || whitelist.includes(origin)) { 
      callback(null, true); 
    } else { 
      appLogger.warn(`[安全拦截] 不允许的跨域请求来源: ${origin}`); // ★ 替换为 appLogger 
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

// ★ 智能日志分流：本地写文件清净控制台，云端打控制台方便 Zeabur 收集 
if (process.env.NODE_ENV === 'production') { 
  // 生产环境：输出简短的 dev 格式到控制台，让 Zeabur 抓取 
  app.use(morgan('dev')); 
} else { 
  // 本地环境：输出详细的 combined 格式到文件，控制台不再刷屏 
  app.use(morgan('combined', { stream: httpLogStream })); 
} 

app.use('/api', apiLimiter); 
app.use('/api', (req, res, next) => { 
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); 
  res.set('Pragma', 'no-cache'); 
  res.set('Expires', '0'); 
  next(); 
}); 

// ========== ★★★ 维护模式拦截网 ★★★ ==========
app.use((req, res, next) => {
  // 1. 如果没开维护，直接放行
  if (!global.isMaintenanceMode) return next();

  // 2. 放行登录和注册接口（否则管理员都进不去）
  if (req.path === '/api/login' || req.path === '/api/register') return next();

  // 3. 尝试识别管理员/内部号放行
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      // 角色是 admin 或者 是内部号，直接放行
      if (decoded.role === 'admin' || decoded.isInternal) {
        return next();
      }
    } catch (e) {
      // Token 无效或过期，按普通用户处理，继续拦截
    }
  }

  // 4. 其他所有人，一律拦截
  return res.status(503).json({ 
    error: '系统升级维护中，请稍后再试', 
    code: 'MAINTENANCE' // 前端可根据此 code 弹出全屏维护页
  });
});
// ==========================================

// 路由挂载 
app.use('/api', authRoutes); 
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
app.use('/api/membership', membershipRoutes); 

app.get('/api/health', (req, res) => { 
  res.json({ status: 'ok', time: new Date().toISOString() }); 
}); 

// ★★★ 全局错误处理中间件，必须放在所有路由之后 ★★★ 
app.use((err, req, res, next) => { 
  appLogger.error(`[全局未捕获异常] ${err.stack || err}`); // ★ 替换为 appLogger 
  res.status(500).json({ error: '服务器内部错误，请稍后再试' }); 
}); 

async function start() { 
  try { 
    await connectDB(); 
    await initRiskModule(); 
    // ★★★ 数据库连接成功后，预生成消消乐棋盘池 ★★★ 
    await fillPools(); 

    const server = http.createServer(app); 
    const chatGateway = createChatGateway(server); 

    server.listen(PORT, () => { 
      // ★ 改造：所有启动日志使用 appLogger.info 记录 
      appLogger.info('=========================================='); 
      appLogger.info('🏇 巨人赛跑 & ⚔️ 点兵点将 后端服务已启动'); 
      appLogger.info(`🚀 地址：http://localhost:${PORT}`); 
      appLogger.info(`🛡️ CORS 白名单：${whitelist.join(', ')}`); 
      appLogger.info('🛡️ 安全响应头：已启用'); 
      appLogger.info('🛡️ 信任代理：已启用'); 
      appLogger.info('⏱️ 频率限制：每IP每分钟 60 次请求'); 
      appLogger.info('🚫 API缓存：已强制禁用'); 
      appLogger.info('------------------------------------------'); 
      appLogger.info('🎮 [巨人赛跑] 参数配置:'); 
      appLogger.info(' 赔率：红方1.9倍 / 蓝方1.9倍 / 平局9倍'); 
      appLogger.info(' 下注范围：10 ~ 8000'); 
      appLogger.info(' 抽水：无'); 
      appLogger.info('------------------------------------------'); 
      appLogger.info('⚔️ [点兵点将] 参数配置:'); 
      appLogger.info(' 普通(5倍)：赵云 / 秦良玉 / 马超 / 花木兰'); 
      appLogger.info(' 特殊(10倍)：关羽'); 
      appLogger.info(' 特殊(20倍)：张飞'); 
      appLogger.info(' 特殊(30倍)：梁红玉'); 
      appLogger.info(' 特殊(40倍)：穆桂英'); 
      appLogger.info(' 抽水：固定5%（仅对净盈利部分收取）'); 
      appLogger.info('------------------------------------------'); 
      appLogger.info('🧩 [消消乐] 参数配置:'); 
      appLogger.info(' 门票：5000 / 20000 / 100000 / 500000'); 
      appLogger.info(' 抽水：10%（仅对净利润部分收取）'); 
      appLogger.info(' 控奖：多级奖牌池预生成 + 动态 RTP 平衡'); 
      appLogger.info(' 索引：单例累加统计，数据库极低压力'); 
      appLogger.info(' RTP：动态锁定 85% ~ 105% 之间'); 
      appLogger.info('------------------------------------------'); 
      appLogger.info('🛡️ [智能风控引擎 V4] 已就绪:'); 
      appLogger.info(' ⚪ 架构：事件采集 → 特征计算 → 规则匹配 → 动态控制 → 决策输出'); 
      appLogger.info(' ⚫ 存储：RiskProfile(画像) / SystemPool(奖池) / RiskLog(日志)'); 
      appLogger.info(' 📊 名单层：白名单豁免 / 黑名单压制 / 内部号保护'); 
      appLogger.info(' 📊 个人层：暴利平衡 / 连胜打断 / 历史吸血鬼（联动池子）'); 
      appLogger.info(' 📊 行为层：鸡贼下注 / 对冲套利吸尘器 / 5倍全覆盖'); 
      appLogger.info(' 📊 仇恨层：诱导大奖 → 强诱导 → 暗箱反杀（点兵/巨人各一套）'); 
      appLogger.info(' 📊 系统层：危急吸血 / 重度压制 / 轻度止损 / 丰收放水'); 
      appLogger.info(' 📊 安抚层：连败安慰（防流失）'); 
      appLogger.info('------------------------------------------'); 
      appLogger.info('🔄 [四阶段动态吃分控制] 核心机制:'); 
      appLogger.info(' eatProgress = 今日系统获得 / 今日系统发放'); 
      appLogger.info(' ┌──────────────────────────────────────────────────┐'); 
      appLogger.info(' │ KILL │ DECAY │ DORMANT │ FEED │'); 
      appLogger.info(' │ <50% │ 50%~80% │ 80%~100% │ ≥100% │'); 
      appLogger.info(' │ 规则全效 │ 线性衰减 │ 规则休眠 │ 主动放水 │'); 
      appLogger.info(' │ impact=1 │ 1.0→0.0 │ impact=0 │ +5%~30%加成│'); 
      appLogger.info(' └──────────────────────────────────────────────────┘'); 
      appLogger.info(' ★ 吃分控制全部通过概率调整实现，抽水始终固定5%'); 
      appLogger.info('------------------------------------------'); 
      appLogger.info('💬 [客服系统] WebSocket 网关已就绪:'); 
      appLogger.info(` 端点：ws://localhost:${PORT}/ws`); 
      appLogger.info(' 鉴权：JWT Token'); 
      appLogger.info(' 功能：实时聊天 / 会话管理 / 未读推送'); 
      appLogger.info('=========================================='); 
    }); 
  } catch (err) { 
    appLogger.error(`[启动失败] ${err.message}`); // ★ 替换为 appLogger 
    process.exit(1); 
  } 
} 

start();
