<template>
  <div class="track-area">
    <img :src="'/assets/images/dl_bg_001.png'" class="track-bg" alt="" />
    <div class="track-content">
      <div class="lane red-lane">
        <div class="finish-line"></div>
        <div class="runner-area">
          <GiantRunner color="red" :progress="redProgress" :mood="redMood" :show-wine="showWineRed" />
        </div>
        <div class="lane-label">红巨人</div>
      </div>
      <div class="lane blue-lane">
        <div class="finish-line"></div>
        <div class="runner-area">
          <GiantRunner color="blue" :progress="blueProgress" :mood="blueMood" :show-wine="showWineBlue" />
        </div>
        <div class="lane-label">蓝巨人</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import GiantRunner from './GiantRunner.vue'
defineProps({
  redProgress: { type: Number, default: 0 },
  blueProgress: { type: Number, default: 0 },
  redMood: { type: String, default: 'idle' },
  blueMood: { type: String, default: 'idle' },
  showWineRed: { type: Boolean, default: false },
  showWineBlue: { type: Boolean, default: false }
})
</script>

<style scoped>
.track-area { position:relative; margin:8px 12px; border-radius:12px; overflow:hidden; border:2px solid rgba(255,215,0,0.3); box-shadow:0 0 20px rgba(255,215,0,0.1); }
.track-bg { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:0; }
.track-content { position:relative; z-index:1; padding:8px 0; }
.lane { position:relative; display:flex; align-items:center; padding:4px 8px; margin:4px 8px; border-radius:8px; background:rgba(0,0,0,0.25); }
.lane-label { width:48px; font-size:12px; font-weight:700; text-align:center; flex-shrink:0; }
.red-lane .lane-label { color:var(--color-red); text-shadow:0 0 8px var(--color-red-glow); }
.blue-lane .lane-label { color:var(--color-blue); text-shadow:0 0 8px var(--color-blue-glow); }
.runner-area { flex:1; position:relative; height:80px; overflow:hidden; }
.finish-line { width:4px; height:70px; background:repeating-linear-gradient(180deg,#fff 0px,#fff 6px,#000 6px,#000 12px); border-radius:2px; flex-shrink:0; margin-right:4px; box-shadow:0 0 6px rgba(255,255,255,0.4); }
</style>
