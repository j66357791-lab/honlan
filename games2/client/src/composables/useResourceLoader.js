import { ref } from 'vue'

// 全局缓存，第二次进入不重复加载
const cache = new Set()

export function useResourceLoader() {
  const progress = ref(0)
  const currentName = ref('')
  const loaded = ref(false)
  const totalCount = ref(0)
  const doneCount = ref(0)

  /**
   * 开始加载资源列表
   * @param {Array<{name: string, url: string, type: 'image'|'audio'}>} resources
   */
  async function startLoading(resources) {
    if (!resources || resources.length === 0) {
      loaded.value = true
      progress.value = 100
      return
    }

    totalCount.value = resources.length
    doneCount.value = 0
    loaded.value = false
    progress.value = 0

    // 过滤掉已缓存的
    const pending = resources.filter(r => !cache.has(r.url))
    
    if (pending.length === 0) {
      // 全部已缓存，秒过
      doneCount.value = resources.length
      progress.value = 100
      loaded.value = true
      return
    }

    // 并发加载，最多同时 6 个
    const queue = [...pending]
    const workers = []
    const concurrency = Math.min(6, queue.length)

    for (let i = 0; i < concurrency; i++) {
      workers.push(loadWorker(queue, resources.length))
    }

    await Promise.all(workers)
    loaded.value = true
    progress.value = 100
  }

  async function loadWorker(queue, total) {
    while (queue.length > 0) {
      const res = queue.shift()
      if (!res) break

      currentName.value = res.name || ''

      // 已缓存则跳过
      if (cache.has(res.url)) {
        doneCount.value++
        progress.value = Math.round((doneCount.value / total) * 100)
        continue
      }

      try {
        if (res.type === 'image') {
          await loadImage(res.url)
        } else if (res.type === 'audio') {
          await loadAudio(res.url)
        }
        cache.add(res.url)
      } catch (e) {
        // 加载失败也标记缓存，避免反复重试
        cache.add(res.url)
        console.warn(`[Loader] 加载失败: ${res.url}`)
      }

      doneCount.value++
      progress.value = Math.round((doneCount.value / total) * 100)
    }
  }

  function loadImage(url) {
    return new Promise((resolve) => {
      const img = new Image()
      const timeout = setTimeout(() => resolve(), 15000)
      img.onload = () => { clearTimeout(timeout); resolve() }
      img.onerror = () => { clearTimeout(timeout); resolve() }
      img.src = url
    })
  }

  function loadAudio(url) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(), 10000)
      const audio = new Audio()
      audio.addEventListener('canplaythrough', () => {
        clearTimeout(timeout)
        resolve()
      }, { once: true })
      audio.addEventListener('error', () => {
        clearTimeout(timeout)
        resolve()
      })
      audio.preload = 'auto'
      audio.src = url
      audio.load()
    })
  }

  function isCached(url) {
    return cache.has(url)
  }

  return {
    progress,
    currentName,
    loaded,
    totalCount,
    doneCount,
    startLoading,
    isCached
  }
}
