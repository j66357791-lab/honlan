// client/src/config.js

// 生产环境地址（Zeabur 后端域名），开发环境留空走 Vite proxy
export const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// 预设头像映射表（1-5）
export const AVATAR_MAP = {
  1: '/assets/images/avatars/icon_cwjh_bzl.png',  // 白泽兰
  2: '/assets/images/avatars/icon_cwjh_xm.png',   // 玄冥
  3: '/assets/images/avatars/icon_cwjh_yxl.png',  // 玉虚龙
  4: '/assets/images/avatars/icon_cwjh_lh.png',   // 烈火
  5: '/assets/images/avatars/icon_cwjh_tz.png',   // 天泽
}

// 默认头像（兜底）
export const DEFAULT_AVATAR = '/assets/images/avatars/icon_cwjh_bzl.png'
