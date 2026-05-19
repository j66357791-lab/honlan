import { Router } from 'express';
import User from '../models/User.js';
import PointingBet from '../models/PointingBet.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware } from '../middleware/auth.js';
import crypto from 'crypto';
import { getPointingProb, updateSystemProfit } from '../config/systemPool.js';
import { evaluateRisk } from '../utils/riskEngine.js';

const router = Router();

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

function generateBasePointingResult() {
  const prob = getPointingProb();
  const random = crypto.randomInt(100);
  if (random < prob.allEliminated * 100) return { resultType: 'all_eliminated', survivedCharacters: [] };
  if (random < (prob.allEliminated + prob.allSurvived) * 100) return { resultType: 'all_survived', survivedCharacters: CHARACTERS.map(c => c.name) };
  const isMale = crypto.randomInt(2) === 0;
  const genderCharacters = CHARACTERS.filter(c => c.gender === (isMale ? 'male' : 'female'));
  const survivalRand = crypto.randomInt(100);
  const survivalCount = survivalRand < 50 ? 1 : (survivalRand < 83 ? 2 : 3);
  const survived = [...genderCharacters];
  while (survived.length > survivalCount) {
    const totalPower = survived.reduce((s, c) => s + c.power, 0);
    const rand = crypto.randomInt(totalPower);
    let acc = 0;
    for (let i = 0; i < survived.length; i++) {
      acc += survived[i].power;
      if (rand < acc) { survived.splice(i, 1); break; }
    }
  }
  return { resultType: 'normal', survivedCharacters: survived.map(c => c.name) };
}

function checkIsBaseWin(bets, gameResult) {
  let totalPayout = 0;
  bets.forEach(bet => {
    if (gameResult.resultType === 'all_survived') totalPayout += bet.type === 'gender' ? bet.amount * GENDER_ODDS : bet.amount * CHARACTERS.find(c => c.name === bet.choice).odds;
    else if (gameResult.resultType === 'normal') {
      if (bet.type === 'gender') { const wg = CHARACTERS.find(c => gameResult.survivedCharacters.includes(c.name))?.gender; if (bet.choice === wg) totalPayout += bet.amount * GENDER_ODDS; }
      else if (gameResult.survivedCharacters.includes(bet.choice)) totalPayout += bet.amount * CHARACTERS.find(c => c.name === bet.choice).odds;
    }
  });
  return totalPayout > 0;
}

function applyRiskControl(baseResult, riskAction, bets) {
  if (riskAction === 'NORMAL' || baseResult.resultType !== 'normal') return baseResult;
  const betGenders = [...new Set(bets.filter(b => b.type === 'gender').map(b => b.choice))];
  const betNames = [...new Set(bets.filter(b => b.type === 'character').map(b => b.choice))];
  let surviveGender;
  if (riskAction === 'FORCE_LOSE') { surviveGender = betGenders.includes('male') ? 'female' : 'male'; }
  else if (riskAction === 'FORCE_WIN') { surviveGender = betGenders.length > 0 ? betGenders[0] : CHARACTERS.find(c => betNames.includes(c.name))?.gender || 'male'; }
  const genderCharacters = CHARACTERS.filter(c => c.gender === surviveGender);
  const survived = [...genderCharacters];
  if (riskAction === 'FORCE_WIN' && betNames.length > 0) { while (survived.length > 1) { const nonBetChars = survived.filter(c => !betNames.includes(c.name)); if (nonBetChars.length > 0) { survived.splice(survived.indexOf(nonBetChars[0]), 1); } else break; } }
  else { while (survived.length > 2) { survived.splice(crypto.randomInt(survived.length), 1); } }
  return { resultType: 'normal', survivedCharacters: survived.map(c => c.name) };
}

// ========== POST /bet ==========
router.post('/bet', authMiddleware, async (req, res) => {
  try {
    const { bets } = req.body;
    const userId = req.user.userId;
    if (!bets || bets.length === 0) return res.status(400).json({ error: '请至少选择一项下注' });
    let totalAmount = 0;
    for (const b of bets) {
      const amt = parseInt(b.amount);
      if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: '单注金额必须为大于0的整数' });
      b.amount = amt;
      totalAmount += amt;
    }
    if (totalAmount < 10) return res.status(400).json({ error: '下注总额最少10积分' });
    const user = await User.findOneAndUpdate({ _id: userId, banned: false, balance: { $gte: totalAmount } }, { $inc: { balance: -totalAmount } }, { new: true });
    if (!user) {
      const c = await User.findById(userId);
      if (!c) return res.status(404).json({ error: '用户不存在' });
      if (c.banned) return res.status(403).json({ error: '账号已被封禁' });
      return res.status(400).json({ error: '积分不足' });
    }
    const baseResult = generateBasePointingResult();
    const isBaseWin = checkIsBaseWin(bets, baseResult);
    const riskAction = evaluateRisk(user, totalAmount, isBaseWin);
    const gameResult = applyRiskControl(baseResult, riskAction, bets);
    let totalPayout = 0;
    bets.forEach(bet => {
      let winAmount = 0;
      if (gameResult.resultType === 'all_survived') {
        winAmount = bet.type === 'gender' ? bet.amount * GENDER_ODDS : bet.amount * CHARACTERS.find(c => c.name === bet.choice).odds;
      } else if (gameResult.resultType === 'normal') {
        if (bet.type === 'gender') {
          const wg = CHARACTERS.find(c => gameResult.survivedCharacters.includes(c.name))?.gender;
          if (bet.choice === wg) winAmount = bet.amount * GENDER_ODDS;
        } else if (gameResult.survivedCharacters.includes(bet.choice)) {
          winAmount = bet.amount * CHARACTERS.find(c => c.name === bet.choice).odds;
        }
      }
      totalPayout += Math.floor(winAmount);
    });
    const netChange = totalPayout - totalAmount;
    const win = totalPayout > 0;
    updateSystemProfit(netChange);
    if (totalPayout > 0) {
      await User.updateOne({ _id: userId }, { $inc: { balance: totalPayout } });
      user.balance += totalPayout;
    }
    const updateFields = { $inc: { totalBetAmount: totalAmount, totalPayoutAmount: totalPayout, todayProfit: netChange } };
    if (riskAction === 'NORMAL' && win && user.todayProfit > 5000 && user.historyProfit > 5000 && totalAmount < 1000) {
      const oldIndex = user.riskIndex || 0;
      const newIndex = Math.min(oldIndex + 10, 30);
      updateFields.$inc.riskIndex = 10;
      console.warn(`🚨 [风控升级] 玩家 ${user.phone} 频繁小额赢利！风险指数 +10% -> 当前 ${newIndex}%`);
    }
    await User.updateOne({ _id: userId }, updateFields);

    // 生成下注摘要（用于记录展示）
    const choiceSummary = bets.map(b => b.type === 'gender' ? (b.choice === 'male' ? '猜男' : '猜女') : b.choice).join('+');

    const betRecord = await PointingBet.create({
      userId,
      bets,
      totalAmount,
      resultType: gameResult.resultType,
      survivedCharacters: gameResult.survivedCharacters,
      totalPayout,
      netChange,
      choiceSummary  // 新增字段
    });

    const balanceAfterExpense = user.balance - totalPayout;
    await Transaction.create({ userId, type: 'bet_expense', amount: totalAmount, balanceAfter: balanceAfterExpense, remark: `点兵点将下注 ${totalAmount}积分`, betId: betRecord._id, gameType: 'pointing' });
    if (totalPayout > 0) {
      await Transaction.create({ userId, type: 'bet_win', amount: totalPayout, balanceAfter: user.balance, remark: `点兵点将赢取 ${totalPayout}积分`, betId: betRecord._id, gameType: 'pointing' });
    }

    res.json({ result: gameResult, payout: totalPayout, netChange, balance: user.balance });
  } catch (err) {
    console.error(`[点兵点将] ${err.message}`);
    res.status(500).json({ error: '下注失败' });
  }
});

// ========== GET /history — 对局记录 ==========
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const rawBets = await PointingBet.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    // 转换为 RecordModal 通用格式
    const history = rawBets.map(bet => {
      // 推算获胜性别
      let result;
      if (bet.resultType === 'all_survived') {
        result = 'all_survived';
      } else if (bet.resultType === 'all_eliminated') {
        result = 'all_eliminated';
      } else {
        const survivedChar = CHARACTERS.find(c => bet.survivedCharacters.includes(c.name));
        result = survivedChar ? survivedChar.gender : 'male';
      }

      return {
        _id: bet._id,
        choice: bet.choiceSummary || (bet.bets.length > 0 ? bet.bets[0].choice : ''),
        amount: bet.totalAmount,
        result,
        netChange: bet.netChange,
        createdAt: bet.createdAt
      };
    });

    res.json({ history });
  } catch (err) {
    console.error(`[点兵历史] ${err.message}`);
    res.status(500).json({ error: '获取记录失败' });
  }
});

// ========== GET /transactions — 积分明细 ==========
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const list = await Transaction.find({
      userId: req.user.userId,
      remark: { $regex: '点兵点将' }
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ list });
  } catch (err) {
    console.error(`[点兵明细] ${err.message}`);
    res.status(500).json({ error: '获取明细失败' });
  }
});

export default router;
