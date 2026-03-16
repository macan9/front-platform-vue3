import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { Water } from 'three/addons/objects/Water2.js'
import { TWEEN } from 'three/addons/libs/tween.module.min.js'

export function islandInit({ mountEl, textEl }) {
  const container = mountEl?.value
  const textContainer = textEl?.value
  if (!container || !textContainer) return { destroy() {} }

  let index = 0
  let rafId = 0
  let destroyed = false
  let resizeRafId = 0
  let wheelLocked = false

  const cleanupFns = []
  const trackedTextures = []
  const trackedGeometries = []
  const trackedMaterials = []

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  const controls = new OrbitControls(camera, renderer.domElement)

  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/models/draco/')
  const gltfLoader = new GLTFLoader()
  gltfLoader.setDRACOLoader(dracoLoader)
  const rgbeLoader = new RGBELoader()

  let starsInstance = null
  let starsArr = []
  let endArr = []

  const trackGeometry = (geometry) => {
    trackedGeometries.push(geometry)
    return geometry
  }

  const trackMaterial = (material) => {
    trackedMaterials.push(material)
    return material
  }

  const trackTexture = (texture) => {
    trackedTextures.push(texture)
    return texture
  }

  const scenes = [
    {
      text: '看看房子内部',
      callback: () => {
        translateCamera(new THREE.Vector3(-3.23, 3, 4.06), new THREE.Vector3(-8, 2, 0))
      },
    },
    {
      text: '看看全景',
      callback: () => {
        translateCamera(new THREE.Vector3(7, 0, 23), new THREE.Vector3(0, 0, 0))
      },
    },
    {
      text: '海边宝箱',
      callback: () => {
        translateCamera(new THREE.Vector3(10, 3, 0), new THREE.Vector3(5, 2, 0))
      },
    },
    {
      text: '星星房屋远景',
      callback: () => {
        translateCamera(new THREE.Vector3(7, 0, 23), new THREE.Vector3(0, 0, 0))
        makeHeart()
      },
    },
    {
      text: 'GG',
      callback: () => {
        translateCamera(new THREE.Vector3(-20, 1.3, 6.6), new THREE.Vector3(5, 2, 0))
      },
    },
  ]

  const setTextItems = () => {
    textContainer.innerHTML = ''
    scenes.forEach((item) => {
      const title = document.createElement('h1')
      title.textContent = item.text
      textContainer.appendChild(title)
    })
  }

  const changeText = () => {
    textContainer.style.top = `${-index * 60}px`
  }

  const resize = () => {
    if (destroyed) return
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }

  const scheduleResize = () => {
    cancelAnimationFrame(resizeRafId)
    resizeRafId = requestAnimationFrame(resize)
  }

  const translateCamera = (position, target) => {
    const cameraTween = new TWEEN.Tween(camera.position)
    cameraTween.to({ x: position.x, y: position.y, z: position.z }, 1000)
    cameraTween.start()

    const controlsTween = new TWEEN.Tween(controls.target)
    controlsTween.to({ x: target.x, y: target.y, z: target.z }, 1000)
    controlsTween.onUpdate(() => {
      controls.update()
    })
    controlsTween.start()
  }

  const makeHeart = () => {
    const params = { time: 0 }
    const heartTween = new TWEEN.Tween(params)
    heartTween.to({ time: 1 }, 1000)
    heartTween.onUpdate(() => {
      for (let i = 0; i < 100; i += 1) {
        const x = starsArr[i].x + (endArr[i].x - starsArr[i].x) * params.time
        const y = starsArr[i].y + (endArr[i].y - starsArr[i].y) * params.time
        const z = starsArr[i].z + (endArr[i].z - starsArr[i].z) * params.time
        const matrix = new THREE.Matrix4()
        matrix.setPosition(x, y, z)
        starsInstance.setMatrixAt(i, matrix)
      }
      starsInstance.instanceMatrix.needsUpdate = true
    })
    heartTween.start()
  }

  const restoreHeart = () => {
    const params = { time: 0 }
    const resetHeartTween = new TWEEN.Tween(params)
    resetHeartTween.to({ time: 1 }, 1000)
    resetHeartTween.onUpdate(() => {
      for (let i = 0; i < 100; i += 1) {
        const x = endArr[i].x + (starsArr[i].x - endArr[i].x) * params.time
        const y = endArr[i].y + (starsArr[i].y - endArr[i].y) * params.time
        const z = endArr[i].z + (starsArr[i].z - endArr[i].z) * params.time
        const matrix = new THREE.Matrix4()
        matrix.setPosition(x, y, z)
        starsInstance.setMatrixAt(i, matrix)
      }
      starsInstance.instanceMatrix.needsUpdate = true
    })
    resetHeartTween.start()
  }

  const onWheel = (event) => {
    if (wheelLocked) return
    wheelLocked = true

    if (event.deltaY > 0) {
      index += 1
      if (index > scenes.length - 1) {
        index = 0
        restoreHeart()
      }
    } else {
      index -= 1
      if (index < 0) index = scenes.length - 1
    }

    changeText()
    scenes[index].callback()
    window.setTimeout(() => {
      wheelLocked = false
    }, 1000)
  }

  const animate = () => {
    if (destroyed) return
    TWEEN.update()
    controls.update()
    renderer.render(scene, camera)
    rafId = requestAnimationFrame(animate)
  }

  const initModel = () => {
    gltfLoader.load('/models/threeJsModels/scene.glb', (gltf) => {
      if (destroyed) return
      const model = gltf.scene
      model.traverse((child) => {
        if (child.name === 'Plane') child.visible = false
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      scene.add(model)
    })
  }

  const initEnvironment = () => {
    rgbeLoader.load('/models/textures/sky.hdr', (texture) => {
      if (destroyed) {
        texture.dispose()
        return
      }
      trackTexture(texture)
      texture.mapping = THREE.EquirectangularReflectionMapping
      scene.background = texture
      scene.environment = texture
    })
  }

  const initWater = () => {
    const waterGeometry = trackGeometry(new THREE.CircleGeometry(10000, 180))
    const water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      color: 0xeeeeff,
      flowDirection: new THREE.Vector2(1, 1),
      scale: 100,
    })
    water.rotation.x = -Math.PI / 2
    water.position.y = -0.4
    scene.add(water)
  }

  const initLights = () => {
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(0, 50, 0)
    scene.add(light)

    const pointLight = new THREE.PointLight(0xffffff, 30)
    pointLight.position.set(0.1, 2.4, -0.6)
    pointLight.castShadow = true
    scene.add(pointLight)

    const pointLightGroup = new THREE.Group()
    pointLightGroup.position.set(-7, 2.5, -1)
    const pointLightMeshes = []
    const radius = 3

    for (let i = 0; i < 3; i += 1) {
      const sphereGeometry = trackGeometry(new THREE.SphereGeometry(0.2, 16, 16))
      const sphereMaterial = trackMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 50,
      }))
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
      pointLightMeshes.push(sphere)
      sphere.position.set(
        radius * Math.cos((i * 2 * Math.PI) / 3),
        Math.cos((i * 2 * Math.PI) / 3),
        radius * Math.sin((i * 2 * Math.PI) / 3),
      )
      const childPointLight = new THREE.PointLight(0xffffff, 50)
      sphere.add(childPointLight)
      pointLightGroup.add(sphere)
    }

    scene.add(pointLightGroup)

    const tweenState = { angle: 0 }
    const tween = new TWEEN.Tween(tweenState)
    tween.to({ angle: Math.PI * 2 }, 7000)
    tween.onUpdate((obj) => {
      pointLightGroup.rotation.y = obj.angle
      pointLightMeshes.forEach((item, meshIndex) => {
        item.position.set(
          radius * Math.cos((meshIndex * 2 * Math.PI) / 3),
          Math.cos((meshIndex * 2 * Math.PI) / 3 + tweenState.angle * 5),
          radius * Math.sin((meshIndex * 2 * Math.PI) / 3),
        )
      })
    })
    tween.repeat(Infinity)
    tween.easing(TWEEN.Easing.Linear.None)
    tween.start()
  }

  const initStars = () => {
    starsInstance = new THREE.InstancedMesh(
      trackGeometry(new THREE.SphereGeometry(0.1, 16, 16)),
      trackMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 10,
      })),
      100,
    )

    starsArr = []
    endArr = []

    for (let i = 0; i < 100; i += 1) {
      const x = Math.random() * 100 - 50
      const y = Math.random() * 100 - 50
      const z = Math.random() * 100 - 50
      starsArr.push(new THREE.Vector3(x, y, z))
      const matrix = new THREE.Matrix4()
      matrix.setPosition(x, y, z)
      starsInstance.setMatrixAt(i, matrix)
    }
    scene.add(starsInstance)

    const heartShape = new THREE.Shape()
    heartShape.moveTo(25, 25)
    heartShape.bezierCurveTo(25, 25, 20, 0, 0, 0)
    heartShape.bezierCurveTo(-30, 0, -30, 35, -30, 35)
    heartShape.bezierCurveTo(-30, 55, -10, 77, 25, 95)
    heartShape.bezierCurveTo(60, 77, 80, 55, 80, 35)
    heartShape.bezierCurveTo(80, 35, 80, 0, 50, 0)
    heartShape.bezierCurveTo(35, 0, 25, 25, 25, 25)

    const center = new THREE.Vector3(0, 2, 10)
    for (let i = 0; i < 100; i += 1) {
      const point = heartShape.getPoint(i / 100)
      endArr.push(new THREE.Vector3(point.x * 0.1 + center.x, point.y * 0.1 + center.y, center.z))
    }
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.shadowMap.enabled = true
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.5
  renderer.physicallyCorrectLights = true

  camera.position.set(-3.23, 2.98, 4.06)
  camera.lookAt(0, 0, 0)

  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 0, 0)
  controls.update()

  container.innerHTML = ''
  container.appendChild(renderer.domElement)

  setTextItems()
  changeText()
  initModel()
  initEnvironment()
  initWater()
  initLights()
  initStars()
  resize()
  animate()

  container.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('resize', scheduleResize)
  cleanupFns.push(() => container.removeEventListener('wheel', onWheel))
  cleanupFns.push(() => window.removeEventListener('resize', scheduleResize))

  return {
    destroy() {
      if (destroyed) return
      destroyed = true

      cleanupFns.forEach((fn) => fn())
      cleanupFns.length = 0

      cancelAnimationFrame(rafId)
      cancelAnimationFrame(resizeRafId)
      TWEEN.removeAll()
      controls.dispose()
      dracoLoader.dispose()

      trackedGeometries.forEach((geometry) => geometry.dispose())
      trackedMaterials.forEach((material) => material.dispose())
      trackedTextures.forEach((texture) => texture.dispose())

      scene.background = null
      scene.environment = null
      scene.clear()

      renderer.dispose()
      renderer.forceContextLoss?.()
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }

      textContainer.innerHTML = ''
      container.innerHTML = ''
    },
  }
}
