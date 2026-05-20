/**
 * 巨人赛跑 - Mongoose 数据库配置
 * 职责：纯粹负责连接数据库
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
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`[数据库] MongoDB 连接成功: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[数据库] MongoDB 连接失败: ${error.message}`);
    process.exit(1);
  }
}

export default mongoose;
