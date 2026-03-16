import * as THREE from "three";
import { gsap } from "gsap";
import { DailyTimeFormat } from "@/utils/utils.js";
import {
  DONT_HIT_THE_SPIKE_CONFIG,
  createJumpState,
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
  getConeScore,
  resetConeField,
} from "@/views/three/utils/dontHitTheSpikeObstacles.js";

function getMountSize(mountEl) {
  const el = mountEl.value;
  if (!el) return { width: window.innerWidth, height: window.innerHeight };
  return {
    width: el.clientWidth || window.innerWidth,
    height: el.clientHeight || window.innerHeight,
  };
}

function createPlayerMesh(playerRadius, player) {
  const playerGeo = new THREE.SphereGeometry(playerRadius, 24, 16);
  const positions = playerGeo.attributes.position;
  const axis = new THREE.Vector3(0.6, 0.8, 0.2).normalize();
  const c1 = new THREE.Color("#ff4fd8");
  const c2 = new THREE.Color("#ffffff");
  const tmpV = new THREE.Vector3();
  const tmpC = new THREE.Color();
  const colors = new Float32Array(positions.count * 3);

  for (let i = 0; i < positions.count; i++) {
    tmpV.fromBufferAttribute(positions, i).normalize();
    const tRaw = (tmpV.dot(axis) + 1) * 0.5;
    const t = THREE.MathUtils.smoothstep(tRaw, 0.12, 0.88);
    tmpC.copy(c1).lerp(c2, t);
    colors[i * 3 + 0] = tmpC.r;
    colors[i * 3 + 1] = tmpC.g;
    colors[i * 3 + 2] = tmpC.b;
  }

  playerGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const playerMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.05 });
  const playerMesh = new THREE.Mesh(playerGeo, playerMat);
  playerMesh.position.copy(player.pos);

  return { playerGeo, playerMat, playerMesh };
}

function createSceneRuntime({ mountEl, player, playerRadius, ceilingY, lightY, levelHalfWidth, levelMinY, cameraBoundsPadding }) {
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  const cameraOffset = new THREE.Vector3(0, 8, 18);
  const cameraLookOffset = new THREE.Vector3(0, 5, 0);
  const cameraRig = new THREE.Group();
  cameraRig.add(camera);
  camera.position.set(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#001d45");
  scene.fog = new THREE.Fog("#001d45", 10, 300);
  scene.add(cameraRig);

  const worldCenterY = ceilingY * 0.5;
  const worldPivot = new THREE.Group();
  worldPivot.position.y = worldCenterY;
  const world = new THREE.Group();
  world.position.y = -worldCenterY;
  worldPivot.add(world);
  scene.add(worldPivot);

  const wallGeo = new THREE.BoxGeometry(30, 0.5, 500);
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x0000aa });
  const floormesh = new THREE.Mesh(wallGeo, wallMat);
  const ceilingmesh = new THREE.Mesh(wallGeo, wallMat);
  ceilingmesh.position.y = ceilingY;
  world.add(floormesh);
  world.add(ceilingmesh);

  const { playerGeo, playerMat, playerMesh } = createPlayerMesh(playerRadius, player);
  world.add(playerMesh);

  const light1 = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
  world.add(light1);
  const light = new THREE.PointLight(0xffffff, 1.2, 120);
  light.position.set(10, lightY, player.pos.z + 10);
  world.add(light);

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
    wallMat.dispose();
    playerGeo.dispose();
    playerMat.dispose();
    if (mountEl.value && renderer.domElement && renderer.domElement.parentNode === mountEl.value) {
      mountEl.value.removeChild(renderer.domElement);
    }
    renderer.dispose();
    renderer.forceContextLoss?.();
  };

  return {
    scene,
    camera,
    renderer,
    playerMesh,
    world,
    worldPivot,
    resize,
    updateCamera,
    dispose,
  };
}

export function createDontHitTheSpikeRuntime(state) {
  const {
    mountEl,
    score,
    lastScore,
    showLose,
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
    gravityStrength,
    baseHeightScale,
    jumpVelocity,
    maxJumpHoldSeconds,
    jumpBoostPerSecond,
    jumpCutMultiplier,
    levelHalfWidth,
    levelMinY,
    cameraBoundsPadding,
  } = DONT_HIT_THE_SPIKE_CONFIG;
  const { minY, maxY, ceilingY, lightY, ceilingGroundY } = createVerticalBounds(baseHeightScale, playerRadius);

  let destroyed = false;
  let rafId = 0;
  let loseTimeoutId = 0;
  let hitTimeoutId = 0;
  let lastFrameTs = 0;
  let startRequested = false;
  let panSpeed = basePanSpeed;
  let laneIndex = 1;
  let collisionStartIndex = 0;
  let inverted = false;
  const gravity = new THREE.Vector3(0, -gravityStrength, 0);
  const jumpState = createJumpState();
  const player = createPlayerState(lanes, minY, playerZ);
  const flipVisual = { t: 0 };
  let flipTween = null;
  const cleanupFns = [];

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
    conePositions,
    coneGeometrySmall,
    coneGeometryLarge,
    coneMaterial,
  } = createConeField(sceneRuntime.world, {
    ceilingY,
    leftLaneX: lanes[0],
    rightLaneX: lanes[lanes.length - 1],
  });

  const resetGame = () => {
    paused.value = false;
    showLose.value = false;
    score.value = 0;
    scoreRecorded.value = false;
    recordError.value = "";
    lastScoreTime.value = "";
    panSpeed = basePanSpeed;
    lastFrameTs = 0;
    collisionStartIndex = 0;
    laneIndex = resetPlayerState(player, lanes, minY, playerZ);
    resetJumpState(jumpState);
    inverted = false;
    gravity.y = -gravityStrength;
    flipTween?.kill();
    flipTween = null;
    flipVisual.t = 0;
    sceneRuntime.worldPivot.rotation.z = 0;
    sceneRuntime.playerMesh.position.copy(player.pos);
    sceneRuntime.updateCamera(0, 0.016);
    gsap.killTweensOf(conePositions);
    resetConeField(cones);
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

    lastScore.value = getConeScore(cones);
    lastScoreTime.value = DailyTimeFormat(new Date());
    scoreRecorded.value = false;
    recordError.value = "";
    showLose.value = true;

    if (loseTimeoutId) clearTimeout(loseTimeoutId);
    loseTimeoutId = setTimeout(() => {
      showLose.value = false;
      loseTimeoutId = 0;
    }, 1000);
  };

  const updateRunningState = (dt) => {
    advanceCones(cones, panSpeed, dt);
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
    score.value = getConeScore(cones);
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
      inverted = toggleGravity(inverted, gravity, gravityStrength, player, jumpState);
      flipTween?.kill();
      flipTween = gsap.to(flipVisual, {
        t: inverted ? 1 : 0,
        duration: 0.09,
        ease: "power2.inOut",
        overwrite: true,
      });
      return;
    }

    if (!e.repeat && e.code === "Space") {
      startJump(player, inverted, jumpVelocity, jumpState);
    }
    if (!e.repeat && (e.code === "ArrowLeft" || e.code === "KeyA")) {
      laneIndex = moveLane(laneIndex, -1, inverted, lanes, player);
    }
    if (!e.repeat && (e.code === "ArrowRight" || e.code === "KeyD")) {
      laneIndex = moveLane(laneIndex, 1, inverted, lanes, player);
    }
  };

  const onKeyUp = (e) => {
    if (destroyed) return;
    if (e.code === "Space") e.preventDefault();

    if (e.code === "Space") {
      stopJumpHold(jumpState);
      if (!stopped.value && !paused.value) cutJumpVelocity(player, inverted, jumpCutMultiplier);
    }
  };

  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  cleanupFns.push(() => window.removeEventListener("resize", onResize));
  cleanupFns.push(() => document.removeEventListener("keydown", onKeyDown));
  cleanupFns.push(() => document.removeEventListener("keyup", onKeyUp));
  cleanupFns.push(() => gsap.killTweensOf(conePositions));
  cleanupFns.push(() => coneGeometrySmall.dispose());
  cleanupFns.push(() => coneGeometryLarge.dispose());
  cleanupFns.push(() => coneMaterial.dispose());
  cleanupFns.push(() => sceneRuntime.dispose());

  render();

  return {
    requestStart() {
      startRequested = true;
    },
    destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      if (loseTimeoutId) clearTimeout(loseTimeoutId);
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
