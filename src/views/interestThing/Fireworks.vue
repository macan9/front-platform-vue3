<template>
  <section
    class="fireworks-page home-view-page"
    @dblclick="handleBurst"
  >
    <canvas
      ref="canvasRef"
      class="fireworks-canvas"
      @pointerdown="handleLaunch"
    />

    <div class="fireworks-mask" />
  </section>
</template>

<script>
export default {
  name: 'FireworksView',
}
</script>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const canvasRef = ref(null)
const autoLaunch = ref(true)

const rockets = []
const particles = []
const explosionColors = [12, 24, 36, 48, 195, 210, 280, 320]
const HORIZONTAL_SAFE_PADDING = 72
const BURST_TOP_RATIO = 0.18
const BURST_BOTTOM_RATIO = 0.58

let context = null
let animationFrameId = 0
let autoLaunchTimer = 0
let resizeHandler = null
let visibilityHandler = null
let screenWidth = 0
let screenHeight = 0
let devicePixelRatio = 1
let isCompactMode = false
let isRunning = false

const maxParticles = computed(() => (isCompactMode ? 220 : 420))
const autoLaunchInterval = computed(() => (isCompactMode ? 1200 : 900))

function randomBetween(min, max) {
  return Math.random() * (max - min) + min
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getSafeLaunchX(x = screenWidth / 2) {
  return clamp(x, HORIZONTAL_SAFE_PADDING, screenWidth - HORIZONTAL_SAFE_PADDING)
}

function getExplosionTargetY() {
  return randomBetween(screenHeight * BURST_TOP_RATIO, screenHeight * BURST_BOTTOM_RATIO)
}

class Particle {
  constructor(position = { x: 0, y: 0 }) {
    this.pos = {
      x: position.x,
      y: position.y,
    }
    this.vel = {
      x: 0,
      y: 0,
    }
    this.shrink = 0.97
    this.size = 2
    this.resistance = 1
    this.gravity = 0
    this.flick = false
    this.alpha = 1
    this.fade = 0
    this.color = 0
  }

  update() {
    this.vel.x *= this.resistance
    this.vel.y *= this.resistance
    this.vel.y += this.gravity

    this.pos.x += this.vel.x
    this.pos.y += this.vel.y
    this.size *= this.shrink
    this.alpha -= this.fade
  }

  render(ctx) {
    if (!this.exists()) return

    const radius = Math.max(0.6, this.flick ? Math.random() * this.size : this.size)

    if (isCompactMode) {
      ctx.fillStyle = `hsla(${this.color}, 100%, 62%, ${Math.max(this.alpha * 0.9, 0.12)})`
    } else {
      const gradient = ctx.createRadialGradient(
        this.pos.x,
        this.pos.y,
        0.1,
        this.pos.x,
        this.pos.y,
        radius
      )

      gradient.addColorStop(0.12, `rgba(255, 255, 255, ${this.alpha})`)
      gradient.addColorStop(0.72, `hsla(${this.color}, 100%, 58%, ${this.alpha})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient
    }

    ctx.beginPath()
    ctx.arc(this.pos.x, this.pos.y, radius, 0, Math.PI * 2, true)
    ctx.fill()
  }

  exists() {
    return this.alpha >= 0.1 && this.size >= 1
  }
}

class Rocket extends Particle {
  constructor(x) {
    super({
      x: getSafeLaunchX(x),
      y: screenHeight + 20,
    })

    this.explosionColor = randomFrom(explosionColors)
    this.blastScale = randomBetween(0.72, 1.5)
    this.targetY = getExplosionTargetY()
  }

  explode() {
    const scale = this.blastScale
    const count = Math.round(randomBetween(32, isCompactMode ? 62 : 96) * scale)

    for (let i = 0; i < count; i += 1) {
      const particle = new Particle(this.pos)
      const angle = Math.random() * Math.PI * 2
      const speed = Math.cos(Math.random() * Math.PI / 2) * randomBetween(5.5, isCompactMode ? 10 : 14) * scale

      particle.vel.x = Math.cos(angle) * speed
      particle.vel.y = Math.sin(angle) * speed
      particle.size = randomBetween(isCompactMode ? 2.4 : 3.4, isCompactMode ? 5.2 : 8.4) * Math.min(scale, 1.2)
      particle.gravity = randomBetween(0.16, 0.23)
      particle.resistance = randomBetween(0.9, 0.94)
      particle.shrink = randomBetween(0.92, 0.972)
      particle.fade = randomBetween(isCompactMode ? 0.014 : 0.01, isCompactMode ? 0.03 : 0.022)
      particle.flick = !isCompactMode
      particle.color = this.explosionColor

      particles.push(particle)
    }
  }
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas || !context) return

  screenWidth = window.innerWidth
  screenHeight = window.innerHeight
  isCompactMode = screenWidth <= 768 || window.matchMedia('(pointer: coarse)').matches
  devicePixelRatio = Math.min(window.devicePixelRatio || 1, isCompactMode ? 1.25 : 1.75)

  canvas.width = Math.round(screenWidth * devicePixelRatio)
  canvas.height = Math.round(screenHeight * devicePixelRatio)

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
}

function launchRocket(x = Math.random() * screenWidth) {
  if (!screenWidth || rockets.length >= (isCompactMode ? 5 : 10)) return

  const launchX = getSafeLaunchX(x)
  const edgeRatio = Math.abs(launchX - screenWidth / 2) / (screenWidth / 2)
  const rocket = new Rocket(launchX)
  rocket.vel.y = randomBetween(isCompactMode ? -8.2 : -10, isCompactMode ? -5.8 : -6.5)
  rocket.vel.x = randomBetween(-2, 2) * (1 - edgeRatio * 0.45)
  rocket.size = randomBetween(isCompactMode ? 3.5 : 5, isCompactMode ? 5 : 7)
  rocket.shrink = 0.999
  rocket.gravity = 0.03
  rocket.resistance = 0.995

  rockets.push(rocket)
}

function launchBurst() {
  const center = screenWidth / 2
  const offsets = isCompactMode ? [-60, 0, 60] : [-120, -60, 0, 60, 120]

  offsets.forEach((offset) => {
    launchRocket(center + offset)
  })
}

function clearScene() {
  if (!context) return

  // Keep the background image visible while still leaving a trailing glow.
  context.fillStyle = 'rgba(4, 8, 18, 0.12)'
  context.fillRect(0, 0, screenWidth, screenHeight)
}

function updateRockets() {
  for (let i = rockets.length - 1; i >= 0; i -= 1) {
    const rocket = rockets[i]
    rocket.update()
    rocket.pos.x = clamp(rocket.pos.x, HORIZONTAL_SAFE_PADDING * 0.72, screenWidth - HORIZONTAL_SAFE_PADDING * 0.72)
    rocket.render(context)

    const shouldExplode =
      rocket.pos.y <= rocket.targetY ||
      rocket.vel.y >= 0 ||
      rocket.pos.y < screenHeight * 0.12

    if (shouldExplode) {
      rocket.explode()
      rockets.splice(i, 1)
    } else if (!rocket.exists()) {
      rockets.splice(i, 1)
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i]
    particle.update()

    if (particle.exists()) {
      particle.render(context)
    } else {
      particles.splice(i, 1)
    }
  }

  if (particles.length > maxParticles.value) {
    particles.splice(0, particles.length - maxParticles.value)
  }
}

function animate() {
  if (!context || !isRunning) return

  context.globalCompositeOperation = 'source-over'
  clearScene()
  context.globalCompositeOperation = 'lighter'
  updateRockets()
  updateParticles()

  animationFrameId = window.requestAnimationFrame(animate)
}

function queueAutoLaunch() {
  if (autoLaunchTimer) {
    window.clearTimeout(autoLaunchTimer)
    autoLaunchTimer = 0
  }

  if (!autoLaunch.value || document.hidden) return

  const jitter = isCompactMode ? 280 : 180
  autoLaunchTimer = window.setTimeout(() => {
    launchRocket()

    if (!isCompactMode && Math.random() > 0.72) {
      launchRocket(randomBetween(screenWidth * 0.22, screenWidth * 0.78))
    }

    queueAutoLaunch()
  }, autoLaunchInterval.value + randomBetween(-jitter, jitter))
}

function startAnimation() {
  if (isRunning || !context) return

  isRunning = true
  queueAutoLaunch()
  animate()
}

function stopAnimation() {
  isRunning = false

  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId)
    animationFrameId = 0
  }

  if (autoLaunchTimer) {
    window.clearTimeout(autoLaunchTimer)
    autoLaunchTimer = 0
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopAnimation()
    return
  }

  startAnimation()
}

function handleResize() {
  resizeCanvas()

  if (!context) return

  context.globalCompositeOperation = 'source-over'
  context.fillStyle = 'rgba(4, 8, 18, 0.22)'
  context.fillRect(0, 0, screenWidth, screenHeight)
}

function handleLaunch(event) {
  const x = event.clientX
  launchRocket(x)

  if (!isCompactMode && Math.random() > 0.45) {
    launchRocket(x + randomBetween(-40, 40))
  }
}

function handleBurst() {
  launchBurst()
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  context = canvas.getContext('2d', {
    alpha: true,
    desynchronized: true,
  })

  if (!context) return

  resizeCanvas()

  context.fillStyle = 'rgba(4, 8, 18, 0.22)'
  context.fillRect(0, 0, screenWidth, screenHeight)

  resizeHandler = () => handleResize()
  visibilityHandler = () => handleVisibilityChange()
  window.addEventListener('resize', resizeHandler, { passive: true })
  document.addEventListener('visibilitychange', visibilityHandler)

  startAnimation()
})

onBeforeUnmount(() => {
  stopAnimation()

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }

  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
  }
})
</script>

<style lang="scss" scoped>
.fireworks-page {
  position: relative;
  height: 100%;
  overflow: hidden;
  background-color: #040812;
}

.fireworks-canvas,
.fireworks-mask {
  position: absolute;
  inset: 0;
}

.fireworks-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}

.fireworks-mask {
  pointer-events: none;
  background:
    radial-gradient(circle at top, rgba(255, 204, 124, 0.14), transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(71, 135, 255, 0.16), transparent 24%);
}
</style>
