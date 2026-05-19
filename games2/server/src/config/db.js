/**
 * 巨人赛跑 - Mongoose 数据库配置 V2
 * [V2] 新增：启动时自动为缺少uid的旧用户补全数据
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

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

    // ★ 启动后自动迁移旧用户
    await migrateOldUsers();

    return conn;
  } catch (error) {
    console.error(`[数据库] MongoDB 连接失败: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 为缺少 uid/nickname/avatar 的旧用户自动补全
 * 不会影响已有数据，只修补空缺字段
 */
async function migrateOldUsers() {
  try {
    const usersWithoutUid = await User.find({ uid: { $exists: false } });

    if (usersWithoutUid.length === 0) {
      console.log('[迁移] 所有用户均已有UID，无需迁移');
      return;
    }

    console.log(`[迁移] 发现 ${usersWithoutUid.length} 个旧用户需要补全UID...`);

    let success = 0;
    let failed = 0;

    for (const user of usersWithoutUid) {
      try {
        // 生成唯一UID
        let uid;
        let retries = 0;
        do {
          uid = String(Math.floor(10000000 + Math.random() * 90000000));
          const exists = await User.findOne({ uid });
          if (!exists) break;
          retries++;
        } while (retries < 20);

        if (retries >= 20) {
          console.error(`[迁移] 用户 ${user._id} UID生成失败，跳过`);
          failed++;
          continue;
        }

        // 只修补空缺字段，不覆盖已有数据
        if (!user.uid) user.uid = uid;
        if (!user.nickname) user.nickname = `玩家${uid.slice(-4)}`;
        if (!user.avatar) user.avatar = 1;

        await user.save({ validateBeforeSave: false });
        success++;
      } catch (err) {
        console.error(`[迁移] 用户 ${user._id} 迁移失败: ${err.message}`);
        failed++;
      }
    }

    console.log(`[迁移] 完成！成功 ${success} 个，失败 ${failed} 个`);
  } catch (err) {
    console.error(`[迁移] 迁移过程出错: ${err.message}`);
    // 迁移失败不阻止启动
  }
}

export default mongoose;
