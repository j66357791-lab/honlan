/**
 * 智能风控引擎 V2
 * 核心逻辑：白名单优先 > 黑名单 > 系统动态风控
 */

export const evaluateRisk = (user, betAmount, isBaseWin) => {
  // 0. 跨天重置今日盈亏和风险指数
  const today = new Date().toISOString().slice(0, 10);
  if (user.lastSettleDate !== today) {
    user.todayProfit = 0;
    user.riskIndex = 0;
    user.lastSettleDate = today;
  }

  // ==========================================
  // 🛡️ 最高优先级：白名单豁免
  // 只要管理员加了白名单，系统绝对不干预，哪怕他赢上天
  // ==========================================
  if (user.isWhitelisted) {
    return 'NORMAL';
  }

  const TP = user.todayProfit; 
  const HP = user.historyProfit; 

  const BIG_BET = 3000;   
  const SMALL_BET = 1000; 
  const WIN_LIMIT = 5000; 

  let riskLevel = 'NORMAL';

  // 1. 评定玩家风险等级
  if (TP > WIN_LIMIT && HP < -WIN_LIMIT) {
    riskLevel = 'LOW';    
  } else if (TP < -WIN_LIMIT && HP > WIN_LIMIT) {
    riskLevel = 'MEDIUM'; 
  } else if (TP > WIN_LIMIT && HP > WIN_LIMIT) {
    riskLevel = 'HIGH';   
  }

  // ⚠️ 次高优先级：管理员手动黑名单 (极端针对)
  if (user.isHighRisk) riskLevel = 'EXTREME';

  // 2. 根据风险等级决定动作
  let action = 'NORMAL';

  if (riskLevel === 'EXTREME') {
    action = isBaseWin ? 'FORCE_LOSE' : 'NORMAL'; 
  } 
  else if (riskLevel === 'LOW') {
    if (betAmount >= BIG_BET && isBaseWin) action = 'FORCE_LOSE'; 
    if (betAmount < SMALL_BET && !isBaseWin) action = 'FORCE_WIN'; 
  } 
  else if (riskLevel === 'MEDIUM') {
    if (betAmount < SMALL_BET && !isBaseWin) action = 'FORCE_WIN'; 
  } 
  else if (riskLevel === 'HIGH') {
    if (betAmount >= BIG_BET) {
      action = 'FORCE_LOSE'; 
    } else if (betAmount < SMALL_BET) {
      if (user.riskIndex >= 30) {
        action = isBaseWin ? 'FORCE_LOSE' : 'NORMAL';
      } else {
        if (!isBaseWin) action = 'FORCE_WIN'; 
      }
    }
  }

  if (action !== 'NORMAL') {
    console.log(`🎯 [风控引擎] 玩家:${user.phone}, 等级:${riskLevel}, 下注:${betAmount}, 基础赢:${isBaseWin}, 动作:${action}, 当前指数:${user.riskIndex}%`);
  }

  return action;
};
