import RiskProfile from '../risk/models/RiskProfile.js';
import SystemPool from '../risk/models/SystemPool.js';

export async function runDailySettle() {
  const todayStr = new Date().toISOString().slice(0, 10);
  console.log(`[日结任务] 🕛 开始执行 ${todayStr} 的日结汇总...`);
  try {
    const profileResult = await RiskProfile.updateMany(
      { lastSettleDate: { $ne: todayStr } }, 
      [{ $set: { yesterdayProfit: "$todayProfit", yesterdayBetCount: "$todayBetCount", historyProfit: { $add: ["$historyProfit", "$todayProfit"] }, todayProfit: 0, todayBetCount: 0, todayWinCount: 0, todayTotalBet: 0, todayMaxBet: 0, consecutiveWins: 0, consecutiveLosses: 0, riskIndex: 0, lastSettleDate: todayStr } }]
    );
    console.log(`[日结任务] ✅ 已结转 ${profileResult.modifiedCount} 个用户的风控档案`);

    const pool = await SystemPool.findOne({ key: 'default' });
    if (pool) { pool.resetDaily(todayStr); await pool.save(); }
    console.log(`[日结任务] ✅ 系统奖池今日数据已重置`);
    console.log(`[日结任务] 🎉 日结完成！`);
  } catch (err) { console.error(`[日结任务] ❌ 日结失败:`, err); }
}
