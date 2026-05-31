// ============================================
// useSound.js - 音频层级管理器
// BGM 置底不干扰音效
// ============================================
import { ref } from 'vue'
import { addVersion } from '../config' // 🌟 新增引入

const soundEnabled = ref(true)
const bgmEnabled = ref(true)
const masterVolume = ref(0.8)
const bgmVolume = ref(0.15)
const sfxVolume = ref(0.6)

const sfxCache = new Map()
let currentBgm = null
let bgmPrompted = false

const SFX_LIST = [ 'click', 'win', 'lose', 'step', 'hit', 'pickup', 'gameover' ]

// 🌟 修改：路径生成加 addVersion
function getSfxPath(name) {
  return addVersion(`/assets/sounds/sfx/${name}.mp3`)
}

// 🌟 修改：路径生成加 addVersion
function getBgmPath(name) {
  return addVersion(`/assets/sounds/bgm/${name}.mp3`)
}

export function initSounds() {
  SFX_LIST.forEach(name => {
    const audio = new Audio(getSfxPath(name))
    audio.volume = sfxVolume.value * masterVolume.value
    audio.preload = 'auto'
    sfxCache.set(name, audio)
  })
}

export function setMasterVolume(vol) { masterVolume.value = Math.max(0, Math.min(1, vol)); updateAllVolumes() }
export function setSfxVolume(vol) { sfxVolume.value = Math.max(0, Math.min(1, vol)); updateAllVolumes() }
export function setBgmVolume(vol) { bgmVolume.value = Math.max(0, Math.min(1, vol)); updateAllVolumes() }

function updateAllVolumes() {
  sfxCache.forEach(audio => { audio.volume = sfxVolume.value * masterVolume.value })
  if (currentBgm) { currentBgm.volume = bgmVolume.value * masterVolume.value }
}

function fadeAudio(audio, from, to, duration, onComplete = null) {
  if (audio._fadeInterval) { clearInterval(audio._fadeInterval); audio._fadeInterval = null }
  const stepTime = 50
  const steps = Math.max(1, duration / stepTime)
  const volumeStep = (to - from) / steps
  let current = from
  audio._fadeInterval = setInterval(() => {
    current += volumeStep
    const reachedTarget = volumeStep >= 0 ? current >= to : current <= to
    if (reachedTarget) {
      audio.volume = to; clearInterval(audio._fadeInterval); audio._fadeInterval = null
      if (onComplete) onComplete()
    } else {
      audio.volume = current
    }
  }, stepTime)
}

export function playBgm(name, options = {}) {
  if (!bgmEnabled.value) return
  const fadeIn = options.fadeIn ?? 2000
  const loop = options.loop ?? true
  if (currentBgm && currentBgm.src.includes(name)) return
  stopBgm(1000)
  const bgm = new Audio(getBgmPath(name))
  bgm.loop = loop
  bgm.volume = 0
  currentBgm = bgm
  bgm.play().catch(() => {})
  if (fadeIn > 0) {
    fadeAudio(bgm, 0, bgmVolume.value * masterVolume.value, fadeIn)
  } else {
    bgm.volume = bgmVolume.value * masterVolume.value
  }
}

export function stopBgm(fadeOut = 1000) {
  if (!currentBgm) return
  const bgm = currentBgm
  currentBgm = null
  if (fadeOut > 0) {
    fadeAudio(bgm, bgm.volume, 0, fadeOut, () => { bgm.pause(); bgm.currentTime = 0 })
  } else {
    bgm.pause(); bgm.currentTime = 0
  }
}

export function switchBgm(name, options = {}) {
  if (!bgmEnabled.value) return
  const fadeOut = options.fadeOut ?? 1000
  const fadeIn = options.fadeIn ?? 2000
  const loop = options.loop ?? true
  if (currentBgm && currentBgm.src.includes(name)) return
  if (currentBgm) {
    const oldBgm = currentBgm
    currentBgm = null
    fadeAudio(oldBgm, oldBgm.volume, 0, fadeOut, () => {
      oldBgm.pause(); oldBgm.currentTime = 0; playBgm(name, { fadeIn, loop })
    })
  } else {
    playBgm(name, { fadeIn, loop })
  }
}

export function playSfx(name, options = {}) {
  if (!soundEnabled.value) return
  let audio = sfxCache.get(name)
  if (!audio) {
    audio = new Audio(getSfxPath(name))
    audio.preload = 'auto'
    sfxCache.set(name, audio)
  }
  const clone = audio.cloneNode()
  const finalVolume = options.volume !== undefined ? options.volume * masterVolume.value : sfxVolume.value * masterVolume.value
  clone.volume = Math.max(0, Math.min(1, finalVolume))
  if (options.playbackRate) { clone.playbackRate = options.playbackRate }
  clone.play().catch(() => {})
  clone.addEventListener('ended', () => { clone.src = '' })
}

export function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  if (!soundEnabled.value) { stopBgm(500) } else { if (bgmEnabled.value) playBgm('Battle') }
}
export function toggleBgm() {
  bgmEnabled.value = !bgmEnabled.value
  if (!bgmEnabled.value) { stopBgm(500) } else { playBgm('Battle') }
}
export function setSoundEnabled(enabled) { soundEnabled.value = enabled; if (!enabled) stopBgm(500) }
export function setBgmEnabled(enabled) { bgmEnabled.value = enabled; if (!enabled) stopBgm(500) }

function tryStartBgm() {
  if (!bgmPrompted) {
    bgmPrompted = true
    if (confirm('是否开启游戏背景音乐？')) { playBgm('Battle') } else { setBgmEnabled(false) }
  }
}

export function useSound() {
  function startRunningSound() { tryStartBgm(); playSfx('step') }
  function stopRunningSound() {}
  function playBoostSound() { tryStartBgm(); playSfx('pickup') }
  function playFinishSound() { tryStartBgm(); playSfx('gameover') }
  function playWinSound() { tryStartBgm(); playSfx('win') }
  function playLoseSound() { tryStartBgm(); playSfx('lose') }
  function playClickSound() { tryStartBgm(); playSfx('click') }
  function playTapSound() { tryStartBgm(); playSfx('hit') }
  
  return {
    soundEnabled, bgmEnabled, masterVolume, bgmVolume, sfxVolume, initSounds,
    playBgm, stopBgm, switchBgm, playSfx, setMasterVolume, setSfxVolume, setBgmVolume,
    toggleSound, toggleBgm, setSoundEnabled, setBgmEnabled,
    startRunningSound, stopRunningSound, playBoostSound, playFinishSound,
    playWinSound, playLoseSound, playClickSound, playTapSound,
  }
}
