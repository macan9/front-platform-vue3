import * as THREE from "three";
import { gsap } from "gsap";
import { DailyTimeFormat } from "@/utils/utils.js";
import floorDiffuseUrl from "@/assets/three/dont-hit-the-spike/floor_diff.jpg";
import floorNormalUrl from "@/assets/three/dont-hit-the-spike/floor_normal.jpg";
import wallDiffuseUrl from "@/assets/three/dont-hit-the-spike/wall_diff.jpg";
import wallNormalUrl from "@/assets/three/dont-hit-the-spike/wall_normal.jpg";
import ceilingDiffuseUrl from "@/assets/three/dont-hit-the-spike/ceiling_diff.jpg";
import ceilingNormalUrl from "@/assets/three/dont-hit-the-spike/ceiling_normal.jpg";
import {
  DONT_HIT_THE_SPIKE_CONFIG,
  createJumpState,
  canToggleGravity,
  createPlayerState,
  createVerticalBounds,
  cutJumpVelocity,
  moveLane,
  resetJumpState,
  resetPlayerState,
  startJump,
  stopJumpHold,
  toggleGravity,
  updatePlayerPhysics,
} from "@/views/three/utils/dontHitTheSpikePhysics.js";
import {
  advanceCones,
  createConeField,
  detectConeCollision,
  recycleConeField,
  resetConeField,
  updatePassedConeScore,
} from "@/views/three/utils/dontHitTheSpikeObstacles.js";

function getMountSize(mountEl) {
  const el = mountEl.value;
  if (!el) return { width: window.innerWidth, height: window.innerHeight };
  return {
    width: el.clientWidth || window.innerWidth,
    height: el.clientHeight || window.innerHeight,
  };
}

function getDensityByRowNumber(rowNumber, rowsPerGeneration, baseDensity, densityStep, maxSpikeDensity) {
  const generation = Math.floor(Number(rowNumber || 0) / Number(rowsPerGeneration || 50)) + 1;
  const density = Number(baseDensity || 0.2) + (generation - 1) * Number(densityStep || 0.1);
  return THREE.MathUtils.clamp(density, Number(baseDensity || 0.2), Number(maxSpikeDensity || 0.8));
}

const textureLoader = new THREE.TextureLoader();
const DONT_HIT_THEME_PRESETS = {
  industrial: {
    label: "Industrial",
    sceneBackground: "#001d45",
    fogColor: "#001d45",
    floor: { color: "#ffffff", emissive: "#20486c", emissiveIntensity: 0.34, roughness: 0.84, metalness: 0.12, repeatX: 6, repeatY: 70, normalScale: 0.18 },
    ceiling: { color: "#ffffff", emissive: "#3b2858", emissiveIntensity: 0.36, roughness: 0.76, metalness: 0.14, repeatX: 7, repeatY: 64, normalScale: 0.12 },
    wall: { color: "#ffffff", emissive: "#182331", emissiveIntensity: 0.08, roughness: 0.82, metalness: 0.08, repeatX: 10, repeatY: 16, normalScale: 0.2 },
  },
  neon: {
    label: "Neon",
    sceneBackground: "#16324b",
    fogColor: "#16324b",
    floor: { color: "#ecfbff", emissive: "#2f9fd1", emissiveIntensity: 0.52, roughness: 0.58, metalness: 0.2, repeatX: 5, repeatY: 54, normalScale: 0.22 },
    ceiling: { color: "#fff6ff", emissive: "#9158d8", emissiveIntensity: 0.56, roughness: 0.54, metalness: 0.18, repeatX: 6, repeatY: 48, normalScale: 0.14 },
    wall: { color: "#c9b2ff", emissive: "#6f4fd6", emissiveIntensity: 0.2, roughness: 0.68, metalness: 0.1, repeatX: 7, repeatY: 10, normalScale: 0.24 },
  },
};

function setTextureColorSpace(texture, colorSpace) {
  if (!texture || !colorSpace) return;
  if ("colorSpace" in texture) {
    texture.colorSpace = colorSpace;
    return;
  }
  if (colorSpace === THREE.SRGBColorSpace && "encoding" in texture && "sRGBEncoding" in THREE) {
    texture.encoding = THREE.sRGBEncoding;
  }
}

function loadRepeatTexture(url, { repeatX, repeatY, anisotropy = 8, colorSpace = null } = {}) {
  const texture = textureLoader.load(url);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = anisotropy;
  setTextureColorSpace(texture, colorSpace);
  return texture;
}

function applyThemeToStandardMaterial(material, texture, config) {
  if (!material || !texture || !config) return;
  material.color.set(config.color || "#ffffff");
  material.emissive.set(config.emissive || "#000000");
  material.emissiveIntensity = Number(config.emissiveIntensity || 0);
  material.roughness = Number(config.roughness ?? material.roughness ?? 0.8);
  material.metalness = Number(config.metalness ?? material.metalness ?? 0.1);
  if (material.normalScale) {
    const scale = Number(config.normalScale ?? 0.18);
    material.normalScale.set(scale, scale);
  }
  texture.repeat.set(Number(config.repeatX || 1), Number(config.repeatY || 1));
  texture.needsUpdate = true;
  material.needsUpdate = true;
}

function createPlayerStripeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const colors = ["#dfcf34", "#9fda3f", "#d7c62f", "#8ed43d"];
  const stripeCount = 8;
  const stripeWidth = canvas.width / stripeCount;

  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height);
  }

  // Add a soft equator ring while keeping the palette strictly yellow-green.
  const equator = ctx.createLinearGradient(0, 0, 0, canvas.height);
  equator.addColorStop(0, "rgba(255,255,255,0)");
  equator.addColorStop(0.42, "rgba(255,255,255,0)");
  equator.addColorStop(0.5, "rgba(245,255,166,0.16)");
  equator.addColorStop(0.58, "rgba(255,255,255,0)");
  equator.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = equator;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Keep asymmetry but stay within the same yellow-green palette.
  ctx.fillStyle = "rgba(180, 230, 88, 0.68)";
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.62, canvas.height * 0.18);
  ctx.lineTo(canvas.width * 0.78, canvas.height * 0.3);
  ctx.lineTo(canvas.width * 0.68, canvas.height * 0.52);
  ctx.lineTo(canvas.width * 0.52, canvas.height * 0.38);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  setTextureColorSpace(texture, THREE.SRGBColorSpace);
  return texture;
}

function createPlayerMesh(playerRadius, player) {
  const playerGeo = new THREE.SphereGeometry(playerRadius, 24, 16);
  const playerTexture = createPlayerStripeTexture();
  const playerMat = new THREE.MeshStandardMaterial({
    map: playerTexture,
    color: "#ffffff",
    roughness: 0.78,
    metalness: 0.01,
  });
  const playerMesh = new THREE.Mesh(playerGeo, playerMat);
  playerMesh.position.copy(player.pos);

  return { playerGeo, playerMat, playerMesh, playerTexture };
}

function createProjectionTexture(innerColor, outerColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(128, 128, 12, 128, 128, 110);
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(0.45, outerColor);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createEdgeBlendTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "rgba(255,255,255,0.42)");
  gradient.addColorStop(0.22, "rgba(255,255,255,0.16)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.04)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(20, 1);
  texture.needsUpdate = true;
  return texture;
}

function createSceneRuntime({ mountEl, player, playerRadius, ceilingY, lightY, levelHalfWidth, levelMinY, cameraBoundsPadding }) {
  const sceneDepth = 650;
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  const cameraOffset = new THREE.Vector3(0, 8, 18);
  const cameraLookOffset = new THREE.Vector3(0, 5, 0);
  const cameraRig = new THREE.Group();
  cameraRig.add(camera);
  camera.position.set(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#001d45");
  scene.fog = new THREE.Fog("#001d45", 10, 390);
  scene.add(cameraRig);

  const worldCenterY = ceilingY * 0.5;
  const worldPivot = new THREE.Group();
  worldPivot.position.y = worldCenterY;
  const world = new THREE.Group();
  world.position.y = -worldCenterY;
  worldPivot.add(world);
  scene.add(worldPivot);

  const wallGeo = new THREE.BoxGeometry(30, 0.5, sceneDepth);
  const sideWallGeo = new THREE.BoxGeometry(0.5, ceilingY - levelMinY + 0.5, sceneDepth);
  const floorTexture = loadRepeatTexture(floorDiffuseUrl, {
    repeatX: 6,
    repeatY: 70,
    colorSpace: THREE.SRGBColorSpace,
  });
  const floorNormalTexture = loadRepeatTexture(floorNormalUrl, {
    repeatX: 6,
    repeatY: 70,
  });
  const ceilingTexture = loadRepeatTexture(ceilingDiffuseUrl, {
    repeatX: 7,
    repeatY: 64,
    colorSpace: THREE.SRGBColorSpace,
  });
  const ceilingNormalTexture = loadRepeatTexture(ceilingNormalUrl, {
    repeatX: 7,
    repeatY: 64,
  });
  const sideTexture = loadRepeatTexture(wallDiffuseUrl, {
    repeatX: 10,
    repeatY: 16,
    colorSpace: THREE.SRGBColorSpace,
  });
  const sideNormalTexture = loadRepeatTexture(wallNormalUrl, {
    repeatX: 10,
    repeatY: 16,
  });
  const edgeBlendTexture = createEdgeBlendTexture();
  const floorProjectionTexture = createProjectionTexture("rgba(126, 207, 255, 0.42)", "rgba(126, 207, 255, 0.12)");
  const ceilingProjectionTexture = createProjectionTexture("rgba(216, 179, 255, 0.4)", "rgba(216, 179, 255, 0.11)");
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTexture,
    normalMap: floorNormalTexture,
    color: "#ffffff",
    emissive: new THREE.Color("#20486c"),
    emissiveIntensity: 0.32,
    roughness: 0.84,
    metalness: 0.12,
  });
  const ceilingMat = new THREE.MeshStandardMaterial({
    map: ceilingTexture,
    normalMap: ceilingNormalTexture,
    color: "#ffffff",
    emissive: new THREE.Color("#3b2858"),
    emissiveIntensity: 0.34,
    roughness: 0.76,
    metalness: 0.14,
  });
  const sideMat = new THREE.MeshStandardMaterial({
    map: sideTexture,
    normalMap: sideNormalTexture,
    color: "#ffffff",
    emissive: new THREE.Color("#102119"),
    emissiveIntensity: 0.12,
    roughness: 0.82,
    metalness: 0.08,
  });
  const edgeBlendMat = new THREE.MeshBasicMaterial({
    map: edgeBlendTexture,
    color: "#f7fbff",
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const floorProjectionMat = new THREE.MeshBasicMaterial({
    map: floorProjectionTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });
  const ceilingProjectionMat = new THREE.MeshBasicMaterial({
    map: ceilingProjectionTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.62,
  });
  const floormesh = new THREE.Mesh(wallGeo, floorMat);
  const ceilingmesh = new THREE.Mesh(wallGeo, ceilingMat);
  const leftWallMesh = new THREE.Mesh(sideWallGeo, sideMat);
  const rightWallMesh = new THREE.Mesh(sideWallGeo, sideMat);
  const edgeBlendGeo = new THREE.PlaneGeometry(sceneDepth, 3.2);
  const floorLeftEdgeMesh = new THREE.Mesh(edgeBlendGeo, edgeBlendMat);
  const floorRightEdgeMesh = new THREE.Mesh(edgeBlendGeo, edgeBlendMat);
  const ceilingLeftEdgeMesh = new THREE.Mesh(edgeBlendGeo, edgeBlendMat);
  const ceilingRightEdgeMesh = new THREE.Mesh(edgeBlendGeo, edgeBlendMat);
  const projectionGeo = new THREE.PlaneGeometry(playerRadius * 3.8, playerRadius * 3.8);
  const floorProjectionMesh = new THREE.Mesh(projectionGeo, floorProjectionMat);
  const ceilingProjectionMesh = new THREE.Mesh(projectionGeo, ceilingProjectionMat);
  ceilingmesh.position.y = ceilingY;
  leftWallMesh.position.set(-levelHalfWidth, ceilingY * 0.5, 0);
  rightWallMesh.position.set(levelHalfWidth, ceilingY * 0.5, 0);
  floorLeftEdgeMesh.position.set(-levelHalfWidth + 0.22, levelMinY + 1.1, 0);
  floorRightEdgeMesh.position.set(levelHalfWidth - 0.22, levelMinY + 1.1, 0);
  ceilingLeftEdgeMesh.position.set(-levelHalfWidth + 0.22, ceilingY - 1.1, 0);
  ceilingRightEdgeMesh.position.set(levelHalfWidth - 0.22, ceilingY - 1.1, 0);
  floorLeftEdgeMesh.rotation.y = Math.PI * 0.5;
  floorRightEdgeMesh.rotation.y = -Math.PI * 0.5;
  ceilingLeftEdgeMesh.rotation.y = Math.PI * 0.5;
  ceilingRightEdgeMesh.rotation.y = -Math.PI * 0.5;
  floorLeftEdgeMesh.renderOrder = 1;
  floorRightEdgeMesh.renderOrder = 1;
  ceilingLeftEdgeMesh.renderOrder = 1;
  ceilingRightEdgeMesh.renderOrder = 1;
  floorProjectionMesh.rotation.x = -Math.PI * 0.5;
  ceilingProjectionMesh.rotation.x = Math.PI * 0.5;
  floorProjectionMesh.position.set(player.pos.x, levelMinY + 0.26, player.pos.z);
  ceilingProjectionMesh.position.set(player.pos.x, ceilingY - 0.26, player.pos.z);
  floorProjectionMesh.renderOrder = 2;
  ceilingProjectionMesh.renderOrder = 2;
  world.add(floormesh);
  world.add(ceilingmesh);
  world.add(leftWallMesh);
  world.add(rightWallMesh);
  world.add(floorLeftEdgeMesh);
  world.add(floorRightEdgeMesh);
  world.add(ceilingLeftEdgeMesh);
  world.add(ceilingRightEdgeMesh);
  world.add(floorProjectionMesh);
  world.add(ceilingProjectionMesh);

  const { playerGeo, playerMat, playerMesh, playerTexture } = createPlayerMesh(playerRadius, player);
  world.add(playerMesh);

  const ambientLight = new THREE.AmbientLight(0xdce8ff, 0.62);
  world.add(ambientLight);
  const light1 = new THREE.HemisphereLight(0xf8fbff, 0x1b2742, 1.45);
  world.add(light1);
  const light = new THREE.PointLight(0xffffff, 1.35, 150);
  light.position.set(10, lightY, player.pos.z + 10);
  world.add(light);
  const fillLight = new THREE.DirectionalLight(0xc7d9ff, 0.42);
  fillLight.position.set(-16, ceilingY * 0.75, 24);
  world.add(fillLight);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const size = getMountSize(mountEl);
  renderer.setSize(size.width, size.height);
  camera.aspect = size.width / size.height;
  camera.updateProjectionMatrix();

  if (mountEl.value) {
    mountEl.value.replaceChildren(renderer.domElement);
  }

  cameraRig.position.copy(player.pos.clone().add(cameraOffset));
  camera.lookAt(player.pos.clone().add(cameraLookOffset));

  const tmpCorner = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const tmpPlayerWorldPos = new THREE.Vector3();
  const tmpDesiredCamPos = new THREE.Vector3();
  const tmpLookAtPos = new THREE.Vector3();
  const levelAabb = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  const computeLevelAabb = (angleRad) => {
    const pivot = worldPivot.position;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const levelMaxY = ceilingY;
    const corners = [
      [-levelHalfWidth, levelMinY],
      [levelHalfWidth, levelMinY],
      [-levelHalfWidth, levelMaxY],
      [levelHalfWidth, levelMaxY],
    ];

    for (let i = 0; i < corners.length; i++) {
      tmpCorner.set(corners[i][0], corners[i][1], 0).sub(pivot).applyAxisAngle(zAxis, angleRad).add(pivot);
      minX = Math.min(minX, tmpCorner.x);
      maxX = Math.max(maxX, tmpCorner.x);
      minY = Math.min(minY, tmpCorner.y);
      maxY = Math.max(maxY, tmpCorner.y);
    }

    levelAabb.minX = minX;
    levelAabb.maxX = maxX;
    levelAabb.minY = minY;
    levelAabb.maxY = maxY;
  };

  const resize = (destroyed) => {
    if (!renderer || destroyed) return;
    const nextSize = getMountSize(mountEl);
    renderer.setSize(nextSize.width, nextSize.height);
    camera.aspect = nextSize.width / nextSize.height;
    camera.updateProjectionMatrix();
  };

  const updateCamera = (flipAngle, dt) => {
    worldPivot.rotation.z = flipAngle;
    light.position.set(10, lightY, player.pos.z + 10);
    floorProjectionMesh.position.set(player.pos.x, levelMinY + 0.26, player.pos.z);
    ceilingProjectionMesh.position.set(player.pos.x, ceilingY - 0.26, player.pos.z);
    playerMesh.getWorldPosition(tmpPlayerWorldPos);
    tmpDesiredCamPos.copy(tmpPlayerWorldPos).add(cameraOffset);

    computeLevelAabb(flipAngle);
    const camMinX = levelAabb.minX + cameraBoundsPadding;
    const camMaxX = levelAabb.maxX - cameraBoundsPadding;
    const camMinY = levelAabb.minY + cameraBoundsPadding;
    const camMaxY = levelAabb.maxY - cameraBoundsPadding;
    if (camMinX < camMaxX) tmpDesiredCamPos.x = THREE.MathUtils.clamp(tmpDesiredCamPos.x, camMinX, camMaxX);
    if (camMinY < camMaxY) tmpDesiredCamPos.y = THREE.MathUtils.clamp(tmpDesiredCamPos.y, camMinY, camMaxY);

    cameraRig.position.lerp(tmpDesiredCamPos, 1 - Math.pow(0.001, dt));
    tmpLookAtPos.copy(tmpPlayerWorldPos).add(cameraLookOffset);
    camera.lookAt(tmpLookAtPos);
  };

  const dispose = () => {
    wallGeo.dispose();
    sideWallGeo.dispose();
    edgeBlendGeo.dispose();
    floorTexture.dispose();
    floorNormalTexture.dispose();
    ceilingTexture.dispose();
    ceilingNormalTexture.dispose();
    sideTexture.dispose();
    sideNormalTexture.dispose();
    edgeBlendTexture.dispose();
    floorProjectionTexture.dispose();
    ceilingProjectionTexture.dispose();
    floorMat.dispose();
    ceilingMat.dispose();
    sideMat.dispose();
    edgeBlendMat.dispose();
    projectionGeo.dispose();
    floorProjectionMat.dispose();
    ceilingProjectionMat.dispose();
    playerGeo.dispose();
    playerTexture.dispose();
    playerMat.dispose();
    if (mountEl.value && renderer.domElement && renderer.domElement.parentNode === mountEl.value) {
      mountEl.value.removeChild(renderer.domElement);
    }
    renderer.dispose();
    renderer.forceContextLoss?.();
  };

  const setTheme = (themeKey = "industrial") => {
    const theme = DONT_HIT_THEME_PRESETS[themeKey] || DONT_HIT_THEME_PRESETS.industrial;
    scene.background = new THREE.Color(theme.sceneBackground);
    scene.fog.color = new THREE.Color(theme.fogColor);
    applyThemeToStandardMaterial(floorMat, floorTexture, theme.floor);
    applyThemeToStandardMaterial(ceilingMat, ceilingTexture, theme.ceiling);
    applyThemeToStandardMaterial(sideMat, sideTexture, theme.wall);
  };

  setTheme("neon");

  return {
    scene,
    camera,
    renderer,
    playerMesh,
    world,
    worldPivot,
    setTheme,
    resize,
    updateCamera,
    dispose,
  };
}

export function createDontHitTheSpikeRuntime(state) {
  const {
    mountEl,
    onReady,
    onSpeedChange,
    onDensityChange,
    score,
    lastScore,
    paused,
    stopped,
    gameOver,
    scoreRecorded,
    recordError,
    lastScoreTime,
  } = state;

  const {
    lanes,
    playerZ,
    playerRadius,
    basePanSpeed,
    speedAccelPerSecond,
    maxPanSpeed,
    baseSpikeDensity,
    densityAccelPerSecond,
    maxSpikeDensity,
    spikeRowsPerGeneration,
    lowSpikeHeight,
    midSpikeHeight,
    highSpikeHeight,
    highSpikeUnlockScore,
    gravityStrength,
    baseHeightScale,
    jumpVelocity,
    maxJumpHoldSeconds,
    jumpBoostPerSecond,
    jumpCutMultiplier,
    gravityFlipCooldownSeconds,
    levelHalfWidth,
    levelMinY,
    cameraBoundsPadding,
  } = DONT_HIT_THE_SPIKE_CONFIG;
  const { minY, maxY, ceilingY, lightY, ceilingGroundY } = createVerticalBounds(baseHeightScale, playerRadius);

  let destroyed = false;
  let rafId = 0;
  let hitTimeoutId = 0;
  let lastFrameTs = 0;
  let startRequested = false;
  let readyFired = false;
  let panSpeed = basePanSpeed;
  let laneIndex = 1;
  let collisionStartIndex = 0;
  let inverted = false;
  let spikeDensity = baseSpikeDensity;
  let gravityFlipLocked = false;
  const gravity = new THREE.Vector3(0, -gravityStrength, 0);
  const jumpState = createJumpState();
  const player = createPlayerState(lanes, minY, playerZ);
  const flipVisual = { t: 0 };
  let flipTween = null;
  const cleanupFns = [];
  let currentTheme = "neon";

  const markReady = () => {
    if (destroyed || readyFired) return;
    readyFired = true;
    requestAnimationFrame(() => {
      if (!destroyed) onReady?.();
    });
  };

  const sceneRuntime = createSceneRuntime({
    mountEl,
    player,
    playerRadius,
    ceilingY,
    lightY,
    levelHalfWidth,
    levelMinY,
    cameraBoundsPadding,
  });

  const {
    cones,
    rows,
    recycleState,
    coneGeometryLow,
    coneGeometryMid,
    coneGeometryHigh,
    coneMaterialLow,
    coneMaterialMid,
    coneMaterialHigh,
  } = createConeField(sceneRuntime.world, {
    ceilingY,
    lanes,
    rowCount: spikeRowsPerGeneration,
    rowsPerGeneration: spikeRowsPerGeneration,
    lowSpikeHeight,
    midSpikeHeight,
    highSpikeHeight,
    highSpikeUnlockScore,
    baseSpikeDensity,
    densityStep: densityAccelPerSecond,
    maxSpikeDensity,
  });

  const resetGame = () => {
    paused.value = false;
    score.value = 0;
    scoreRecorded.value = false;
    recordError.value = "";
    lastScoreTime.value = "";
    panSpeed = basePanSpeed;
    spikeDensity = baseSpikeDensity;
    onSpeedChange?.(panSpeed);
    onDensityChange?.(spikeDensity);
    lastFrameTs = 0;
    collisionStartIndex = 0;
    laneIndex = resetPlayerState(player, lanes, minY, playerZ);
    resetJumpState(jumpState);
    inverted = false;
    gravity.y = -gravityStrength;
    flipTween?.kill();
    flipTween = null;
    gravityFlipLocked = false;
    flipVisual.t = 0;
    sceneRuntime.worldPivot.rotation.z = 0;
    sceneRuntime.playerMesh.position.copy(player.pos);
    sceneRuntime.updateCamera(0, 0.016);
    gsap.killTweensOf(cones.map((cone) => cone.position));
    resetConeField(rows, recycleState, {
      ceilingY,
      lanes,
      lowSpikeHeight,
      midSpikeHeight,
      highSpikeHeight,
      highSpikeUnlockScore,
      coneGeometryLow,
      coneGeometryMid,
      coneGeometryHigh,
      coneMaterialLow,
      coneMaterialMid,
      coneMaterialHigh,
      baseSpikeDensity,
      densityStep: densityAccelPerSecond,
      maxSpikeDensity,
      rowsPerGeneration: spikeRowsPerGeneration,
    });
  };

  const onResize = () => {
    sceneRuntime.resize(destroyed);
  };

  const handleDeath = () => {
    paused.value = false;
    stopped.value = true;
    gameOver.value = true;
    player.hit = true;

    if (hitTimeoutId) clearTimeout(hitTimeoutId);
    hitTimeoutId = setTimeout(() => {
      player.hit = false;
      hitTimeoutId = 0;
    }, 1000);

    lastScore.value = score.value;
    lastScoreTime.value = DailyTimeFormat(new Date());
    scoreRecorded.value = false;
    recordError.value = "";
  };

  const updateRunningState = (dt) => {
    advanceCones(rows, panSpeed, dt);
    const collisionResult = detectConeCollision({
      cones,
      collisionStartIndex,
      playerPos: player.pos,
      playerRadius,
      playerHit: player.hit,
      playerZ: player.pos.z,
    });
    collisionStartIndex = collisionResult.collisionStartIndex;
    panSpeed = Math.min(maxPanSpeed, panSpeed + speedAccelPerSecond * dt);
    const maxRowNumber = rows.reduce((currentMax, row) => Math.max(currentMax, Number(row?.rowNumber ?? 0)), 0);
    spikeDensity = getDensityByRowNumber(
      maxRowNumber,
      spikeRowsPerGeneration,
      baseSpikeDensity,
      densityAccelPerSecond,
      maxSpikeDensity
    );
    onSpeedChange?.(panSpeed);
    onDensityChange?.(spikeDensity);
    recycleConeField(rows, recycleState, {
      playerZ: player.pos.z,
      ceilingY,
      lanes,
      currentScore: score.value,
      spacing: 30,
      lowSpikeHeight,
      midSpikeHeight,
      highSpikeHeight,
      highSpikeUnlockScore,
      coneGeometryLow,
      coneGeometryMid,
      coneGeometryHigh,
      coneMaterialLow,
      coneMaterialMid,
      coneMaterialHigh,
      baseSpikeDensity,
      densityStep: densityAccelPerSecond,
      maxSpikeDensity,
      rowsPerGeneration: spikeRowsPerGeneration,
    });
    if (collisionResult.dead) {
      handleDeath();
      return;
    }

    const prevX = updatePlayerPhysics({
      player,
      gravity,
      dt,
      inverted,
      jumpState,
      maxJumpHoldSeconds,
      jumpBoostPerSecond,
      minY,
      maxY,
      ceilingGroundY,
      laneLimit: lanes[lanes.length - 1],
    });
    sceneRuntime.playerMesh.position.copy(player.pos);
    const dx = player.pos.x - prevX;
    sceneRuntime.playerMesh.rotation.z -= dx / playerRadius;
    sceneRuntime.playerMesh.rotation.x -= (panSpeed * dt) / playerRadius;
    sceneRuntime.updateCamera(flipVisual.t * Math.PI, dt);
    score.value = updatePassedConeScore(cones, player.pos.z, score.value, playerRadius);
  };

  const render = (ts) => {
    if (destroyed) return;

    const now = typeof ts === "number" ? ts : performance.now();
    if (!lastFrameTs) lastFrameTs = now;
    const dt = Math.min(0.05, (now - lastFrameTs) / 1000);
    lastFrameTs = now;

    if (startRequested) {
      startRequested = false;
      stopped.value = false;
      gameOver.value = false;
      resetGame();
    }

    if (!stopped.value && !paused.value) {
      updateRunningState(dt);
    }

    sceneRuntime.renderer.render(sceneRuntime.scene, sceneRuntime.camera);
    rafId = requestAnimationFrame(render);
  };

  const tryToggleGravity = () => {
    if (destroyed || stopped.value || paused.value) return false;
    if (gravityFlipLocked) return false;
    if (!canToggleGravity(player, inverted, minY, ceilingGroundY)) return false;
    gravityFlipLocked = true;
    inverted = toggleGravity(inverted, gravity, gravityStrength, player, jumpState);
    flipTween?.kill();
    flipTween = gsap.to(flipVisual, {
      t: inverted ? 1 : 0,
      duration: gravityFlipCooldownSeconds,
      ease: "power2.inOut",
      overwrite: true,
      onComplete: () => {
        gravityFlipLocked = false;
      },
    });
    return true;
  };

  const tryJumpPress = () => {
    if (destroyed) return false;
    if (stopped.value) {
      startRequested = true;
      return true;
    }
    if (paused.value) return false;
    return startJump(player, inverted, jumpVelocity, jumpState);
  };

  const tryJumpRelease = () => {
    if (destroyed) return false;
    stopJumpHold(jumpState);
    if (!stopped.value && !paused.value) cutJumpVelocity(player, inverted, jumpCutMultiplier);
    return true;
  };

  const tryMoveLane = (direction) => {
    if (destroyed || stopped.value || paused.value) return false;
    laneIndex = moveLane(laneIndex, direction, inverted, lanes, player);
    return true;
  };

  const onKeyDown = (e) => {
    if (destroyed) return;
    if (e.code === "Space") e.preventDefault();

    if (stopped.value) {
      if (!e.repeat && (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter")) {
        startRequested = true;
      }
      return;
    }

    if (!e.repeat && e.code === "KeyP") {
      paused.value = !paused.value;
      return;
    }
    if (paused.value) return;

    if (!e.repeat && e.code === "ArrowUp") {
      tryToggleGravity();
      return;
    }

    if (!e.repeat && e.code === "Space") {
      tryJumpPress();
    }
    if (!e.repeat && (e.code === "ArrowLeft" || e.code === "KeyA")) {
      tryMoveLane(-1);
    }
    if (!e.repeat && (e.code === "ArrowRight" || e.code === "KeyD")) {
      tryMoveLane(1);
    }
  };

  const onKeyUp = (e) => {
    if (destroyed) return;
    if (e.code === "Space") e.preventDefault();

    if (e.code === "Space") {
      tryJumpRelease();
    }
  };

  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  cleanupFns.push(() => window.removeEventListener("resize", onResize));
  cleanupFns.push(() => document.removeEventListener("keydown", onKeyDown));
  cleanupFns.push(() => document.removeEventListener("keyup", onKeyUp));
  cleanupFns.push(() => gsap.killTweensOf(cones.map((cone) => cone.position)));
  cleanupFns.push(() => coneGeometryLow.dispose());
  cleanupFns.push(() => coneGeometryMid.dispose());
  cleanupFns.push(() => coneGeometryHigh.dispose());
  cleanupFns.push(() => coneMaterialLow.dispose());
  cleanupFns.push(() => coneMaterialMid.dispose());
  cleanupFns.push(() => coneMaterialHigh.dispose());
  cleanupFns.push(() => sceneRuntime.dispose());

  render();
  markReady();

  return {
    setTheme(nextTheme) {
      currentTheme = nextTheme in DONT_HIT_THEME_PRESETS ? nextTheme : "industrial";
      sceneRuntime.setTheme(currentTheme);
      return currentTheme;
    },
    getTheme() {
      return currentTheme;
    },
    resize() {
      onResize();
    },
    requestStart() {
      startRequested = true;
    },
    moveLeft() {
      return tryMoveLane(-1);
    },
    moveRight() {
      return tryMoveLane(1);
    },
    flipGravity() {
      return tryToggleGravity();
    },
    jumpPress() {
      return tryJumpPress();
    },
    jumpRelease() {
      return tryJumpRelease();
    },
    destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      if (hitTimeoutId) clearTimeout(hitTimeoutId);
      for (const fn of cleanupFns.splice(0)) {
        try {
          fn();
        } catch (e) {
          // ignore cleanup errors
        }
      }
    },
  };
}
