<template>
	<section class="lucky-wheel-page home-view-page">
		<div class="lucky-wheel-scroll">
			<div class="lucky-wheel-shell">
				<div class="wheel-board">
					<div class="board-copy">
						<p class="eyebrow">Lucky Wheel</p>
						<h1>幸运转盘</h1>
						<p class="board-desc">
							点击START按钮开始抽取幸运大奖。
						</p>
					</div>

					<div class="wheel-stage">
						<div ref="wheelWrapRef" class="wheel-wrap">
							<div class="wheel-pointer">
								<span class="pointer-badge">LUCK</span>
								<span class="pointer-head" />
								<span class="pointer-glow" />
							</div>

							<div
								ref="wheelDiskRef"
								class="wheel-disk"
								:class="{ spinning: isSpinning }"
								:style="{ background: wheelBackground }"
							>
								<div
									v-for="segment in wheelSegments"
									:key="segment.id"
									class="wheel-segment-label"
									:style="segment.labelStyle"
								>
									<div class="segment-label-content">
										<span class="segment-icon">{{ segment.icon }}</span>
										<span class="segment-name">{{ segment.label }}</span>
									</div>
								</div>

								<button
									class="wheel-center"
									type="button"
									:disabled="isSpinning || !canSpin"
									@click="spinWheel"
								>
									<span>START</span>
								</button>
							</div>
						</div>

						<!-- <div class="wheel-status-panel">
							<div class="status-card">
								<span class="status-label">当前状态</span>
								<strong>{{ statusText }}</strong>
							</div>
							<div class="status-card">
								<span class="status-label">奖项数量</span>
								<strong>{{ wheelItems.length }} 项</strong>
							</div>
							<div class="status-card accent">
								<span class="status-label">最近结果</span>
								<strong>{{ latestWinText }}</strong>
							</div>
						</div> -->

						<div class="wheel-actions">
							<button class="primary-btn" type="button" :disabled="isSpinning || !canSpin" @click="spinWheel">
								{{ isSpinning ? '旋转中...' : '开始抽奖' }}
							</button>
							<button class="ghost-btn" type="button" :disabled="isSpinning" @click="showPrizeDialog = true">
								奖品详情
							</button>
							<button class="ghost-btn" type="button" :disabled="isSpinning" @click="resetRecords">
								清空记录
							</button>
						</div>

					</div>
				</div>

				<aside class="side-panel">
					<section class="panel-card config-card">
						<div class="panel-head">
							<div>
								<p class="panel-kicker">Source</p>
								<h2>奖品详情</h2>
							</div>
						</div>

						<!-- <div class="source-card">
							<p>当前奖项直接从前端配置文件引入：</p>
							<p class="source-path">`src/views/interestThing/LuckyItems.js`</p>
							<p>修改该文件后，转盘内容会随页面重新渲染。</p>
						</div> -->

						<div class="preview-list">
							<div
								v-for="item in wheelItems"
								:key="item.id"
								class="preview-item"
								:style="{ '--preview-color': item.color }"
							>
								<span class="preview-icon">{{ item.icon }}</span>
								<div class="preview-content">
									<strong>{{ item.label }} · {{ item.percentage }}%</strong>
									<p>{{ item.description }}</p>
								</div>
							</div>
						</div>
					</section>

					<section class="panel-card record-card">
						<div class="panel-head">
							<div>
								<p class="panel-kicker">History</p>
								<h2>转盘记录</h2>
							</div>
							<span class="record-count">{{ spinRecords.length }} 次</span>
						</div>

						<div class="record-entry-card">
							<div v-if="spinRecords.length" class="record-entry-summary">
								<div class="record-entry-latest" :style="{ '--record-color': spinRecords[0].color }">
									<div class="record-icon">{{ spinRecords[0].icon }}</div>
									<div class="record-content">
										<div class="record-main">
											<strong>{{ spinRecords[0].label }}</strong>
											<span>{{ spinRecords[0].time }}</span>
										</div>
										<p>{{ spinRecords[0].description }}</p>
									</div>
								</div>

								<div class="record-entry-stats">
									<div class="record-stat-card">
										<span>记录数</span>
										<strong>{{ spinRecords.length }}</strong>
									</div>
									<div class="record-stat-card">
										<span>最近抽中</span>
										<strong>{{ spinRecords[0].label }}</strong>
									</div>
								</div>
							</div>
							<div v-else class="record-empty">还没有抽奖记录，先转一次看看。</div>

							<div class="record-entry-actions">
								<button
									class="primary-btn history-open-btn"
									type="button"
									:disabled="!spinRecords.length"
									@click="showHistoryDialog = true"
								>
									查看全部记录
								</button>
							</div>
						</div>
					</section>
				</aside>
			</div>
		</div>

		<el-dialog
			v-model="showHistoryDialog"
			class="lucky-history-dialog"
			title="转盘记录"
			width="680px"
			append-to-body
			align-center
		>
			<div class="history-dialog-body">
				<div v-if="spinRecords.length" class="history-dialog-summary">
					<div class="history-dialog-stat">
						<span>总抽奖数</span>
						<strong>{{ spinRecords.length }}</strong>
					</div>
					<div class="history-dialog-stat">
						<span>最新结果</span>
						<strong>{{ spinRecords[0].label }}</strong>
					</div>
					<div class="history-dialog-stat accent">
						<span>最近时间</span>
						<strong>{{ spinRecords[0].time }}</strong>
					</div>
				</div>

				<div class="history-dialog-toolbar">
					<p>保留最近 12 条抽奖记录，按时间倒序显示。</p>
					<button class="ghost-btn history-clear-btn" type="button" :disabled="!spinRecords.length" @click="resetRecords">
						清空记录
					</button>
				</div>

				<div v-if="spinRecords.length" class="history-dialog-list">
					<div
						v-for="record in spinRecords"
						:key="record.id"
						class="record-item history-record-item"
						:style="{ '--record-color': record.color }"
					>
						<div class="record-icon">{{ record.icon }}</div>
						<div class="record-content">
							<div class="record-main">
								<strong>{{ record.label }}</strong>
								<span>{{ record.time }}</span>
							</div>
							<p>{{ record.description }}</p>
						</div>
					</div>
				</div>
				<div v-else class="history-dialog-empty">
					<div class="history-dialog-empty-icon">◎</div>
					<p>还没有抽奖记录，先点击 START 开始一次。</p>
				</div>
			</div>
		</el-dialog>

		<el-dialog
			v-model="showPrizeDialog"
			class="lucky-prize-dialog"
			title="奖品详情"
			width="720px"
			append-to-body
			align-center
		>
			<div class="prize-dialog-body">
				<div class="prize-dialog-toolbar">
					<p>当前转盘共 {{ wheelItems.length }} 个奖项，按概率展示。</p>
				</div>
				<div class="preview-list prize-dialog-list">
					<div
						v-for="item in wheelItems"
						:key="item.id"
						class="preview-item"
						:style="{ '--preview-color': item.color }"
					>
						<span class="preview-icon">{{ item.icon }}</span>
						<div class="preview-content">
							<strong>{{ item.label }} · {{ item.percentage }}%</strong>
							<p>{{ item.description }}</p>
						</div>
					</div>
				</div>
			</div>
		</el-dialog>

		<el-dialog
			v-model="showResultDialog"
			class="lucky-result-dialog"
			title="抽奖结果"
			width="460px"
			append-to-body
			align-center
		>
			<div
				v-if="currentResult"
				class="winner-card winner-dialog-card"
				:style="{ '--winner-color': currentResult.color }"
			>
				<div class="winner-icon">{{ currentResult.icon }}</div>
				<div class="winner-info">
					<p class="winner-title">本次抽中</p>
					<h3>{{ currentResult.label }}</h3>
					<p>{{ currentResult.description }}</p>
				</div>
			</div>
		</el-dialog>
	</section>
</template>

<script>
export default {
	name: 'LuckyWheelView',
}
</script>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import luckyItems from './LuckyItems'

const normalizeAngle = (value) => ((value % 360) + 360) % 360

const wheelDiskRef = ref(null)
const wheelWrapRef = ref(null)
const wheelDiameter = ref(560)
const wheelItems = ref(
	Array.isArray(luckyItems)
		? luckyItems.map((item, index) => ({
				id: item.id ?? `lucky-item-${index + 1}`,
				label: item.label ?? item.name ?? `奖项${index + 1}`,
				icon: item.icon ?? '🎁',
				color: item.color ?? '#ff8a65',
				percentage: Number(item.percentage) > 0 ? Number(item.percentage) : 1,
				description: item.description ?? '未配置描述',
			}))
		: [],
)
const isSpinning = ref(false)
const rotation = ref(0)
const currentResult = ref(null)
const spinRecords = ref([])
const showHistoryDialog = ref(false)
const showPrizeDialog = ref(false)
const showResultDialog = ref(false)
let rotationFrame = null
let wheelResizeObserver = null
let removeWheelResizeListener = null

const canSpin = computed(() => wheelItems.value.length >= 2)

const totalPercentage = computed(() =>
	wheelItems.value.reduce((sum, item) => sum + (Number(item.percentage) > 0 ? Number(item.percentage) : 0), 0),
)

const wheelBackground = computed(() => {
	if (!wheelItems.value.length) {
		return 'linear-gradient(135deg, #ffe5d1, #ffc89c)'
	}

	let start = 0
	const slices = wheelItems.value.map((item) => {
		const span = (item.percentage / totalPercentage.value) * 360
		const end = start + span
		const slice = `${item.color} ${start}deg ${end}deg`
		start = end
		return slice
	})

	return `conic-gradient(from -90deg, ${slices.join(', ')})`
})

const wheelSegments = computed(() => {
	let startAngle = -90
	const currentDiameter = Math.max(260, Number(wheelDiameter.value) || 560)
	const diameterRatio = currentDiameter / 560

	return wheelItems.value.map((item) => {
		const spanAngle = (item.percentage / totalPercentage.value) * 360
		const centerAngle = startAngle + spanAngle / 2
		const radiusFactor = spanAngle < 32 ? 0.43 : spanAngle < 48 ? 0.405 : 0.378
		const compactPull = diameterRatio < 0.8 ? (0.8 - diameterRatio) * 44 : 0
		const labelRadius = Math.max(90, currentDiameter * radiusFactor - compactPull)
		const labelWidth = Math.max(64, Math.min(currentDiameter * 0.31, Math.round((spanAngle / 360) * currentDiameter * 1.14)))
		const segment = {
			...item,
			startAngle,
			spanAngle,
			centerAngle,
			labelStyle: {
				width: `${labelWidth}px`,
				transform: `translate(-50%, -50%) rotate(${centerAngle}deg) translateY(-${labelRadius}px) rotate(${-centerAngle}deg)`,
			},
		}
		startAngle += spanAngle
		return segment
	})
})

const formatTime = (date) =>
	new Intl.DateTimeFormat('zh-CN', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	}).format(date)

const appendRecord = (item) => {
	spinRecords.value = [
		{
			id: `${item.id}-${Date.now()}`,
			label: item.label,
			icon: item.icon,
			color: item.color,
			description: item.description,
			time: formatTime(new Date()),
		},
		...spinRecords.value,
	].slice(0, 12)
}

const resetRecords = () => {
	spinRecords.value = []
	currentResult.value = null
	showHistoryDialog.value = false
	showResultDialog.value = false
}

const easeOutCubic = (t) => 1 - (1 - t) ** 3

const setDiskRotation = (angle) => {
	if (wheelDiskRef.value) {
		wheelDiskRef.value.style.transform = `translateZ(0) rotate(${angle}deg)`
	}
}

const updateWheelDiameter = () => {
	const nextWidth = wheelWrapRef.value?.clientWidth || 560
	wheelDiameter.value = Math.max(260, nextWidth - 48)
}

const animateRotation = ({ from, to, duration, onComplete }) => {
	if (rotationFrame) {
		cancelAnimationFrame(rotationFrame)
		rotationFrame = null
	}

	const startTime = performance.now()

	const step = (now) => {
		const progress = Math.min((now - startTime) / duration, 1)
		const eased = easeOutCubic(progress)
		const nextRotation = from + (to - from) * eased
		setDiskRotation(nextRotation)

		if (progress < 1) {
			rotationFrame = requestAnimationFrame(step)
			return
		}

		rotation.value = to
		setDiskRotation(to)
		rotationFrame = null
		onComplete?.()
	}

	rotationFrame = requestAnimationFrame(step)
}

const spinWheel = () => {
	if (isSpinning.value || !canSpin.value) return

	showResultDialog.value = false
	const randomValue = Math.random() * totalPercentage.value
	let current = 0
	const targetSegment =
		wheelSegments.value.find((segment) => {
			current += segment.percentage
			return randomValue <= current
		}) || wheelSegments.value[wheelSegments.value.length - 1]
	const targetItem = targetSegment
	const currentNormalized = normalizeAngle(rotation.value)
	const targetAngle = normalizeAngle(360 - normalizeAngle(targetSegment.centerAngle))
	const delta = normalizeAngle(targetAngle - currentNormalized)
	const extraTurns = (5 + Math.floor(Math.random() * 3)) * 360
	const finalRotation = rotation.value + extraTurns + delta

	isSpinning.value = true

	animateRotation({
		from: rotation.value,
		to: finalRotation,
		duration: 5200,
		onComplete: () => {
			rotation.value = normalizeAngle(finalRotation)
			currentResult.value = targetItem
			appendRecord(targetItem)
			showResultDialog.value = true
			isSpinning.value = false
		},
	})
}

onMounted(() => {
	setDiskRotation(rotation.value)
	updateWheelDiameter()
	if (typeof ResizeObserver !== 'undefined' && wheelWrapRef.value) {
		wheelResizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0]
			if (!entry) return
			const nextWidth = entry.contentRect?.width || wheelWrapRef.value?.clientWidth || 560
			wheelDiameter.value = Math.max(260, nextWidth - 48)
		})
		wheelResizeObserver.observe(wheelWrapRef.value)
	} else {
		window.addEventListener('resize', updateWheelDiameter)
		removeWheelResizeListener = () => window.removeEventListener('resize', updateWheelDiameter)
	}
})

onBeforeUnmount(() => {
	wheelResizeObserver?.disconnect()
	wheelResizeObserver = null
	removeWheelResizeListener?.()
	removeWheelResizeListener = null
	if (rotationFrame) {
		cancelAnimationFrame(rotationFrame)
		rotationFrame = null
	}
})
</script>

<style lang="scss">
.lucky-wheel-page.home-view-page {
	height: 100%;
	overflow: hidden;
	background:
		radial-gradient(circle at top left, rgba(255, 248, 218, 0.92), transparent 28%),
		radial-gradient(circle at bottom right, rgba(255, 177, 120, 0.28), transparent 30%),
		linear-gradient(135deg, #fff8ef 0%, #ffe9d8 45%, #ffd4b8 100%);
}

.lucky-wheel-scroll {
	height: 100%;
	padding: 10px 0;
	box-sizing: border-box;
	overflow-x: hidden;
	overflow-y: hidden;
	scrollbar-width: thin;
	scrollbar-color: rgba(214, 109, 55, 0.88) rgba(255, 247, 239, 0.46);
}

.lucky-wheel-scroll::-webkit-scrollbar {
	width: 12px;
}

.lucky-wheel-scroll::-webkit-scrollbar-track {
	background: rgba(255, 247, 239, 0.46);
	border-radius: 999px;
}

.lucky-wheel-scroll::-webkit-scrollbar-thumb {
	border-radius: 999px;
	border: 3px solid rgba(255, 247, 239, 0.46);
	background: linear-gradient(180deg, rgba(239, 134, 77, 0.88), rgba(203, 93, 43, 0.92));
}

.lucky-wheel-scroll::-webkit-scrollbar-thumb:hover {
	background: linear-gradient(180deg, rgba(246, 146, 93, 0.94), rgba(190, 82, 33, 0.96));
}

.lucky-wheel-shell {
	width: min(1360px, calc(100% - 32px));
	height: 100%;
	min-height: 0;
	margin: 0 auto;
	padding: 8px 0 12px;
	display: grid;
	grid-template-columns: minmax(0, 1.32fr) minmax(300px, 390px);
	gap: 16px;
	align-items: stretch;
	box-sizing: border-box;
}

.wheel-board,
.panel-card {
	border-radius: 32px;
	background: rgba(255, 255, 255, 0.72);
	border: 1px solid rgba(255, 255, 255, 0.7);
	box-shadow: 0 24px 60px rgba(166, 101, 52, 0.12);
	backdrop-filter: blur(18px);
}

.wheel-board {
	padding: 20px;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: 20px;
}

.eyebrow,
.panel-kicker {
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.2em;
	text-transform: uppercase;
	color: #d6672d;
}

.board-copy h1,
.panel-head h2 {
	margin-top: 8px;
	color: #73351b;
}

.board-copy h1 {
	margin-bottom: 8px;
	font-size: 32px;
}

.board-desc,
.record-empty,
.record-content p,
.winner-info p,
.source-card p,
.preview-content p,
.history-dialog-toolbar p,
.history-dialog-empty p {
	color: rgba(103, 57, 33, 0.72);
	line-height: 1.7;
}

.wheel-stage {
	display: grid;
	align-content: start;
	gap: 12px;
	justify-items: center;
}

.wheel-wrap {
	position: relative;
	width: min(100%, 460px, calc(100vh - 280px));
	aspect-ratio: 1;
	display: grid;
	place-items: center;
	padding: 14px;
}

.wheel-wrap::before {
	content: '';
	position: absolute;
	inset: 20px;
	border-radius: 50%;
	background:
		radial-gradient(circle at center, rgba(255, 255, 255, 0.9) 0 20%, transparent 20%),
		radial-gradient(circle, rgba(255, 184, 120, 0.16), transparent 66%);
	filter: blur(2px);
}

.wheel-pointer {
	position: absolute;
	top: -14px;
	left: 50%;
	z-index: 4;
	width: 132px;
	height: 118px;
	transform: translateX(-50%);
	display: grid;
	justify-items: center;
}

.pointer-badge {
	position: absolute;
	top: 0;
	left: 50%;
	transform: translateX(-50%);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 88px;
	height: 34px;
	padding: 0 16px;
	border-radius: 999px;
	background: linear-gradient(135deg, #ff7d4d, #ffb347);
	border: 3px solid rgba(255, 247, 234, 0.96);
	color: #fffaf2;
	font-size: 14px;
	font-weight: 900;
	letter-spacing: 0.16em;
	box-shadow:
		0 10px 24px rgba(180, 78, 29, 0.26),
		inset 0 -6px 10px rgba(162, 63, 16, 0.16);
}

.pointer-head {
	position: absolute;
	top: 28px;
	left: 50%;
	width: 0;
	height: 0;
	transform: translateX(-50%);
	border-left: 20px solid transparent;
	border-right: 20px solid transparent;
	border-top: 56px solid #f45c2c;
	filter: drop-shadow(0 12px 14px rgba(168, 63, 20, 0.26));
}

.pointer-head::before {
	content: '';
	position: absolute;
	left: 50%;
	top: -53px;
	width: 24px;
	height: 24px;
	transform: translateX(-50%);
	border-radius: 50%;
	background: radial-gradient(circle at 30% 30%, #fff7cf, #ffd875 65%, #f9a73c);
	border: 4px solid rgba(255, 248, 237, 0.96);
}

.pointer-glow {
	position: absolute;
	top: 36px;
	left: 50%;
	width: 74px;
	height: 74px;
	transform: translateX(-50%);
	border-radius: 50%;
	background: radial-gradient(circle, rgba(255, 184, 112, 0.34), rgba(255, 184, 112, 0));
	filter: blur(4px);
}

.wheel-disk {
	position: relative;
	width: 100%;
	height: 100%;
	border-radius: 50%;
	overflow: hidden;
	border: 14px solid #fff5e8;
	will-change: transform;
	transform: translateZ(0);
	backface-visibility: hidden;
	box-shadow:
		0 30px 60px rgba(170, 93, 42, 0.18),
		inset 0 0 0 14px rgba(255, 255, 255, 0.45);
}

.wheel-disk.spinning {
	will-change: transform;
}

.wheel-segment-label {
	position: absolute;
	left: 50%;
	top: 50%;
	transform-origin: center center;
	z-index: 1;
}

.segment-label-content {
	width: 100%;
	display: grid;
	justify-items: center;
	gap: 6px;
	color: #fffaf3;
	text-shadow: 0 2px 6px rgba(103, 57, 33, 0.26);
}

.segment-icon {
	font-size: 28px;
	line-height: 1;
}

.segment-name {
	font-size: 14px;
	font-weight: 700;
	text-align: center;
	line-height: 1.35;
	word-break: break-word;
	white-space: normal;
}

.wheel-center {
	position: absolute;
	inset: 50%;
	width: 124px;
	height: 124px;
	transform: translate(-50%, -50%);
	display: grid;
	place-items: center;
	border-radius: 50%;
	cursor: pointer;
	border: 0;
	background:
		radial-gradient(circle at 30% 30%, #fff9e8, #ffd582 68%, #ff9c53 100%);
	box-shadow:
		0 16px 32px rgba(173, 68, 20, 0.22),
		inset 0 -10px 18px rgba(173, 68, 20, 0.16);
	font-size: 22px;
	font-weight: 900;
	color: #7a3318;
	letter-spacing: 0.08em;
	z-index: 2;
	transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.wheel-center:hover {
	transform: translate(-50%, -50%) scale(1.03);
	box-shadow:
		0 20px 38px rgba(173, 68, 20, 0.26),
		inset 0 -10px 18px rgba(173, 68, 20, 0.16);
}

.wheel-center:disabled {
	cursor: not-allowed;
	opacity: 0.8;
	transform: translate(-50%, -50%);
}

.wheel-status-panel {
	width: 100%;
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.status-card {
	padding: 16px;
	border-radius: 20px;
	background: rgba(255, 248, 241, 0.84);
	border: 1px solid rgba(255, 255, 255, 0.74);
	display: grid;
	gap: 8px;
}

.status-card.accent {
	background: linear-gradient(135deg, rgba(255, 226, 171, 0.92), rgba(255, 191, 134, 0.88));
}

.status-label {
	font-size: 12px;
	color: rgba(103, 57, 33, 0.62);
}

.status-card strong {
	color: #6c2e15;
	font-size: 18px;
}

.wheel-actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 10px;
}

.primary-btn,
.ghost-btn {
	border: 0;
	cursor: pointer;
	transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.primary-btn:hover,
.ghost-btn:hover {
	transform: translateY(-1px);
}

.primary-btn:disabled,
.ghost-btn:disabled {
	cursor: not-allowed;
	opacity: 0.65;
	transform: none;
}

.primary-btn {
	padding: 12px 18px;
	border-radius: 16px;
	background: linear-gradient(135deg, #ff965a, #ef5d2f);
	color: #fffaf4;
	font-size: 16px;
	font-weight: 700;
	box-shadow: 0 16px 28px rgba(206, 95, 44, 0.22);
}

.ghost-btn {
	padding: 10px 16px;
	border-radius: 14px;
	background: rgba(255, 248, 241, 0.95);
	color: #7a3a1d;
}

.winner-card {
	width: 100%;
	padding: 18px;
	border-radius: 24px;
	display: flex;
	align-items: center;
	gap: 16px;
	background:
		linear-gradient(135deg, color-mix(in srgb, var(--winner-color) 18%, white), rgba(255, 255, 255, 0.88)),
		rgba(255, 255, 255, 0.8);
	border: 1px solid rgba(255, 255, 255, 0.76);
}

.winner-icon,
.record-icon,
.preview-icon {
	flex: 0 0 auto;
	display: grid;
	place-items: center;
	border-radius: 18px;
}

.winner-icon {
	width: 72px;
	height: 72px;
	font-size: 34px;
	background: rgba(255, 255, 255, 0.75);
}

.winner-title {
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: #cb6b31;
}

.winner-info h3 {
	margin: 6px 0;
	font-size: 24px;
	color: #6e3118;
}

.winner-dialog-card {
	padding: 22px;
}

.side-panel {
	display: grid;
	align-content: stretch;
	gap: 0;
}

.panel-card {
	padding: 18px;
	display: grid;
	align-content: start;
	gap: 14px;
}

.config-card {
	display: none;
}

.panel-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
}

.source-card,
.record-entry-card {
	padding: 16px;
	border-radius: 20px;
	background: rgba(255, 252, 247, 0.92);
	border: 1px solid rgba(255, 255, 255, 0.72);
}

.source-path {
	margin: 6px 0;
	font-weight: 700;
	color: #7a3519 !important;
}

.preview-list {
	display: grid;
	gap: 12px;
	max-height: min(52vh, 520px);
	overflow: auto;
	padding-right: 4px;
}

.preview-list::-webkit-scrollbar {
	width: 8px;
}

.preview-list::-webkit-scrollbar-thumb {
	border-radius: 999px;
	background: rgba(207, 124, 74, 0.45);
}

.preview-item,
.record-item,
.record-entry-latest {
	display: flex;
	align-items: flex-start;
	gap: 14px;
	padding: 14px;
	border-radius: 18px;
	background: rgba(255, 252, 247, 0.9);
	border: 1px solid rgba(255, 255, 255, 0.76);
}

.preview-icon,
.record-icon {
	width: 52px;
	height: 52px;
	font-size: 26px;
	background: color-mix(in srgb, var(--preview-color, var(--record-color)) 18%, white);
}

.preview-content,
.record-content {
	flex: 1;
	min-width: 0;
}

.preview-content strong,
.record-main strong,
.record-stat-card strong,
.history-dialog-stat strong {
	color: #6f3218;
	font-size: 16px;
}

.record-count {
	flex: 0 0 auto;
	padding: 8px 12px;
	border-radius: 999px;
	background: rgba(255, 245, 236, 0.95);
	color: #b7602b;
	font-size: 13px;
	font-weight: 700;
}

.record-main {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 4px;
}

.record-main span {
	flex: 0 0 auto;
	font-size: 12px;
	color: rgba(103, 57, 33, 0.54);
}

.record-entry-card {
	display: grid;
	gap: 12px;
}

.record-entry-summary {
	display: grid;
	gap: 12px;
}

.record-entry-stats,
.history-dialog-summary {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
}

.history-dialog-summary {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.record-stat-card,
.history-dialog-stat {
	display: grid;
	gap: 6px;
	padding: 12px;
	border-radius: 18px;
	background: rgba(255, 247, 239, 0.94);
	border: 1px solid rgba(255, 255, 255, 0.78);
}

.record-stat-card span,
.history-dialog-stat span {
	font-size: 12px;
	color: rgba(103, 57, 33, 0.62);
}

.history-dialog-stat.accent {
	background: linear-gradient(135deg, rgba(255, 221, 176, 0.98), rgba(255, 194, 133, 0.92));
}

.record-entry-actions {
	display: flex;
	justify-content: center;
}

.history-open-btn {
	width: 100%;
}

.history-dialog-body {
	display: grid;
	gap: 16px;
}

.prize-dialog-body {
	display: grid;
	gap: 16px;
}

.prize-dialog-toolbar p {
	margin: 0;
	color: rgba(103, 57, 33, 0.72);
	line-height: 1.6;
}

.prize-dialog-list {
	max-height: min(62vh, 520px);
}

.history-dialog-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
}

.history-clear-btn {
	flex: 0 0 auto;
}

.history-dialog-list {
	display: grid;
	gap: 12px;
	max-height: 420px;
	overflow: auto;
	padding-right: 4px;
}

.history-dialog-list::-webkit-scrollbar {
	width: 8px;
}

.history-dialog-list::-webkit-scrollbar-thumb {
	border-radius: 999px;
	background: rgba(207, 124, 74, 0.45);
}

.history-record-item {
	background: rgba(255, 252, 247, 0.96);
	box-shadow: 0 12px 24px rgba(166, 101, 52, 0.08);
}

.history-dialog-empty {
	display: grid;
	justify-items: center;
	gap: 10px;
	padding: 36px 16px 18px;
	text-align: center;
}

.history-dialog-empty-icon {
	display: grid;
	place-items: center;
	width: 62px;
	height: 62px;
	border-radius: 50%;
	background: rgba(255, 236, 220, 0.92);
	color: #d7743a;
	font-size: 28px;
}

:deep(.lucky-result-dialog .el-dialog) {
	border-radius: 28px;
	overflow: hidden;
	background: rgba(255, 250, 244, 0.98);
	box-shadow: 0 28px 64px rgba(145, 76, 34, 0.22);
}

:deep(.lucky-result-dialog .el-dialog__header) {
	margin-right: 0;
	padding: 22px 24px 8px;
	background:
		radial-gradient(circle at top left, rgba(255, 228, 185, 0.75), transparent 30%),
		linear-gradient(180deg, rgba(255, 247, 238, 0.92), rgba(255, 250, 244, 0.92));
}

:deep(.lucky-result-dialog .el-dialog__title) {
	font-size: 24px;
	font-weight: 800;
	color: #71341b;
}

:deep(.lucky-result-dialog .el-dialog__body) {
	padding: 16px 24px 24px;
}

:deep(.lucky-result-dialog .el-dialog__headerbtn) {
	top: 20px;
	right: 20px;
}

:deep(.lucky-result-dialog .el-dialog__close) {
	color: #a55528;
	font-size: 18px;
}

:deep(.lucky-prize-dialog .el-dialog) {
	border-radius: 28px;
	overflow: hidden;
	background: rgba(255, 250, 244, 0.98);
	box-shadow: 0 28px 64px rgba(145, 76, 34, 0.22);
}

:deep(.lucky-prize-dialog .el-dialog__header) {
	margin-right: 0;
	padding: 22px 24px 8px;
	background:
		radial-gradient(circle at top left, rgba(255, 228, 185, 0.75), transparent 30%),
		linear-gradient(180deg, rgba(255, 247, 238, 0.92), rgba(255, 250, 244, 0.92));
}

:deep(.lucky-prize-dialog .el-dialog__title) {
	font-size: 24px;
	font-weight: 800;
	color: #71341b;
}

:deep(.lucky-prize-dialog .el-dialog__body) {
	padding: 16px 24px 24px;
}

:deep(.lucky-prize-dialog .el-dialog__headerbtn) {
	top: 20px;
	right: 20px;
}

:deep(.lucky-prize-dialog .el-dialog__close) {
	color: #a55528;
	font-size: 18px;
}

:deep(.lucky-history-dialog .el-dialog) {
	border-radius: 28px;
	overflow: hidden;
	background: rgba(255, 250, 244, 0.98);
	box-shadow: 0 28px 64px rgba(145, 76, 34, 0.22);
}

:deep(.lucky-history-dialog .el-dialog__header) {
	margin-right: 0;
	padding: 22px 24px 8px;
	background:
		radial-gradient(circle at top left, rgba(255, 228, 185, 0.75), transparent 30%),
		linear-gradient(180deg, rgba(255, 247, 238, 0.92), rgba(255, 250, 244, 0.92));
}

:deep(.lucky-history-dialog .el-dialog__title) {
	font-size: 24px;
	font-weight: 800;
	color: #71341b;
}

:deep(.lucky-history-dialog .el-dialog__body) {
	padding: 16px 24px 24px;
}

:deep(.lucky-history-dialog .el-dialog__headerbtn) {
	top: 20px;
	right: 20px;
}

:deep(.lucky-history-dialog .el-dialog__close) {
	color: #a55528;
	font-size: 18px;
}

@media (max-width: 1180px) {
	.lucky-wheel-shell {
		grid-template-columns: 1fr;
	}

	.wheel-wrap {
		width: min(100%, 560px);
	}

	.side-panel {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 820px) {
	.lucky-wheel-scroll {
		overflow-y: auto;
	}

	.lucky-wheel-shell {
		width: min(100%, calc(100% - 16px));
		height: auto;
		padding: 10px 0 16px;
	}

	.wheel-board,
	.panel-card {
		padding: 18px;
		border-radius: 24px;
	}

	.board-copy h1 {
		font-size: 30px;
	}

	.wheel-status-panel,
	.side-panel,
	.history-dialog-summary,
	.record-entry-stats {
		grid-template-columns: 1fr;
	}

	.wheel-actions,
	.history-dialog-toolbar {
		width: 100%;
		flex-direction: column;
	}

	.wheel-stage {
		gap: 14px;
	}

	.primary-btn,
	.ghost-btn,
	.history-clear-btn {
		width: 100%;
	}
}

@media (max-width: 640px) {
	.segment-label-content {
		width: 100%;
	}

	.segment-icon {
		font-size: 22px;
	}

	.segment-name {
		font-size: 12px;
	}

	.wheel-center {
		width: 94px;
		height: 94px;
		font-size: 16px;
	}

	.winner-card,
	.record-entry-latest {
		flex-direction: column;
		text-align: center;
	}

	.record-main {
		flex-direction: column;
		align-items: flex-start;
	}

	:deep(.lucky-history-dialog .el-dialog) {
		width: calc(100vw - 20px) !important;
		margin: 0 auto;
	}

	:deep(.lucky-history-dialog .el-dialog__body) {
		padding: 14px 16px 18px;
	}

	:deep(.lucky-prize-dialog .el-dialog) {
		width: calc(100vw - 20px) !important;
		margin: 0 auto;
	}

	:deep(.lucky-prize-dialog .el-dialog__body) {
		padding: 14px 16px 18px;
	}

	:deep(.lucky-result-dialog .el-dialog) {
		width: calc(100vw - 20px) !important;
		margin: 0 auto;
	}

	:deep(.lucky-result-dialog .el-dialog__body) {
		padding: 14px 16px 18px;
	}
}
</style>
