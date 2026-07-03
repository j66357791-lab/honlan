import { ref, reactive } from 'vue'
import { TALENT_POOL } from '../data/talents'
import { SHOP_ITEMS } from '../data/shop'
import { EVENT_POOL } from '../data/events'
import { BACKGROUNDS } from '../data/backgrounds.js'

const STORAGE_KEY_MERIT = 'cycle_game_merit'

export function useReincarnationCore() {
  // --- 全局状态 ---
  const totalMerit = ref(parseInt(localStorage.getItem(STORAGE_KEY_MERIT) || '0'))
  const gamePhase = ref('shop') 
  
  const player = reactive({
    gender: 'male',
    age: 0,
    month: 0, 
    isAlive: true,
    background: null, 
    hometown: '',
    parents: {},
    stats: { str: 0, int: 0, chr: 0, con: 0, luck: 0 },
    money: 0,
    health: 100,
    mood: 50,
    maxHealth: 100,
    talents: [],
    inventory: []
  })

  const currentEvent = ref(null)
  const yearlyLog = ref([])

  // ========== 存档系统 ==========

  const getSaveSlots = () => {
    const slots = []
    for (let i = 1; i <= 3; i++) {
      const data = localStorage.getItem(`cycle_save_slot_${i}`)
      if (data) {
        try {
          const parsed = JSON.parse(data)
          slots.push({
            index: i,
            exists: true,
            timestamp: parsed.timestamp,
            desc: `${parsed.player.age}岁${parsed.player.month}个月 - ${parsed.player.background?.name}`,
            preview: parsed.player.background?.location
          })
        } catch (e) {
          slots.push({ index: i, exists: false })
        }
      } else {
        slots.push({ index: i, exists: false })
      }
    }
    return slots
  }

  const saveGameToSlot = (slotIndex) => {
    const saveData = {
      timestamp: new Date().toLocaleString(),
      totalMerit: totalMerit.value,
      gamePhase: gamePhase.value,
      player: JSON.parse(JSON.stringify(player)),
      yearlyLog: yearlyLog.value
    }
    localStorage.setItem(`cycle_save_slot_${slotIndex}`, JSON.stringify(saveData))
    localStorage.setItem(STORAGE_KEY_MERIT, totalMerit.value)
    return true
  }

  const loadGameFromSlot = (slotIndex) => {
    const dataStr = localStorage.getItem(`cycle_save_slot_${slotIndex}`)
    if (!dataStr) return false
    try {
      const saveData = JSON.parse(dataStr)
      gamePhase.value = saveData.gamePhase
      
      // 深度合并，防止属性丢失
      Object.assign(player, saveData.player)
      
      totalMerit.value = saveData.totalMerit
      yearlyLog.value = saveData.yearlyLog || []
      
      // 确保功德也是最新的
      localStorage.setItem(STORAGE_KEY_MERIT, totalMerit.value)
      return true
    } catch (e) {
      return false
    }
  }

  const hardReset = () => {
    localStorage.clear()
    window.location.reload()
  }

  // ========== 动作决策系统 ==========

  const getAvailableActions = () => {
    const totalMonths = player.age * 12 + player.month
    if (totalMonths < 12) {
      return [
        { id: 'drink_milk', label: '喝奶睡觉', effect: { con: 0.5, health: 2 }, mood: 2 },
        { id: 'crawl', label: '尝试爬行', effect: { str: 0.5 }, mood: 1 },
        { id: 'listen_music', label: '听曲儿', effect: { int: 0.2, chr: 0.5 }, mood: 3 }
      ]
    }
    if (totalMonths < 36) {
      return [
        { id: 'play_mud', label: '玩泥巴', effect: { str: 0.5, con: 0.5 }, mood: 3 },
        { id: 'listen_story', label: '听故事', effect: { int: 0.5 }, mood: 2 },
        { id: 'run_around', label: '到处乱跑', effect: { dex: 0.5 }, mood: 2 }
      ]
    }
    if (totalMonths < 84) {
      return [
        { id: 'help_house', label: '帮做家务', effect: { str: 0.5, int: 0.5 }, mood: 1 },
        { id: 'read_basic', label: '看启蒙书', effect: { int: 1 }, mood: -1 },
        { id: 'play_friends', label: '找朋友玩', effect: { chr: 1 }, mood: 4 }
      ]
    }
    return [
      { id: 'study', label: '寒窗苦读', effect: { int: 1 }, mood: -2 },
      { id: 'exercise', label: '强身健体', effect: { str: 1, con: 1 }, mood: -3 },
      { id: 'social', label: '外出交际', effect: { chr: 1, luck: 0.5 }, mood: 1, cost: 10 }
    ]
  }

  // ========== 投胎逻辑 ==========

  const startNewLife = (gender) => {
    player.gender = gender
    player.age = 0
    player.month = 0
    player.isAlive = true
    player.health = 100
    player.mood = 50
    player.talents = []
    
    const randomBg = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)]
    player.background = randomBg
    player.hometown = randomBg.location
    player.parents = { father: randomBg.father, mother: randomBg.mother }

    Object.keys(player.stats).forEach(key => player.stats[key] = Math.floor(Math.random() * 10) + 1)
    
    if (randomBg.baseStats) {
      Object.keys(randomBg.baseStats).forEach(key => {
        if (player.stats[key] !== undefined) player.stats[key] += randomBg.baseStats[key]
      })
    }

    player.money = randomBg.startMoney || 0
    
    const talentCount = Math.floor(Math.random() * 3) + 1
    for(let i=0; i<talentCount; i++) {
      const randomTalent = TALENT_POOL[Math.floor(Math.random() * TALENT_POOL.length)]
      player.talents.push(randomTalent)
    }

    gamePhase.value = 'living'
    
    // 🆕 自动存档到槽位1
    saveGameToSlot(1)
  }

  // ========== 游戏循环 ==========

  const passMonth = (actionId) => {
    if (!player.isAlive) return

    const actions = getAvailableActions()
    const currentAction = actions.find(a => a.id === actionId)
    
    if (currentAction) {
      if (currentAction.cost) {
        if (player.money >= currentAction.cost) {
          player.money -= currentAction.cost
        } else {
          player.mood -= 5
          yearlyLog.value.unshift(`${player.age}岁${player.month+1}月: 想去${currentAction.label}，但囊中羞涩。`)
        }
      }

      if (currentAction.effect) {
        Object.keys(currentAction.effect).forEach(key => {
          if (player.stats[key] !== undefined) player.stats[key] += currentAction.effect[key]
          if (key === 'health' || key === 'mood') player[key] += currentAction.effect[key]
        })
      }
    }

    player.month++
    if (player.month >= 12) {
      player.month = 0
      player.age++
      player.maxHealth = 100 + (player.stats.con * 2) - (player.age > 50 ? (player.age - 50) : 0)
    }

    const totalMonths = player.age * 12 + player.month
    const potentialEvents = EVENT_POOL.filter(e => {
      const min = e.minAge ? e.minAge * 12 : 0
      const max = e.maxAge ? e.maxAge * 12 : 1200
      if (totalMonths < min || totalMonths > max) return false
      if (e.condition && !e.condition(player)) return false
      return Math.random() < (e.chance || 0.05) 
    })

    if (potentialEvents.length > 0) {
      currentEvent.value = potentialEvents[Math.floor(Math.random() * potentialEvents.length)]
    } else {
      currentEvent.value = null
    }

    // 👇 修复Bug：移除了错误的年龄判定。目前只看健康值。
    // 如果健康归零，或者年龄超过120岁（简单的老死判定），则死亡
    if (player.health <= 0 || player.age > 120) {
      player.isAlive = false
      gamePhase.value = 'dead'
      const meritGain = player.age * 10 + player.stats.int * 5
      totalMerit.value += meritGain
      localStorage.setItem(STORAGE_KEY_MERIT, totalMerit.value)
    }
    
    // 🆕 每月结束自动存档
    saveGameToSlot(1)
  }

  const handleEventChoice = (choiceIndex) => {
    const evt = currentEvent.value
    const choice = evt.choices[choiceIndex]
    let passed = choice.check ? choice.check(player) : true
    const result = passed ? choice.success : choice.fail
    
    if (result.effect) {
      if (result.effect.money) player.money += result.effect.money
      if (result.effect.health) player.health += result.effect.health
      if (result.effect.mood) player.mood += result.effect.mood
    }
    
    yearlyLog.value.unshift(`${player.age}岁${player.month+1}月: ${result.text}`)
    currentEvent.value = null
    saveGameToSlot(1) // 事件后也存档
  }

  const buyItem = (item) => {
    if (totalMerit.value >= item.price) {
      totalMerit.value -= item.price
      localStorage.setItem(STORAGE_KEY_MERIT, totalMerit.value)
      player.inventory.push(item.id)
      return true
    }
    return false
  }

  const restartGame = () => {
    player.inventory = [] 
    gamePhase.value = 'shop'
  }

  return {
    gamePhase, player, totalMerit, currentEvent, yearlyLog, shopItems: SHOP_ITEMS,
    buyItem, startNewLife, passMonth, handleEventChoice, restartGame,
    getSaveSlots, saveGameToSlot, loadGameFromSlot, hardReset,
    getAvailableActions
  }
}
