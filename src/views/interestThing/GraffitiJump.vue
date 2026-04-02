<template>
	<section class="graffiti-jump-page home-view-page">
		<div class="home-view-title">
			<div class="page-title">涂鸦跳跃</div>
			<div class="graffiti-jump-fullscreen-toggle">
				<FullscreenToggle
					v-model:fullscreen="pageFullscreen"
					v-model:menu-visible="pageMenuVisible"
				/>
			</div>
		</div>

		<div class="game-shell">
			<header class="game-toolbar">
				<div class="scoreboard">
					<div class="score-group">
						<div class="score-card score-card--high">
							<span class="score-label">最高</span>
							<strong>{{ highScore }}</strong>
						</div>
						<div class="score-card score-card--current">
							<span class="score-label">当前</span>
							<strong>{{ score }}</strong>
						</div>
					</div>
					<button class="action-button" type="button" @click="restartGame">
						{{ gameStarted ? '重开' : '开始' }}
					</button>
				</div>
			</header>

			<canvas ref="canvasRef" class="game-canvas" @click="handleCanvasClick" />

			<div v-if="isMobile && !showOverlay" class="canvas-tap-zones" aria-hidden="true">
				<button
					class="canvas-tap-zone canvas-tap-zone--left"
					type="button"
					tabindex="-1"
					@pointerdown.prevent="setMoveState('left', true)"
					@pointerup.prevent="setMoveState('left', false)"
					@pointerleave.prevent="setMoveState('left', false)"
					@pointercancel.prevent="setMoveState('left', false)"
				/>
				<button
					class="canvas-tap-zone canvas-tap-zone--right"
					type="button"
					tabindex="-1"
					@pointerdown.prevent="setMoveState('right', true)"
					@pointerup.prevent="setMoveState('right', false)"
					@pointerleave.prevent="setMoveState('right', false)"
					@pointercancel.prevent="setMoveState('right', false)"
				/>
			</div>

			<div class="hud" v-if="!isMobile">
				<div class="hud-pill">方向键 / A D 控制左右</div>
				<div class="hud-pill">踩中平台持续向上冲刺</div>
			</div>

			<div v-if="showOverlay" class="game-overlay">
				<div class="overlay-card">
					<p class="overlay-eyebrow">{{ isGameOver ? '本局结束' : '准备起跳' }}</p>
					<h2>{{ isGameOver ? `得分 ${score}` : '简易涂鸦跳跃' }}</h2>
					<p class="overlay-text">
						{{
							isGameOver
								? '掉出画面后会自动记录分数，排行榜仅展示当前游戏前十。'
								: '起跳后会自动弹跳，落到平台上即可继续上升。'
						}}
					</p>
					<p v-if="isGameOver" class="overlay-status" :class="{ 'is-error': recordError }">
						{{ recordStatusText }}
					</p>
					<div class="overlay-actions">
						<button class="overlay-button" type="button" @click="restartGame">
							{{ isGameOver ? '重新开始' : '开始游戏' }}
						</button>
						<button
							v-if="isGameOver"
							class="overlay-button overlay-button--secondary"
							type="button"
							@click="showLeaderboard = true"
						>
							查看排行榜
						</button>
					</div>
				</div>
			</div>

			<div v-if="isMobile && !showOverlay" class="touch-controls">
				<button
					class="touch-button"
					type="button"
					aria-label="move left"
					@pointerdown.prevent="setMoveState('left', true)"
					@pointerup.prevent="setMoveState('left', false)"
					@pointerleave.prevent="setMoveState('left', false)"
					@pointercancel.prevent="setMoveState('left', false)"
				>
					<span aria-hidden="true">←</span>
				</button>
				<button
					class="touch-button"
					type="button"
					aria-label="move right"
					@pointerdown.prevent="setMoveState('right', true)"
					@pointerup.prevent="setMoveState('right', false)"
					@pointerleave.prevent="setMoveState('right', false)"
					@pointercancel.prevent="setMoveState('right', false)"
				>
					<span aria-hidden="true">→</span>
				</button>
			</div>

			<LeaderboardDialog
				:visible="showLeaderboard"
				game-code="GraffitiJump"
				:limit="10"
				variant="graffiti"
				@close="showLeaderboard = false"
			/>
		</div>
	</section>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { gameScoreCreateReq } from '@/apis/gameScoreApis.js'
import { isApiSuccess } from '@/common/requests/requests.js'
import FullscreenToggle from '@/components/FullscreenToggle.vue'
import LeaderboardDialog from '@/views/three/components/LeaderboardDialog.vue'
import { DailyTimeFormat } from '@/utils/utils.js'

const GAME_CODE = 'GraffitiJump'
const STORAGE_KEY = 'graffiti-jump-high-score'
const LAST_SCORE_STORAGE_KEY = 'graffiti-jump-last-score'
const VIEW_WIDTH = 420
const VIEW_HEIGHT = 680
const PLATFORM_WIDTH = 78
const SHORT_PLATFORM_WIDTH = 52
const PLATFORM_HEIGHT = 14
const PLAYER_WIDTH = 34
const PLAYER_HEIGHT = 42
const GRAVITY = 0.34
const MOVE_SPEED = 4.4
const JUMP_VELOCITY = -10.6
const CAMERA_TRIGGER_Y = 244
const PLATFORM_GAP_MIN = 62
const PLATFORM_GAP_MAX = 96
const WALL_PADDING = 10
const SHORT_PLATFORM_SCORE = 120
const FAST_PLATFORM_SCORE = 200
const FAST_SHORT_PLATFORM_SCORE = 350

const canvasRef = ref(null)
const store = useStore()
const homeLayoutControls = inject('homeLayoutControls', null)
const isMobile = computed(() => store.state.isMobile)
const score = ref(0)
const highScore = ref(0)
const gameStarted = ref(false)
const isGameOver = ref(false)
const maxClimbDistance = ref(0)
const pageFullscreen = ref(false)
const pageMenuVisible = ref(true)
const showLeaderboard = ref(false)
const savingScore = ref(false)
const scoreRecorded = ref(false)
const lastScoreTime = ref('')
const recordError = ref('')

const moveLeft = ref(false)
const moveRight = ref(false)

let context = null
let animationFrameId = 0
let resizeHandler = null
let lastTimestamp = 0
let devicePixelRatioValue = 1
const viewportMetrics = {
	width: VIEW_WIDTH,
	height: VIEW_HEIGHT,
	scale: 1,
	offsetX: 0,
	offsetY: 0,
}

const player = {
	x: VIEW_WIDTH / 2 - PLAYER_WIDTH / 2,
	y: VIEW_HEIGHT - 150,
	width: PLAYER_WIDTH,
	height: PLAYER_HEIGHT,
	vx: 0,
	vy: 0,
	tilt: 1,
}

const platforms = []
const stars = []

const showOverlay = computed(() => !gameStarted.value || isGameOver.value)
const recordStatusText = computed(() => {
	if (!isGameOver.value) return ''
	if (recordError.value) return recordError.value
	if (savingScore.value) return '正在记录本局分数...'
	if (scoreRecorded.value) return '分数已记录，已为你准备好排行榜前十。'
	return '登录后可自动记录本局分数。'
})

watch(
	() => pageFullscreen.value,
	(value) => {
		homeLayoutControls?.setFullscreen?.(value)
	},
	{ immediate: true }
)

watch(
	() => pageMenuVisible.value,
	(value) => {
		homeLayoutControls?.setMenuVisible?.(value)
	},
	{ immediate: true }
)

watch(
	() => isGameOver.value,
	async (next, prev) => {
		if (!next || prev) return
		if (!score.value && !lastScoreTime.value) return
		if (savingScore.value || scoreRecorded.value) return
		await recordScore()
	}
)

function randomBetween(min, max) {
	return Math.random() * (max - min) + min
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value))
}

function safeParseJson(str) {
	const value = String(str || '').trim()
	if (!value) return null
	try {
		return JSON.parse(value)
	} catch {
		return null
	}
}

function getCurrentUserId() {
	const userInfoObj = safeParseJson(localStorage.getItem('userInfo')) || {}
	return String(userInfoObj?.user?.id || '')
}

function loadHighScore() {
	try {
		const rawHighScore = localStorage.getItem(STORAGE_KEY)
		const rawLastScore = localStorage.getItem(LAST_SCORE_STORAGE_KEY)
		const parsedHighScore = Number(rawHighScore || 0)
		const parsedLastScore = Number(rawLastScore || 0)

		highScore.value = Number.isFinite(parsedHighScore) ? parsedHighScore : 0
		score.value = Number.isFinite(parsedLastScore) ? parsedLastScore : 0
	} catch {
		highScore.value = 0
		score.value = 0
	}
}

function saveHighScore(value) {
	highScore.value = value
	try {
		localStorage.setItem(STORAGE_KEY, String(value))
	} catch {
		// Ignore storage failures so the game loop is not affected.
	}
}

function saveLastScore(value) {
	try {
		localStorage.setItem(LAST_SCORE_STORAGE_KEY, String(value))
	} catch {
		// Ignore storage failures so the game loop is not affected.
	}
}

function calculateScoreFromHeight(height) {
	const climb = Math.max(0, Math.floor(height))
	const stageOne = Math.min(climb, 600)
	const stageTwo = Math.min(Math.max(climb - 600, 0), 1200)
	const stageThree = Math.max(climb - 1800, 0)

	return (
		Math.floor(stageOne / 18) +
		Math.floor(stageTwo / 15) +
		Math.floor(stageThree / 12)
	)
}

function createPlatform(y, previousX = null) {
	const edgePadding = 18
	const difficultyScore = score.value
	const canSpawnFastShort = difficultyScore >= FAST_SHORT_PLATFORM_SCORE
	const canSpawnFast = difficultyScore >= FAST_PLATFORM_SCORE
	const canSpawnShort = difficultyScore >= SHORT_PLATFORM_SCORE

	let type = 'normal'
	if (canSpawnFastShort && Math.random() > 0.72) {
		type = 'fast-short'
	} else if (canSpawnFast && Math.random() > 0.76) {
		type = 'fast'
	} else if (canSpawnShort && Math.random() > 0.72) {
		type = 'short'
	}

	const isShort = type === 'short' || type === 'fast-short'
	const isFast = type === 'fast' || type === 'fast-short'
	const width = isShort ? SHORT_PLATFORM_WIDTH : PLATFORM_WIDTH
	const minX = edgePadding
	const maxX = VIEW_WIDTH - width - edgePadding
	let x = randomBetween(minX, maxX)

	if (previousX !== null) {
		const minDistance = 54
		if (Math.abs(x - previousX) < minDistance) {
			x = clamp(
				previousX + (x > previousX ? minDistance : -minDistance),
				minX,
				maxX
			)
		}
	}

	const moving = isFast || Math.random() > 0.72
	const speed = isFast ? randomBetween(1.8, 2.8) : moving ? randomBetween(0.8, 1.6) : 0

	return {
		x,
		y,
		width,
		height: PLATFORM_HEIGHT,
		type,
		short: isShort,
		moving,
		fast: isFast,
		speed,
		direction: Math.random() > 0.5 ? 1 : -1,
	}
}

function seedStars() {
	stars.length = 0
	for (let index = 0; index < 22; index += 1) {
		stars.push({
			x: randomBetween(18, VIEW_WIDTH - 18),
			y: randomBetween(12, VIEW_HEIGHT - 12),
			size: randomBetween(1.5, 3.8),
			alpha: randomBetween(0.16, 0.45),
		})
	}
}

function resetPlayer() {
	player.x = VIEW_WIDTH / 2 - PLAYER_WIDTH / 2
	player.y = VIEW_HEIGHT - 150
	player.vx = 0
	player.vy = JUMP_VELOCITY
	player.tilt = 1
}

function resetPlatforms() {
	platforms.length = 0
	const basePlatform = {
		x: VIEW_WIDTH / 2 - PLATFORM_WIDTH / 2,
		y: VIEW_HEIGHT - 72,
		width: PLATFORM_WIDTH + 16,
		height: PLATFORM_HEIGHT,
		type: 'base',
		short: false,
		moving: false,
		fast: false,
		speed: 0,
		direction: 0,
	}
	platforms.push(basePlatform)

	let currentY = VIEW_HEIGHT - 140
	let previousX = basePlatform.x

	while (currentY > -120) {
		const platform = createPlatform(currentY, previousX)
		platforms.push(platform)
		previousX = platform.x
		currentY -= randomBetween(PLATFORM_GAP_MIN, PLATFORM_GAP_MAX)
	}
}

function updateScore(nextScore) {
	const rounded = Math.max(0, Math.floor(nextScore))
	score.value = rounded
	saveLastScore(rounded)
	if (rounded > highScore.value) {
		saveHighScore(rounded)
	}
}

function restartGame() {
	maxClimbDistance.value = 0
	updateScore(0)
	gameStarted.value = true
	isGameOver.value = false
	moveLeft.value = false
	moveRight.value = false
	showLeaderboard.value = false
	savingScore.value = false
	scoreRecorded.value = false
	recordError.value = ''
	lastScoreTime.value = ''
	resetPlayer()
	resetPlatforms()
	seedStars()
	lastTimestamp = 0
}

function setMoveState(direction, value) {
	if (direction === 'left') moveLeft.value = value
	if (direction === 'right') moveRight.value = value
}

function isLeftControlKey(event) {
	return (
		event.code === 'ArrowLeft' ||
		event.code === 'KeyA' ||
		event.key === 'ArrowLeft' ||
		String(event.key || '').toLowerCase() === 'a'
	)
}

function isRightControlKey(event) {
	return (
		event.code === 'ArrowRight' ||
		event.code === 'KeyD' ||
		event.key === 'ArrowRight' ||
		String(event.key || '').toLowerCase() === 'd'
	)
}

function handleKeyDown(event) {
	if (isLeftControlKey(event)) {
		event.preventDefault()
		moveLeft.value = true
	}
	if (isRightControlKey(event)) {
		event.preventDefault()
		moveRight.value = true
	}
	if (event.code === 'Space' || event.key === ' ') {
		if (showOverlay.value) {
			event.preventDefault()
			restartGame()
		}
	}
}

function handleKeyUp(event) {
	if (isLeftControlKey(event)) {
		event.preventDefault()
		moveLeft.value = false
	}
	if (isRightControlKey(event)) {
		event.preventDefault()
		moveRight.value = false
	}
}

function handleCanvasClick() {
	if (showOverlay.value) {
		restartGame()
	}
}

async function recordScore() {
	recordError.value = ''

	const userId = getCurrentUserId()
	if (!userId) {
		recordError.value = '请先登录后再自动记录分数'
		return
	}

	const scoreValue = Number(score.value || 0)
	const scoreTime = lastScoreTime.value || DailyTimeFormat(new Date())

	savingScore.value = true
	try {
		const res = await gameScoreCreateReq({
			gameCode: GAME_CODE,
			score: scoreValue,
			scoreTime,
			userId,
		})
		if (!isApiSuccess(res)) {
			recordError.value = String(res?.message || '分数记录失败')
			ElMessage({ message: recordError.value, type: 'error' })
			return
		}

		scoreRecorded.value = true
		showLeaderboard.value = true
		ElMessage({ message: '分数已记录', type: 'success' })
	} catch (error) {
		recordError.value = String(error?.message || '分数记录失败')
		ElMessage({ message: recordError.value, type: 'error' })
	} finally {
		savingScore.value = false
	}
}

function syncCanvasSize() {
	const canvas = canvasRef.value
	if (!canvas || !context) return

	const rect = canvas.getBoundingClientRect()
	devicePixelRatioValue = Math.max(window.devicePixelRatio || 1, 1)
	canvas.width = Math.round(rect.width * devicePixelRatioValue)
	canvas.height = Math.round(rect.height * devicePixelRatioValue)
	context.setTransform(devicePixelRatioValue, 0, 0, devicePixelRatioValue, 0, 0)

	viewportMetrics.width = rect.width
	viewportMetrics.height = rect.height
	viewportMetrics.scale = Math.min(rect.width / VIEW_WIDTH, rect.height / VIEW_HEIGHT)
	viewportMetrics.offsetX = (rect.width - VIEW_WIDTH * viewportMetrics.scale) / 2
	viewportMetrics.offsetY = (rect.height - VIEW_HEIGHT * viewportMetrics.scale) / 2
}

function spawnPlatformAtTop() {
	const topY = Math.min(...platforms.map((item) => item.y))
	const previousX = platforms.find((item) => item.y === topY)?.x ?? null
	const nextY = topY - randomBetween(PLATFORM_GAP_MIN, PLATFORM_GAP_MAX)
	platforms.push(createPlatform(nextY, previousX))
}

function updatePlatforms(deltaFactor) {
	for (const platform of platforms) {
		if (!platform.moving) continue
		platform.x += platform.speed * platform.direction * deltaFactor
		if (platform.x <= 12 || platform.x + platform.width >= VIEW_WIDTH - 12) {
			platform.direction *= -1
			platform.x = clamp(platform.x, 12, VIEW_WIDTH - platform.width - 12)
		}
	}
}

function applyCameraShift() {
	if (player.y >= CAMERA_TRIGGER_Y) return

	const offset = CAMERA_TRIGGER_Y - player.y
	player.y = CAMERA_TRIGGER_Y
	maxClimbDistance.value += offset
	updateScore(calculateScoreFromHeight(maxClimbDistance.value))

	for (const platform of platforms) {
		platform.y += offset
	}

	while (platforms.length && platforms[0].y > VIEW_HEIGHT + 60) {
		platforms.shift()
	}

	while (platforms.length < 12 || Math.min(...platforms.map((item) => item.y)) > -40) {
		spawnPlatformAtTop()
	}
}

function handleCollision(previousBottom) {
	if (player.vy <= 0) return

	const currentBottom = player.y + player.height
	for (const platform of platforms) {
		const hitsHorizontal =
			player.x + player.width - 8 > platform.x &&
			player.x + 8 < platform.x + platform.width
		const crossedTop = previousBottom <= platform.y && currentBottom >= platform.y

		if (hitsHorizontal && crossedTop) {
			player.y = platform.y - player.height
			player.vy = JUMP_VELOCITY
			return
		}
	}
}

function updatePlayer(deltaFactor) {
	const moveDirection = Number(moveRight.value) - Number(moveLeft.value)
	player.vx = moveDirection * MOVE_SPEED
	player.x += player.vx * deltaFactor
	player.vy += GRAVITY * deltaFactor

	const previousBottom = player.y + player.height
	player.y += player.vy * deltaFactor
	player.tilt = moveDirection === 0 ? player.tilt * 0.8 : moveDirection

	const minX = WALL_PADDING
	const maxX = VIEW_WIDTH - player.width - WALL_PADDING
	if (player.x < minX) {
		player.x = minX
		player.vx = 0
	} else if (player.x > maxX) {
		player.x = maxX
		player.vx = 0
	}

	handleCollision(previousBottom)
	applyCameraShift()

	if (player.y > VIEW_HEIGHT + 90) {
		saveLastScore(score.value)
		lastScoreTime.value = DailyTimeFormat(new Date())
		isGameOver.value = true
		gameStarted.value = false
	}
}

function updateGame(deltaFactor) {
	if (!gameStarted.value || isGameOver.value) return
	updatePlatforms(deltaFactor)
	updatePlayer(deltaFactor)
}

function drawBackground() {
	context.clearRect(0, 0, viewportMetrics.width, viewportMetrics.height)

	const gradient = context.createLinearGradient(0, 0, 0, VIEW_HEIGHT)
	gradient.addColorStop(0, '#fffaf0')
	gradient.addColorStop(0.5, '#f8f2cf')
	gradient.addColorStop(1, '#dcefcf')
	context.fillStyle = gradient
	context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)

	context.save()
	context.globalAlpha = 0.7
	for (const star of stars) {
		context.fillStyle = `rgba(78, 97, 68, ${star.alpha})`
		context.beginPath()
		context.arc(star.x, star.y, star.size, 0, Math.PI * 2)
		context.fill()
	}
	context.restore()

	context.strokeStyle = 'rgba(69, 93, 54, 0.16)'
	context.lineWidth = 1
	for (let y = 38; y < VIEW_HEIGHT; y += 46) {
		context.beginPath()
		context.moveTo(18, y)
		context.quadraticCurveTo(VIEW_WIDTH / 2, y + 8, VIEW_WIDTH - 18, y - 2)
		context.stroke()
	}
}

function drawPlatforms() {
	for (const platform of platforms) {
		context.save()
		if (platform.fast && platform.short) {
			context.fillStyle = '#7f6bff'
		} else if (platform.fast) {
			context.fillStyle = '#ff7b54'
		} else if (platform.short) {
			context.fillStyle = '#5fc1ff'
		} else if (platform.moving) {
			context.fillStyle = '#ffb15c'
		} else {
			context.fillStyle = '#78c958'
		}
		context.strokeStyle = '#27421f'
		context.lineWidth = 3

		context.beginPath()
		context.roundRect(platform.x, platform.y, platform.width, platform.height, 10)
		context.fill()
		context.stroke()

		context.fillStyle = 'rgba(255, 255, 255, 0.55)'
		context.fillRect(platform.x + 8, platform.y + 3, platform.width - 16, 3)
		context.restore()
	}
}

function drawPlayer() {
	const bodyX = player.x
	const bodyY = player.y

	context.save()
	context.translate(bodyX + player.width / 2, bodyY + player.height / 2)
	context.rotate((player.tilt * Math.PI) / 30)
	context.translate(-(bodyX + player.width / 2), -(bodyY + player.height / 2))

	context.fillStyle = '#9ce04d'
	context.strokeStyle = '#1b3017'
	context.lineWidth = 3
	context.beginPath()
	context.roundRect(bodyX + 4, bodyY + 6, player.width - 8, player.height - 12, 12)
	context.fill()
	context.stroke()

	context.fillStyle = '#ffffff'
	context.beginPath()
	context.arc(bodyX + 12, bodyY + 18, 4.6, 0, Math.PI * 2)
	context.arc(bodyX + player.width - 12, bodyY + 18, 4.6, 0, Math.PI * 2)
	context.fill()

	context.fillStyle = '#20301e'
	context.beginPath()
	context.arc(bodyX + 12, bodyY + 18, 2.2, 0, Math.PI * 2)
	context.arc(bodyX + player.width - 12, bodyY + 18, 2.2, 0, Math.PI * 2)
	context.fill()

	context.strokeStyle = '#20301e'
	context.lineWidth = 2.5
	context.beginPath()
	context.arc(bodyX + player.width / 2, bodyY + 24, 7, 0.1 * Math.PI, 0.9 * Math.PI)
	context.stroke()

	context.strokeStyle = '#20301e'
	context.lineWidth = 3
	context.beginPath()
	context.moveTo(bodyX + 8, bodyY + player.height - 10)
	context.lineTo(bodyX + 2, bodyY + player.height + 4)
	context.moveTo(bodyX + player.width - 8, bodyY + player.height - 10)
	context.lineTo(bodyX + player.width + 4, bodyY + player.height + 4)
	context.stroke()
	context.restore()
}

function drawFrame() {
	context.save()
	context.strokeStyle = '#314428'
	context.lineWidth = 6
	context.strokeRect(6, 6, VIEW_WIDTH - 12, VIEW_HEIGHT - 12)

	context.strokeStyle = 'rgba(49, 68, 40, 0.25)'
	context.lineWidth = 2
	context.strokeRect(18, 18, VIEW_WIDTH - 36, VIEW_HEIGHT - 36)
	context.restore()
}

function render() {
	if (!context) return

	context.save()
	context.translate(viewportMetrics.offsetX, viewportMetrics.offsetY)
	context.scale(viewportMetrics.scale, viewportMetrics.scale)
	drawBackground()
	drawPlatforms()
	drawPlayer()
	drawFrame()
	context.restore()
}

function animate(timestamp) {
	if (!context) return

	if (!lastTimestamp) lastTimestamp = timestamp
	const delta = timestamp - lastTimestamp
	lastTimestamp = timestamp
	const deltaFactor = Math.min(delta / 16.6667, 1.8)

	updateGame(deltaFactor)
	render()

	animationFrameId = window.requestAnimationFrame(animate)
}

onMounted(() => {
	const canvas = canvasRef.value
	if (!canvas) return

	context = canvas.getContext('2d')
	if (!context) return

	loadHighScore()
	seedStars()
	resetPlayer()
	resetPlatforms()
	syncCanvasSize()
	render()

	resizeHandler = () => syncCanvasSize()
	window.addEventListener('resize', resizeHandler)
	window.addEventListener('keydown', handleKeyDown, { passive: false })
	window.addEventListener('keyup', handleKeyUp, { passive: false })

	animationFrameId = window.requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
	pageFullscreen.value = false
	pageMenuVisible.value = true
	homeLayoutControls?.setFullscreen?.(false)
	homeLayoutControls?.setMenuVisible?.(true)

	if (animationFrameId) {
		window.cancelAnimationFrame(animationFrameId)
		animationFrameId = 0
	}

	if (resizeHandler) {
		window.removeEventListener('resize', resizeHandler)
		resizeHandler = null
	}

	window.removeEventListener('keydown', handleKeyDown)
	window.removeEventListener('keyup', handleKeyUp)
})
</script>

<style scoped lang="scss">
.graffiti-jump-page.home-view-page {
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: 0;
	padding: 0;
	background:
		radial-gradient(circle at top, rgba(255, 250, 223, 0.92), transparent 34%),
		linear-gradient(180deg, #fbf8e8 0%, #eef5d8 48%, #dceec6 100%);

	.home-view-title {
		position: relative;
		height: 68px;
		border-bottom: 1px solid rgba(74, 98, 55, 0.14);
		background:
			linear-gradient(180deg, rgba(255, 250, 223, 0.96), rgba(247, 240, 201, 0.92));
		box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.5);

		.page-title {
			padding-left: 40px;
			font-size: 20px;
			font-weight: 800;
			letter-spacing: 0.08em;
			color: #314428;
			text-shadow: 0 1px 0 rgba(255, 255, 255, 0.65);
		}

		.page-title::before {
			top: 18px;
			left: 18px;
			width: 10px;
			height: 33px;
			border-radius: 10px;
			background: linear-gradient(180deg, #9ce04d 0%, #78c958 100%);
			box-shadow:
				0 0 0 3px rgba(156, 224, 77, 0.16),
				0 8px 18px rgba(74, 98, 55, 0.16);
		}
	}

	.graffiti-jump-fullscreen-toggle {
		position: absolute;
		top: 12px;
		right: 18px;
		z-index: 6;
	}
}

.game-toolbar {
	position: absolute;
	top: 16px;
	left: 16px;
	right: 16px;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	flex-wrap: wrap;
	padding: 0;
}

.scoreboard {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	gap: 12px;
	flex-wrap: wrap;
}

.score-group {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 12px;
	flex-wrap: wrap;
}

.score-card {
	min-width: 88px;
	padding: 10px 14px;
	border: 1px solid rgba(255, 255, 255, 0.32);
	border-radius: 16px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.16));
	box-shadow: 0 10px 20px rgba(52, 85, 32, 0.12);
	color: #243414;
	backdrop-filter: blur(8px);
	display: flex;
	flex-direction: column;
	gap: 2px;

	strong {
		font-size: 24px;
		line-height: 1;
	}
}

.score-label {
	font-size: 12px;
	letter-spacing: 0.08em;
	color: rgba(36, 52, 20, 0.72);
}

.action-button,
.overlay-button,
.touch-button,
.canvas-tap-zone {
	border: 0;
	cursor: pointer;
	user-select: none;
	-webkit-user-select: none;
	-webkit-touch-callout: none;
	-webkit-tap-highlight-color: transparent;
	transition:
		transform 0.18s ease,
		box-shadow 0.18s ease,
		background 0.18s ease,
		opacity 0.18s ease;
}

.action-button {
	padding: 12px 18px;
	border-radius: 999px;
	background: linear-gradient(180deg, #fff5bf, #ffd166);
	color: #4b3212;
	font-weight: 700;
	box-shadow: 0 12px 20px rgba(73, 99, 43, 0.18);
}

.action-button:hover,
.overlay-button:hover,
.touch-button:hover {
	transform: translateY(-1px);
}

.game-shell {
	position: relative;
	flex: 1;
	min-height: 0;
	padding: 14px 14px 16px;
	border-radius: 0;
	background:
		radial-gradient(circle at top, rgba(255, 255, 255, 0.58), transparent 36%),
		linear-gradient(180deg, #fbf8e8, #eef5d8 48%, #dceec6);
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.7),
		inset 0 18px 32px rgba(255, 250, 223, 0.35);
	overflow: hidden;
	-webkit-user-select: none;
	user-select: none;
}

.game-canvas {
	display: block;
	width: 100%;
	height: 100%;
	margin: 0 auto;
	border-radius: 24px;
	background: transparent;
	touch-action: manipulation;
}

.canvas-tap-zones {
	position: absolute;
	left: 14px;
	right: 14px;
	top: 14px;
	bottom: 96px;
	z-index: 1;
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0;
}

.canvas-tap-zone {
	background: transparent;
	opacity: 0;
}

.canvas-tap-zone:active {
	opacity: 0.08;
	background: rgba(49, 68, 40, 0.5);
}

.hud {
	width: 180px;
	position: absolute;
	top: 94px;
	left: 22px;
	right: 22px;
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	pointer-events: none;
	z-index: 2;
}

.hud-pill {
	padding: 8px 12px;
	border-radius: 999px;
	background: rgba(255, 252, 238, 0.8);
	color: #425531;
	font-size: 12px;
	backdrop-filter: blur(8px);
}

.game-overlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px;
	background: rgba(244, 240, 218, 0.55);
	backdrop-filter: blur(5px);
	z-index: 4;
}

.overlay-card {
	width: min(100%, 380px);
	padding: 28px 26px;
	border: 3px solid rgba(49, 68, 40, 0.12);
	border-radius: 26px;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(251, 246, 214, 0.96));
	box-shadow: 0 24px 54px rgba(74, 98, 55, 0.16);
	text-align: center;
	color: #314428;

	h2 {
		margin: 0 0 12px;
		font-size: 30px;
		line-height: 1.1;
	}
}

.overlay-eyebrow {
	margin-bottom: 8px;
	font-size: 12px;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: rgba(49, 68, 40, 0.66);
}

.overlay-text {
	margin: 0;
	line-height: 1.7;
}

.overlay-status {
	margin: 14px 0 0;
	padding: 10px 12px;
	border-radius: 14px;
	background: rgba(255, 252, 238, 0.88);
	color: rgba(49, 68, 40, 0.78);
	line-height: 1.6;
}

.overlay-status.is-error {
	background: rgba(255, 224, 224, 0.88);
	color: #a04747;
}

.overlay-actions {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin-top: 18px;
}

.overlay-button {
	padding: 13px 18px;
	min-width: 144px;
	border-radius: 999px;
	background: linear-gradient(180deg, #ffbb67, #f28b37);
	color: #44260f;
	font-weight: 800;
	box-shadow: 0 12px 24px rgba(242, 139, 55, 0.22);
}

.overlay-button--secondary {
	background: rgba(255, 252, 238, 0.88);
	color: #314428;
	box-shadow: 0 12px 26px rgba(74, 98, 55, 0.14);
}

.touch-controls {
	position: absolute;
	left: 20px;
	right: 20px;
	bottom: 18px;
	display: flex;
	justify-content: center;
	gap: 16px;
	z-index: 3;
}

.touch-button {
	min-width: 132px;
	min-height: 72px;
	padding: 12px 16px;
	border-radius: 22px;
	background: rgba(255, 252, 238, 0.92);
	color: #314428;
	font-weight: 800;
	font-size: 34px;
	line-height: 1;
	box-shadow: 0 12px 26px rgba(74, 98, 55, 0.14);
}

.touch-button:active {
	transform: translateY(1px) scale(0.98);
	background: rgba(255, 238, 210, 0.95);
}

@media (max-width: 900px) {
	.graffiti-jump-page.home-view-page {
		padding: 0;

		.graffiti-jump-fullscreen-toggle {
			top: calc(env(safe-area-inset-top, 0px) + 10px);
			right: 12px;
		}
	}

	.game-toolbar {
		top: 16px;
		left: 18px;
		right: 18px;
	}

	.scoreboard {
		align-items: flex-start;
		justify-content: flex-start;
		gap: 0;
	}

	.score-group {
		gap: 0;
		width: 100%;
	}

	.score-card {
		min-width: auto;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		box-shadow: none;
		backdrop-filter: none;
		color: rgba(36, 52, 20, 0.62);

		strong {
			font-size: 18px;
			line-height: 1;
			color: rgba(36, 52, 20, 0.72);
		}
	}

	.score-card--high {
		display: none;
	}

	.score-card--current {
		padding-left: 4px;

		strong {
			font-size: 20px;
			line-height: 1;
		}
	}

	.score-label {
		font-size: 10px;
		letter-spacing: 0.04em;
		color: rgba(36, 52, 20, 0.45);
	}

	.action-button {
		display: none;
	}

	.game-shell {
		padding: 8px 8px 58px;
	}

	.canvas-tap-zones {
		left: 8px;
		right: 8px;
		top: 8px;
		bottom: 66px;
	}

	.touch-controls {
		left: 18px;
		right: 18px;
		bottom: 8px;
		gap: 12px;
	}

	.touch-button {
		flex: 1;
		min-width: 0;
		min-height: 39px;
		max-width: 40%;
		font-size: 38px;
		padding: 6px 12px;
		border-radius: 16px;
	}
}
</style>
