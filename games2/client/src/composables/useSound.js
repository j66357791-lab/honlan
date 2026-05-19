/**
 * 巨人赛跑 - 音效系统
 * Web Audio API 合成音效
 */
import { ref } from 'vue'
let audioCtx = null
const soundEnabled = ref(true)

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function playNote(freq, duration, type = 'sine', volume = 0.3, startDelay = 0) {
  if (!soundEnabled.value) return
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay)
  gain.gain.setValueAtTime(volume, ctx.currentTime + startDelay)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration)
  osc.connect(gain); gain.connect(ctx.destination)
  osc.start(ctx.currentTime + startDelay)
  osc.stop(ctx.currentTime + startDelay + duration)
}

let runningInterval = null
export function startRunningSound() {
  if (!soundEnabled.value || runningInterval) return
  let beat = 0
  runningInterval = setInterval(() => {
    playNote(beat % 2 === 0 ? 150 : 180, 0.08, 'sine', 0.12)
    beat++
  }, 200)
}
export function stopRunningSound() {
  if (runningInterval) { clearInterval(runningInterval); runningInterval = null }
}
export function playBoostSound() {
  [523,659,784,1047].forEach((f,i) => playNote(f,0.15,'square',0.15,i*0.08))
}
export function playFinishSound() {
  playNote(880,0.3,'sawtooth',0.2); playNote(1175,0.4,'sawtooth',0.15,0.15)
}
export function playWinSound() {
  [523,659,784,1047].forEach((f,i) => playNote(f,0.25,'triangle',0.25,i*0.12))
}
export function playLoseSound() {
  [392,330,262].forEach((f,i) => playNote(f,0.35,'sine',0.2,i*0.2))
}
export function playClickSound() { playNote(1200,0.05,'square',0.1) }
export function playTapSound() { playNote(800,0.04,'sine',0.08) }
export function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  if (!soundEnabled.value) stopRunningSound()
}
export function useSound() {
  return { soundEnabled, toggleSound, startRunningSound, stopRunningSound, playBoostSound, playFinishSound, playWinSound, playLoseSound, playClickSound, playTapSound }
}
