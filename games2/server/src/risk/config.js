// src/risk/config.js
import crypto from 'crypto';

/**
 * 生成风控追踪ID
 * 格式: risk_{userId后4位}_{随机6位}
 */
export function generateTraceId(userId) {
  const idStr = userId.toString();
  const suffix = idStr.length > 4 ? idStr.slice(-4) : idStr;
  const rand = crypto.randomBytes(3).toString('hex');
  return `risk_${suffix}_${rand}`;
}

// 未来如果要支持从数据库/配置中心动态加载规则，可以在这里扩展
