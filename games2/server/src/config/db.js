/**
 * 巨人赛跑 - Mongoose 数据库配置
 * 使用 MongoDB 云数据库，连接字符串请自行修改
 */
import mongoose from 'mongoose';

// ========== MongoDB 连接字符串 ==========
// TODO: 请修改为你的 MongoDB 云数据库连接字符串
const MONGODB_URI = 'mongodb+srv://j66357791_db_user:hjh628727@cluster0.oiwbvje.mongodb.net/invest-v6?retryWrites=true&w=majority';

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
