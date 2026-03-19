<script setup>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
// import * as dat from 'dat.gui'
// import * as Stats from 'stats.js'
import { ElMessage } from 'element-plus'
import createGeometry from './utils/createGeometry.js'
import { onMounted, onUnmounted, ref } from 'vue';
const isLoading = ref(true)
let renderLoop = false
let rafId = null
let scene = null // 场景
let camera = null // 相机
let axes = null // 坐标轴
let plane = null // 平面
let renderer = null // 渲染器
let spotLight = null // 灯光
let cube = null // 立方体
let sphere = null // 球体
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
  // 创建球体
  sphere = createGeometry(
    scene,
    {
      type: 'SphereGeometry',
      attribute: [3, 20, 20],
    },
    { type: 'MeshLambertMaterial', options: { color: 0x7777ff } },
    {
      position: [-15, 3, 10],
      castShadow: true,
    },
  )
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
  controls.target.set(0, 8, 0)
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
  sphere.position.x = 20 * Math.cos(guiConfiguration.sphereInitVelocity)
  sphere.position.z = 20 * Math.sin(guiConfiguration.sphereInitVelocity)

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

//   gui.add(guiConfiguration, 'message')
//   gui.add(guiConfiguration, 'cubeSpeed', 0, 0.5)
//   gui.add(guiConfiguration, 'sphereInitVelocity', -1, 1)
//   gui.add(guiConfiguration, 'sphereAcceleration', 0, 1)
//   gui.add(guiConfiguration, 'checkBox')
//   gui.add(guiConfiguration, 'button').name('点我')

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

//   // 设置gui的dom样式
//   gui.domElement.style = 'position:absolute;top:500px;left:0px'

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
