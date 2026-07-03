import { calculateLifespan } from '../logic/lifeRules.js'

export class FamilySystem {
  constructor(player) {
    this.player = player
  }

  // 初始化父母 (出生时调用)
  initParents(fatherInfo, motherInfo) {
    // 假设父亲比你大25岁，母亲大22岁
    this.player.family.parents.father = {
      ...fatherInfo,
      age: 25,
      isAlive: true,
      stats: { str: 5, int: 5, con: 5, luck: 5, chr: 5 } // 简化父母属性
    }
    this.player.family.parents.mother = {
      ...motherInfo,
      age: 22,
      isAlive: true,
      stats: { str: 3, int: 6, con: 4, luck: 5, chr: 8 }
    }
  }

  // 每月检查父母状态 (随时间流逝调用)
  tickParents() {
    const father = this.player.family.parents.father
    const mother = this.player.family.parents.mother

    // 1. 父母随玩家一起变老
    father.age += 1/12 // 每月增加
    mother.age += 1/12

    // 2. 判定父亲生死
    if (father.isAlive) {
      const fatherLifeLimit = calculateLifespan(father.stats.con, father.stats.luck, 70)
      if (father.age >= fatherLifeLimit) {
        father.isAlive = false
        return { type: 'father_dead', text: `你的父亲 ${father.name} 寿终正寝，享年 ${Math.floor(father.age)} 岁。` }
      }
    }

    // 3. 判定母亲生死 (逻辑同上)
    if (mother.isAlive) {
      const motherLifeLimit = calculateLifespan(mother.stats.con, mother.stats.luck, 75) // 女性通常寿长一点
      if (mother.age >= motherLifeLimit) {
        mother.isAlive = false
        return { type: 'mother_dead', text: `你的母亲 ${mother.name} 离你而去，享年 ${Math.floor(mother.age)} 岁。` }
      }
    }

    return null // 无事件
  }

  // 结婚 (简化版，触发时调用)
  marry(spouseInfo) {
    this.player.family.spouse = {
      ...spouseInfo,
      age: this.player.age - 2, // 假设配偶比你小2岁
      relation: 50 // 初始好感
    }
  }

  // 生孩子 (概率触发)
  tryHaveChild() {
    if (!this.player.family.spouse) return null
    if (this.player.age < 16 || this.player.age > 50) return null // 育龄期
    
    // 30% 概率怀孕
    if (Math.random() < 0.3) {
      const gender = Math.random() > 0.5 ? 'male' : 'female'
      const child = {
        name: '未命名', // 可以加个取名库
        gender: gender,
        age: 0,
        stats: {
          str: Math.floor(Math.random() * 10),
          int: Math.floor(Math.random() * 10),
          // ... 遗传逻辑可以写在这里： 父母属性平均值 + 随机
        }
      }
      this.player.family.children.push(child)
      return { type: 'child_born', text: `你的配偶为你生下了一个${gender === 'male' ? '男孩' : '女孩'}。` }
    }
    return null
  }

  // 孩子长大 (每月调用)
  tickChildren() {
    this.player.family.children.forEach(child => {
      child.age += 1/12
    })
  }
}
