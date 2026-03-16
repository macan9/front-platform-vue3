<script setup>
import * as THREE from 'three'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const containerRef = ref(null)
const labelLayerRef = ref(null)
const hoveredPlanet = ref('太阳')

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x020617, 0.00045)

const sceneRoot = new THREE.Group()
scene.add(sceneRoot)

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 4000)
camera.position.set(-120, 68, 160)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setClearColor(new THREE.Color(0x020617))
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.outputEncoding = THREE.sRGBEncoding

const orbitControls = new OrbitControls(camera, renderer.domElement)
orbitControls.enableDamping = true
orbitControls.dampingFactor = 0.06
orbitControls.autoRotate = true
orbitControls.autoRotateSpeed = 0.35
orbitControls.minDistance = 25
orbitControls.maxDistance = 320
orbitControls.target.set(0, 8, 0)

const textureLoader = new THREE.TextureLoader()
const rgbeLoader = new RGBELoader()
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const clock = new THREE.Clock()

const labelEntries = []
const planetBodies = []
const disposableGeometries = []
const disposableMaterials = []
const disposableTextures = []

const planetsConfiguration = [
  { name: '太阳', radius: 14, distance: 0, rotationSpeed: 0.0025, orbitSpeed: 0, mapImg: '/textures/sun_color.jpg', emissive: 0xffb347 },
  { name: '水星', radius: 1.2, distance: 22, rotationSpeed: 0.01, orbitSpeed: 0.85, mapImg: '/textures/mercury_color.jpg' },
  { name: '金星', radius: 1.8, distance: 30, rotationSpeed: 0.007, orbitSpeed: 0.72, mapImg: '/textures/venus_color.jpg' },
  { name: '地球', radius: 2.1, distance: 40, rotationSpeed: 0.016, orbitSpeed: 0.6, mapImg: '/textures/earth_color.jpg' },
  { name: '火星', radius: 1.7, distance: 52, rotationSpeed: 0.013, orbitSpeed: 0.5, mapImg: '/textures/mars_color.jpg' },
  { name: '木星', radius: 5.8, distance: 70, rotationSpeed: 0.022, orbitSpeed: 0.34, mapImg: '/textures/jupiter_color.jpg' },
  { name: '土星', radius: 4.9, distance: 94, rotationSpeed: 0.018, orbitSpeed: 0.26, mapImg: '/textures/saturn_color.jpg' },
  { name: '天王星', radius: 3.1, distance: 118, rotationSpeed: 0.014, orbitSpeed: 0.18, mapImg: '/textures/uranus_color.jpg' },
  { name: '海王星', radius: 2.9, distance: 140, rotationSpeed: 0.015, orbitSpeed: 0.14, mapImg: '/textures/neptune_color.jpg' },
]

const selectedPlanetInfo = computed(() => {
  const target = planetBodies.find((item) => item.config.name === hoveredPlanet.value)
  if (!target) return null

  if (!target.config.distance) {
    return '恒星核心，提供整套场景主光源。'
  }

  return `轨道半径 ${target.config.distance} / 自转 ${target.config.rotationSpeed.toFixed(3)} / 公转 ${target.config.orbitSpeed.toFixed(2)}`
})

function trackGeometry(geometry) {
  disposableGeometries.push(geometry)
  return geometry
}

function trackMaterial(material) {
  disposableMaterials.push(material)
  return material
}

function trackTexture(texture) {
  disposableTextures.push(texture)
  return texture
}

function loadTexture(path) {
  return trackTexture(textureLoader.load(path))
}

function createLights() {
  const ambientLight = new THREE.AmbientLight(0x8fb0ff, 0.18)
  const pointLight = new THREE.PointLight(0xffffff, 2.4, 0, 0)
  const haloLight = new THREE.PointLight(0xff9d4d, 1.2, 180)

  pointLight.position.set(0, 0, 0)
  haloLight.position.set(0, 0, 0)

  sceneRoot.add(ambientLight)
  sceneRoot.add(pointLight)
  sceneRoot.add(haloLight)
}

function createUniverse() {
  rgbeLoader.load('/models/textures/sky.hdr', (texture) => {
    trackTexture(texture)
    texture.mapping = THREE.EquirectangularReflectionMapping
    scene.background = texture
    scene.environment = texture
  })
}

function createStarField() {
  const positions = []
  const colors = []
  const starsGeometry = trackGeometry(new THREE.BufferGeometry())

  for (let i = 0; i < 5000; i += 1) {
    const radius = THREE.MathUtils.randFloat(420, 1800)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2))
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.cos(phi)
    const z = radius * Math.sin(phi) * Math.sin(theta)
    positions.push(x, y, z)

    const tone = THREE.MathUtils.randFloat(0.75, 1)
    colors.push(tone, tone, 1)
  }

  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

  const starsMaterial = trackMaterial(new THREE.PointsMaterial({
    size: 1.4,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
  }))

  const starsMesh = new THREE.Points(starsGeometry, starsMaterial)
  sceneRoot.add(starsMesh)
}

function createOrbitRing(distance, color) {
  const orbitGeometry = trackGeometry(new THREE.RingGeometry(distance - 0.08, distance + 0.08, 256))
  const orbitMaterial = trackMaterial(new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.2,
  }))

  const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial)
  orbit.rotation.x = Math.PI / 2
  sceneRoot.add(orbit)
}

function createSaturnRing(parentMesh, radius) {
  const ringGeometry = trackGeometry(new THREE.RingGeometry(radius * 1.35, radius * 2.2, 96))
  const ringMaterial = trackMaterial(new THREE.MeshBasicMaterial({
    color: 0xd9c7a3,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.72,
  }))

  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  ring.rotation.x = Math.PI * 0.42
  parentMesh.add(ring)
}

function createMoon(parentPivot, earthRadius) {
  const moonPivot = new THREE.Group()
  const moonGeometry = trackGeometry(new THREE.SphereGeometry(0.48, 24, 24))
  const moonMaterial = trackMaterial(new THREE.MeshStandardMaterial({
    color: 0xdfe7f0,
    roughness: 0.95,
    metalness: 0.02,
  }))

  const moon = new THREE.Mesh(moonGeometry, moonMaterial)
  moon.position.set(4.5, 0.4, 0)
  moonPivot.add(moon)

  const moonOrbitGeometry = trackGeometry(new THREE.RingGeometry(4.45, 4.52, 120))
  const moonOrbitMaterial = trackMaterial(new THREE.MeshBasicMaterial({
    color: 0x94a3b8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.24,
  }))
  const moonOrbit = new THREE.Mesh(moonOrbitGeometry, moonOrbitMaterial)
  moonOrbit.rotation.x = Math.PI / 2

  parentPivot.add(moonOrbit)
  parentPivot.add(moonPivot)

  return {
    mesh: moon,
    pivot: moonPivot,
    orbitRadius: earthRadius + 2.4,
    orbitSpeed: 1.8,
  }
}

function createPlanets() {
  planetsConfiguration.forEach((config, index) => {
    const pivot = new THREE.Group()
    const geometry = trackGeometry(new THREE.SphereGeometry(config.radius, 48, 48))
    const materialOptions = {
      map: loadTexture(config.mapImg),
      roughness: index === 0 ? 1 : 0.92,
      metalness: 0.04,
    }

    if (config.emissive) {
      materialOptions.emissive = new THREE.Color(config.emissive)
      materialOptions.emissiveIntensity = 1.1
    }

    const material = trackMaterial(new THREE.MeshStandardMaterial(materialOptions))
    const mesh = new THREE.Mesh(geometry, material)

    mesh.position.set(config.distance, 0, 0)
    mesh.userData.name = config.name
    pivot.add(mesh)
    sceneRoot.add(pivot)

    const body = {
      config,
      pivot,
      mesh,
      angle: Math.random() * Math.PI * 2,
      moon: null,
    }

    if (config.distance) {
      createOrbitRing(config.distance, index % 2 === 0 ? 0x60a5fa : 0xe2e8f0)
    }

    if (config.name === '土星') {
      createSaturnRing(mesh, config.radius)
    }

    if (config.name === '地球') {
      body.moon = createMoon(pivot, config.radius)
    }

    const labelEl = document.createElement('button')
    labelEl.type = 'button'
    labelEl.className = 'planet-label'
    labelEl.textContent = config.name
    labelEl.addEventListener('click', () => focusPlanet(body))
    labelLayerRef.value?.appendChild(labelEl)

    labelEntries.push({ el: labelEl, mesh, body })
    planetBodies.push(body)
  })
}

function focusPlanet(body) {
  hoveredPlanet.value = body.config.name
  orbitControls.target.copy(body.mesh.position)
}

function createSunGlow() {
  const glowGeometry = trackGeometry(new THREE.SphereGeometry(17.5, 48, 48))
  const glowMaterial = trackMaterial(new THREE.MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.18,
  }))

  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial)
  sceneRoot.add(glowMesh)
}

function updateRendererSize() {
  const container = containerRef.value
  if (!container) return

  const width = container.clientWidth || window.innerWidth
  const height = container.clientHeight || window.innerHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function updateLabels() {
  const container = containerRef.value
  const labelLayer = labelLayerRef.value
  if (!container || !labelLayer) return

  const width = container.clientWidth
  const height = container.clientHeight

  labelEntries.forEach(({ el, mesh, body }) => {
    const worldPosition = mesh.getWorldPosition(new THREE.Vector3())
    const screenPosition = worldPosition.project(camera)
    const visible = screenPosition.z < 1
      && screenPosition.x >= -1.2
      && screenPosition.x <= 1.2
      && screenPosition.y >= -1.2
      && screenPosition.y <= 1.2

    if (!visible) {
      el.style.opacity = '0'
      return
    }

    const x = (screenPosition.x * 0.5 + 0.5) * width
    const y = (-screenPosition.y * 0.5 + 0.5) * height

    el.style.opacity = '1'
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    el.classList.toggle('is-active', hoveredPlanet.value === body.config.name)
  })
}

function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}

function onPointerMove(event) {
  updatePointer(event)
  raycaster.setFromCamera(pointer, camera)
  const intersects = raycaster.intersectObjects(planetBodies.map((item) => item.mesh), false)

  if (intersects.length > 0) {
    hoveredPlanet.value = intersects[0].object.userData.name
  }
}

function onCanvasClick(event) {
  updatePointer(event)
  raycaster.setFromCamera(pointer, camera)
  const intersects = raycaster.intersectObjects(planetBodies.map((item) => item.mesh), false)
  if (!intersects.length) return

  const targetBody = planetBodies.find((item) => item.mesh === intersects[0].object)
  if (targetBody) focusPlanet(targetBody)
}

let animationId = 0

function animate() {
  const delta = clock.getDelta()
  const elapsed = clock.elapsedTime

  planetBodies.forEach((body) => {
    body.mesh.rotation.y += body.config.rotationSpeed

    if (body.config.distance) {
      body.angle += delta * body.config.orbitSpeed * 0.35
      body.pivot.rotation.y = body.angle
    }

    if (body.moon) {
      body.moon.pivot.rotation.y += delta * body.moon.orbitSpeed
      body.moon.mesh.rotation.y += 0.01
    }
  })

  const sun = planetBodies[0]
  if (sun) {
    sun.mesh.scale.setScalar(1 + Math.sin(elapsed * 1.0) * 0.015)
  }

  orbitControls.update()
  updateLabels()
  renderer.render(scene, camera)
  animationId = requestAnimationFrame(animate)
}

function disposeScene() {
  if (animationId) cancelAnimationFrame(animationId)

  labelEntries.forEach(({ el }) => el.remove())
  labelEntries.length = 0
  planetBodies.length = 0

  disposableGeometries.forEach((geometry) => geometry.dispose())
  disposableMaterials.forEach((material) => material.dispose())
  disposableTextures.forEach((texture) => texture.dispose())

  scene.background = null
  scene.environment = null
  renderer.dispose()
  scene.clear()
}

function onWindowResize() {
  updateRendererSize()
  updateLabels()
}

function init() {
  const container = containerRef.value
  if (!container) return

  createLights()
  createUniverse()
  createStarField()
  createSunGlow()
  createPlanets()

  updateRendererSize()
  container.appendChild(renderer.domElement)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('click', onCanvasClick)

  animate()
}

onMounted(() => {
  init()
  window.addEventListener('resize', onWindowResize, false)
})

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize, false)
  renderer.domElement.removeEventListener('pointermove', onPointerMove)
  renderer.domElement.removeEventListener('click', onCanvasClick)
  orbitControls.dispose()
  disposeScene()
})
</script>

<template>
  <div ref="containerRef" class="planet-container">
    <div class="planet-overlay">
      <div class="planet-panel">
        <p class="planet-eyebrow">Solar System</p>
        <h2>{{ hoveredPlanet }}</h2>
        <p>{{ selectedPlanetInfo }}</p>
      </div>
    </div>
    <div ref="labelLayerRef" class="label-layer"></div>
  </div>
</template>

<style lang="scss" scoped>
.planet-container {
  position: relative;
  width: 100%;
  height: calc(100vh - 72px);
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(59, 130, 246, 0.14), transparent 36%),
    radial-gradient(circle at bottom, rgba(249, 115, 22, 0.1), transparent 28%),
    #020617;
}

.planet-overlay {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 3;
  pointer-events: none;
}

.planet-panel {
  width: min(320px, calc(100vw - 32px));
  padding: 18px 20px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  background: rgba(2, 6, 23, 0.58);
  backdrop-filter: blur(16px);
  color: #e2e8f0;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.45);
}

.planet-panel h2 {
  margin: 6px 0 10px;
  font-size: 30px;
  line-height: 1.1;
  font-weight: 700;
}

.planet-panel p {
  margin: 0;
  line-height: 1.6;
}

.planet-eyebrow {
  color: #7dd3fc;
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 12px;
}

.label-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

:deep(.planet-label) {
  position: absolute;
  padding: 7px 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.62);
  color: #f8fafc;
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.08em;
  transform: translate3d(-9999px, -9999px, 0);
  pointer-events: auto;
  cursor: pointer;
  transition: opacity 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}

:deep(.planet-label:hover),
:deep(.planet-label.is-active) {
  background: rgba(14, 165, 233, 0.35);
  border-color: rgba(125, 211, 252, 0.65);
}

canvas {
  display: block;
}

@media (max-width: 768px) {
  .planet-container {
    height: calc(100vh - 60px);
  }

  .planet-overlay {
    top: 16px;
    left: 16px;
  }

  .planet-panel {
    padding: 16px;
  }

  .planet-panel h2 {
    font-size: 24px;
  }
}
</style>
