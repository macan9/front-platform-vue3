<template>
  <div class="dont-hit-the-spikes">
    <div class="dont-hit-fullscreen-toggle">
      <FullscreenToggle
        v-model:fullscreen="pageFullscreen"
        v-model:menu-visible="pageMenuVisible"
        fixed
      />
    </div>

    <div class="three-loading" :class="{ 'is-hidden': !isLoading }">
      <div class="three-loading-spinner"></div>
      <p>正在初始化躲避尖刺...</p>
    </div>

    <div id="dont-hit" ref="mountEl" :class="{ 'is-ready': !isLoading }"></div>

    <div class="dont-hit-remind">
      <div class="hud">
        <button class="theme-switch-btn" type="button" @click="toggleTheme">
          主题：{{ currentThemeLabel }}
        </button>
        <h1 class="reaction">速度：{{ reactionSpeedText }}</h1>
        <h1 class="density">密度：{{ spikeDensityText }}</h1>
        <h1 class="score">得分：{{ score }}</h1>
        <h1 class="last-score">上次得分：{{ lastScore }}</h1>
        <h1 class="paused" v-if="paused">已暂停</h1>
      </div>

      <div class="modal" v-if="stopped">
        <div class="modal-card">
          <h2 class="modal-title">{{ gameOver ? '游戏结束' : '准备开始' }}</h2>
          <p class="modal-text" v-if="gameOver">本局得分：{{ lastScore }}</p>
          <p v-else class="modal-text">玩法：左右移动，上键翻转重力，空格起跳，P 暂停。</p>
          <div class="modal-actions">
            <button class="modal-btn" type="button" @click="requestStart">
              {{ gameOver ? '重新开始' : '开始游戏' }}
            </button>
            <button
              v-if="gameOver"
              class="modal-btn"
              type="button"
              :disabled="savingScore || scoreRecorded"
              @click="recordScore"
            >
              {{ recordBtnText }}
            </button>
            <button class="modal-btn" type="button" @click="showLeaderboard = true">查看排行榜</button>
          </div>
          <p v-if="recordError" class="modal-error">{{ recordError }}</p>
        </div>
      </div>

      <div v-if="isMobile" class="touch-controls">
        <button
          class="touch-button touch-button--direction"
          type="button"
          @touchstart.prevent="handleMoveLeft"
          @mousedown.prevent="handleMoveLeft"
        >
          左移
        </button>
        <button
          class="touch-button touch-button--direction"
          type="button"
          @touchstart.prevent="handleMoveRight"
          @mousedown.prevent="handleMoveRight"
        >
          右移
        </button>
        <button
          class="touch-button touch-button--action"
          type="button"
          @touchstart.prevent="handleFlipGravity"
          @mousedown.prevent="handleFlipGravity"
        >
          翻转
        </button>
        <button
          class="touch-button touch-button--jump"
          type="button"
          @touchstart.prevent="handleJumpPress"
          @touchend.prevent="handleJumpRelease"
          @touchcancel.prevent="handleJumpRelease"
          @mousedown.prevent="handleJumpPress"
          @mouseup.prevent="handleJumpRelease"
          @mouseleave.prevent="handleJumpRelease"
        >
          跳跃
        </button>
      </div>

      <LeaderboardDialog :visible="showLeaderboard" @close="showLeaderboard = false" />
    </div>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { isApiSuccess } from '@/common/requests/requests.js'
import { DailyTimeFormat } from '@/utils/utils.js'
import { gameScoreCreateReq } from '@/apis/gameScoreApis.js'
import FullscreenToggle from '@/components/FullscreenToggle.vue'
import LeaderboardDialog from '@/views/three/components/LeaderboardDialog.vue'
import { createDontHitTheSpikeRuntime } from '@/views/three/utils/dontHitTheSpikeRuntime.js'

const store = useStore()
const homeLayoutControls = inject('homeLayoutControls', null)
const mountEl = ref(null)
const score = ref(0)
const lastScore = ref(0)
const paused = ref(false)
const stopped = ref(true)
const gameOver = ref(false)
const savingScore = ref(false)
const scoreRecorded = ref(false)
const lastScoreTime = ref('')
const recordError = ref('')
const showLeaderboard = ref(false)
const isLoading = ref(true)
const reactionSpeed = ref(0)
const spikeDensity = ref(0)
const currentTheme = ref('neon')
const isMobile = computed(() => store.state.isMobile)
const pageFullscreen = ref(false)
const pageMenuVisible = ref(true)

const recordBtnText = computed(() => {
  if (scoreRecorded.value) return '已记录'
  if (savingScore.value) return '记录中...'
  return '记录分数'
})

const reactionSpeedText = computed(() => `${reactionSpeed.value.toFixed(2)}x`)
const spikeDensityText = computed(() => spikeDensity.value.toFixed(2))
const currentThemeLabel = computed(() => (currentTheme.value === 'neon' ? 'Neon' : 'Industrial'))

let gameRuntime = null
let layoutObserver = null

function requestStart() {
  gameRuntime?.requestStart()
}

function handleMoveLeft() {
  gameRuntime?.moveLeft()
}

function handleMoveRight() {
  gameRuntime?.moveRight()
}

function handleFlipGravity() {
  gameRuntime?.flipGravity()
}

function handleJumpPress() {
  gameRuntime?.jumpPress()
}

function handleJumpRelease() {
  gameRuntime?.jumpRelease()
}

function toggleTheme() {
  const nextTheme = currentTheme.value === 'industrial' ? 'neon' : 'industrial'
  currentTheme.value = gameRuntime?.setTheme?.(nextTheme) || nextTheme
}

const safeParseJson = (str) => {
  const s = String(str || '').trim()
  if (!s) return null
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

const getCurrentUserId = () => {
  const userInfoObj = safeParseJson(localStorage.getItem('userInfo')) || {}
  return String(userInfoObj?.user?.id || '')
}

const recordScore = async () => {
  if (savingScore.value || scoreRecorded.value) return
  recordError.value = ''

  const userId = getCurrentUserId()
  if (!userId) {
    ElMessage({ message: '请先登录后再记录分数', type: 'warning' })
    return
  }

  const scoreValue = Number(lastScore.value || 0)
  const scoreTime = lastScoreTime.value || DailyTimeFormat(new Date())

  savingScore.value = true
  try {
    const res = await gameScoreCreateReq({ score: scoreValue, scoreTime, userId })
    const ok = isApiSuccess(res)
    if (!ok) {
      const msg = res?.message || '记录失败'
      recordError.value = String(msg)
      ElMessage({ message: recordError.value, type: 'error' })
      return
    }

    scoreRecorded.value = true
    ElMessage({ message: '分数已记录', type: 'success' })
  } catch (e) {
    recordError.value = String(e?.message || '记录失败')
    ElMessage({ message: recordError.value, type: 'error' })
  } finally {
    savingScore.value = false
  }
}

onMounted(async () => {
  await nextTick()

  gameRuntime = createDontHitTheSpikeRuntime({
    mountEl,
    onReady: () => {
      isLoading.value = false
    },
    onSpeedChange: (speed) => {
      reactionSpeed.value = Number(speed || 0)
    },
    onDensityChange: (density) => {
      spikeDensity.value = Number(density || 0)
    },
    score,
    lastScore,
    paused,
    stopped,
    gameOver,
    scoreRecorded,
    recordError,
    lastScoreTime,
  })

  requestAnimationFrame(() => {
    gameRuntime?.resize?.()
    currentTheme.value = gameRuntime?.getTheme?.() || 'neon'
  })

  const targetEl = mountEl.value?.parentElement || mountEl.value
  if (targetEl && typeof ResizeObserver !== 'undefined') {
    layoutObserver = new ResizeObserver(() => {
      gameRuntime?.resize?.()
    })
    layoutObserver.observe(targetEl)
  }
})

watch(
  () => gameOver.value,
  async (next, prev) => {
    if (!next || prev) return
    if (scoreRecorded.value || savingScore.value) return
    await recordScore()
  }
)

watch(
  () => pageFullscreen.value,
  (value) => {
    homeLayoutControls?.setFullscreen?.(value)
  },
  { immediate: true }
)

watch(
  () => pageMenuVisible.value,
  (value) => {
    homeLayoutControls?.setMenuVisible?.(value)
  },
  { immediate: true }
)

onUnmounted(() => {
  pageFullscreen.value = false
  pageMenuVisible.value = true
  homeLayoutControls?.setFullscreen?.(false)
  homeLayoutControls?.setMenuVisible?.(true)
  layoutObserver?.disconnect?.()
  layoutObserver = null
  gameRuntime?.destroy()
  gameRuntime = null
})
</script>

<style lang="scss">
.dont-hit-the-spikes {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;

  .dont-hit-fullscreen-toggle {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 5.4rem);
    right: 16px;
    z-index: 50;
  }

  #dont-hit {
    width: 100%;
    height: 100%;
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.35s ease;

    canvas {
      display: block;
    }
  }

  #dont-hit.is-ready {
    opacity: 1;
  }

  .three-loading {
    position: absolute;
    inset: 0;
    z-index: 4;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background:
      radial-gradient(circle at top, rgba(252, 186, 3, 0.14), transparent 30%),
      rgba(0, 13, 34, 0.86);
    color: #fcba03;
    transition: opacity 0.35s ease, visibility 0.35s ease;
  }

  .three-loading.is-hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .three-loading-spinner {
    width: 44px;
    height: 44px;
    border: 3px solid rgba(252, 186, 3, 0.18);
    border-top-color: #fcba03;
    border-radius: 50%;
    animation: three-spin 0.9s linear infinite;
  }

  .dont-hit-remind {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 2;

    .hud {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    h1 {
      margin: 0;
      color: #fcba03;
      font-size: 1.25rem;
      text-shadow: 2px 2px rgba(0, 0, 0, 0.5);
      font-family: Arial, sans-serif;
    }

    .reaction {
      position: absolute;
      top: 1rem;
      left: 1rem;
    }

    .density {
      position: absolute;
      top: 3.2rem;
      left: 1rem;
    }

    .paused {
      position: absolute;
      top: 5.4rem;
      left: 1rem;
    }

    .score {
      position: absolute;
      top: 1rem;
      right: 1rem;
    }

    .last-score {
      position: absolute;
      top: 3.2rem;
      right: 1rem;
    }

    .theme-switch-btn {
      position: absolute;
      top: 1rem;
      right: 50%;
      transform: translateX(50%);
      min-width: 132px;
      padding: 0.55rem 0.9rem;
      border: 1px solid rgba(252, 186, 3, 0.45);
      border-radius: 999px;
      background: rgba(0, 17, 39, 0.68);
      color: #fcba03;
      font-size: 0.92rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22);
      pointer-events: auto;
      cursor: pointer;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .theme-switch-btn:hover {
      background: rgba(252, 186, 3, 0.14);
    }

    .modal {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.35);
      pointer-events: auto;
    }

    .modal-card {
      min-width: 240px;
      max-width: 80%;
      padding: 16px 18px;
      border-radius: 12px;
      background: rgba(0, 29, 69, 0.92);
      border: 1px solid rgba(252, 186, 3, 0.35);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      text-align: center;
    }

    .modal-title {
      margin-bottom: 0.5rem;
      font-size: 1.25rem;
      color: #fcba03;
      text-shadow: 2px 2px rgba(0, 0, 0, 0.5);
    }

    .modal-text {
      margin: 0 0 1rem 0;
      color: rgba(252, 186, 3, 0.95);
    }

    .modal-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: stretch;
    }

    .modal-btn {
      appearance: none;
      border: 1px solid rgba(252, 186, 3, 0.55);
      background: rgba(0, 0, 0, 0.25);
      color: #fcba03;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 1rem;
      width: 100%;
    }

    .modal-btn:hover {
      background: rgba(252, 186, 3, 0.12);
    }

    .modal-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .modal-error {
      margin: 0.75rem 0 0 0;
      color: rgba(255, 120, 120, 0.95);
      font-size: 0.95rem;
    }

    .touch-controls {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 3;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      padding: 14px 12px calc(14px + env(safe-area-inset-bottom, 0px));
      pointer-events: auto;
      touch-action: manipulation;
    }

    .touch-button {
      min-height: 54px;
      padding: 0 8px;
      border: 1px solid rgba(252, 186, 3, 0.42);
      border-radius: 14px;
      background: rgba(0, 17, 39, 0.72);
      color: #fcba03;
      font-size: 0.98rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .touch-button--jump {
      background: rgba(252, 186, 3, 0.16);
    }

    .touch-button--action {
      background: rgba(130, 92, 255, 0.18);
    }

    .touch-button:active {
      transform: translateY(1px) scale(0.985);
      background: rgba(252, 186, 3, 0.24);
    }
  }
}

@media (min-width: 769px) {
  .dont-hit-the-spikes .dont-hit-fullscreen-toggle {
    top: 5.4rem;
    right: 20px;
  }

  .dont-hit-the-spikes .dont-hit-remind .touch-controls {
    display: none;
  }
}

@media (max-width: 768px) {
  .dont-hit-the-spikes .dont-hit-remind {
    .hud h1 {
      font-size: 1rem;
    }

    .reaction,
    .score,
    .theme-switch-btn {
      top: 0.8rem;
    }

    .density,
    .last-score {
      top: 2.6rem;
    }

    .paused {
      top: 4.4rem;
    }

    .theme-switch-btn {
      min-width: 110px;
      padding: 0.48rem 0.75rem;
      font-size: 0.84rem;
    }
  }

  .dont-hit-the-spikes .dont-hit-fullscreen-toggle {
    top: calc(env(safe-area-inset-top, 0px) + 4.8rem);
    right: 12px;
  }
}

@keyframes three-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
