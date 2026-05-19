/**
 * 巨人赛跑 - Mongoose 数据库配置
 * [安全修复] 移除硬编码凭证，改用环境变量
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// ========== MongoDB 连接字符串 ==========
// 从环境变量中读取，不再暴露在代码中
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('[数据库] 错误：未在环境变量中配置 MONGODB_URI');
  process.exit(1);
}

/**
 * 连接数据库
 */
export async function connectDB() {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`[数据库] MongoDB 连接成功: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[数据库] MongoDB 连接失败: ${error.message}`);
    process.exit(1);
  }
}

export default mongoose;
