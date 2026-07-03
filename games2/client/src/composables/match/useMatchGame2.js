// src/composables/match/useMatchGame2.js
import { ref } from 'vue'
import { useAuth } from '../useAuth.js'
import { useMatchSound } from '../useMatchSound.js'
import { request } from '../request.js'

const boardMap = ref({})
const gameState = ref('idle')
const lastResult = ref(null)
const waveInfo = ref({ wave: 0, waveScore: 0, totalScore: 0 })
const errorMessage = ref('')
const jackpotAmount = ref(0) // ★ 奖池金额
const highlightGroups = ref([]) // ★ 正在连线的分组UID

export function useMatchGame2() {
  const { updateBalance } = useAuth()
  const { playDrop, playEliminate, playEnd, playWin, playLose, playCombo } = useMatchSound()

  // ★★★ 核心动画时长调整 (放慢节奏，增加期待感) ★★★
  const ANIM = {
    INIT_FALL: 1500,
    HIGHLIGHT_LINE: 1000, // 新增：连线嘟嘟嘟时间
    ELIMINATE: 600,       // 消除爆发时间
    FALL: 800,            // 下落时间
    RESULT_DELAY: 500
  }

  // ★ 拉取奖池
  const fetchJackpot = async () => {
    try {
      const res = await request('/api/match/game2/jackpot', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      if (res.ok) { 
        const data = await res.json()
        jackpotAmount.value = data.amount 
      }
    } catch (e) {
      // 忽略奖池拉取错误
    }
  }

  const startGame = async (ticketPrice = 100, retryCount = 0) => {
    if (gameState.value === 'playing') return
    gameState.value = 'playing'
    boardMap.value = {}
    lastResult.value = null
    errorMessage.value = ''
    waveInfo.value = { wave: 0, waveScore: 0, totalScore: 0 }

    try {
      const res = await request('/api/match/game2/bet', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ticketPrice })
      })
      
      if (res.status === 503) {
        if (retryCount < 2) {
          errorMessage.value = `当前游玩人数过多，2秒后自动重试...`
          await new Promise(r => setTimeout(r, 2000))
          return startGame(ticketPrice, retryCount + 1)
        } else {
          throw new Error('当前人数过多，请稍后再试')
        }
      }
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '请求失败')
      
      jackpotAmount.value = data.jackpotAmount || 0 // 同步最新奖池
      await playFrames(data.frames, data)
    } catch (err) {
      errorMessage.value = err.message || '游戏失败，请稍后重试'
      gameState.value = 'idle'
    }
  }

  const playFrames = async (frames, result) => {
    for (const frame of frames) {
      if (frame.type === 'init') {
        await playInit(frame)
      } else if (frame.type === 'wave') {
        await playWave(frame)
      }
    }
    
    if (waveInfo.value.wave > 0) playEnd(waveInfo.value.wave)
    await new Promise(r => setTimeout(r, ANIM.RESULT_DELAY))

    // ★ 构建带有近失提示的结算数据
    const events = result.events || {}
    let nearMissMsg = ''
    if (events.maxSpecialGroup >= 3 && events.treasureTriggers.length === 0 && events.x2Triggers === 0) {
      nearMissMsg = `😱 差1个特殊方块即可触发大奖！`
    }

    lastResult.value = { 
      totalScore: result.totalScore, fee: result.fee, payout: result.payout, 
      netProfit: result.netProfit, ticketPrice: result.ticketPrice, frames: result.frames,
      nearMissMsg, events 
    }
    updateBalance(result.balance)
    gameState.value = 'result'
    
    // ★ 修复：规范 if...else 语法
    if (result.netProfit >= 0) {
      playWin()
    } else {
      playLose()
    }
  }

  const playInit = (frame) => {
    return new Promise(resolve => {
      const map = {}
      frame.blocks.forEach(b => { 
        map[b.uid] = { uid: b.uid, type: b.type, row: b.fromRow, targetRow: b.row, col: b.col, targetCol: b.col, isRemoving: false, isHighlighting: false } 
      })
      boardMap.value = map
      
      requestAnimationFrame(() => { 
        Object.values(boardMap.value).forEach(b => { b.row = b.targetRow })
        boardMap.value = { ...boardMap.value }
      })
      
      setTimeout(() => { 
        playDrop()
        resolve() 
      }, ANIM.INIT_FALL)
    })
  }

  const playWave = (frame) => {
    return new Promise(resolve => {
      // 1. ★ 连线高亮期 (嘟嘟嘟) ★
      highlightGroups.value = frame.eliminatedGroups || []
      const allUids = highlightGroups.value.flat().map(b => b.uid)
      allUids.forEach(uid => { 
        if(boardMap.value[uid]) boardMap.value[uid].isHighlighting = true 
      })
      boardMap.value = { ...boardMap.value }
      
      if (playCombo) playCombo(frame.wave) // 播放连击音效
      
      setTimeout(() => {
        // 2. ★ 消除爆发期 ★
        allUids.forEach(uid => { 
          if(boardMap.value[uid]) { 
            boardMap.value[uid].isHighlighting = false
            boardMap.value[uid].isRemoving = true 
          } 
        })
        boardMap.value = { ...boardMap.value }
        playEliminate(frame.wave)
        highlightGroups.value = []

        setTimeout(() => {
          // 3. 移除消除的方块
          allUids.forEach(uid => { delete boardMap.value[uid] })
          
          // 4. 移动方块 (下落 + 横向列收缩)
          frame.moves.forEach(m => {
            const block = boardMap.value[m.uid]
            if (block) {
              if (m.fromRow !== undefined) block.row = m.fromRow
              if (m.toRow !== undefined) block.targetRow = m.toRow
              if (m.fromCol !== undefined) block.col = m.fromCol
              if (m.toCol !== undefined) block.targetCol = m.toCol
            }
          })
          boardMap.value = { ...boardMap.value }
          
          requestAnimationFrame(() => {
            Object.values(boardMap.value).forEach(b => {
              if (b.targetRow !== undefined && b.row !== b.targetRow) b.row = b.targetRow
              if (b.targetCol !== undefined && b.col !== b.targetCol) b.col = b.targetCol
            })
            boardMap.value = { ...boardMap.value }
          })

          waveInfo.value = { wave: frame.wave, waveScore: frame.waveScore, totalScore: frame.totalScore }
          
          setTimeout(() => { 
            playDrop()
            resolve() 
          }, ANIM.FALL)
        }, ANIM.ELIMINATE)
      }, ANIM.HIGHLIGHT_LINE) // 停留1秒让用户看清连线
    })
  }

  const closeResult = () => { 
    gameState.value = 'idle'
    lastResult.value = null
    boardMap.value = {}
    waveInfo.value = { wave: 0, waveScore: 0, totalScore: 0 }
  }

  return { boardMap, gameState, lastResult, waveInfo, errorMessage, jackpotAmount, highlightGroups, startGame, fetchJackpot, closeResult }
}
