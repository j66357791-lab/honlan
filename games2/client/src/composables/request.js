// games2/client/src/composables/request.js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export function request(url, options = {}) {
  const fullUrl = BASE_URL + url
  
  // 🚀 1. 自动携带 Token
  const token = localStorage.getItem('token')
  const defaultHeaders = {
    'Content-Type': 'application/json',
  }
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  return fetch(fullUrl, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}), 
    },
  })
  .then(async response => {
    // 🚀 2. 拦截 401 未登录/登录失效
    if (response.status === 401) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login' 
      }
    }
    
    // 🚀 3. 拦截其他后端报错 (400, 500等)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '网络请求失败' }))
      throw new Error(errorData.error || `请求失败 (${response.status})`)
    }
    
    // 🚀 关键修复：返回原始 response，兼容旧代码里的 res.json()
    return response; 
  })
}
