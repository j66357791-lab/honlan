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
      ...(options.headers || {}), // 允许调用时覆盖 headers
    },
  })
  .then(async response => {
    // 🚀 2. 统一拦截后端报错 (比如 401 未登录, 400 余额不足)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '网络请求失败' }))
      const errMsg = errorData.error || `请求失败 (${response.status})`
      
      // 如果是 401，说明 token 失效或未登录，可以直接踢回登录页
      if (response.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login' 
      }
      
      // 将错误抛出，这样在组件里用 try/catch 就能 catch 到报错信息
      throw new Error(errMsg)
    }
    
    return response.json()
  })
}
