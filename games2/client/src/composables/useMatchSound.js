// src/composables/useMatchSound.js
import { ref, watch } from 'vue'

// 全局开关
const soundEnabled = ref(localStorage.getItem('match_sound') !== 'false')
watch(soundEnabled, (val) => {
  localStorage.setItem('match_sound', val ? 'true' : 'false')
})

// ========== 获取当前语言 ==========
const getLang = () => {
  // 优先从 localStorage 获取，如果没有默认 'cn'
  // 请根据您项目的实际 i18n 配置调整这里，例如 vue-i18n 的 locale 值
  const locale = localStorage.getItem('locale') || localStorage.getItem('language') || 'cn'
  return locale.startsWith('en') ? 'en' : 'cn' // 简单判断，如果是以 en 开头则用英文，否则中文
}

// ========== 预加载所有音效 ==========
// 背景音乐（单例）
let bgmAudio = null

// 连击音效 Combo1~6，7+沿用Combo6
const comboSounds = {}
for (let i = 1; i <= 6; i++) {
  const a = new Audio(`/assets/sounds/sfx/match/xiaochu/Combo${i}.mp3`)
  a.volume = 0.5
  comboSounds[i] = a
}

// ★ 结算音效 ComboEnd1~5 (cn/en)
const comboEndSounds = {}
for (let i = 1; i <= 5; i++) {
  comboEndSounds[i] = {
    cn: new Audio(`/assets/sounds/sfx/match/xiaochu-end/ComboEnd${i}_cn.mp3`),
    en: new Audio(`/assets/sounds/sfx/match/xiaochu-end/ComboEnd${i}_en.mp3`)
  }
  // 设置默认音量
  comboEndSounds[i].cn.volume = 0.6
  comboEndSounds[i].en.volume = 0.6
}

export function useMatchSound() {
  // ========== 背景音乐 ==========
  const initBGM = () => {
    if (!bgmAudio) {
      bgmAudio = new Audio('/assets/sounds/bgm/festival_game.mp3')
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
    if (val) {
      bgmAudio.play().catch(() => {})
    } else {
      bgmAudio.pause()
    }
  })

  // ========== 合成音效（落位/胜利/失败/点击）==========
  let audioCtx = null
  const getCtx = () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
  }

  const playTone = (freq, duration, type = 'sine', volume = 0.3, delay = 0) => {
    if (!soundEnabled.value) return
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      const t = ctx.currentTime + delay
      gain.gain.setValueAtTime(volume, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + duration)
    } catch (e) {}
  }

  // ★ 消除音效：1连击→Combo1，2连击→Combo2 ... 6+连击→Combo6
  const playEliminate = (wave = 1) => {
    if (!soundEnabled.value) return
    const idx = Math.min(Math.max(wave, 1), 6)
    const sound = comboSounds[idx]
    if (sound) {
      sound.currentTime = 0
      sound.play().catch(() => {})
    }
  }

  // ★ 消除结束音效（根据连击等级和语言播放）
  const playEnd = (wave = 1) => {
    if (!soundEnabled.value) return
    // 将连击数映射到 1-5 级别
    // 规则：1->1, 2->2, 3->3, 4->4, 5+->5
    // 您也可以根据需要调整映射规则，例如：1-2->1, 3-4->2 等
    const idx = Math.min(Math.max(wave, 1), 5)
    const lang = getLang()
    
    const sound = comboEndSounds[idx]?.[lang]
    
    if (sound) {
      sound.currentTime = 0
      sound.play().catch(() => {})
    }
  }

  // 方块落位
  const playDrop = () => {
    playTone(200, 0.08, 'sine', 0.1)
  }

  // 胜利
  const playWin = () => {
    ;[523, 659, 784, 1047].forEach((f, i) => {
      playTone(f, 0.25, 'sine', 0.25, i * 0.12)
    })
  }

  // 失败
  const playLose = () => {
    playTone(350, 0.3, 'sine', 0.15)
    playTone(250, 0.4, 'sine', 0.12, 0.25)
  }

  // 按钮点击
  const playClick = () => {
    playTone(800, 0.04, 'square', 0.08)
  }

  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
  }

  return {
    soundEnabled,
    initBGM,
    stopBGM,
    playDrop,
    playEliminate,
    playEnd,
    playWin,
    playLose,
    playClick,
    toggleSound
  }
}
