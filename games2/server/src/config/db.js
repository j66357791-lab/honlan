// src/config/db.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[数据库] 错误：未在环境变量中配置 MONGODB_URI');
  process.exit(1);
}

export async function connectDB() {
  try {
    // ★ 云数据库优化配置（针对 Atlas 公网不稳定优化）
    const options = {
      maxPoolSize: 50,            // 最大连接数
      minPoolSize: 5,             // 预热连接数
      serverSelectionTimeoutMS: 15000, // [调优] 选服务器超时放宽到 15 秒（原 5 秒在弱网容易断）
      socketTimeoutMS: 45000,     // 单次操作超时 45 秒
      connectTimeoutMS: 15000,    // [新增] 初始 TCP 连接超时 15 秒
      heartbeatFrequencyMS: 10000,// [新增] 心跳检测频率 10 秒（默认10s，显式声明防篡改）
      retryWrites: true,          // [新增] Atlas 强烈建议开启，网络抖动时自动重试写入
      family: 4                   // 强制使用 IPv4，避免解析卡顿
    };

    const conn = await mongoose.connect(MONGODB_URI, options);
    console.log(`[数据库] MongoDB 连接成功: ${conn.connection.host}`);
    console.log(`[数据库] 连接池配置: 最大=${options.maxPoolSize}, 预热=${options.minPoolSize}`);
    return conn;
  } catch (error) {
    console.error(`[数据库] MongoDB 连接失败: ${error.message}`);
    process.exit(1);
  }
}

export default mongoose;
