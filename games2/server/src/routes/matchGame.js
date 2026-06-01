// src/routes/matchGame.js
import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import MatchBet from '../models/MatchBet.js';
import Transaction from '../models/Transaction.js';
import MatchStats from '../models/MatchStats.js';
import { authMiddleware } from '../middleware/auth.js';
import crypto from 'crypto';
import { initBoardPool, drawTier, getBoard, updateLiveRTP } from '../services/BoardPool.js';
import { TURNOVER_RATE } from '../config/redPacket.js';
import appLogger from '../utils/logger.js'; // ★ 引入日志

const router = Router();

// ========== 游戏配置 ==========
const ALLOWED_PRICES = [5000, 20000, 100000, 500000]; // ★ 新档位：5k, 2w, 10w, 50w
const BOARD_SIZE = 8;
const ELEMENT_TYPES = 5;
const BASE_SCORE = 2.0;
const SCORE_MULTIPLIER = 4.0;
const FEE_RATE = 0.10;
const MAX_WAVES = 50; // ★★★ 新增：最大连消波数，防止极端情况死循环卡死服务器

const getLengthMultiplier = (L) => {
  if (L === 3) return 1.0;
  if (L === 4) return 1.5;
  if (L === 5) return 2.0;
  if (L >= 6) return 3.0;
  return 1.0;
};

const getComboMultiplier = (n) => 1 + (n - 1) * 0.15;

const calculateFee = (totalScore, ticketPrice) => {
  if (totalScore <= ticketPrice) return 0;
  return Math.ceil((totalScore - ticketPrice) * FEE_RATE);
};

const findMatches = (board) => {
  const matches = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    let c = 0;
    while (c < BOARD_SIZE) {
      let endC = c + 1;
      while (endC < BOARD_SIZE && board[r][endC]?.type === board[r][c]?.type) endC++;
      if (endC - c >= 3) {
        const group = [];
        for (let i = c; i < endC; i++) group.push([r, i]);
        matches.push(group);
      }
      c = endC;
    }
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    let r = 0;
    while (r < BOARD_SIZE) {
      let endR = r + 1;
      while (endR < BOARD_SIZE && board[endR][c]?.type === board[r][c]?.type) endR++;
      if (endR - r >= 3) {
        const group = [];
        for (let i = r; i < endR; i++) group.push([i, c]);
        matches.push(group);
      }
      r = endR;
    }
  }
  return matches;
};

function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return (h1^h2^h3^h4) >>> 0;
}

function sfc32(a, b, c, d) {
  return function() {
    a |= 0; b |= 0; c |= 0; d |= 0;
    let t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

const createRNG = (seedStr) => {
  const hash = cyrb128(seedStr);
  return sfc32(hash, hash, hash, hash);
};

const simulateGame = (ticketPrice, initSeed) => {
  let blockIdCounter = 0;
  const nextBlockId = () => ++blockIdCounter;
  const createBlock = (row, col, type) => ({ uid: nextBlockId(), type, row, col });

  let rng = createRNG(initSeed);
  const getRandomType = () => Math.floor(rng() * ELEMENT_TYPES) + 1;

  const generateBoard = () => {
    const board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(null));
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        board[r][c] = createBlock(r, c, getRandomType());
    return board;
  };

  let board;
  let attempts = 0;
  do {
    board = generateBoard();
    attempts++;
  } while (findMatches(board).length === 0 && attempts < 100);

  const frames = [];
  let rawTotal = 0;
  let wave = 0;
  const scoreRatio = ticketPrice / 100;
  const newBlockSeeds = [];

  const initBlocks = board.flat().map(b => ({
    uid: b.uid, type: b.type, row: b.row, col: b.col,
    fromRow: -(BOARD_SIZE + Math.floor(rng() * 4))
  }));
  frames.push({ type: 'init', blocks: initBlocks });

  while (true) {
    const matches = findMatches(board);
    // ★★★ 核心修复：增加 wave 上限判断，防止无限连消卡死进程 ★★★
    if (matches.length === 0 || wave >= MAX_WAVES) break; 
    
    wave++;
    const waveSeed = `${initSeed}-w${wave}`;
    newBlockSeeds.push(waveSeed);
    let waveRng = createRNG(waveSeed);
    const getWaveRandomType = () => Math.floor(waveRng() * ELEMENT_TYPES) + 1;

    const eliminated = new Set();
    let rawWaveScore = 0;
    matches.forEach(group => {
      rawWaveScore += group.length * BASE_SCORE * getLengthMultiplier(group.length);
      group.forEach(([r, c]) => eliminated.add(`${r}-${c}`));
    });

    rawWaveScore = Math.floor(rawWaveScore * getComboMultiplier(wave));
    rawTotal += rawWaveScore;

    const displayWaveScore = Math.floor(rawWaveScore * SCORE_MULTIPLIER * scoreRatio);
    const displayTotal = Math.floor(rawTotal * SCORE_MULTIPLIER * scoreRatio);

    const eliminatedBlocks = [];
    for (const key of eliminated) {
      const [r, c] = key.split('-').map(Number);
      eliminatedBlocks.push({ uid: board[r][c].uid, row: r, col: c, type: board[r][c].type });
    }

    const moves = [];
    const newBlocks = [];
    const nextBoard = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(null));

    for (let c = 0; c < BOARD_SIZE; c++) {
      let writeRow = BOARD_SIZE - 1;
      for (let r = BOARD_SIZE - 1; r >= 0; r--) {
        if (!eliminated.has(`${r}-${c}`)) {
          const block = board[r][c];
          nextBoard[writeRow][c] = { uid: block.uid, type: block.type, row: writeRow, col: c };
          if (r !== writeRow) moves.push({ uid: block.uid, type: block.type, fromRow: r, toRow: writeRow, col: c });
          writeRow--;
        }
      }
      const emptyCount = writeRow + 1;
      for (let i = 0; i < emptyCount; i++) {
        const nb = createBlock(writeRow, c, getWaveRandomType());
        nextBoard[writeRow][c] = nb;
        newBlocks.push({ uid: nb.uid, type: nb.type, row: nb.row, col: c, fromRow: -(emptyCount - i) });
        writeRow--;
      }
    }

    frames.push({
      type: 'wave', wave, waveScore: displayWaveScore, totalScore: displayTotal,
      eliminated: eliminatedBlocks, moves, newBlocks
    });
    board = nextBoard;
  }

  const totalScore = Math.floor(rawTotal * SCORE_MULTIPLIER * scoreRatio);
  return { frames, totalScore, waves: wave, initSeed, newBlockSeeds };
};

initBoardPool(simulateGame);

router.post('/bet', authMiddleware, async (req, res) => {
  const startTime = Date.now(); // ★ 计时开始
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.userId;
    const ticketPrice = Number(req.body.ticketPrice) || 100;

    if (!ALLOWED_PRICES.includes(ticketPrice)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: '无效的门票金额' });
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, banned: false, balance: { $gte: ticketPrice } },
      { $inc: { balance: -ticketPrice, totalBetAmount: Math.floor(ticketPrice * TURNOVER_RATE.match) } },
      { new: true, session, runValidators: true }
    );

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      const checkUser = await User.findById(userId);
      if (!checkUser) return res.status(404).json({ error: '用户不存在' });
      if (checkUser.banned) return res.status(403).json({ error: '账号已被封禁' });
      return res.status(400).json({ error: '积分不足' });
    }

    appLogger.info(`[消消乐-耗时1] 数据库扣款耗时: ${Date.now() - startTime}ms`);
    const balanceAfterBet = user.balance;
    
    const tier = drawTier();
    let result = getBoard(tier);

    if (!result) {
      await session.abortTransaction();
      session.endSession();
      return res.status(503).json({ error: '当前游玩人数过多，请稍后再试' });
    }

    if (ticketPrice !== 100) {
      const ratio = ticketPrice / 100;
      result.totalScore = Math.floor(result.totalScore * ratio);
      result.frames.forEach(frame => {
        if (frame.type === 'wave') {
          frame.waveScore = Math.floor(frame.waveScore * ratio);
          frame.totalScore = Math.floor(frame.totalScore * ratio);
        }
      });
    }

    const { totalScore, frames, initSeed, newBlockSeeds, waves } = result;
    const fee = calculateFee(totalScore, ticketPrice);
    const payout = totalScore - fee;
    const netProfit = payout - ticketPrice;
    let finalBalance = balanceAfterBet;

    appLogger.info(`[消消乐-耗时2] 取棋盘耗时: ${Date.now() - startTime}ms`);

    // ★ 优化事务写入：提前组装数据，使用 insertMany
    const transactionsToCreate = [
      { userId, type: 'bet_expense', amount: ticketPrice, balanceAfter: balanceAfterBet, remark: `消消乐门票 -${ticketPrice}`, gameType: 'match' }
    ];
    if (payout > 0) {
      finalBalance = balanceAfterBet + payout;
      transactionsToCreate.push(
        { userId, type: 'bet_win', amount: payout, balanceAfter: finalBalance, remark: `消消乐派彩 +${payout}${fee > 0 ? ` (手续费-${fee})` : ''}`, gameType: 'match' }
      );
    }

    await Transaction.insertMany(transactionsToCreate, { session, ordered: true });
    await MatchBet.insertMany([{ 
      userId, roundId: crypto.randomUUID(), ticketPrice, totalScore, netProfit, waves, initSeed, newBlockSeeds 
    }], { session, ordered: true });

    // 加钱操作紧跟流水之后
    if (payout > 0) {
      await User.updateOne({ _id: userId }, { $inc: { balance: payout } }, { session });
    }

    await session.commitTransaction();
    session.endSession();

    appLogger.info(`[消消乐-总耗时] 本局总耗时: ${Date.now() - startTime}ms`);

    res.json({ totalScore, fee, payout, netProfit, balance: finalBalance, ticketPrice, frames });

    // ★ 非核心操作移到事务外异步执行
    updateLiveRTP(ticketPrice, payout);
    MatchStats.findByIdAndUpdate('global', { $inc: { totalWagered: ticketPrice, totalPayout: payout, totalGames: 1 } }, { upsert: true }).exec().catch(() => {});

  } catch (err) {
    try { await session.abortTransaction(); } catch {}
    session.endSession();
    appLogger.error(`[消消乐] ❌ 异常: ${err.message}`);
    if (!res.headersSent) res.status(500).json({ error: '游戏失败，请稍后重试' });
  }
});

export default router;
