import * as THREE from 'three'

export function createConeField(world, {
  ceilingY,
  leftLaneX,
  rightLaneX,
  count = 1000,
  spacing = 30,
  startZ = -30,
  smallHeight = 5,
  largeHeight = 10,
  radius = 3,
  radialSegments = 10,
  color = '#fcba03',
}) {
  const coneGeometrySmall = new THREE.ConeGeometry(radius, smallHeight, radialSegments)
  const coneGeometryLarge = new THREE.ConeGeometry(radius, largeHeight, radialSegments)
  const coneMaterial = new THREE.MeshBasicMaterial({ color })
  const cones = []

  for (let i = 0; i < count; i++) {
    let height = smallHeight
    if (Math.random() <= 0.33) height = largeHeight

    const geometry = height > smallHeight ? coneGeometryLarge : coneGeometrySmall
    const cone = new THREE.Mesh(geometry, coneMaterial)
    cone.position.z = startZ - i * spacing
    cone.originalZ = cone.position.z
    cone.h = height

    if (Math.random() <= 0.5) {
      cone.position.y = ceilingY
      cone.rotation.z = Math.PI
    }

    const laneRandom = Math.random()
    if (laneRandom <= 0.33) cone.position.x = leftLaneX
    if (laneRandom >= 0.66) cone.position.x = rightLaneX

    cones.push(cone)
    world.add(cone)
  }

  return {
    cones,
    conePositions: cones.map((cone) => cone.position),
    coneGeometrySmall,
    coneGeometryLarge,
    coneMaterial,
  }
}

export function resetConeField(cones) {
  for (let i = 0; i < cones.length; i++) {
    cones[i].position.z = cones[i].originalZ
  }
}

export function advanceCones(cones, panSpeed, dt) {
  for (let i = 0; i < cones.length; i++) {
    cones[i].position.z += panSpeed * dt
  }
}

export function detectConeCollision({
  cones,
  collisionStartIndex,
  playerPos,
  playerRadius,
  playerHit,
  playerZ,
  range = 60,
}) {
  let nextCollisionStartIndex = collisionStartIndex

  while (nextCollisionStartIndex < cones.length && cones[nextCollisionStartIndex].position.z > playerZ + range) {
    nextCollisionStartIndex++
  }

  let dead = false
  for (let i = nextCollisionStartIndex; i < cones.length; i++) {
    const cone = cones[i]
    if (cone.position.z < playerZ - range) break

    const distSq = playerPos.distanceToSquared(cone.position)
    const size = cone.h > 5 ? 5 : 3
    const hitRadius = playerRadius + size * 0.6
    if (distSq < hitRadius * hitRadius && !playerHit) {
      dead = true
      break
    }
  }

  return {
    dead,
    collisionStartIndex: nextCollisionStartIndex,
  }
}

export function getConeScore(cones, offset = 30) {
  return Math.floor((cones[0]?.position.z || 0) + offset)
}
