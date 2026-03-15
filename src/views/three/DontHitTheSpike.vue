<template>
  <div class="dont-hit-the-spikes" >
	<div id="dont-hit" ref="mountEl"></div>
	<div class="dont-hit-remind">
			<div class="hud">
				<h1 class="tip">按 P 暂停/继续</h1>
				<h1 class="hint">按 ↑ 键翻转重力，按空格跳跃</h1>
				<h1 class="score">得分：{{ score }}</h1>
				<h1 class="lastScore">上次得分：{{ lastScore }}</h1>
				<h1 class="lose" :class="{ show: showLose }">你输了！</h1>
				<h1 class="paused" v-if="paused">已暂停</h1>
			</div>
	
			<div class="modal" v-if="stopped">
				<div class="modal-card">
					<h2 class="modal-title">{{ gameOver ? "游戏结束！" : "准备开始" }}</h2>
					<p class="modal-text" v-if="gameOver">得分：{{ lastScore }}</p>
					<button class="modal-btn" type="button" @click="requestStart">{{ gameOver ? "重新开始" : "开始游戏" }}</button>
				</div>
			</div>
	</div>
  </div>
</template>

<script setup>
import * as THREE from "three";
import { gsap } from "gsap";
import { onMounted, onUnmounted, ref } from "vue";

// UI 状态 / 挂载容器

const mountEl = ref(null);
const score = ref(0);
const lastScore = ref(0);
const showLose = ref(false);
const paused = ref(false);
const stopped = ref(true);
const gameOver = ref(false);
const startRequested = ref(false);
function requestStart() { startRequested.value = true; }

let renderer = null;
let rafId = 0;
let loseTimeoutId = 0;
let hitTimeoutId = 0;
let destroyed = false;
let cleanupFns = [];

// 获取当前容器尺寸（用于 renderer）
function getMountSize() {
	const el = mountEl.value;
	if (!el) return { width: window.innerWidth, height: window.innerHeight };
	const width = el.clientWidth || window.innerWidth;
	const height = el.clientHeight || window.innerHeight;
	return { width, height };
}

onMounted(() => {
	// 初始化 three.js 场景
	destroyed = false;
	cleanupFns = [];

	// 相机跟随玩家
	const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
	const cameraOffset = new THREE.Vector3(0, 8, 18);
	// 让玩家在画面中更靠下：相机看向更高的位置（相机略微仰一点）
	const cameraLookOffset = new THREE.Vector3(0, 5.0, 0);
	const cameraRig = new THREE.Group();
	cameraRig.add(camera);
	camera.position.set(0, 0, 0);
	const flipVisual = { t: 0 };
	let flipTween = null;
	const tmpPlayerWorldPos = new THREE.Vector3();
	const tmpDesiredCamPos = new THREE.Vector3();
	const tmpLookAtPos = new THREE.Vector3();

	// 玩家物理状态
	const lanes = [-7.5, 0, 7.5];
	let laneIndex = 1;
	const player = {
		pos: new THREE.Vector3(0, 2, 10),
		vel: new THREE.Vector3(0, 0, 0),
		acc: new THREE.Vector3(0, 0, 0),
		hit: false,
		wantX: lanes[laneIndex],
		jumping: false,
	};

	// 前进滚动速度（可调）
	// 旧逻辑是“每帧位移 0.4”，约等于 24 units/s（按 60fps 估算），这里改为按秒计算
	const basePanSpeed = 24;
	let panSpeed = basePanSpeed;
	// 重力与翻转状态（↑ 切换）
	const gravityStrength = 32;
	const gravity = new THREE.Vector3(0, -gravityStrength, 0);
	let inverted = false;

	// 垂直边界（已缩放）
	const baseHeightScale = 1.5; // +50% vertical space
	const minY = 2;
	const maxY = 13 * baseHeightScale;
	const ceilingY = 15 * baseHeightScale;
	const lightY = 7.5 * baseHeightScale;
	// 初始起跳速度（不长按时的跳跃高度主要由它决定）
	const jumpVelocity = 15;
	// 马里奥式可变跳高：按下立即起跳；按住在短窗口内“加高”；松开时截断上升速度
	const maxJumpHoldSeconds = 0.18;
	const jumpBoostPerSecond = 34;
	const jumpCutMultiplier = 0.45;
	const playerRadius = 1.15;
	// 翻转重力时，玩家“落地”的高度：贴近天花板，避免与顶部尖刺距离过大
	const ceilingGroundY = ceilingY - playerRadius;

	const scene = new THREE.Scene();
	scene.background = new THREE.Color("#001d45");
	scene.fog = new THREE.Fog("#001d45", 10, 300);
	scene.add(cameraRig);

	// ?????????????????? Y ????????????
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

	// 玩家：粉色小球
	const playerGeo = new THREE.SphereGeometry(playerRadius, 24, 16);
	// 给小球做渐变顶点色，滚动时更容易肉眼观测到旋转
	{
		const positions = playerGeo.attributes.position;
		const axis = new THREE.Vector3(0.6, 0.8, 0.2).normalize(); // 非对称轴，旋转更明显
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
	}
	const playerMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.05 });
	const playerMesh = new THREE.Mesh(playerGeo, playerMat);
	playerMesh.position.copy(player.pos);
	world.add(playerMesh);
	cameraRig.position.copy(player.pos.clone().add(cameraOffset));
	camera.lookAt(player.pos.clone().add(cameraLookOffset));
	let jumpHolding = false;
	let jumpHoldTime = 0;

	// 障碍物（尖刺）
	const cones = [];
	const coneGeometrySmall = new THREE.ConeGeometry(3, 5, 10);
	const coneGeometryLarge = new THREE.ConeGeometry(3, 10, 10);
	const coneMaterial = new THREE.MeshBasicMaterial({ color: "#fcba03" });
	for (let i = 0; i < 1000; i++) {
		let h = 5;
		if (Math.random() <= 0.33) h = 10;
		const geometry = h > 5 ? coneGeometryLarge : coneGeometrySmall;
		const cone = new THREE.Mesh(geometry, coneMaterial);
		cone.position.z = -i * 30 - 30;
		cone.originalZ = cone.position.z;
		cone.h = h;
		if (Math.random() <= 0.5) {
			cone.position.y = ceilingY;
			cone.rotation.z = Math.PI;
		}
		const dirR = Math.random();
		if (dirR <= 0.33) cone.position.x = -7.5;
		if (dirR >= 0.66) cone.position.x = 7.5;
		cones.push(cone);
		world.add(cone);
	}
	const conePositions = cones.map((c) => c.position);

	const light1 = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
	world.add(light1);
	const light = new THREE.PointLight(0xffffff, 1.2, 120);
	light.position.set(10, lightY, player.pos.z + 10);
	world.add(light);

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	const size = getMountSize();
	// 让 canvas 的 CSS 尺寸与容器一致，避免在高 DPR 下因溢出裁切导致画面“偏一边”
	renderer.setSize(size.width, size.height);
	camera.aspect = size.width / size.height;
	camera.updateProjectionMatrix();

	if (mountEl.value) {
		mountEl.value.replaceChildren(renderer.domElement);
	}


	// 保持 renderer 与容器尺寸一致
	const onResize = () => {
		if (!renderer || destroyed) return;
		const { width, height } = getMountSize();
		renderer.setSize(width, height);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	};
	window.addEventListener("resize", onResize);
	cleanupFns.push(() => window.removeEventListener("resize", onResize));


	// 碰撞 / 重置 / 速度增长
	let collisionStartIndex = 0;
	let resetting = false;
	let resetTween = null;
	let lastFrameTs = 0;
	const speedAccelPerSecond = 1.2; // units/s^2 (converted from old frame-based speed)
	const maxPanSpeed = 120;

	// ?????????/????????
	function resetGame() {
		paused.value = false;
		showLose.value = false;
		score.value = 0;

		// ????/??
		panSpeed = basePanSpeed;
		lastFrameTs = 0;
		collisionStartIndex = 0;

		// ??????
		player.pos.set(0, minY, 10);
		player.vel.set(0, 0, 0);
		player.acc.set(0, 0, 0);
		laneIndex = 1;
		player.wantX = lanes[laneIndex];
		player.jumping = false;
		player.hit = false;
		jumpHolding = false;
		jumpHoldTime = 0;
		inverted = false;
		gravity.y = -gravityStrength;
		flipTween?.kill();
		flipTween = null;
		flipVisual.t = 0;
		worldPivot.rotation.z = 0;
		playerMesh.position.copy(player.pos);
		cameraRig.position.copy(player.pos.clone().add(cameraOffset));
		camera.lookAt(player.pos.clone().add(cameraLookOffset));

		// ????????????? Z?
		gsap.killTweensOf(conePositions);
		for (let i = 0; i < cones.length; i++) cones[i].position.z = cones[i].originalZ;
	}

	const render = (ts) => {
		if (destroyed || !renderer) return;

		// 帧间 dt（秒），做上限保护

		const now = typeof ts === "number" ? ts : performance.now();
		if (!lastFrameTs) lastFrameTs = now;
		const dt = Math.min(0.05, (now - lastFrameTs) / 1000);
		lastFrameTs = now;

		// ????/????
		if (startRequested.value) {
			startRequested.value = false;
			stopped.value = false;
			gameOver.value = false;
			resetGame();
		}

		// 移动尖刺并检测碰撞（暂停时冻结）
		if (!stopped.value && !paused.value && !resetting) {
			for (let i = 0; i < cones.length; i++) cones[i].position.z += panSpeed * dt;

			let dead = false;
			const playerZ = player.pos.z;
			// cones 按 z 递减排序（index 0 最靠前）
			while (collisionStartIndex < cones.length && cones[collisionStartIndex].position.z > playerZ + 60) {
				collisionStartIndex++;
			}
			for (let i = collisionStartIndex; i < cones.length; i++) {
				const cone = cones[i];
				if (cone.position.z < playerZ - 60) break;
				const distSq = player.pos.distanceToSquared(cone.position);
				const size = cone.h > 5 ? 5 : 3;
				const hitRadius = playerRadius + (size * 0.6);
				if (distSq < hitRadius * hitRadius && !player.hit) {
					dead = true;
					break;
				}
			}
			// 基于时间的加速
			panSpeed = Math.min(maxPanSpeed, panSpeed + speedAccelPerSecond * dt);
			// 死亡：显示提示并重置尖刺/速度
			if (dead) {
				// ?????????????????
				paused.value = false;
				stopped.value = true;
				gameOver.value = true;

				player.hit = true;
				if (hitTimeoutId) clearTimeout(hitTimeoutId);
				hitTimeoutId = setTimeout(() => {
					player.hit = false;
					hitTimeoutId = 0;
				}, 1000);

				lastScore.value = Math.floor(cones[0].position.z + 30);
				showLose.value = true;
				if (loseTimeoutId) clearTimeout(loseTimeoutId);
				loseTimeoutId = setTimeout(() => {
					showLose.value = false;
					loseTimeoutId = 0;
				}, 1000);
			}
		}


		// 玩家物理与相机跟随
		if (!stopped.value && !paused.value) {
			const prevX = player.pos.x;
			player.acc.add(gravity);

			// 长按加高：只在上升阶段且在短窗口内生效
			const jumpDir = inverted ? -1 : 1;
			if (jumpHolding && player.vel.y * jumpDir > 0 && jumpHoldTime < maxJumpHoldSeconds) {
				player.vel.y += (jumpBoostPerSecond * dt) * jumpDir;
				jumpHoldTime += dt;
			}

			player.vel.addScaledVector(player.acc, dt);
			player.pos.addScaledVector(player.vel, dt);
			player.acc.set(0, 0, 0);

			// 左右移动：向目标赛道平滑靠近（与帧率无关）
			// 左右移动：向目标赛道平滑靠近（与帧率无关）
			player.pos.x = THREE.MathUtils.damp(player.pos.x, player.wantX, 10, dt);

			// 落地/顶到上限
			if (!inverted) {
				if (player.pos.y <= minY) {
					player.pos.y = minY;
					player.vel.y = Math.max(0, player.vel.y);
					player.jumping = false;
					jumpHolding = false;
				} else if (player.pos.y >= maxY) {
					player.pos.y = maxY;
					player.vel.y = Math.min(0, player.vel.y);
				}
			} else {
				if (player.pos.y >= ceilingGroundY) {
					player.pos.y = ceilingGroundY;
					player.vel.y = Math.min(0, player.vel.y);
					player.jumping = false;
					jumpHolding = false;
				} else if (player.pos.y <= minY) {
					player.pos.y = minY;
					player.vel.y = Math.max(0, player.vel.y);
				}
			}

			player.pos.clamp(new THREE.Vector3(-7.5, minY, 10), new THREE.Vector3(7.5, inverted ? ceilingGroundY : maxY, 10));
			playerMesh.position.copy(player.pos);

			// 小球滚动：横向位移 -> 绕 Z 轴滚；“前进”速度 -> 绕 X 轴滚（增强动感）
			const dx = player.pos.x - prevX;
			playerMesh.rotation.z -= dx / playerRadius;
			playerMesh.rotation.x -= (panSpeed * dt) / playerRadius;

			// 灯光与相机跟随
			light.position.set(10, lightY, player.pos.z + 10);
			const t = flipVisual.t;
			worldPivot.rotation.z = t * Math.PI;

			playerMesh.getWorldPosition(tmpPlayerWorldPos);
			tmpDesiredCamPos.copy(tmpPlayerWorldPos).add(cameraOffset);
			cameraRig.position.lerp(tmpDesiredCamPos, 1 - Math.pow(0.001, dt));
			tmpLookAtPos.copy(tmpPlayerWorldPos).add(cameraLookOffset);
			camera.lookAt(tmpLookAtPos);

			score.value = Math.floor(cones[0].position.z + 30);
		}
		renderer.render(scene, camera);
		rafId = requestAnimationFrame(render);
	};

	render();


	// 控制：P 暂停，↑ 翻转重力，空格跳跃，←/→ 移动
	const onKeyDown = (e) => {
		if (destroyed) return;
		if (e.code === "Space") e.preventDefault();

		if (stopped.value) {
			// 停止状态：空格/回车 开始/重开
			if (!e.repeat && (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter")) {
				requestStart();
			}
			return;
		}

		if (!e.repeat && e.code === "KeyP") {
			paused.value = !paused.value;
			resetTween?.paused(paused.value);
			return;
		}
		if (paused.value) return;

		// 翻转重力（↑）：上/下“落地”切换
		if (!e.repeat && e.code === "ArrowUp") {
			inverted = !inverted;
			gravity.y = inverted ? gravityStrength : -gravityStrength;
			jumpHolding = false;
			jumpHoldTime = 0;
			player.jumping = false;
			player.vel.y = 0;
			flipTween?.kill();
			flipTween = gsap.to(flipVisual, {
				t: inverted ? 1 : 0,
				duration: 0.09,
				ease: "power2.inOut",
				overwrite: true,
			});
			return;
		}

		if (!e.repeat && e.code === "Space" && !player.jumping) {
			player.jumping = true;
			player.vel.y = inverted ? -jumpVelocity : jumpVelocity;
			jumpHolding = true;
			jumpHoldTime = 0;
		}
		if (!e.repeat && (e.code === "ArrowLeft" || e.code === "KeyA")) {
			// 画面翻转后左右方向对称（避免视觉上左右颠倒）
			const dir = inverted ? 1 : -1;
			const next = laneIndex + dir;
			if (next >= 0 && next < lanes.length) {
				laneIndex = next;
				player.wantX = lanes[laneIndex];
			}
		}
		if (!e.repeat && (e.code === "ArrowRight" || e.code === "KeyD")) {
			const dir = inverted ? -1 : 1;
			const next = laneIndex + dir;
			if (next >= 0 && next < lanes.length) {
				laneIndex = next;
				player.wantX = lanes[laneIndex];
			}
		}
	};
	const onKeyUp = (e) => {
		if (destroyed) return;
		if (e.code === "Space") e.preventDefault();

		// 松开跳跃键：停止加高；并在运行中截断上升速度（短按跳得低、长按跳得高）
		if (e.code === "Space") {
			jumpHolding = false;
			const jumpDir = inverted ? -1 : 1;
			if (!stopped.value && !paused.value && player.vel.y * jumpDir > 0) player.vel.y *= jumpCutMultiplier;
			return;
		}

		if (stopped.value || paused.value) return;
	};
	document.addEventListener("keydown", onKeyDown);
	document.addEventListener("keyup", onKeyUp);
	cleanupFns.push(() => document.removeEventListener("keydown", onKeyDown));
	cleanupFns.push(() => document.removeEventListener("keyup", onKeyUp));

	cleanupFns.push(() => {
		gsap.killTweensOf(conePositions);
		wallGeo.dispose();
		wallMat.dispose();
		playerGeo.dispose();
		playerMat.dispose();
		coneGeometrySmall.dispose();
		coneGeometryLarge.dispose();
		coneMaterial.dispose();
	});
});

onUnmounted(() => {
	// 清理：RAF、定时器、事件监听、WebGL
	destroyed = true;
	if (rafId) cancelAnimationFrame(rafId);
	rafId = 0;
	if (loseTimeoutId) clearTimeout(loseTimeoutId);
	loseTimeoutId = 0;
	if (hitTimeoutId) clearTimeout(hitTimeoutId);
	hitTimeoutId = 0;

	for (const fn of cleanupFns.splice(0)) {
		try {
			fn();
		} catch (e) { /* ignore cleanup errors */ }
	}

	if (renderer) {
		const el = mountEl.value;
		if (el && renderer.domElement && renderer.domElement.parentNode === el) {
			el.removeChild(renderer.domElement);
		}
		renderer.dispose();
		renderer.forceContextLoss?.();
		renderer = null;
	}
});
</script>
<style lang="scss">
.dont-hit-the-spikes {
	width: 100%;
	height: 100%;
	overflow: hidden;
	position: relative;
	#dont-hit{
		width: 100%;
		height: 100%;
		overflow: hidden;
		canvas {
			display: block;
		}
	}



	.dont-hit-remind{
		position: absolute;
		inset: 0;
		z-index: 2;

		.hud {
			position: absolute;
			inset: 0;
			pointer-events: none;
		}

		h1 {
			margin: 0;
			color: #fcba03;
			font-size: 1.25rem;
			text-shadow: 2px 2px rgba(0, 0, 0, 0.5);
			font-family: Arial;
		}

		.tip {
			position: absolute;
			top: 1rem;
			left: 1rem;
		}
		.hint {
			position: absolute;
			top: 3.2rem;
			left: 1rem;
			max-width: 70%;
		}
		.paused {
			position: absolute;
			top: 5.4rem;
			left: 1rem;
		}

		.score {
			position: absolute;
			top: 1rem;
			right: 1rem;
		}
		.lastScore {
			position: absolute;
			top: 3.2rem;
			right: 1rem;
		}

		.lose {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: auto;
			max-width: 100%;
			padding: 0 1rem;
			font-size: 5rem;
			text-align: center;
			opacity: 0;
			transition: opacity 0.2s ease-out;
			pointer-events: none;
		}
		.lose.show {
			opacity: 1;
		}

		.modal {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			background: rgba(0, 0, 0, 0.35);
			pointer-events: auto;
		}
		.modal-card {
			min-width: 240px;
			max-width: 80%;
			padding: 16px 18px;
			border-radius: 12px;
			background: rgba(0, 29, 69, 0.92);
			border: 1px solid rgba(252, 186, 3, 0.35);
			box-shadow: 0 10px 30px rgba(0,0,0,0.35);
			text-align: center;
		}
		.modal-title {
			margin-bottom: 0.5rem;
			font-size: 1.25rem;
			color: #fcba03;
			text-shadow: 2px 2px rgba(0, 0, 0, 0.5);
		}
		.modal-text {
			margin: 0 0 1rem 0;
			color: rgba(252, 186, 3, 0.95);
		}
		.modal-btn {
			appearance: none;
			border: 1px solid rgba(252, 186, 3, 0.55);
			background: rgba(0, 0, 0, 0.25);
			color: #fcba03;
			padding: 0.5rem 1rem;
			border-radius: 10px;
			cursor: pointer;
			font-size: 1rem;
		}
		.modal-btn:hover {
			background: rgba(252, 186, 3, 0.12);
		}
	}
  
}
</style>
