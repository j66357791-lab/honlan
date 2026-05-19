// client/src/config.js
// 生产环境地址（Zeabur 后端域名），开发环境留空走 Vite proxy

export const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
