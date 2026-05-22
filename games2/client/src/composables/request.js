// games2/client/src/composables/request.js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export function request(url, options = {}) {
  const fullUrl = BASE_URL + url
  console.log(`[API] ${options.method || 'GET'} ${fullUrl}`)
  return fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}
