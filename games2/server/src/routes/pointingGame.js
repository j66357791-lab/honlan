/**
 * 点兵点将 - 游戏路由
 */
import { Router } from 'express';
import User from '../models/User.js';
import PointingBet from '../models/PointingBet.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 角色配置 (与前端保持绝对一致)
const CHARACTERS = [
  { name: '赵云', gender: 'male', power: 4, odds: 2.7 },
  { name: '关羽', gender: 'male', power: 3, odds: 3.4 },
  { name: '张飞', gender: 'male', power: 2, odds: 4.9 },
  { name: '马超', gender: 'male', power: 1, odds: 8.0 },
  { name: '秦良玉', gender: 'female', power: 4, odds: 2.7 },
  { name: '梁红玉', gender: 'female', power: 3, odds: 3.4 },
  { name: '穆桂英', gender: 'female', power: 2, odds: 4.9 },
  { name: '花木兰', gender: 'female', power: 1, odds: 8.0 }
];
const GENDER_ODDS = 1.9;

/**
 * 模拟游戏结果 (纯后端计算，防作弊)
 */
function generatePointingResult() {
  const random = Math.random();
  let resultType = 'normal';
  let survivedCharacters = [];

  // 1. 特殊结局 (1%通杀, 1%通赢)
  if (random <= 0.01) {
    resultType = 'all_eliminated';
    return { resultType, survivedCharacters };
  } else if (random <= 0.02) {
    resultType = 'all_survived';
    survivedCharacters = CHARACTERS.map(c => c.name);
    return { resultType, survivedCharacters };
  }

  // 2. 正常淘汰
  const isMale = Math.random() < 0.5;
  const gender = isMale ? 'male' : 'female';
  const genderCharacters = CHARACTERS.filter(c => c.gender === gender);
  
  // 决定存活人数 (1人:50%, 2人:33%, 3人:17%)
  const survivalRand = Math.random();
  const survivalCount = survivalRand < 0.5 ? 1 : (survivalRand < 0.833 ? 2 : 3);

  // 根据生存力权重淘汰
  const survived = [...genderCharacters];
  while (survived.length > survivalCount) {
    const totalPower = survived.reduce((sum, c) => sum + c.power, 0);
    const rand = Math.random() * totalPower;
    let accumulated = 0;
    for (let i = 0; i < survived.length; i++) {
      accumulated += survived[i].power;
      if (rand <= accumulated) {
        survived.splice(i, 1); // 淘汰该角色
        break;
      }
    }
  }
  
  survivedCharacters = survived.map(c => c.name);
  return { resultType, survivedCharacters };
}

/**
 * POST /api/pointing/bet - 点兵点将下注
 */
router.post('/bet', authMiddleware, async (req, res) => {
  try {
    const { bets } = req.body; // bets: [{ type: 'gender', choice: 'male', amount: 100 }, ...]
    const userId = req.user.userId;

    if (!bets || bets.length === 0) {
      return res.status(400).json({ error: '请至少选择一项下注' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.banned) return res.status(403).json({ error: '账号已被封禁' });

    // 计算总下注额并校验
    const totalAmount = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalAmount < 10) return res.status(400).json({ error: '下注总额最少10积分' });
    if (user.balance < totalAmount) return res.status(400).json({ error: '积分不足' });

    // 1. 生成结果
    const gameResult = generatePointingResult();

    // 2. 计算赔付
    let totalPayout = 0;
    bets.forEach(bet => {
      let winAmount = 0;
      if (gameResult.resultType === 'all_survived') {
        // 通赢
        winAmount = bet.type === 'gender' ? bet.amount * GENDER_ODDS : bet.amount * CHARACTERS.find(c => c.name === bet.choice).odds;
      } else if (gameResult.resultType === 'all_eliminated') {
        // 通杀，赔付0
        winAmount = 0;
      } else {
        // 正常结算
        if (bet.type === 'gender') {
          const winGender = CHARACTERS.find(c => gameResult.survivedCharacters.includes(c.name))?.gender;
          if (bet.choice === winGender) winAmount = bet.amount * GENDER_ODDS;
        } else if (bet.type === 'character') {
          if (gameResult.survivedCharacters.includes(bet.choice)) {
            winAmount = bet.amount * CHARACTERS.find(c => c.name === bet.choice).odds;
          }
        }
      }
      totalPayout += Math.floor(winAmount);
    });

    const netChange = totalPayout - totalAmount;

    // 3. 扣除/增加余额
    user.balance -= totalAmount;
    user.balance += totalPayout;
    await user.save();

    // 4. 记录下注单
    const betRecord = await PointingBet.create({
      userId, bets, totalAmount,
      resultType: gameResult.resultType,
      survivedCharacters: gameResult.survivedCharacters,
      totalPayout, netChange
    });

    // 5. 记录积分明细 (复用 Transaction 模型)
    await Transaction.create({
      userId, type: 'bet_expense', amount: totalAmount,
      balanceAfter: user.balance - totalPayout, // 扣除前的余额
      remark: `点兵点将下注 ${totalAmount}积分`,
      betId: betRecord._id
    });
    if (totalPayout > 0) {
      await Transaction.create({
        userId, type: 'bet_win', amount: totalPayout,
        balanceAfter: user.balance,
        remark: `点兵点将赢取 ${totalPayout}积分`,
        betId: betRecord._id
      });
    }

    res.json({
      result: gameResult,
      payout: totalPayout,
      netChange,
      balance: user.balance
    });

  } catch (err) {
    console.error(`[点兵点将] 下注错误: ${err.message}`);
    res.status(500).json({ error: '下注失败' });
  }
});

export default router;
