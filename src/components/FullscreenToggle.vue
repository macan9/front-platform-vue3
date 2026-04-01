<template>
  <button
    class="fullscreen-toggle"
    :class="{
      'is-active': currentFullscreen,
      'is-disabled': disabled,
      'is-fixed': fixed,
    }"
    type="button"
    :title="buttonTitle"
    :aria-label="buttonTitle"
    :disabled="disabled"
    @click="toggleFullscreen"
  >
    <span
      class="fullscreen-toggle__icon"
      :class="currentFullscreen ? 'is-exit' : 'is-enter'"
      aria-hidden="true"
    />
  </button>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  fullscreen: {
    type: Boolean,
    default: false,
  },
  menuVisible: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  fixed: {
    type: Boolean,
    default: false,
  },
  target: {
    type: [String, Object, null],
    default: null,
  },
  fallbackToPageMode: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits([
  'update:fullscreen',
  'update:menuVisible',
  'change',
  'enter',
  'exit',
])

const currentFullscreen = ref(Boolean(props.fullscreen))
let viewportMetaEl = null
let originalViewportContent = ''

const lockedTouchState = {
  lastTouchEndAt: 0,
}

const toggleInteractionLockClass = (enabled) => {
  document.documentElement.classList.toggle('fullscreen-interaction-lock', enabled)
  document.body.classList.toggle('fullscreen-interaction-lock', enabled)
}

const ensureViewportMeta = () => {
  let meta = document.querySelector('meta[name="viewport"]')

  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'viewport')
    document.head.appendChild(meta)
  }

  return meta
}

const lockViewportZoom = () => {
  viewportMetaEl = ensureViewportMeta()
  originalViewportContent = viewportMetaEl.getAttribute('content') || ''
  viewportMetaEl.setAttribute(
    'content',
    'width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no,viewport-fit=cover'
  )
}

const unlockViewportZoom = () => {
  if (!viewportMetaEl) return

  if (originalViewportContent) {
    viewportMetaEl.setAttribute('content', originalViewportContent)
  } else {
    viewportMetaEl.setAttribute('content', 'width=device-width,initial-scale=1.0')
  }
}

const preventContextMenu = (event) => {
  if (!currentFullscreen.value) return
  event.preventDefault()
}

const preventGestureStart = (event) => {
  if (!currentFullscreen.value) return
  event.preventDefault()
}

const preventPinchZoom = (event) => {
  if (!currentFullscreen.value) return
  if ((event.touches?.length || 0) > 1) {
    event.preventDefault()
  }
}

const preventDoubleTapZoom = (event) => {
  if (!currentFullscreen.value) return

  const now = Date.now()
  if (now - lockedTouchState.lastTouchEndAt <= 300) {
    event.preventDefault()
  }
  lockedTouchState.lastTouchEndAt = now
}

const enableFullscreenGuards = () => {
  toggleInteractionLockClass(true)
  lockViewportZoom()

  document.addEventListener('contextmenu', preventContextMenu)
  document.addEventListener('gesturestart', preventGestureStart, { passive: false })
  document.addEventListener('touchstart', preventPinchZoom, { passive: false })
  document.addEventListener('touchmove', preventPinchZoom, { passive: false })
  document.addEventListener('touchend', preventDoubleTapZoom, { passive: false })
}

const disableFullscreenGuards = () => {
  toggleInteractionLockClass(false)
  unlockViewportZoom()

  document.removeEventListener('contextmenu', preventContextMenu)
  document.removeEventListener('gesturestart', preventGestureStart)
  document.removeEventListener('touchstart', preventPinchZoom)
  document.removeEventListener('touchmove', preventPinchZoom)
  document.removeEventListener('touchend', preventDoubleTapZoom)
}

const getFullscreenElement = () => (
  document.fullscreenElement ||
  document.webkitFullscreenElement ||
  document.mozFullScreenElement ||
  document.msFullscreenElement ||
  null
)

const resolveTargetElement = () => {
  if (typeof window === 'undefined') return null

  if (typeof props.target === 'string' && props.target.trim()) {
    return document.querySelector(props.target.trim())
  }

  if (props.target && props.target.nodeType === 1) {
    return props.target
  }

  return document.documentElement
}

const isBrowserFullscreenActive = () => Boolean(getFullscreenElement())

const syncFullscreenState = (value) => {
  const nextValue = Boolean(value)
  currentFullscreen.value = nextValue
  emit('update:fullscreen', nextValue)
  emit('change', nextValue)

  if (nextValue) {
    emit('enter')
    return
  }

  emit('exit')
}

const handleFullscreenChange = () => {
  if (isBrowserFullscreenActive()) {
    if (props.menuVisible) {
      emit('update:menuVisible', false)
    }

    syncFullscreenState(true)
    return
  }

  if (currentFullscreen.value) {
    emit('update:menuVisible', true)
    syncFullscreenState(false)
  }
}

const requestNativeFullscreen = async () => {
  const targetEl = resolveTargetElement()
  if (!targetEl) return false

  const requestMethod = (
    targetEl.requestFullscreen ||
    targetEl.webkitRequestFullscreen ||
    targetEl.mozRequestFullScreen ||
    targetEl.msRequestFullscreen
  )

  if (!requestMethod) return false

  await requestMethod.call(targetEl)
  return true
}

const exitNativeFullscreen = async () => {
  const exitMethod = (
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen
  )

  if (!exitMethod) return false

  await exitMethod.call(document)
  return true
}

const enterFullscreen = async () => {
  emit('update:menuVisible', false)

  try {
    const requested = await requestNativeFullscreen()
    if (requested) {
      syncFullscreenState(true)
      return
    }
  } catch (error) {
    console.warn('request fullscreen failed:', error)
  }

  if (props.fallbackToPageMode) {
    syncFullscreenState(true)
    return
  }

  emit('update:menuVisible', true)
}

const leaveFullscreen = async () => {
  try {
    if (isBrowserFullscreenActive()) {
      await exitNativeFullscreen()
    }
  } catch (error) {
    console.warn('exit fullscreen failed:', error)
  }

  emit('update:menuVisible', true)
  syncFullscreenState(false)
}

const toggleFullscreen = async () => {
  if (props.disabled) return

  if (currentFullscreen.value || isBrowserFullscreenActive()) {
    await leaveFullscreen()
    return
  }

  await enterFullscreen()
}

const buttonTitle = computed(() => (
  currentFullscreen.value ? 'Exit fullscreen' : 'Enter fullscreen'
))

watch(
  () => props.fullscreen,
  (value) => {
    currentFullscreen.value = Boolean(value)
  }
)

watch(
  () => currentFullscreen.value,
  (value) => {
    if (value) {
      enableFullscreenGuards()
      return
    }

    disableFullscreenGuards()
  },
  { immediate: true }
)

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
})

onBeforeUnmount(() => {
  disableFullscreenGuards()
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
})
</script>

<style scoped lang="scss">
.fullscreen-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid rgba(188, 204, 220, 0.92);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 26px rgba(98, 124, 150, 0.16);
  color: #36536d;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(104, 163, 235, 0.95);
    box-shadow: 0 14px 30px rgba(93, 145, 211, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  &.is-active {
    border-color: rgba(88, 158, 241, 0.95);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(236, 245, 255, 0.98));
  }

  &.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }

  &.is-fixed {
    position: fixed;
    top: 18px;
    right: 18px;
    z-index: 4000;
  }
}

.fullscreen-toggle__icon {
  position: relative;
  display: block;
  width: 18px;
  height: 18px;
}

.fullscreen-toggle__icon.is-enter::before,
.fullscreen-toggle__icon.is-enter::after,
.fullscreen-toggle__icon.is-exit::before,
.fullscreen-toggle__icon.is-exit::after {
  content: '';
  position: absolute;
}

.fullscreen-toggle__icon.is-enter::before {
  inset: 0;
  background:
    linear-gradient(#36536d, #36536d) left top / 7px 2px no-repeat,
    linear-gradient(#36536d, #36536d) left top / 2px 7px no-repeat,
    linear-gradient(#36536d, #36536d) right top / 7px 2px no-repeat,
    linear-gradient(#36536d, #36536d) right top / 2px 7px no-repeat,
    linear-gradient(#36536d, #36536d) left bottom / 7px 2px no-repeat,
    linear-gradient(#36536d, #36536d) left bottom / 2px 7px no-repeat,
    linear-gradient(#36536d, #36536d) right bottom / 7px 2px no-repeat,
    linear-gradient(#36536d, #36536d) right bottom / 2px 7px no-repeat;
}

.fullscreen-toggle__icon.is-exit::before,
.fullscreen-toggle__icon.is-exit::after {
  top: 8px;
  left: 1px;
  width: 16px;
  height: 2px;
  border-radius: 999px;
  background: #36536d;
  transform-origin: center;
}

.fullscreen-toggle__icon.is-exit::before {
  transform: rotate(45deg);
}

.fullscreen-toggle__icon.is-exit::after {
  transform: rotate(-45deg);
}
</style>
