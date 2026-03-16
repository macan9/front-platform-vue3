<template>
  <div class="three-island-page">
    <div class="three-island-shell">
      <div class="three-island-head">
        <p class="three-island-eyebrow">Island Scene</p>
        <h2>海岛场景演示</h2>
      </div>

      <div ref="mountEl" class="webThree">
        <div class="ulBox">
          <div ref="textEl" class="liBox"></div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { islandInit } from './utils/heka.js'
import { onMounted, onUnmounted, ref } from 'vue'

const mountEl = ref(null)
const textEl = ref(null)
let islandRuntime = null

onMounted(() => {
  islandRuntime = islandInit({
    mountEl,
    textEl,
  })
})

onUnmounted(() => {
  islandRuntime?.destroy()
  islandRuntime = null
})
</script>
<style lang="scss">
.three-island-page {
  width: 100%;
  height: 100%;
}

.three-island-shell {
  position: relative;
  height: 100%;
  padding: 18px;
  border: 1px solid rgba(198, 213, 225, 0.9);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(243, 247, 252, 0.78));
  box-shadow: 0 18px 40px rgba(111, 144, 176, 0.12);
  box-sizing: border-box;
  overflow: hidden;
}

.three-island-head {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 3;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(7, 16, 30, 0.28);
  backdrop-filter: blur(12px);
  color: #eff6ff;
}

.three-island-head h2 {
  margin: 4px 0 0;
  font-size: 28px;
  line-height: 1.15;
}

.three-island-eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.webThree {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 20px;
  background: #020617;
}

.webThree canvas {
  display: block;
}

.ulBox {
  position: absolute;
  top: 92px;
  left: 0;
  width: 100%;
  height: 60px;
  overflow: hidden;
  z-index: 2;
  pointer-events: none;
}

.liBox {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  transition: top 1s ease;
}

.liBox h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(28px, 4vw, 50px);
  line-height: 60px;
  padding-left: 30px;
  text-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}

@media (max-width: 768px) {
  .three-island-shell {
    padding: 12px;
    border-radius: 18px;
  }

  .three-island-head {
    top: 12px;
    left: 12px;
    max-width: calc(100% - 24px);
  }

  .three-island-head h2 {
    font-size: 22px;
  }

  .ulBox {
    top: 84px;
  }

  .liBox h1 {
    padding-left: 18px;
  }
}
</style>
