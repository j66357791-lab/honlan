// src/config/preloadAssets.js
// 全站预加载资源清单（只填原始路径，Loader会自动加版本号）

export const preloadAssets = [
  // === 基础图片 ===
  { type: 'image', url: '/assets/images/bg.01.png' },
  { type: 'image', url: '/assets/images/bg_login.png' },
  { type: 'image', url: '/assets/images/cw_img_004.png' },
  { type: 'image', url: '/assets/images/gonggao-backend.png' },
  { type: 'image', url: '/assets/images/icon_jz.png' },
  { type: 'image', url: '/assets/images/lobby_bg.png' },

  // === 头像 ===
  { type: 'image', url: '/assets/images/avatars/icon_cwjh_bzl.png' },
  { type: 'image', url: '/assets/images/avatars/icon_cwjh_lh.png' },
  { type: 'image', url: '/assets/images/avatars/icon_cwjh_tz.png' },
  { type: 'image', url: '/assets/images/avatars/icon_cwjh_xm.png' },
  { type: 'image', url: '/assets/images/avatars/icon_cwjh_yxl.png' },

  // === 表情 & 道具 ===
  { type: 'image', url: '/assets/images/biaoqing/tongyong11_kulou01.png' },
  { type: 'image', url: '/assets/images/biaoqing/tongyong22_kaixin01.png' },
  { type: 'image', url: '/assets/images/daoju/icon_gift_jiu.png' },

  // === 游戏UI ===
  { type: 'image', url: '/assets/images/game-ui-icon/chouma-icon.png' },

  // === 巨人赛跑角色 ===
  { type: 'image', url: '/assets/images/juese/honse/feitu1-idle_0.png' },
  { type: 'image', url: '/assets/images/juese/honse/feitu1-run_0.png' },
  { type: 'image', url: '/assets/images/juese/honse/feitu1-run_1.png' },
  { type: 'image', url: '/assets/images/juese/honse/feitu1-run_2.png' },
  { type: 'image', url: '/assets/images/juese/honse/feitu1-run_3.png' },
  { type: 'image', url: '/assets/images/juese/honse/feitu1-run_4.png' },
  { type: 'image', url: '/assets/images/juese/lanse/feitu2-idle_0.png' },
  { type: 'image', url: '/assets/images/juese/lanse/feitu2-run_0.png' },
  { type: 'image', url: '/assets/images/juese/lanse/feitu2-run_1.png' },
  { type: 'image', url: '/assets/images/juese/lanse/feitu2-run_2.png' },
  { type: 'image', url: '/assets/images/juese/lanse/feitu2-run_3.png' },
  { type: 'image', url: '/assets/images/juese/lanse/feitu2-run_4.png' },

  // === 点兵点将人物 ===
  { type: 'image', url: '/assets/images/games2/关羽.png' },
  { type: 'image', url: '/assets/images/games2/张飞.png' },
  { type: 'image', url: '/assets/images/games2/梁红玉..png' },
  { type: 'image', url: '/assets/images/games2/秦良玉.png' },
  { type: 'image', url: '/assets/images/games2/穆桂英.png' },
  { type: 'image', url: '/assets/images/games2/花木兰.png' },
  { type: 'image', url: '/assets/images/games2/赵云.png' },
  { type: 'image', url: '/assets/images/games2/马超.png' },

  // === 消消乐元素 & UI ===
  { type: 'image', url: '/assets/images/match/ui/jiazaiye-bg.png' },
  { type: 'image', url: '/assets/images/match/ui/night_main_bg.png' },
  ...Array.from({ length: 8 }, (_, i) => ({ type: 'image', url: `/assets/images/match/elements/item_${i + 1}.png` })),

  // === 字体 (特殊类型，Loader里会特殊处理) ===
  { type: 'font', url: '/assets/images/fonts/ObelixProNum.ttf', name: 'ObelixProNum' },

  // === 音效 & BGM ===
  { type: 'audio', url: '/assets/sounds/bgm/Battle.mp3' },
  { type: 'audio', url: '/assets/sounds/bgm/festival_game.mp3' },
  { type: 'audio', url: '/assets/sounds/sfx/click.mp3' },
  { type: 'audio', url: '/assets/sounds/sfx/hit.mp3' },
  { type: 'audio', url: '/assets/sounds/sfx/lose.mp3' },
  { type: 'audio', url: '/assets/sounds/sfx/win.mp3' },
  ...Array.from({ length: 6 }, (_, i) => ({ type: 'audio', url: `/assets/sounds/sfx/match/xiaochu/Combo${i + 1}.mp3` })),
  ...Array.from({ length: 5 }, (_, i) => ({ type: 'audio', url: `/assets/sounds/sfx/match/xiaochu-end/ComboEnd${i + 1}_cn.mp3` })),
  ...Array.from({ length: 5 }, (_, i) => ({ type: 'audio', url: `/assets/sounds/sfx/match/xiaochu-end/ComboEnd${i + 1}_en.mp3` }))
]
