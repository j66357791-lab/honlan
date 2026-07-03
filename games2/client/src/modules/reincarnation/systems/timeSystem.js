import { calculateLifespan } from '../logic/lifeRules.js'

export class TimeSystem {
  constructor(player) {
    this.player = player
  }

  // 推进一个月
  passMonth() {
    // 1. 增加月份
    this.player.month++
    if (this.player.month >= 12) {
      this.player.month = 0
      this.player.age++
    }

    // 2. 判定自身寿命 (核心逻辑修改点)
    // 每次过生日(即month=0的时候)重新计算一下生死概率，或者直接判定
    const limit = calculateLifespan(
      this.player.stats.con, 
      this.player.stats.luck, 
      this.player.mood
    )
    
    // 这里做一个平滑处理：如果超过寿命，死亡率逐年飙升
    if (this.player.age > limit) {
      const overAge = this.player.age - limit
      // 超过1岁，20%死；超过2岁，50%死...
      const deathChance = overAge * 0.2 
      if (Math.random() < deathChance) {
        return 'dead_old_age'
      }
    }
    
    return 'alive'
  }
}
