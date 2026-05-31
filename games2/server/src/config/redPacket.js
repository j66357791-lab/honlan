// server/src/config/redPacket.js

// ★ 流水转化比例：根据游戏不同制定不同比例
export const TURNOVER_RATE = {
  giant: 0.1,      // 巨人赛跑
  pointing: 0.1,   // 点兵点将
  match: 0.5       // 消消乐
};

// ★ 红包配置：金额(放大1000倍) + 概率(prob，总和必须为1)
export const redPacketConfig = [
  { 
    level: 1, 
    requiredTurnover: 100000, // 10万流水
    name: "青铜场",
    redPackets: [
      { amount: 100, prob: 0.40 },  // 0.1晶石，40%概率
      { amount: 200, prob: 0.30 },  // 0.2晶石，30%概率
      { amount: 300, prob: 0.20 },  // 0.3晶石，20%概率
      { amount: 400, prob: 0.08 },  // 0.4晶石，8%概率
      { amount: 500, prob: 0.02 }   // 0.5晶石，2%概率
    ]
  },
  { 
    level: 2, 
    requiredTurnover: 500000, // 50万流水
    name: "白银场",
    redPackets: [
      { amount: 300,  prob: 0.50 }, // 0.3晶石
      { amount: 1200, prob: 0.20 }, // 1.2晶石
      { amount: 1800, prob: 0.15 }, // 1.8晶石
      { amount: 2400, prob: 0.10 }, // 2.4晶石
      { amount: 3000, prob: 0.05 }  // 3.0晶石
    ]
  }
];
