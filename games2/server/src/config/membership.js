// src/config/membership.js

// 会员卡类型配置
export const MEMBERSHIP_CONFIG = {
  normal: {
    name: '普通月卡',
    price: 138,           // 标价，仅展示用
    dailyReward: 500000,  // 每日奖励50w积分 (如果积分也放大了1000倍，请改为 500000000)
    durationDays: 30      // 持续30天
  },
  super: {
    name: '超级月卡',
    price: 1998,
    dailyReward: 6500000, // 每日奖励650w积分 (如果积分放大1000倍，改为 6500000000)
    durationDays: 30
  }
};
