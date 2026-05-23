import { ref, computed } from 'vue'
import { useSound } from './useSound.js'
import { useAuth } from './useAuth.js'

// ========== Toast系统 ==========
const toastList = ref([])
let toastId = 0
function showToast(message, type = 'info', duration = 2500) {
  const id = ++toastId
  toastList.value.push({ id, message, type })
  setTimeout(() => {
    toastList.value = toastList.value.filter(t => t.id !== id)
  }, duration)
}
export function useToast() {
  return { toastList, showToast }
}

// ========== 游戏逻辑 ==========
export function useGame() {
  const { soundEnabled, toggleSound, startRunningSound, stopRunningSound, playBoostSound, playFinishSound, playWinSound, playLoseSound, playClickSound, playTapSound } = useSound()
  const { authFetch, refreshUser } = useAuth()

  // ========== 游戏状态 ==========
  const balance = ref(0)
  const choice = ref('')
  const betAmount = ref(100)
  const gamePhase = ref('idle')
  const raceResult = ref(null)
  const history = ref([])
  const transactions = ref([])
  const showResult = ref(false)
  const showHistory = ref(false)
  const showTransactions = ref(false)
  const screenShaking = ref(false)
  const showConfetti = ref(false)

  // ========== 动画状态 ==========
  const redProgress = ref(0)
  const blueProgress = ref(0)
  const redMood = ref('idle')
  const blueMood = ref('idle')
  const showWineRed = ref(false)
  const showWineBlue = ref(false)

  // ========== 帧动画状态（新增：导出帧索引） ==========
  const redFrame = ref(0)
  const blueFrame = ref(0)
  let animationId = null
  let lastFrameTimeRed = 0
  let lastFrameTimeBlue = 0

  // ========== 余额显示 ==========
  const displayBalance = ref(0)
  const balanceAnimating = ref(false)
  let balanceTimer = null
  function animateBalance(target) {
    const start = displayBalance.value
    const diff = target - start
    if (diff === 0) { displayBalance.value = target; return }
    balanceAnimating.value = true
    const steps = 20
    const stepVal = diff / steps
    let step = 0
    if (balanceTimer) clearInterval(balanceTimer)
    balanceTimer = setInterval(() => {
      step++
      displayBalance.value = Math.round(start + stepVal * step)
      if (step >= steps) {
        displayBalance.value = target
        clearInterval(balanceTimer)
        balanceAnimating.value = false
      }
    }, 30)
  }

  // ========== 计算属性 ==========
  const isInsufficient = computed(() => balance.value < 10)
  const canBet = computed(() => choice.value && betAmount.value >= 10 && betAmount.value <= balance.value && gamePhase.value === 'idle')

  // ========== API方法 ==========
  async function fetchBalance() {
    try {
      const res = await authFetch('/api/balance')
      const data = await res.json()
      if (res.ok) {
        balance.value = data.balance
        animateBalance(data.balance)
      }
    } catch (e) {
      console.error('[余额] 获取失败', e)
    }
  }
  async function fetchHistory() {
    try {
      const res = await authFetch('/api/history?limit=50')
      const data = await res.json()
      if (res.ok) history.value = data.list
    } catch (e) {
      console.error('[历史] 获取失败', e)
    }
  }
  async function fetchTransactions() {
    try {
      const res = await authFetch('/api/transactions?limit=50')
      const data = await res.json()
      if (res.ok) transactions.value = data.list
    } catch (e) {
      console.error('[积分明细] 获取失败', e)
    }
  }

  // 🚀 核心修改：接收 BetPanel 传来的 betData
  async function placeBet(betData) {
    const currentChoice = betData?.choice || choice.value
    const currentAmount = betData?.betAmount || betData?.totalBet || betAmount.value
    const currentDetail = betData?.detail || null
    if (!currentChoice || !currentAmount || currentAmount < 10) {
      if (!currentChoice) showToast('请先选择下注对象', 'error')
      else showToast('下注金额不能小于10', 'error')
      return
    }
    if (currentAmount > balance.value) {
      showToast('余额不足', 'error')
      return
    }
    gamePhase.value = 'racing'
    try {
      const payload = { choice: currentChoice, amount: currentAmount, detail: currentDetail }
      console.log('[GiantGame] 发给后端 /api/bet 的数据:', payload)
      const res = await authFetch('/api/bet', { method: 'POST', body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || '下注失败', 'error')
        gamePhase.value = 'idle'
        await fetchBalance()
        return
      }
      startRaceAnimation(data)
    } catch (e) {
      showToast('网络错误，请重试', 'error')
      gamePhase.value = 'idle'
    }
  }

  // 🚀 核心修复：帧动画改为props驱动
  function startRaceAnimation(resultData) {
    const { result } = resultData
    const DURATION = 5000
    const startTime = Date.now()
    startRunningSound()
    const wineTime = 1000 + Math.random() * 2000
    const wineColor = Math.random() > 0.5 ? 'red' : 'blue'
    let wineShown = false
    const loserEnd = 85 + Math.random() * 10

    // 重置帧计时
    lastFrameTimeRed = Date.now()
    lastFrameTimeBlue = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / DURATION, 1)

      // --- 帧动画逻辑：直接更新帧索引 ---
      if (elapsed - lastFrameTimeRed > 120) {
        redFrame.value = (redFrame.value + 1) % 5
        lastFrameTimeRed = elapsed
      }
      if (elapsed - lastFrameTimeBlue > 120) {
        blueFrame.value = (blueFrame.value + 1) % 5
        lastFrameTimeBlue = elapsed
      }

      // --- 位置计算逻辑（保持不变）---
      let redTarget, blueTarget
      if (result === 'draw') {
        redTarget = t * 100
        blueTarget = t * 100
      } else {
        const winner = result
        const loserFinal = loserEnd
        if (t <= 0.6) {
          const phase = t / 0.6
          const base = phase * 55
          const leadSwitch = Math.sin(phase * Math.PI * 4) * 8
          redTarget = base + (winner === 'red' ? leadSwitch : -leadSwitch)
          blueTarget = base + (winner === 'blue' ? leadSwitch : -leadSwitch)
        } else if (t <= 0.8) {
          const phase = (t - 0.6) / 0.2
          const base = 55 + phase * 25
          const gap = phase * (100 - loserFinal) * 0.6
          if (winner === 'red') {
            redTarget = base + gap * 0.5
            blueTarget = base - gap * 0.5
          } else {
            blueTarget = base + gap * 0.5
            redTarget = base - gap * 0.5
          }
        } else {
          const phase = (t - 0.8) / 0.2
          if (winner === 'red') {
            redTarget = 80 + phase * 20
            blueTarget = 80 - (100 - loserFinal) * 0.6 + phase * (loserFinal - (80 - (100 - loserFinal) * 0.6))
          } else {
            blueTarget = 80 + phase * 20
            redTarget = 80 - (100 - loserFinal) * 0.6 + phase * (loserEnd - (80 - (100 - loserFinal) * 0.6))
          }
        }
      }

      redProgress.value = Math.max(0, Math.min(100, redTarget))
      blueProgress.value = Math.max(0, Math.min(100, blueTarget))

      if (!wineShown && elapsed >= wineTime) {
        wineShown = true
        if (wineColor === 'red') showWineRed.value = true
        else showWineBlue.value = true
        playBoostSound()
        setTimeout(() => {
          showWineRed.value = false
          showWineBlue.value = false
        }, 800)
      }

      if (t < 1) {
        animationId = requestAnimationFrame(animate)
      } else {
        onRaceFinish(resultData)
      }
    }

    animationId = requestAnimationFrame(animate)
  }

  function onRaceFinish(resultData) {
    const { result, win } = resultData
    animationId = null
    stopRunningSound()
    playFinishSound()
    if (result === 'red') {
      redMood.value = 'win'
      blueMood.value = 'lose'
    } else if (result === 'blue') {
      blueMood.value = 'win'
      redMood.value = 'lose'
    } else {
      redMood.value = 'win'
      blueMood.value = 'win'
    }
    screenShaking.value = true
    setTimeout(() => {
      screenShaking.value = false
    }, 500)
    if (win) {
      showConfetti.value = true
      setTimeout(() => {
        showConfetti.value = false
      }, 3000)
      playWinSound()
    } else {
      playLoseSound()
    }
    raceResult.value = resultData
    balance.value = resultData.balance
    animateBalance(resultData.balance)
    setTimeout(() => {
      showResult.value = true
      gamePhase.value = 'result'
    }, 500)
    fetchHistory()
    fetchTransactions()
    refreshUser()
  }

  function closeResult() {
    showResult.value = false
    gamePhase.value = 'idle'
    raceResult.value = null
    redMood.value = 'idle'
    blueMood.value = 'idle'
    redProgress.value = 0
    blueProgress.value = 0
    choice.value = ''
  }

  function setBetAmount(val) {
    const num = parseInt(val)
    if (isNaN(num)) return
    if (num < 10) betAmount.value = 10
    else if (num > 8000) betAmount.value = 8000
    else if (num > balance.value) betAmount.value = balance.value
    else betAmount.value = num
  }

  function quickBet(type) {
    playTapSound()
    switch (type) {
      case 10: setBetAmount(10); break
      case 100: setBetAmount(100); break
      case 500: setBetAmount(500); break
      case 1000: setBetAmount(1000); break
      case 'all': setBetAmount(balance.value); break
    }
  }

  function selectChoice(c) {
    playClickSound()
    choice.value = c
  }

  // 清理函数
  function cleanupGame() {
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    if (balanceTimer) {
      clearInterval(balanceTimer)
      balanceTimer = null
    }
    stopRunningSound()
  }

  // 🚀 导出帧索引，供GiantRunner使用
  return {
    balance,
    displayBalance,
    balanceAnimating,
    choice,
    betAmount,
    gamePhase,
    raceResult,
    history,
    transactions,
    showResult,
    showHistory,
    showTransactions,
    isInsufficient,
    redProgress,
    blueProgress,
    redMood,
    blueMood,
    showWineRed,
    showWineBlue,
    screenShaking,
    showConfetti,
    soundEnabled,
    canBet,
    fetchBalance,
    placeBet,
    fetchHistory,
    fetchTransactions,
    closeResult,
    setBetAmount,
    quickBet,
    selectChoice,
    toggleSound,
    playTapSound,
    cleanupGame,
    redFrame,  // 导出红巨人帧
    blueFrame   // 导出蓝巨人帧
  }
}
