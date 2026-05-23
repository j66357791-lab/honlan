// src/risk/middleware.js

import RiskProfile from './models/RiskProfile.js';

/**
 * 日重置中间件
 * 挂载在需要风控的路由上，确保跨日数据正确
 */
export const riskDailyReset = async (req, res, next) => {
  if (!req.user?.userId) return next();

  try {
    const today = new Date().toISOString().slice(0, 10);
    const profile = await RiskProfile.findOne({ userId: req.user.userId });

    if (profile && profile.lastSettleDate !== today) {
      profile.resetDaily(today);
      await profile.save();
    }
  } catch (err) {
    console.error('[风控中间件] 日重置失败:', err.message);
  }

  next();
};
