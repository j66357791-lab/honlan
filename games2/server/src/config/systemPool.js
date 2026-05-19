/**
 * 系统奖池与风控配置
 * [风控] 动态概率调整、奖池重置
 */

let currentProfit = 0;

export const getSystemProfit = () => currentProfit;
export const updateSystemProfit = (netChange) => { currentProfit += netChange; };

/**
 * 重置系统奖池（清空数据时调用）
 */
export const resetSystemPool = () => {
  currentProfit = 0;
  console.log('🎰 [风控] 系统奖池已强制归零');
};

/**
 * 初始化系统奖池（服务启动时调用）
 */
export const initSystemPool = async () => {
  try {
    const Bet = (await import('../models/Bet.js')).default;
    const PointingBet = (await import('../models/PointingBet.js')).default;

    const giantStats = await Bet.aggregate([{ $group: { _id: null, totalBet: { $sum: '$amount' }, totalPayout: { $sum: '$payout' } } }]);
    const pointingStats = await PointingBet.aggregate([{ $group: { _id: null, totalBet: { $sum: '$totalAmount' }, totalPayout: { $sum: '$totalPayout' } } }]);

    const totalBet = (giantStats[0]?.totalBet || 0) + (pointingStats[0]?.totalBet || 0);
    const totalPayout = (giantStats[0]?.totalPayout || 0) + (pointingStats[0]?.totalPayout || 0);
    
    currentProfit = totalBet - totalPayout;
    console.log(`🎰 [风控] 系统奖池初始化完成，当前历史总净收益: ${currentProfit} 积分`);
  } catch (err) {
    console.error('🎰 [风控] 奖池初始化失败，默认从0开始:', err.message);
    currentProfit = 0;
  }
};

/**
 * 巨人赛跑 - 动态概率生成
 * 根据系统盈亏返回不同的概率配置
 */
export const getGiantRacingProb = () => {
  const profit = currentProfit;
  if (profit < -5000) return { red: 0.40, blue: 0.40, draw: 0.20 };
  if (profit < -1000) return { red: 0.43, blue: 0.43, draw: 0.14 };
  if (profit > 20000) return { red: 0.48, blue: 0.48, draw: 0.04 };
  if (profit > 5000) return { red: 0.47, blue: 0.47, draw: 0.06 };
  return { red: 0.45, blue: 0.45, draw: 0.10 };
};

/**
 * 点兵点将 - 动态概率生成 (仅针对系统全局盈亏微调通杀通赢)
 */
export const getPointingProb = () => {
  const profit = currentProfit;
  if (profit < -5000) return { allEliminated: 0.03, allSurvived: 0.005 };
  if (profit < -1000) return { allEliminated: 0.02, allSurvived: 0.008 };
  if (profit > 20000) return { allEliminated: 0.005, allSurvived: 0.04 };
  if (profit > 5000) return { allEliminated: 0.008, allSurvived: 0.02 };
  return { allEliminated: 0.01, allSurvived: 0.01 };
};

/**
 * 手动调整系统奖池收益（管理员专用）
 */
export const adjustSystemPoolManually = ({ type, amount, remark = '' }) => {
  if (!['add', 'sub'].includes(type)) throw new Error('type 必须是 add 或 sub');
  if (typeof amount !== 'number' || amount <= 0) throw new Error('amount 必须是大于0的数字');

  const delta = type === 'add' ? amount : -amount;
  currentProfit += delta;

  console.log(
    `🎰 [风控] 管理员手动调整奖池: ${type === 'add' ? '增加' : '扣除'} ${amount} 积分，` +
    `当前总净收益: ${currentProfit} 积分，备注: ${remark || '无'}`
  );

  return { type, amount, currentProfit, remark };
};
