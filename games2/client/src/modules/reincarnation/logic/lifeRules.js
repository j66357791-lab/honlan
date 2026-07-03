// 计算自然寿命 (核心基础)
export function calculateLifespan(con, luck, mood) {
  // 基础寿命 60岁
  let base = 60
  
  // 体质加成：每点体质 + 1.5 岁
  base += con * 1.5
  
  // 运气加成：每点运气 + 0.5 岁
  base += luck * 0.5
  
  // 心情影响：长期心情低(<40)减寿，高(>80)增寿
  if (mood < 40) base -= 5
  if (mood > 80) base += 3
  
  // 随机波动 ± 5 岁
  base += Math.floor(Math.random() * 11) - 5
  
  return Math.floor(base)
}

// 属性自然增长 (儿童期长得快，成年期慢)
export function calculateStatGrowth(statKey, currentAge) {
  if (currentAge < 6) return 0.3 // 幼儿期每月长得快
  if (currentAge < 18) return 0.2 // 少年期
  return 0.05 // 成年后身体定型，很难长了
}
