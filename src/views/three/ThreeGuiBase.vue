<script setup>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
// import * as dat from 'dat.gui'
// import * as Stats from 'stats.js'
import { ElMessage } from 'element-plus'
import createGeometry from './utils/createGeometry.js'
import { onMounted, onUnmounted, ref } from 'vue'

const isLoading = ref(true)
let renderLoop = false
let rafId = null
const clock = new THREE.Clock()
let scene = null // 场景
let camera = null // 相机
let axes = null // 坐标轴
let plane = null // 平面
let renderer = null // 渲染器
let spotLight = null // 灯光
let cube = null // 立方体
let sphere = null // 球体
let sphereGroup = null
let flamePlanes = []
let flameTexture = null
let particleTexture = null
let flameParticles = null
let flameParticleState = []
let flameLight = null
const previousSpherePosition = new THREE.Vector3(-15, 3, 10)
const flameFlowDirection = new THREE.Vector3()
let flameFlowStrength = 0
let sphere2 = null // 球体
let sphere3 = null // 球体
// let gui = null // 参数调节器
// let stats = null // fps状态
let controls = null

const guiConfiguration = {
  message: '哈喽啊~我是荣顶',
  cubeSpeed: 0.03,
  sphereInitVelocity: 0.03,
  sphereAcceleration: 0.04,
  checkBox: false,
  button() {
    ElMessage.success('公众号：前端超人')
  },
  sphere3Color: '#ffae23',
}

function createFlameTexture(type = 'outer') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const gradient = ctx.createLinearGradient(128, 490, 128, 0)
  if (type === 'outer') {
    gradient.addColorStop(0, 'rgba(37,99,235,0)')
    gradient.addColorStop(0.12, 'rgba(59,130,246,0.38)')
    gradient.addColorStop(0.42, 'rgba(56,189,248,0.82)')
    gradient.addColorStop(0.82, 'rgba(125,211,252,0.62)')
    gradient.addColorStop(1, 'rgba(103,232,249,0.36)')
  } else {
    gradient.addColorStop(0, 'rgba(255,255,255,0)')
    gradient.addColorStop(0.18, 'rgba(220,248,255,0.24)')
    gradient.addColorStop(0.55, 'rgba(235,250,255,0.62)')
    gradient.addColorStop(0.86, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(1, 'rgba(255,255,255,0.96)')
  }

  ctx.fillStyle = gradient
  ctx.beginPath()
  if (type === 'outer') {
    ctx.moveTo(128, 26)
    ctx.bezierCurveTo(208, 74, 236, 178, 204, 294)
    ctx.bezierCurveTo(182, 362, 164, 426, 128, 500)
    ctx.bezierCurveTo(92, 426, 74, 362, 52, 294)
    ctx.bezierCurveTo(20, 178, 48, 74, 128, 26)
  } else {
    ctx.moveTo(128, 46)
    ctx.bezierCurveTo(172, 98, 188, 192, 166, 288)
    ctx.bezierCurveTo(152, 340, 140, 392, 128, 458)
    ctx.bezierCurveTo(116, 392, 104, 340, 90, 288)
    ctx.bezierCurveTo(68, 192, 84, 98, 128, 46)
  }
  ctx.fill()

  const coreGradient = type === 'outer'
    ? ctx.createRadialGradient(128, 392, 16, 128, 392, 84)
    : ctx.createRadialGradient(128, 398, 6, 128, 398, 42)
  if (type === 'outer') {
    coreGradient.addColorStop(0, 'rgba(96,165,250,0.18)')
    coreGradient.addColorStop(0.22, 'rgba(56,189,248,0.18)')
    coreGradient.addColorStop(0.5, 'rgba(37,99,235,0.08)')
    coreGradient.addColorStop(1, 'rgba(56,189,248,0)')
  } else {
    coreGradient.addColorStop(0, 'rgba(255,255,255,0.82)')
    coreGradient.addColorStop(0.18, 'rgba(235,248,255,0.7)')
    coreGradient.addColorStop(0.38, 'rgba(191,247,255,0.26)')
    coreGradient.addColorStop(1, 'rgba(191,247,255,0)')
  }
  ctx.fillStyle = coreGradient
  ctx.beginPath()
  ctx.arc(128, 398, type === 'outer' ? 78 : 38, 0, Math.PI * 2)
  ctx.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createParticleTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.12, 'rgba(191,247,255,0.95)')
  gradient.addColorStop(0.5, 'rgba(56,189,248,0.45)')
  gradient.addColorStop(1, 'rgba(56,189,248,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createFlamePlanes() {
  flameTexture = createFlameTexture('outer')
  if (!flameTexture) return

  const geometry = new THREE.PlaneGeometry(7.8, 12.2, 1, 1)
  const wrapGeometry = new THREE.PlaneGeometry(5.8, 6.6, 1, 1)
  const configs = [
    { rotationY: 0, scale: [1.08, 1.16, 1], phase: 0, offset: [0, 3.15, 0], type: 'outer' },
    { rotationY: Math.PI / 4, scale: [1, 1.04, 1], phase: 1.1, offset: [0.12, 3.05, -0.04], type: 'outer' },
    { rotationY: Math.PI / 2, scale: [0.94, 1.08, 1], phase: 2.2, offset: [-0.18, 3.1, 0.08], type: 'outer' },
    { rotationY: Math.PI * 0.75, scale: [0.82, 0.96, 1], phase: 3.05, offset: [0.06, 2.9, 0.16], type: 'outer' },
  ]

  flamePlanes = configs.map((config, index) => {
    const material = new THREE.MeshBasicMaterial({
      map: flameTexture,
      transparent: true,
      opacity: index === 0 ? 0.9 : 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      color: index === 0 ? '#60a5fa' : '#67e8f9',
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...config.offset)
    mesh.scale.set(...config.scale)
    mesh.rotation.y = config.rotationY
    mesh.renderOrder = 2
    sphereGroup.add(mesh)
    return { mesh, base: config }
  })

  const wrapConfigs = [
    { rotationY: 0, scale: [1.1, 1.08, 1], phase: 0.35, offset: [0, 2.15, 1.18], wrap: true, type: 'outer' },
    { rotationY: Math.PI / 2, scale: [1.08, 1.04, 1], phase: 1.2, offset: [1.18, 2.08, 0], wrap: true, type: 'outer' },
    { rotationY: Math.PI, scale: [1.04, 1.02, 1], phase: 2.1, offset: [0, 2.15, -1.18], wrap: true, type: 'outer' },
    { rotationY: Math.PI * 1.5, scale: [1.04, 1.04, 1], phase: 2.95, offset: [-1.18, 2.08, 0], wrap: true, type: 'outer' },
    { rotationY: Math.PI / 4, scale: [0.9, 0.92, 1], phase: 3.6, offset: [0.84, 2.2, 0.84], wrap: true, type: 'outer' },
    { rotationY: Math.PI * 1.25, scale: [0.9, 0.9, 1], phase: 4.2, offset: [-0.84, 2.14, -0.84], wrap: true, type: 'outer' },
  ]

  for (const config of wrapConfigs) {
    const material = new THREE.MeshBasicMaterial({
      map: flameTexture,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      color: '#7dd3fc',
    })
    const mesh = new THREE.Mesh(wrapGeometry, material)
    mesh.position.set(...config.offset)
    mesh.scale.set(...config.scale)
    mesh.rotation.y = config.rotationY
    mesh.renderOrder = 2
    sphereGroup.add(mesh)
    flamePlanes.push({ mesh, base: config })
  }
}

function spawnFlameParticle() {
  const angle = Math.random() * Math.PI * 2
  const radius = 1.45 + Math.random() * 1.35
  const trailingBias = 0.6 + flameFlowStrength * 1.2
  const jitter = 0.16 + Math.random() * 0.18
  return {
    x: Math.cos(angle) * radius + flameFlowDirection.x * trailingBias + (Math.random() - 0.5) * jitter,
    y: 2.4 + Math.random() * 1.9,
    z: Math.sin(angle) * radius + flameFlowDirection.z * trailingBias + (Math.random() - 0.5) * jitter,
    vx: flameFlowDirection.x * (0.03 + flameFlowStrength * 0.03) + (Math.random() - 0.5) * 0.025,
    vy: 0.08 + Math.random() * 0.1,
    vz: flameFlowDirection.z * (0.03 + flameFlowStrength * 0.03) + (Math.random() - 0.5) * 0.025,
    life: Math.random(),
    speed: 0.6 + Math.random() * 0.7,
  }
}

function createFlameParticles() {
  particleTexture = createParticleTexture()
  if (!particleTexture) return

  const count = 36
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  flameParticleState = []

  for (let i = 0; i < count; i += 1) {
    const particle = spawnFlameParticle()
    flameParticleState.push(particle)
    positions[i * 3] = particle.x
    positions[i * 3 + 1] = particle.y
    positions[i * 3 + 2] = particle.z

    const color = new THREE.Color().lerpColors(
      new THREE.Color('#dffbff'),
      new THREE.Color('#38bdf8'),
      Math.random() * 0.7,
    )
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    map: particleTexture,
    size: 1.1,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
    sizeAttenuation: true,
  })

  flameParticles = new THREE.Points(geometry, material)
  flameParticles.renderOrder = 3
  sphereGroup.add(flameParticles)
}

function createFlameEffect() {
  createFlamePlanes()
  createFlameParticles()
  flameLight = new THREE.PointLight('#4cc9ff', 2.4, 28, 2)
  flameLight.position.set(0, 4.2, 0)
  sphereGroup.add(flameLight)
}

function init() {
  // 定义场景
  scene = new THREE.Scene()

  // 给场景添加雾化效果
  // scene.fog = new THREE.Fog(0x123, 5, 10);
  // scene.fog = new THREE.FogExp2(0xffffff, 0.004);

  // 定义摄像机
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / (window.innerHeight - 60),
    0.1,
    1000,
  )

  // 创建坐标系
  createAxes()

  // 创建平面
  createPlane()

  // 创建光源
  createLight()

  // 创建模型
  createSphere()

  // 创建渲染器,放最后
  createRenderer()
}

// 创建球体
function createSphere() {
  // 创建立方体
  cube = createGeometry(
    scene,
    {
      type: 'BoxGeometry',
      attribute: [5, 5, 5],
    },
    { type: 'MeshLambertMaterial', options: { color: 0xff0000 } },
    {
      position: [0, 4, 0],
      castShadow: true,
    },
  )
  cube.name = 'cube'

  // 创建蓝色能量球和它的火焰特效
  sphereGroup = new THREE.Group()
  sphereGroup.position.set(-15, 3, 10)
  previousSpherePosition.copy(sphereGroup.position)
  flameFlowDirection.set(0, 0, 0)
  flameFlowStrength = 0
  scene.add(sphereGroup)

  sphere = new THREE.Mesh(
    new THREE.SphereGeometry(3, 48, 48),
    new THREE.MeshPhongMaterial({
      color: '#60a5fa',
      emissive: '#1d4ed8',
      emissiveIntensity: 1.05,
      shininess: 90,
      specular: new THREE.Color('#dbeafe'),
    }),
  )
  sphere.castShadow = false
  sphere.receiveShadow = true
  sphereGroup.add(sphere)

  createFlameEffect()

  sphere2 = createGeometry(
    scene,
    {
      type: 'SphereGeometry',
      attribute: [1, 20, 20],
    },
    { type: 'MeshLambertMaterial', options: { color: 'lightgreen' } },
    {
      position: [20, 1, 0],
      castShadow: true,
    },
  )
  sphere3 = createGeometry(
    scene,
    {
      type: 'SphereGeometry',
      attribute: [8, 20, 20],
    },
    {
      type: 'MeshLambertMaterial',
      options: { color: guiConfiguration.sphere3Color },
    },
    {
      position: [40, 8, 0],
      castShadow: true,
    },
  )
}

// 创建坐标系
function createAxes() {
  // 创建坐标系,设置轴线粗细值为20
  axes = new THREE.AxesHelper(20)
  // 将轴线添加到场景中
  scene.add(axes)
}

// 创建平面
function createPlane() {
  // 定义平面的大小
  const planeGeometry = new THREE.PlaneGeometry(200, 200)
  // 通过创建材质对象来设置平面的外观,这里使用的是基本材质
  const planeMaterial = new THREE.MeshLambertMaterial({
    color: 0xaaaaaa,
  })
  // 将大小和外观组合进Mesh对象,赋值给平面对象
  plane = new THREE.Mesh(planeGeometry, planeMaterial)
  // 平面绕x轴旋转九十度
  plane.rotation.x = -0.5 * Math.PI
  // 定义其在场景中的位置
  plane.position.set(0, 0, 0)
  // 接收光源
  plane.receiveShadow = true
  // 添加平面到场景中
  scene.add(plane)
}

// 创建光源
function createLight() {
  /* 需要注意的是：MeshBasicMaterial材质不会对光源有任何反应，基本材质只会使用指定的颜色来渲染物体 */
  // 定义光源
  spotLight = new THREE.SpotLight(0xffffff)
  // 设置光源位置
  spotLight.position.set(70, 130, 70)
  // 启用阴影功能
  spotLight.castShadow = true
  // 将光源添加进场景
  scene.add(spotLight)
}

// 创建渲染器
function createRenderer() {
  renderer = new THREE.WebGLRenderer()
  // 设置场景的背景颜色
  renderer.setClearColor(new THREE.Color(0x000000))
  // 设置场景大小
  renderer.setSize(window.innerWidth, window.innerHeight - 60)
  // 设置相机位置(x,y,z)
  camera.position.set(90, 12, 90)
  // 通过lookAt将摄像机指向场景中心,(默认指向0,0,0)
  camera.lookAt(scene.position)
  // 开启阴影
  renderer.shadowMap.enabled = true
  // 将渲染结果添加到dom元素中
  const container = document.getElementById('webgl-output')
  if (container) {
    const oldCanvas = container.querySelector('canvas')
    if (oldCanvas?.parentNode) oldCanvas.parentNode.removeChild(oldCanvas)
    container.appendChild(renderer.domElement)
  }
  // 使用指定的摄像机来渲染场景
  renderer.render(scene, camera)
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enablePan = false
  controls.minPolarAngle = Math.PI * 0.31
  controls.maxPolarAngle = Math.PI * 0.31
  controls.minDistance = 46
  controls.maxDistance = 125
  controls.target.set(0, 1, 0)
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(() => {
    isLoading.value = false
  })
}

// 执行动画
function animate() {
  // stats.update();
  cube.rotation.x += guiConfiguration.cubeSpeed
  cube.rotation.y += guiConfiguration.cubeSpeed
  cube.rotation.z += guiConfiguration.cubeSpeed
  // sphere.position.x += guiConfiguration.speed;
  // if (sphere.position.x > 20) {
  //     sphere.position.x = -20;
  // }
  guiConfiguration.sphereInitVelocity += guiConfiguration.sphereAcceleration
  sphereGroup.position.x = 20 * Math.cos(guiConfiguration.sphereInitVelocity)
  sphereGroup.position.z = 20 * Math.sin(guiConfiguration.sphereInitVelocity)

  const elapsedTime = clock.getElapsedTime()
  if (sphere?.material) {
    const burnPulse = 0.72 + 0.28 * Math.sin(elapsedTime * 8.5)
    const surfacePulse = 0.5 + 0.5 * Math.sin(elapsedTime * 12.5 + 0.8)
    sphere.material.emissiveIntensity = 0.72 + burnPulse * 0.58
    sphere.material.emissive.setRGB(
      0.08 + surfacePulse * 0.1,
      0.24 + burnPulse * 0.16,
      0.58 + burnPulse * 0.18,
    )
    sphere.material.color.setRGB(
      0.34 + burnPulse * 0.06,
      0.6 + surfacePulse * 0.08,
      0.9 + burnPulse * 0.03,
    )
  }

  for (const flamePlane of flamePlanes) {
    const { mesh, base } = flamePlane
    const isWrap = !!base.wrap
    const pulse = (isWrap ? 0.86 : 0.82)
      + (isWrap ? 0.12 : 0.18) * Math.sin(elapsedTime * 9 + base.phase)
    const drift = isWrap ? 0.08 : 0.12
    mesh.position.x = base.offset[0] + Math.sin(elapsedTime * 2.2 + base.phase) * drift
    mesh.position.z = base.offset[2] + Math.cos(elapsedTime * 2.6 + base.phase) * drift
    mesh.position.y = base.offset[1] + Math.abs(Math.sin(elapsedTime * (isWrap ? 4.4 : 5.5) + base.phase)) * (isWrap ? 0.18 : 0.35)
    mesh.rotation.y = base.rotationY + Math.sin(elapsedTime * 1.8 + base.phase) * (isWrap ? 0.04 : 0.08)
    mesh.rotation.z = Math.sin(elapsedTime * (isWrap ? 2.6 : 3.5) + base.phase) * (isWrap ? 0.03 : 0.06)
    mesh.scale.set(
      base.scale[0] * (isWrap ? 0.98 + pulse * 0.06 : 0.94 + pulse * 0.12),
      base.scale[1] * (isWrap ? 0.98 + pulse * 0.12 : 0.94 + pulse * 0.28),
      1,
    )
    mesh.material.opacity = (isWrap ? 0.68 : mesh === flamePlanes[0]?.mesh ? 1.02 : 0.78) * pulse
  }

  if (flameParticles) {
    const positions = flameParticles.geometry.attributes.position.array
    for (let i = 0; i < flameParticleState.length; i += 1) {
      const particle = flameParticleState[i]
      particle.life += 0.018 * particle.speed
      particle.x += particle.vx
      particle.y += particle.vy * particle.speed
      particle.z += particle.vz
      particle.vx *= 0.992
      particle.vz *= 0.992

      if (particle.life >= 1 || particle.y > 9.6) {
        flameParticleState[i] = spawnFlameParticle()
      }

      const active = flameParticleState[i]
      positions[i * 3] = active.x
      positions[i * 3 + 1] = active.y
      positions[i * 3 + 2] = active.z
    }
    flameParticles.geometry.attributes.position.needsUpdate = true
  }

  if (flameLight) {
    flameLight.intensity = 2.1 + Math.sin(elapsedTime * 12) * 0.35
  }

  sphere2.position.x = 10 * Math.cos(guiConfiguration.sphereInitVelocity + 0.9)
  sphere2.position.z = 10 * Math.sin(guiConfiguration.sphereInitVelocity + 0.9)

  sphere3.position.x = 40 * Math.cos(guiConfiguration.sphereInitVelocity - 0.9)
  sphere3.position.z = 40 * Math.sin(guiConfiguration.sphereInitVelocity - 0.9)
  //   console.log(scene, camera,'---scene, camera---')
  controls?.update()
  renderer.render(scene, camera)
  if (renderLoop) rafId = requestAnimationFrame(animate)
}

function disposeMaterial(mat) {
  if (!mat) return
  // 释放材质上挂的贴图（如果未来加了纹理，这里能兜底）
  for (const key in mat) {
    const value = mat[key]
    if (value && value.isTexture) value.dispose()
  }
  mat.dispose?.()
}

function disposeThree() {
  // 停止动画循环
  renderLoop = false
  if (rafId != null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  // 释放场景内的几何体/材质等 GPU 资源
  if (scene) {
    scene.traverse((obj) => {
      if (obj?.geometry) obj.geometry.dispose?.()
      if (obj?.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(disposeMaterial)
        else disposeMaterial(obj.material)
      }
    })
    scene.clear()
  }

  // 移除 canvas，并释放 renderer / WebGL 上下文
  if (renderer) {
    const dom = renderer.domElement
    renderer.dispose?.()
    // 强制丢弃上下文，避免反复进出导致 GPU 内存累积
    renderer.forceContextLoss?.()
    renderer = null

    if (dom?.parentNode) dom.parentNode.removeChild(dom)
  }

  scene = null
  camera = null
  controls?.dispose?.()
  controls = null
  axes = null
  plane = null
  spotLight = null
  cube = null
  sphere = null
  sphereGroup = null
  flamePlanes = []
  flameTexture = null
  particleTexture = null
  flameParticles = null
  flameParticleState = []
  flameLight = null
  sphere2 = null
  sphere3 = null
}

// 获取pfs状态
// function getStats() {
//   stats = new Stats()
//   stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
//   document.querySelector('.page-container').appendChild(stats.dom)
//   stats.domElement.style = 'position:absolute;bottom:0px;left:0px'
//   function statusAnimate() {
//     stats.begin()
//     // monitored code goes here
//     stats.end()
//     requestAnimationFrame(statusAnimate)
//   }
//   requestAnimationFrame(statusAnimate)
// }

// 配置dat.gui
// function configGUI() {
//   gui = new dat.GUI()
//
//   gui.add(guiConfiguration, 'message')
//   gui.add(guiConfiguration, 'cubeSpeed', 0, 0.5)
//   gui.add(guiConfiguration, 'sphereInitVelocity', -1, 1)
//   gui.add(guiConfiguration, 'sphereAcceleration', 0, 1)
//   gui.add(guiConfiguration, 'checkBox')
//   gui.add(guiConfiguration, 'button').name('点我')
//
//   // const testObj = {
//   //   color0: '#ffae23', // CSS string
//   //   color1: [0, 128, 255], // RGB array
//   //   color2: [0, 128, 255, 0.3], // RGB with alpha
//   //   color3: { h: 350, s: 0.9, v: 0.3 }, // Hue, saturation, value
//   // }
//   const f1 = gui.addFolder('球的颜色')
//   const controller = f1
//     .addColor(guiConfiguration, 'sphere3Color')
//     .name('CSS颜色值')
//   // 第二个分组默认打开
//   f1.open()
//   // f1.addColor(testObj, 'color0').name('CSS颜色值')
//   // f1.addColor(testObj, 'color1').name('RGB颜色值')
//   // f1.addColor(testObj, 'color2').name('RGBA颜色值')
//   // f1.addColor(testObj, 'color3').name('HUB颜色值')
//
//   // 设置gui的dom样式
//   gui.domElement.style = 'position:absolute;top:500px;left:0px'
//
//   // 对应控制项值修改完毕响应
//   controller.onFinishChange(() => {
//     // sphere3.color.set(val)
//     scene.remove(sphere3)
//     createSphere()
//   })
// }

function onResize() {
  if (!renderer || !camera) return
  renderer.setSize(window.innerWidth, window.innerHeight - 60)
  camera.aspect = window.innerWidth / (window.innerHeight - 60)
  camera.updateProjectionMatrix()
}

onMounted(() => {
  init()
  window.addEventListener('resize', onResize)
  renderLoop = true
  animate()
  //   getStats()
  //   configGUI()
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  disposeThree()
  // const guiDom = gui.domElement
  // guiDom.parentNode.removeChild(guiDom)
  //
  // const statsDom = stats.domElement
  // statsDom.parentNode.removeChild(statsDom)
})
</script>

<template>
  <!-- <FilepathBox file-path="__filePath__" /> -->
  <div id="webgl-output" :class="{ 'is-ready': !isLoading }">
    <div class="three-loading" :class="{ 'is-hidden': !isLoading }">
      <div class="three-loading-spinner"></div>
      <p>正在初始化场景演示...</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
#webgl-output {
  position: relative;
  height: 100%;
}

#webgl-output :deep(canvas) {
  opacity: 0;
  transition: opacity 0.35s ease;
}

#webgl-output.is-ready :deep(canvas) {
  opacity: 1;
}

.three-loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.88);
  color: #fff;
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
  border: 3px solid rgba(255, 255, 255, 0.18);
  border-top-color: #7dd3fc;
  border-radius: 50%;
  animation: three-spin 0.9s linear infinite;
}

@keyframes three-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
