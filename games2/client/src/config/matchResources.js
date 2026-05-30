// src/config/matchResources.js
import { addVersion } from '../config' // 引入加版本号工具

// 每次构建部署，这些路径都会自动带上时间戳，完美配合强缓存
export const matchResources = [
  // ===== 背景图 =====
  { name: '游戏背景', url: addVersion('/assets/images/match/ui/night_main_bg.png'), type: 'image' },
  
  // ===== 消除元素（8种） =====
  { name: '元素-1', url: addVersion('/assets/images/match/elements/item_1.png'), type: 'image' },
  { name: '元素-2', url: addVersion('/assets/images/match/elements/item_2.png'), type: 'image' },
  { name: '元素-3', url: addVersion('/assets/images/match/elements/item_3.png'), type: 'image' },
  { name: '元素-4', url: addVersion('/assets/images/match/elements/item_4.png'), type: 'image' },
  { name: '元素-5', url: addVersion('/assets/images/match/elements/item_5.png'), type: 'image' },
  { name: '元素-6', url: addVersion('/assets/images/match/elements/item_6.png'), type: 'image' },
  { name: '元素-7', url: addVersion('/assets/images/match/elements/item_7.png'), type: 'image' },
  { name: '元素-8', url: addVersion('/assets/images/match/elements/item_8.png'), type: 'image' },
  
  // ===== BGM =====
  { name: '背景音乐', url: addVersion('/assets/sounds/bgm/festival_game.mp3'), type: 'audio' },
  
  // ===== 连击音效 Combo1~6 =====
  { name: '连击音效-1', url: addVersion('/assets/sounds/sfx/match/xiaochu/Combo1.mp3'), type: 'audio' },
  { name: '连击音效-2', url: addVersion('/assets/sounds/sfx/match/xiaochu/Combo2.mp3'), type: 'audio' },
  { name: '连击音效-3', url: addVersion('/assets/sounds/sfx/match/xiaochu/Combo3.mp3'), type: 'audio' },
  { name: '连击音效-4', url: addVersion('/assets/sounds/sfx/match/xiaochu/Combo4.mp3'), type: 'audio' },
  { name: '连击音效-5', url: addVersion('/assets/sounds/sfx/match/xiaochu/Combo5.mp3'), type: 'audio' },
  { name: '连击音效-6', url: addVersion('/assets/sounds/sfx/match/xiaochu/Combo6.mp3'), type: 'audio' },
  
  // ===== 结算音效-中文 ComboEnd1~5 =====
  { name: '结算音效-中1', url: addVersion('/assets/sounds/sfx/match/xiaochu-end/ComboEnd1_cn.mp3'), type: 'audio' },
  { name: '结算音效-中2', url: addVersion('/assets/sounds/sfx/match/xiaochu-end/ComboEnd2_cn.mp3'), type: 'audio' },
  { name: '结算音效-中3', url: addVersion('/assets/sounds/sfx/match/xiaochu-end/ComboEnd3_cn.mp3'), type: 'audio' },
  { name: '结算音效-中4', url: addVersion('/assets/sounds/sfx/match/xiaochu-end/ComboEnd4_cn.mp3'), type: 'audio' },
  { name: '结算音效-中5', url: addVersion('/assets/sounds/sfx/match/xiaochu-end/ComboEnd5_cn.mp3'), type: 'audio' },
  
  // ===== 结算音效-英文 ComboEnd1~5 =====
  { name: '结算音效-英1', url: addVersion('/assets/sounds/sfx/match/xiaochu-end/ComboEnd1_en.mp3'), type: 'audio' },
  { name: '结算音效-英2', url: addVersion('/assets/sounds/sfx/match/xiaochu-end/ComboEnd2_en.mp3'), type: 'audio' },
  { name: '结算音效-英3', url: addVersion('/assets/sounds/sfx/match/xiaochu-end/ComboEnd3_en.mp3'), type: 'audio' },
  { name: '结算音效-英4', url: addVersion('/assets/sounds/sfx/match/xiaochu-end/ComboEnd4_en.mp3'), type: 'audio' },
  { name: '结算音效-英5', url: addVersion('/assets/sounds/sfx/match/xiaochu-end/ComboEnd5_en.mp3'), type: 'audio' },
]
