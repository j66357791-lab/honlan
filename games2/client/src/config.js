// client/src/config.js

// 生产环境地址（Zeabur 后端域名），开发环境留空走 Vite proxy
export const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// 🌟 新增：自动给 URL 加时间戳的工具函数
export function addVersion(url) {
  // 本地开发时没有时间戳，直接返回原 url
  if (typeof __APP_BUILD_TIME__ === 'undefined') return url
  // 如果已经有 ? 了，就用 & 拼接，否则用 ? 拼接
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${__APP_BUILD_TIME__}`
}

// 预设头像映射表（1-5）- 🌟 修改：用 addVersion 包裹
export const AVATAR_MAP = {
  1: addVersion('/assets/images/avatars/icon_cwjh_bzl.png'), // 白泽兰
  2: addVersion('/assets/images/avatars/icon_cwjh_xm.png'),  // 玄冥
  3: addVersion('/assets/images/avatars/icon_cwjh_yxl.png'), // 玉虚龙
  4: addVersion('/assets/images/avatars/icon_cwjh_lh.png'),  // 烈火
  5: addVersion('/assets/images/avatars/icon_cwjh_tz.png'),  // 天泽
}

// 默认头像（兜底）- 🌟 修改：用 addVersion 包裹
export const DEFAULT_AVATAR = addVersion('/assets/images/avatars/icon_cwjh_bzl.png')
