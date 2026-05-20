// src/scripts/fix-internal.js
// 一次性迁移脚本：修复所有 isInternal 为 undefined 或不同步的 RiskProfile

import User from '../models/User.js';
import RiskProfile from '../risk/models/RiskProfile.js';

async function fixInternalFlags() {
  console.log('[迁移] 开始修复 isInternal 字段...');
  
  try {
    // 1. 找出所有 isInternal 为 undefined 或 null 的 RiskProfile
    const brokenProfiles = await RiskProfile.find({ 
      $or: [
        { isInternal: { $exists: false } },
        { isInternal: null }
      ]
    });
    
    console.log(`[迁移] 找到 ${brokenProfiles.length} 条 isInternal 缺失的记录`);
    
    for (const profile of brokenProfiles) {
      const user = await User.findById(profile.userId);
      const correctValue = user?.isInternal || false;
      
      profile.isInternal = correctValue;
      await profile.save();
      
      console.log(`[迁移] userId=${profile.userId}, isInternal 修复为: ${correctValue}`);
    }
    
    // 2. 检查：User 表 isInternal=true 但 RiskProfile 没有记录或不同步的
    const internalUsers = await User.find({ isInternal: true });
    let fixedCount = 0;
    
    for (const user of internalUsers) {
      const profile = await RiskProfile.findOne({ userId: user._id });
      if (!profile) {
        await RiskProfile.create({ userId: user._id, isInternal: true });
        console.log(`[迁移] 为内部用户 ${user.phone} 创建了 RiskProfile (isInternal=true)`);
        fixedCount++;
      } else if (profile.isInternal !== true) {
        profile.isInternal = true;
        await profile.save();
        console.log(`[迁移] 内部用户 ${user.phone} 的 RiskProfile.isInternal 修复为 true`);
        fixedCount++;
      }
    }
    
    // 3. 反向检查：RiskProfile 标记为内部，但 User 表不是的（异常状态）
    const internalProfiles = await RiskProfile.find({ isInternal: true });
    for (const profile of internalProfiles) {
      const user = await User.findById(profile.userId);
      if (user && !user.isInternal) {
        // 以 User 表为准，RiskProfile 应该同步为 false
        profile.isInternal = false;
        await profile.save();
        console.log(`[迁移] 用户 ${user.phone} 的 RiskProfile.isInternal 异常，已同步为 User 表的 false`);
        fixedCount++;
      }
    }
    
    console.log(`[迁移] isInternal 字段修复完成！共修复 ${brokenProfiles.length + fixedCount} 条记录`);
  } catch (err) {
    console.error('[迁移] 修复 isInternal 字段出错:', err);
  }
}

export default fixInternalFlags;
