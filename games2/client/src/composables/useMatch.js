// src/composables/useMatch.js
import { ref } from 'vue'
import { useAuth } from './useAuth.js'
import { useMatchSound } from './useMatchSound.js'

const boardMap = ref({})
const gameState = ref('idle')
const lastResult = ref(null)
const waveInfo = ref({ wave: 0, waveScore: 0, totalScore: 0 })
const errorMessage = ref('')

export function useMatch() {
  const { updateBalance } = useAuth()
  const { playDrop, playEliminate, playEnd, playWin, playLose } = useMatchSound()

  const ANIM = {
    INIT_FALL: 1500,
    ELIMINATE: 800,
    FALL: 1000,
    RESULT_DELAY: 500
  }

  // ★ 修改：接收 ticketPrice 参数
  const startGame = async (ticketPrice = 100) => {
    if (gameState.value === 'playing') return
    gameState.value = 'playing'
    boardMap.value = {}
    lastResult.value = null
    errorMessage.value = ''
    waveInfo.value = { wave: 0, waveScore: 0, totalScore: 0 }

    try {
      const res = await fetch('/api/match/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        // ★ 修改：将门票价格发送给后端
        body: JSON.stringify({ ticketPrice })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '请求失败')
      }

      await playFrames(data.frames, data)
    } catch (err) {
      errorMessage.value = err.message || '游戏失败，请稍后重试'
      gameState.value = 'idle'
    }
  }

  // ... 下面的代码与之前完全一致，不需要改动
  const playFrames = async (frames, result) => {
    for (const frame of frames) {
      if (frame.type === 'init') {
        await playInit(frame)
      } else if (frame.type === 'wave') {
        await playWave(frame)
      }
    }

    if (waveInfo.value.wave > 0) {
      playEnd(waveInfo.value.wave)
    }

    await new Promise(r => setTimeout(r, ANIM.RESULT_DELAY))

    lastResult.value = {
      totalScore: result.totalScore,
      fee: result.fee,
      payout: result.payout,
      netProfit: result.netProfit,
      ticketPrice: result.ticketPrice // ★ 新增：保存门票价格给弹窗用
    }
    updateBalance(result.balance)

    gameState.value = 'result'
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
        map[b.uid] = {
          uid: b.uid,
          type: b.type,
          row: b.fromRow,
          targetRow: b.row,
          col: b.col,
          isRemoving: false
        }
      })

      boardMap.value = map

      requestAnimationFrame(() => {
        Object.values(boardMap.value).forEach(b => {
          b.row = b.targetRow
        })
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
      frame.eliminated.forEach(e => {
        if (boardMap.value[e.uid]) {
          boardMap.value[e.uid].isRemoving = true
        }
      })
      boardMap.value = { ...boardMap.value }

      playEliminate(frame.wave)

      setTimeout(() => {
        frame.eliminated.forEach(e => {
          delete boardMap.value[e.uid]
        })

        frame.moves.forEach(m => {
          const block = boardMap.value[m.uid]
          if (block) {
            block.row = m.fromRow
            block.targetRow = m.toRow
          }
        })

        frame.newBlocks.forEach(b => {
          boardMap.value[b.uid] = {
            uid: b.uid,
            type: b.type,
            row: b.fromRow,
            targetRow: b.row,
            col: b.col,
            isRemoving: false
          }
        })

        boardMap.value = { ...boardMap.value }

        requestAnimationFrame(() => {
          Object.values(boardMap.value).forEach(b => {
            if (b.targetRow !== undefined && b.row !== b.targetRow) {
              b.row = b.targetRow
            }
          })
          boardMap.value = { ...boardMap.value }
        })

        waveInfo.value = {
          wave: frame.wave,
          waveScore: frame.waveScore,
          totalScore: frame.totalScore
        }

        setTimeout(() => {
          playDrop()
          resolve()
        }, ANIM.FALL)
      }, ANIM.ELIMINATE)
    })
  }

  const closeResult = () => {
    gameState.value = 'idle'
    lastResult.value = null
    boardMap.value = {}
    waveInfo.value = { wave: 0, waveScore: 0, totalScore: 0 }
  }

  return {
    boardMap,
    gameState,
    lastResult,
    waveInfo,
    errorMessage,
    startGame,
    closeResult
  }
}
