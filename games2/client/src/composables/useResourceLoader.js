// src/composables/useResourceLoader.js
import { ref } from 'vue'
import { addVersion } from '../config'

const cache = new Set()

export function useResourceLoader() {
  const progress = ref(0)
  const currentName = ref('')
  const loaded = ref(false)
  const totalCount = ref(0)
  const doneCount = ref(0)

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

    // 过滤掉已经加载过的
    const pending = resources.filter(r => !cache.has(r.url))
    if (pending.length === 0) {
      doneCount.value = resources.length
      progress.value = 100
      loaded.value = true
      return
    }

    const queue = [...pending]
    const workers = []
    const concurrency = Math.min(6, queue.length) // 6个并发通道

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
      
      currentName.value = res.name || res.url.split('/').pop() || ''
      
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
        } else if (res.type === 'font') {
          await loadFont(res.url, res.name)
        }
        cache.add(res.url)
      } catch (e) {
        cache.add(res.url) // 失败也标记，防止卡死
        console.warn(`[Loader] 加载失败: ${res.url}`)
      }
      
      doneCount.value++
      progress.value = Math.round((doneCount.value / total) * 100)
    }
  }

  function loadImage(url) {
    return new Promise((resolve) => {
      const versionedUrl = addVersion(url) // 统一在这里加版本号
      const img = new Image()
      const timeout = setTimeout(() => resolve(), 15000)
      img.onload = () => { clearTimeout(timeout); resolve() }
      img.onerror = () => { clearTimeout(timeout); resolve() }
      img.src = versionedUrl
    })
  }

  function loadAudio(url) {
    return new Promise((resolve) => {
      const versionedUrl = addVersion(url) // 统一在这里加版本号
      const timeout = setTimeout(() => resolve(), 10000)
      const audio = new Audio()
      audio.addEventListener('canplaythrough', () => { clearTimeout(timeout); resolve() }, { once: true })
      audio.addEventListener('error', () => { clearTimeout(timeout); resolve() })
      audio.preload = 'auto'
      audio.src = versionedUrl
      audio.load()
    })
  }

  // 新增：字体加载
  function loadFont(url, name) {
    return new Promise((resolve) => {
      const versionedUrl = addVersion(url)
      const fontFace = new FontFace(name, `url(${versionedUrl})`);
      const timeout = setTimeout(() => resolve(), 10000);
      
      fontFace.load().then((loadedFont) => {
        clearTimeout(timeout);
        document.fonts.add(loadedFont);
        resolve();
      }).catch(() => {
        clearTimeout(timeout);
        resolve();
      });
    })
  }

  function isCached(url) {
    return cache.has(url)
  }

  return { progress, currentName, loaded, totalCount, doneCount, startLoading, isCached }
}
