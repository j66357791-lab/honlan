/**
 * 巨人赛跑 - 游戏逻辑组合函数 v3.0
 * 核心改进：
 * 1. 动画与后端结果严格同步（先拿结果再播动画）
 * 2. 跑步帧动画用JS定时器切换img src
 * 3. 5秒预定动画编排 + 悬念制造
 */
import { ref, computed } from 'vue'
import { useSound } from './useSound.js'
import { useAuth } from './useAuth.js'

// ========== Toast系统 ==========
const toastList = ref([])
let toastId = 0
function showToast(message, type = 'info', duration = 2500) {
  const id = ++toastId
  toastList.value.push({ id, message, type })
  setTimeout(() => { toastList.value = toastList.value.filter(t => t.id !== id) }, duration)
}
export function useToast() { return { toastList, showToast } }

// ========== 游戏逻辑 ==========
export function useGame() {
  const { soundEnabled, toggleSound, startRunningSound, stopRunningSound, playBoostSound, playFinishSound, playWinSound, playLoseSound, playClickSound, playTapSound } = useSound()
  const { authFetch, refreshUser } = useAuth()

  // ========== 游戏状态 ==========
  const balance = ref(0)
  const choice = ref('')
  const betAmount = ref(100)
  const gamePhase = ref('idle')       // idle / racing / result
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
  const redMood = ref('idle')   // idle / running / win / lose
  const blueMood = ref('idle')
  const showWineRed = ref(false)
  const showWineBlue = ref(false)

  // ========== 跑步帧动画定时器 ==========
  let redFrameTimer = null
  let blueFrameTimer = null
  let redFrame = 0
  let blueFrame = 0

  // 启动跑步帧动画（通过CustomEvent通知GiantRunner组件切换图片）
  function startFrameAnimation(color) {
    console.log(`[动画] 启动${color === 'red' ? '红' : '蓝'}巨人帧动画`)
    const frameEvent = new CustomEvent(`giant-frame-${color}`)
    if (color === 'red') {
      redFrame = 0
      redFrameTimer = setInterval(() => {
        redFrame = (redFrame + 1) % 5
        window.dispatchEvent(new CustomEvent(`giant-frame-red`, { detail: redFrame }))
      }, 120)
    } else {
      blueFrame = 0
      blueFrameTimer = setInterval(() => {
        blueFrame = (blueFrame + 1) % 5
        window.dispatchEvent(new CustomEvent(`giant-frame-blue`, { detail: blueFrame }))
      }, 120)
    }
  }

  function stopFrameAnimation(color) {
    if (color === 'red' && redFrameTimer) {
      clearInterval(redFrameTimer); redFrameTimer = null
    }
    if (color === 'blue' && blueFrameTimer) {
      clearInterval(blueFrameTimer); blueFrameTimer = null
    }
  }

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
        console.log(`[余额] ${data.balance}`)
      }
    } catch (e) { console.error('[余额] 获取失败', e) }
  }

  async function fetchHistory() {
    try {
      const res = await authFetch('/api/history?limit=50')
      const data = await res.json()
      if (res.ok) {
        history.value = data.list
        console.log(`[历史] 获取${data.list.length}条记录`)
      }
    } catch (e) { console.error('[历史] 获取失败', e) }
  }

  async function fetchTransactions() {
    try {
      const res = await authFetch('/api/transactions?limit=50')
      const data = await res.json()
      if (res.ok) {
        transactions.value = data.list
        console.log(`[积分明细] 获取${data.list.length}条记录`)
      }
    } catch (e) { console.error('[积分明细] 获取失败', e) }
  }

  /**
   * 下注 - 核心方法
   * 先调API拿结果，再启动5秒动画
   */
  async function placeBet() {
    if (!canBet.value) {
      console.log(`[下注] 条件不满足: choice=${choice.value}, amount=${betAmount.value}, balance=${balance.value}, phase=${gamePhase.value}`)
      if (!choice.value) showToast('请先选择下注对象', 'error')
      else if (betAmount.value > balance.value) showToast('余额不足', 'error')
      return
    }

    console.log(`[下注] 开始: choice=${choice.value}, amount=${betAmount.value}`)
    gamePhase.value = 'racing'

    try {
      // 1. 调用后端API获取结果
      const res = await authFetch('/api/bet', {
        method: 'POST',
        body: JSON.stringify({ choice: choice.value, amount: betAmount.value })
      })
      const data = await res.json()

      if (!res.ok) {
        console.error(`[下注] 失败: ${data.error}`)
        showToast(data.error || '下注失败', 'error')
        gamePhase.value = 'idle'
        await fetchBalance()
        return
      }

      console.log(`[下注] 结果: result=${data.result}, win=${data.win}, payout=${data.payout}, netChange=${data.netChange}`)

      // 2. 启动5秒动画，动画与后端结果严格同步
      startRaceAnimation(data)

    } catch (e) {
      console.error('[下注] 网络错误', e)
      showToast('网络错误，请重试', 'error')
      gamePhase.value = 'idle'
    }
  }

  /**
   * 5秒预定动画编排 - 与后端结果严格同步
   * 0-3秒：两人交替领先（悬念）
   * 3-4秒：根据结果拉开差距
   * 第5秒：获胜方冲线
   */
  function startRaceAnimation(resultData) {
    const { result } = resultData
    const DURATION = 5000  // 5秒
    const startTime = Date.now()

    // 启动跑步帧动画
    startFrameAnimation('red')
    startFrameAnimation('blue')
    startRunningSound()

    // 随机道具出现时间
    const wineTime = 1000 + Math.random() * 2000
    const wineColor = Math.random() > 0.5 ? 'red' : 'blue'
    let wineShown = false

    // 确定最终进度目标
    const loserEnd = 85 + Math.random() * 10  // 85-95%

    console.log(`[动画] 开始: result=${result}, 败方终点=${loserEnd.toFixed(1)}%`)

    const animate = () => {
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / DURATION, 1)  // 0~1

      let redTarget, blueTarget

      if (result === 'draw') {
        // 平局：两人完全同步
        redTarget = t * 100
        blueTarget = t * 100
      } else {
        const winner = result  // 'red' 或 'blue'
        const loserFinal = loserEnd

        if (t <= 0.6) {
          // 0-3秒：交替领先，制造悬念
          const phase = t / 0.6  // 0~1
          const base = phase * 55  // 0~55%
          // 交替领先：用正弦波制造来回
          const leadSwitch = Math.sin(phase * Math.PI * 4) * 8
          redTarget = base + (winner === 'red' ? leadSwitch : -leadSwitch)
          blueTarget = base + (winner === 'blue' ? leadSwitch : -leadSwitch)
        } else if (t <= 0.8) {
          // 3-4秒：根据结果拉开差距
          const phase = (t - 0.6) / 0.2  // 0~1
          const base = 55 + phase * 25  // 55~80%
          const gap = phase * (100 - loserFinal) * 0.6  // 逐渐拉开
          if (winner === 'red') {
            redTarget = base + gap * 0.5
            blueTarget = base - gap * 0.5
          } else {
            blueTarget = base + gap * 0.5
            redTarget = base - gap * 0.5
          }
        } else {
          // 4-5秒：冲线
          const phase = (t - 0.8) / 0.2  // 0~1
          if (winner === 'red') {
            redTarget = 80 + phase * 20  // 80->100
            blueTarget = 80 - (100 - loserFinal) * 0.6 + phase * (loserFinal - (80 - (100 - loserFinal) * 0.6))
          } else {
            blueTarget = 80 + phase * 20
            redTarget = 80 - (100 - loserFinal) * 0.6 + phase * (loserEnd - (80 - (100 - loserFinal) * 0.6))
          }
        }
      }

      // 限制范围
      redProgress.value = Math.max(0, Math.min(100, redTarget))
      blueProgress.value = Math.max(0, Math.min(100, blueTarget))

      // 道具显示
      if (!wineShown && elapsed >= wineTime) {
        wineShown = true
        if (wineColor === 'red') showWineRed.value = true
        else showWineBlue.value = true
        playBoostSound()
        setTimeout(() => { showWineRed.value = false; showWineBlue.value = false }, 800)
      }

      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        // 动画结束
        onRaceFinish(resultData)
      }
    }

    requestAnimationFrame(animate)
  }

  /**
   * 比赛结束处理
   */
  function onRaceFinish(resultData) {
    const { result, win, payout, netChange } = resultData
    console.log(`[动画] 结束: result=${result}, win=${win}, netChange=${netChange}`)

    // 停止跑步帧动画
    stopFrameAnimation('red')
    stopFrameAnimation('blue')
    stopRunningSound()
    playFinishSound()

    // 设置巨人表情
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

    // 震屏
    screenShaking.value = true
    setTimeout(() => { screenShaking.value = false }, 500)

    // 赢了放彩带
    if (win) {
      showConfetti.value = true
      setTimeout(() => { showConfetti.value = false }, 3000)
      playWinSound()
    } else {
      playLoseSound()
    }

    // 更新余额
    raceResult.value = resultData
    balance.value = resultData.balance
    animateBalance(resultData.balance)

    // 显示结果弹窗
    setTimeout(() => {
      showResult.value = true
      gamePhase.value = 'result'
    }, 500)

    // 刷新历史和积分明细
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

  function selectChoice(c) { playClickSound(); choice.value = c }

  return {
    balance, displayBalance, balanceAnimating, choice, betAmount, gamePhase, raceResult,
    history, transactions, showResult, showHistory, showTransactions, isInsufficient,
    redProgress, blueProgress, redMood, blueMood, showWineRed, showWineBlue,
    screenShaking, showConfetti, soundEnabled, canBet,
    fetchBalance, placeBet, fetchHistory, fetchTransactions, closeResult,
    setBetAmount, quickBet, selectChoice, toggleSound, playTapSound
  }
}
