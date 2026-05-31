// src/routes/game.js 
import { Router } from 'express'; 
import mongoose from 'mongoose'; 
import User from '../models/User.js'; 
import Bet from '../models/Bet.js'; 
import Transaction from '../models/Transaction.js'; 
import { authMiddleware } from '../middleware/auth.js'; 
import crypto from 'crypto'; 
import riskEngine from '../risk/engine.js'; 
import rateLimit from 'express-rate-limit'; 
import { TURNOVER_RATE } from '../config/redPacket.js'; // ★ 新增：引入流水比例配置

const router = Router(); 

const ODDS_WIN = 1.9; 
const ODDS_DRAW = 9; 
const MIN_BET = 10; 
const MAX_BET = 8000; 
const MAX_BET_RECORDS = 100; 
const MAX_TRANSACTION_RECORDS = 200; 

// ★ 新增：下注限流（1秒最多3次） 
const betLimiter = rateLimit({ 
  windowMs: 1000, 
  max: 3, 
  message: { error: '操作过于频繁，请稍后再试' }, 
  standardHeaders: true, 
  legacyHeaders: false, 
}); 

router.post('/bet', authMiddleware, betLimiter, async (req, res) => { 
  // ★ 使用事务，防止竞态条件 
  const session = await mongoose.startSession(); 
  session.startTransaction(); 
  try { 
    const { choice, amount, betAmount: totalBetAmount, detail } = req.body; 
    const userId = req.user.userId; 

    // ==========================================
    // 1. 兼容新版(多选)与旧版(单选)入参
    // ==========================================
    let redAmount = 0, drawAmount = 0, blueAmount = 0; 
    if (detail && typeof detail === 'object') { 
      redAmount = parseInt(detail.red) || 0; 
      drawAmount = parseInt(detail.draw) || 0; 
      blueAmount = parseInt(detail.blue) || 0; 
    } else if (choice && amount) { 
      const betAmount = parseInt(amount); 
      if (isNaN(betAmount)) { 
        await session.abortTransaction(); 
        session.endSession(); 
        return res.status(400).json({ error: '金额非法' }); 
      } 
      if (choice === 'red') redAmount = betAmount; 
      else if (choice === 'draw') drawAmount = betAmount; 
      else if (choice === 'blue') blueAmount = betAmount; 
    } else { 
      await session.abortTransaction(); 
      session.endSession(); 
      return res.status(400).json({ error: '缺少下注参数' }); 
    } 

    // ★ 严格校验每个金额
    if (redAmount < 0 || drawAmount < 0 || blueAmount < 0) { 
      await session.abortTransaction(); 
      session.endSession(); 
      return res.status(400).json({ error: '金额不能为负数' }); 
    } 

    const betAmount = redAmount + drawAmount + blueAmount; 
    if (betAmount < MIN_BET || betAmount > MAX_BET) { 
      await session.abortTransaction(); 
      session.endSession(); 
      return res.status(400).json({ error: `下注总额需在${MIN_BET}-${MAX_BET}之间` }); 
    } 

    // ★ 校验 choice 必须是合法值
    if (choice && !['red', 'blue', 'draw'].includes(choice)) { 
      await session.abortTransaction(); 
      session.endSession(); 
      return res.status(400).json({ error: '无效选项' }); 
    } 

    const actualChoices = []; 
    if (redAmount > 0) actualChoices.push('red'); 
    if (drawAmount > 0) actualChoices.push('draw'); 
    if (blueAmount > 0) actualChoices.push('blue'); 

    // ==========================================
    // 2. 风控评估
    // ==========================================
    const baseProb = { red: 0.45, blue: 0.45, draw: 0.10 }; 
    const decision = await riskEngine.evaluate({ 
      type: 'BET', 
      userId, 
      gameId: 'giant_racing', 
      payload: { 
        betAmount, 
        choices: actualChoices, 
        baseProb, 
        odds: { red: ODDS_WIN, blue: ODDS_WIN, draw: ODDS_DRAW }, 
        betDistribution: { red: redAmount, draw: drawAmount, blue: blueAmount } 
      } 
    }); 

    // 冷却检查
    if (decision.constraints?.cooldownSeconds > 0) { 
      const lastBet = await Bet.findOne({ userId }).sort({ createdAt: -1 }); 
      if (lastBet) { 
        const nextAllowed = new Date(lastBet.createdAt.getTime() + decision.constraints.cooldownSeconds * 1000); 
        if (new Date() < nextAllowed) { 
          await session.abortTransaction(); 
          session.endSession(); 
          return res.status(400).json({ error: '操作过于频繁，请稍后再试' }); 
        } 
      } 
    } 

    if (decision.action === 'BLOCK') { 
      await session.abortTransaction(); 
      session.endSession(); 
      return res.status(400).json({ error: `风控拦截: ${decision.reason}` }); 
    } 

    // ★ 原子扣款（带事务）—— 🔴🔴🔴 仅此处修改，加了 totalBetAmount 🔴🔴🔴
    const user = await User.findOneAndUpdate( 
      { _id: userId, banned: false, balance: { $gte: betAmount } }, 
      { $inc: { balance: -betAmount, totalBetAmount: Math.floor(betAmount * TURNOVER_RATE.giant) } }, 
      { new: true, session } 
    ); 

    if (!user) { 
      await session.abortTransaction(); 
      session.endSession(); 
      const checkUser = await User.findById(userId); 
      if (!checkUser) return res.status(404).json({ error: '用户不存在' }); 
      if (checkUser.banned) return res.status(403).json({ error: '账号已被封禁' }); 
      return res.status(400).json({ error: '积分不足' }); 
    } 

    // ==========================================
    // 3. 概率控制
    // ==========================================
    let result; 
    if (decision.constraints?.forceOpposite) { 
      if (actualChoices.length === 1) { 
        const single = actualChoices[0]; 
        result = single === 'red' ? 'blue' : single === 'blue' ? 'red' : (crypto.randomInt(2) === 0 ? 'red' : 'blue'); 
      } else { 
        if (!actualChoices.includes('draw')) result = 'draw'; 
        else if (!actualChoices.includes('red')) result = 'red'; 
        else if (!actualChoices.includes('blue')) result = 'blue'; 
        else result = 'draw'; 
      } 
    } else { 
      let finalProb = { red: 0.45, blue: 0.45, draw: 0.10 }; 
      if (decision.modifier && Object.keys(decision.modifier).length > 0) { 
        const allSame = finalProb.red !== undefined && decision.modifier.red !== undefined && decision.modifier.blue !== undefined && decision.modifier.red === decision.modifier.blue; 
        if (allSame) { 
          const factor = decision.modifier.red; 
          if (factor !== 1.0) { 
            actualChoices.forEach(c => { finalProb[c] *= factor; }); 
            const otherChoices = ['red', 'blue', 'draw'].filter(c => !actualChoices.includes(c)); 
            const reverseFactor = 1.0 / factor; 
            otherChoices.forEach(c => { finalProb[c] *= reverseFactor; }); 
          } 
          if (decision.modifier.draw !== undefined && decision.modifier.draw !== factor) { 
            finalProb.draw *= decision.modifier.draw / factor; 
          } 
        } else { 
          for (const [key, val] of Object.entries(decision.modifier)) { 
            if (finalProb[key] !== undefined) { 
              finalProb[key] *= val; 
            } 
          } 
        } 
      } 
      const eatPhase = decision.eatPhase || 'KILL'; 
      const gameImpact = decision.gameImpact ?? 1.0; 
      if (eatPhase === 'FEED' && gameImpact < 0) { 
        const feedBoost = Math.abs(gameImpact); 
        actualChoices.forEach(c => { finalProb[c] *= (1.0 + feedBoost); }); 
        const otherChoices = ['red', 'blue', 'draw'].filter(c => !actualChoices.includes(c)); 
        otherChoices.forEach(c => { finalProb[c] *= (1.0 - feedBoost * 0.5); }); 
      } 
      // 归一化
      const totalP = finalProb.red + finalProb.blue + finalProb.draw; 
      finalProb.red /= totalP; 
      finalProb.blue /= totalP; 
      finalProb.draw /= totalP; 

      // 破产保护
      const poolProfit = decision.context?.system?.poolProfit || 0; 
      let maxNetLossTolerance; 
      if (poolProfit > 0) maxNetLossTolerance = Math.max(5000, poolProfit * 0.15); 
      else if (poolProfit > -20000) maxNetLossTolerance = 10000; 
      else if (poolProfit > -50000) maxNetLossTolerance = 5000; 
      else maxNetLossTolerance = 3000; 

      const calcSystemLoss = (resultChoice) => { 
        let systemPayout = 0; 
        if (resultChoice === 'red') systemPayout = Math.floor(redAmount * ODDS_WIN); 
        else if (resultChoice === 'blue') systemPayout = Math.floor(blueAmount * ODDS_WIN); 
        else if (resultChoice === 'draw') systemPayout = Math.floor(drawAmount * ODDS_DRAW); 
        return systemPayout - betAmount; 
      }; 

      const netLossMap = { red: calcSystemLoss('red'), blue: calcSystemLoss('blue'), draw: calcSystemLoss('draw') }; 
      const safeProbMap = riskEngine.applyBankruptcyProtection(finalProb, netLossMap, maxNetLossTolerance); 

      const rand = crypto.randomInt(0, 10000) / 10000; // 生成 [0, 1) 的浮点数
      let cumulative = 0; 
      result = 'draw'; 
      if (safeProbMap) { 
        for (const [key, prob] of Object.entries(safeProbMap)) { 
          cumulative += prob; 
          if (rand < cumulative) { 
            result = key; 
            break; 
          } 
        } 
      } else { 
        result = actualChoices.length === 1 ? (actualChoices[0] === 'red' ? 'blue' : 'red') : 'draw'; 
      } 
    } 

    // ==========================================
    // 4. 拆单结算（所有操作带 session）
    // ==========================================
    let totalPayout = 0; 
    const betRecords = []; 
    const roundId = crypto.randomUUID(); 

    if (redAmount > 0) { 
      const payout = calculatePayout('red', redAmount, result); 
      totalPayout += payout; 
      betRecords.push({ userId, roundId, choice: 'red', amount: redAmount, result, payout, netChange: payout > 0 ? payout - redAmount : -redAmount }); 
    } 
    if (drawAmount > 0) { 
      const payout = calculatePayout('draw', drawAmount, result); 
      totalPayout += payout; 
      betRecords.push({ userId, roundId, choice: 'draw', amount: drawAmount, result, payout, netChange: payout > 0 ? payout - drawAmount : -drawAmount }); 
    } 
    if (blueAmount > 0) { 
      const payout = calculatePayout('blue', blueAmount, result); 
      totalPayout += payout; 
      betRecords.push({ userId, roundId, choice: 'blue', amount: blueAmount, result, payout, netChange: payout > 0 ? payout - blueAmount : -blueAmount }); 
    } 

    const netChange = totalPayout - betAmount; 
    const balanceAfterBet = user.balance; // user.balance 已扣除 betAmount

    // ★ 原子加钱（带事务）
    if (totalPayout > 0) { 
      await User.updateOne({ _id: userId }, { $inc: { balance: totalPayout } }, { session }); 
    } 

    // ★ 所有写操作带 session 
    await Bet.insertMany(betRecords, { session }); 
    await Transaction.create([{ userId, type: 'bet_expense', amount: betAmount, balanceAfter: balanceAfterBet, remark: `下注 红${redAmount}/平${drawAmount}/蓝${blueAmount} 共${betAmount}积分`, roundId }], { session }); 
    if (totalPayout > 0) { 
      const winChoices = betRecords.filter(b => b.payout > 0) 
        .map(b => b.choice === 'red' ? '红巨人' : b.choice === 'blue' ? '蓝巨人' : '平局').join('+'); 
      await Transaction.create([{ userId, type: 'bet_win', amount: totalPayout, balanceAfter: balanceAfterBet + totalPayout, remark: `赢得${winChoices}赔付 ${totalPayout}积分`, roundId }], { session }); 
    } 

    // ★ 提交事务 
    await session.commitTransaction(); 
    session.endSession(); 

    // 风控结算（异步，不影响主流程）
    riskEngine.settle(userId, 'giant_racing', betAmount, totalPayout, { choices: actualChoices, }).catch(() => {}); 

    // 清理老旧记录
    cleanupOldRecords(userId).catch(() => {}); 

    // ★★★ 修复：不返回 _risk 风控信息 ★★★
    res.json({ result, win: netChange > 0, payout: totalPayout, balance: balanceAfterBet + totalPayout, netChange, betId: roundId }); 
  } catch (err) { 
    try { await session.abortTransaction(); } catch {} 
    session.endSession(); 
    console.error(`[下注] 错误: ${err.message}`); 
    res.status(500).json({ error: '下注失败，请稍后重试' }); 
  } 
}); 

function calculatePayout(choice, amount, result) { 
  if (choice === result) { 
    return result === 'draw' ? Math.floor(amount * ODDS_DRAW) : Math.floor(amount * ODDS_WIN); 
  } 
  return 0; 
} 

async function cleanupOldRecords(userId) { 
  try { 
    const betCount = await Bet.countDocuments({ userId }); 
    if (betCount > MAX_BET_RECORDS) { 
      const oldIds = (await Bet.find({ userId }).sort({ createdAt: 1 }).limit(betCount - MAX_BET_RECORDS).select('_id')).map(b => b._id); 
      await Bet.deleteMany({ _id: { $in: oldIds } }); 
    } 
  } catch {} 
  try { 
    const txCount = await Transaction.countDocuments({ userId }); 
    if (txCount > MAX_TRANSACTION_RECORDS) { 
      const oldIds = (await Transaction.find({ userId }).sort({ createdAt: 1 }).limit(txCount - MAX_TRANSACTION_RECORDS).select('_id')).map(t => t._id); 
      await Transaction.deleteMany({ _id: { $in: oldIds } }); 
    } 
  } catch {} 
} 

router.get('/balance', authMiddleware, async (req, res) => { 
  const u = await User.findById(req.user.userId).select('balance'); 
  res.json({ balance: u?.balance }); 
}); 

router.get('/history', authMiddleware, async (req, res) => { 
  res.json({ list: await Bet.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(100) }); 
}); 

router.get('/transactions', authMiddleware, async (req, res) => { 
  res.json({ list: await Transaction.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(50) }); 
}); 

export default router;
