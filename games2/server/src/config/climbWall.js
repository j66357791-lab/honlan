// server/src/config/climbWall.js

// ★ 注意这里必须是 export const，不能用 export default
export const climbWallConfig = {
  levels: [
    // 把你原来的阶梯配置填在这里，比如：
    { level: 1, costPoint: 10000, rewardCrystal: 100 },
    { level: 2, costPoint: 100000, rewardCrystal: 500 },
    { level: 3, costPoint: 300000, rewardCrystal: 2000 },
    { level: 4, costPoint: 1000000, rewardCrystal: 10000 },
    { level: 5, costPoint: 5000000, rewardCrystal: 60000 }
  ]
};
