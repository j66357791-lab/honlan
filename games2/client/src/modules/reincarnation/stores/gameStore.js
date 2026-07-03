import { reactive, ref } from 'vue'

export const useGameStore = () => {
  // UI 状态
  const gamePhase = ref('shop') // shop, living, dead
  const totalMerit = ref(parseInt(localStorage.getItem('cycle_game_merit') || '0'))
  const currentEvent = ref(null)
  const monthlyLog = ref([])

  // 玩家核心数据
  const player = reactive({
    gender: 'male',
    age: 0,
    month: 0,
    isAlive: true,
    
    // 背景
    background: null,
    hometown: '',
    
    // 属性
    stats: { str: 0, int: 0, chr: 0, con: 0, luck: 0 },
    health: 100,
    mood: 50,
    
    // 资产
    money: 0,
    inventory: [],
    
    // 🆕 家庭系统
    family: {
      parents: {
        father: { name: '', age: 0, isAlive: true, relation: 80 }, // relation: 亲密度
        mother: { name: '', age: 0, isAlive: true, relation: 90 }
      },
      spouse: null, // { name: age, relation, ... }
      children: []  // [{ name, age, gender, stats: {...} }]
    }
  })

  return {
    gamePhase, totalMerit, currentEvent, monthlyLog, player
  }
}
