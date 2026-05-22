/**
 * 巨人赛跑 - Mongoose 数据库配置
 * 职责：纯粹负责连接数据库（带云数据库连接池优化）
 */
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
    // ★ 云数据库优化配置
    const options = {
      maxPoolSize: 50,           // 最大连接数，抗高并发
      minPoolSize: 5,            // 预热连接数，减少冷启动延迟
      serverSelectionTimeoutMS: 5000, // 选服务器超时 5 秒（默认 30 秒太长）
      socketTimeoutMS: 45000,    // 单次操作超时 45 秒
      family: 4                  // 强制使用 IPv4，避免解析卡顿
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
