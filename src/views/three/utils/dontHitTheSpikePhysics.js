import * as THREE from 'three'

export const DONT_HIT_THE_SPIKE_CONFIG = Object.freeze({
  lanes: [-7.5, 0, 7.5],
  playerZ: 10,
  playerRadius: 1.15,
  basePanSpeed: 24,
  speedAccelPerSecond: 1.2,
  maxPanSpeed: 120,
  gravityStrength: 32,
  baseHeightScale: 1.5,
  jumpVelocity: 15,
  maxJumpHoldSeconds: 0.18,
  jumpBoostPerSecond: 34,
  jumpCutMultiplier: 0.45,
  levelHalfWidth: 15,
  levelMinY: 0,
  cameraBoundsPadding: 1.25,
})

export function createVerticalBounds(baseHeightScale, playerRadius) {
  const minY = 2
  const maxY = 13 * baseHeightScale
  const ceilingY = 15 * baseHeightScale

  return {
    minY,
    maxY,
    ceilingY,
    lightY: 7.5 * baseHeightScale,
    ceilingGroundY: ceilingY - playerRadius,
  }
}

export function createPlayerState(lanes, startY, startZ) {
  return {
    pos: new THREE.Vector3(0, startY, startZ),
    vel: new THREE.Vector3(0, 0, 0),
    acc: new THREE.Vector3(0, 0, 0),
    hit: false,
    wantX: lanes[1],
    jumping: false,
  }
}

export function createJumpState() {
  return {
    holding: false,
    holdTime: 0,
  }
}

export function resetJumpState(jumpState) {
  jumpState.holding = false
  jumpState.holdTime = 0
}

export function resetPlayerState(player, lanes, minY, startZ) {
  player.pos.set(0, minY, startZ)
  player.vel.set(0, 0, 0)
  player.acc.set(0, 0, 0)
  player.wantX = lanes[1]
  player.jumping = false
  player.hit = false
  return 1
}

export function startJump(player, inverted, jumpVelocity, jumpState) {
  if (player.jumping) return false
  player.jumping = true
  player.vel.y = inverted ? -jumpVelocity : jumpVelocity
  jumpState.holding = true
  jumpState.holdTime = 0
  return true
}

export function stopJumpHold(jumpState) {
  jumpState.holding = false
}

export function cutJumpVelocity(player, inverted, jumpCutMultiplier) {
  const jumpDir = inverted ? -1 : 1
  if (player.vel.y * jumpDir > 0) {
    player.vel.y *= jumpCutMultiplier
  }
}

export function toggleGravity(inverted, gravity, gravityStrength, player, jumpState) {
  const nextInverted = !inverted
  gravity.y = nextInverted ? gravityStrength : -gravityStrength
  resetJumpState(jumpState)
  player.jumping = false
  player.vel.y = 0
  return nextInverted
}

export function moveLane(laneIndex, direction, inverted, lanes, player) {
  const visualDirection = inverted ? -direction : direction
  const nextLaneIndex = laneIndex + visualDirection
  if (nextLaneIndex < 0 || nextLaneIndex >= lanes.length) return laneIndex
  player.wantX = lanes[nextLaneIndex]
  return nextLaneIndex
}

export function updatePlayerPhysics({
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
  laneLimit,
}) {
  const prevX = player.pos.x
  player.acc.add(gravity)

  const jumpDir = inverted ? -1 : 1
  if (jumpState.holding && player.vel.y * jumpDir > 0 && jumpState.holdTime < maxJumpHoldSeconds) {
    player.vel.y += jumpBoostPerSecond * dt * jumpDir
    jumpState.holdTime += dt
  }

  player.vel.addScaledVector(player.acc, dt)
  player.pos.addScaledVector(player.vel, dt)
  player.acc.set(0, 0, 0)
  player.pos.x = THREE.MathUtils.damp(player.pos.x, player.wantX, 10, dt)

  if (!inverted) {
    if (player.pos.y <= minY) {
      player.pos.y = minY
      player.vel.y = Math.max(0, player.vel.y)
      player.jumping = false
      stopJumpHold(jumpState)
    } else if (player.pos.y >= maxY) {
      player.pos.y = maxY
      player.vel.y = Math.min(0, player.vel.y)
    }
  } else {
    if (player.pos.y >= ceilingGroundY) {
      player.pos.y = ceilingGroundY
      player.vel.y = Math.min(0, player.vel.y)
      player.jumping = false
      stopJumpHold(jumpState)
    } else if (player.pos.y <= minY) {
      player.pos.y = minY
      player.vel.y = Math.max(0, player.vel.y)
    }
  }

  player.pos.x = THREE.MathUtils.clamp(player.pos.x, -laneLimit, laneLimit)
  player.pos.y = THREE.MathUtils.clamp(player.pos.y, minY, inverted ? ceilingGroundY : maxY)

  return prevX
}
