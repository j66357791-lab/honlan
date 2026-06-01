// src/risk/index.js 
import RiskEngine from './engine.js'; 
import RiskProfile from './models/RiskProfile.js'; 
import RiskLog from './models/RiskLog.js'; 
import SystemPool from './models/SystemPool.js'; 
import { riskDailyReset } from './middleware.js'; 
import { RULES } from './rules.js'; // ← 修复：在这里引入 RULES 
import appLogger from '../utils/logger.js'; // ★ 引入日志调度局

/** 
 * 风控模块初始化 
 * 在 app.js 中调用 
 */ 
export async function initRiskModule() { 
  // 确保默认奖池存在 
  let pool = await SystemPool.findOne({ key: 'default' }); 
  if (!pool) { 
    pool = new SystemPool({ key: 'default' }); 
    await pool.save(); 
  } 
  
  // 从历史数据初始化奖池（首次启动） 
  if (pool.totalBet === 0) { 
    const Bet = (await import('../models/Bet.js')).default; 
    const PointingBet = (await import('../models/PointingBet.js')).default; 
    
    const giantStats = await Bet.aggregate([ 
      { $group: { _id: null, totalBet: { $sum: '$amount' }, totalPayout: { $sum: '$payout' } } } 
    ]); 
    const pointingStats = await PointingBet.aggregate([ 
      { $group: { _id: null, totalBet: { $sum: '$totalAmount' }, totalPayout: { $sum: '$totalPayout' } } } 
    ]); 
    
    pool.totalBet = (giantStats[0]?.totalBet || 0) + (pointingStats[0]?.totalBet || 0); 
    pool.totalPayout = (giantStats[0]?.totalPayout || 0) + (pointingStats[0]?.totalPayout || 0); 
    pool.netProfit = pool.totalBet - pool.totalPayout; 
    pool.todayDate = new Date().toISOString().slice(0, 10); 
    await pool.save(); 
  } 
  
  // 为已有用户创建风险画像 
  const User = (await import('../models/User.js')).default; 
  const usersWithoutProfile = await User.find({ _id: { $nin: (await RiskProfile.distinct('userId')) } }); 
  for (const user of usersWithoutProfile) { 
    await RiskProfile.create({ 
      userId: user._id, 
      isWhitelisted: user.isWhitelisted || false, 
      isHighRisk: user.isHighRisk || false, 
      todayProfit: user.todayProfit || 0, 
      totalBetAmount: user.totalBetAmount || 0, 
      totalPayoutAmount: user.totalPayoutAmount || 0, 
      riskIndex: user.riskIndex || 0, 
      lastSettleDate: user.lastSettleDate || '', 
    }); 
  } 
  
  // ★ 改造：合并精简初始化日志
  appLogger.info('🎰 [风控] 模块初始化完成'); 
  appLogger.info(`   奖池净收益: ${pool.netProfit} 积分 (收益率: ${(pool.profitRate * 100).toFixed(2)}%)`); 
  appLogger.info(`   用户画像: ${await RiskProfile.countDocuments()} 条 | 活跃规则: ${RULES.length} 条`); 
} 

// 统一导出 
export { RiskEngine, RiskProfile, RiskLog, SystemPool, riskDailyReset }; 
export default RiskEngine;
