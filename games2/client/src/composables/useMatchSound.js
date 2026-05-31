// src/composables/useMatchSound.js
import { ref, watch } from 'vue'
import { addVersion } from '../config'

const soundEnabled = ref(localStorage.getItem('match_sound') !== 'false')
watch(soundEnabled, (val) => { localStorage.setItem('match_sound', val ? 'true' : 'false') })

const getLang = () => {
  const locale = localStorage.getItem('locale') || localStorage.getItem('language') || 'cn'
  return locale.startsWith('en') ? 'en' : 'cn'
}

let bgmAudio = null

// ★ 核心改造：不使用顶层 new Audio，改为懒加载缓存池
const audioCache = new Map()
const getAudio = (url) => {
  const versionedUrl = addVersion(url)
  if (!audioCache.has(versionedUrl)) {
    audioCache.set(versionedUrl, new Audio(versionedUrl))
  }
  return audioCache.get(versionedUrl)
}

export function useMatchSound() {
  const initBGM = () => {
    if (!bgmAudio) {
      bgmAudio = getAudio('/assets/sounds/bgm/festival_game.mp3') // 复用缓存池
      bgmAudio.loop = true
      bgmAudio.volume = 0.25
    }
    if (soundEnabled.value) {
      bgmAudio.play().catch(() => {})
    }
  }

  const stopBGM = () => {
    if (bgmAudio) {
      bgmAudio.pause()
      bgmAudio.currentTime = 0
    }
  }

  watch(soundEnabled, (val) => {
    if (!bgmAudio) return
    if (val) { bgmAudio.play().catch(() => {}) } 
    else { bgmAudio.pause() }
  })

  let audioCtx = null
  const getCtx = () => {
    if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)() }
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
  }

  const playTone = (freq, duration, type = 'sine', volume = 0.3, delay = 0) => {
    if (!soundEnabled.value) return
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type; osc.frequency.value = freq
      const t = ctx.currentTime + delay
      gain.gain.setValueAtTime(volume, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + duration)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(t); osc.stop(t + duration)
    } catch (e) {}
  }

  const playEliminate = (wave = 1) => {
    if (!soundEnabled.value) return
    const idx = Math.min(Math.max(wave, 1), 6)
    const sound = getAudio(`/assets/sounds/sfx/match/xiaochu/Combo${idx}.mp3`)
    if (sound) {
      sound.volume = 0.5
      sound.currentTime = 0
      sound.play().catch(() => {})
    }
  }

  const playEnd = (wave = 1) => {
    if (!soundEnabled.value) return
    const idx = Math.min(Math.max(wave, 1), 5)
    const lang = getLang()
    const sound = getAudio(`/assets/sounds/sfx/match/xiaochu-end/ComboEnd${idx}_${lang}.mp3`)
    if (sound) {
      sound.volume = 0.6
      sound.currentTime = 0
      sound.play().catch(() => {})
    }
  }

  const playDrop = () => { playTone(200, 0.08, 'sine', 0.1) }
  const playWin = () => { ;[523, 659, 784, 1047].forEach((f, i) => { playTone(f, 0.25, 'sine', 0.25, i * 0.12) }) }
  const playLose = () => { playTone(350, 0.3, 'sine', 0.15); playTone(250, 0.4, 'sine', 0.12, 0.25) }
  const playClick = () => { playTone(800, 0.04, 'square', 0.08) }
  const toggleSound = () => { soundEnabled.value = !soundEnabled.value }

  return { soundEnabled, initBGM, stopBGM, playDrop, playEliminate, playEnd, playWin, playLose, playClick, toggleSound }
}
