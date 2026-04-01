<template>
	<section class="gashapon-page home-view-page">
		<div class="gashapon-scroll">
			<div class="gashapon-bg">
				<div class="glow glow-a" />
				<div class="glow glow-b" />
				<div class="dot-grid" />
			</div>

			<div class="gashapon-stage">
				<div class="machine-layout">
					<div ref="machineShellRef" class="machine-shell">
						<div class="machine-top">
							<div class="brand-panel">
								<div class="brand-mark">G</div>
								<div>
									<p class="brand-title">梦幻扭蛋机</p>
									<p class="brand-subtitle">转一下，把惊喜装进口袋里</p>
								</div>
							</div>

							<div class="prize-rail">
								<div
									v-for="item in prizes"
									:key="item.id"
									class="prize-chip"
									:style="{ '--chip-color': item.color }"
								>
									<span class="chip-icon">{{ item.icon }}</span>
									<span>{{ item.name }}</span>
								</div>
							</div>
						</div>
					</div>

					<div class="machine-main">
						<div ref="machineBodyRef" class="machine-body">
							<div class="machine-lights">
								<span v-for="n in 6" :key="n" />
							</div>

							<div class="machine-window">
								<div class="window-shine" />
								<div ref="bowlRef" class="capsule-bowl">
									<div
										v-for="ball in machineBalls"
										:key="ball.id"
										class="bowl-ball"
										:style="{
											'--ball-x': `${ball.x}px`,
											'--ball-y': `${ball.y}px`,
											'--ball-size': `${ball.size}px`,
											'--ball-delay': `${ball.delay}s`,
											'--ball-z': ball.zIndex,
											'--ball-opacity': ball.opacity,
											'--ball-blur': `${ball.blur}px`,
											'--ball-shadow-alpha': ball.shadowAlpha,
											'--ball-outline-alpha': ball.outlineAlpha,
											'--ball-shell': ball.shellColor,
											'--ball-core': ball.coreColor,
										}"
									/>
								</div>
								<div class="pointer">
									<div class="pointer-core" />
								</div>
							</div>

							<div class="control-area">
								<div class="coin-slot">
									<div class="slot-mouth" />
									<p>Insert Dream</p>
								</div>

								<button
									ref="handleRef"
									class="handle-button"
									type="button"
									:disabled="isRolling"
									@click="rollCapsule"
								>
									<span class="handle-knob" />
									<span class="handle-arm" />
								</button>
							</div>

							<div class="machine-bottom">
								<div class="tray-header">
									<span class="tray-label">Capsule Out</span>
									<span class="tray-hint">{{ isRolling ? '转动中...' : capsuleHint }}</span>
								</div>

								<div ref="trayRef" class="capsule-tray">
									<button
										v-if="dispensedPrize"
										ref="dispensedCapsuleRef"
										class="dispensed-capsule"
										type="button"
										:class="{ ready: canOpenCapsule }"
										:style="{ '--capsule-color': dispensedPrize.color }"
										@click="openCapsule"
									>
										<span class="capsule-top" />
										<span class="capsule-bottom" />
										<span class="capsule-core">{{ dispensedPrize.icon }}</span>
									</button>
									<p v-else class="tray-empty">胶囊会从这里滚出来</p>
								</div>
							</div>
						</div>

						<div ref="panelRef" class="side-panel">
							<div class="my-gashapon-panel">
								<div class="panel-head">
									<p class="panel-kicker">My Collection</p>
									<h2>我的扭蛋</h2>
								</div>

								<div class="collection-card">
									<div class="collection-summary">
										<div class="collection-stat">
											<span class="collection-stat-label">总数</span>
											<strong>{{ collectionSummary.total }}</strong>
										</div>
										<div class="collection-stat">
											<span class="collection-stat-label">最新入袋</span>
											<strong>{{ collectionSummary.latestName }}</strong>
										</div>
									</div>

									<div v-if="ownedPrizes.length" class="collection-grid">
										<div
											v-for="item in ownedPrizes"
											:key="item.collectionId"
											class="collection-item"
											:style="{ '--collection-color': item.color }"
										>
											<span class="collection-item-icon">{{ item.icon }}</span>
											<div class="collection-item-content">
												<p class="collection-item-name">{{ item.name }}</p>
												<p class="collection-item-meta">
													{{ item.rarity }} · 编号 {{ item.id.toString().padStart(2, '0') }}
												</p>
											</div>
										</div>
									</div>
									<div v-else class="collection-empty">
										<div class="placeholder-icon">?</div>
										<h3>暂无扭蛋</h3>
										<p class="result-desc">转动把手后，新的扭蛋会出现在这里，后续也可以直接接后台返回数据。</p>
									</div>
								</div>
							</div>

							<div class="record-panel">
								<button type="button" class="text-action-button" @click="showHistoryDialog = true">
									扭蛋记录
								</button>
								<button type="button" class="text-action-button" @click="showTradeDialog = true">
									交易记录
								</button>
								<p class="history-entry-tip">{{ historyEntryTip }}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<el-dialog
			v-model="showResultDialog"
			title="本次扭蛋结果"
			width="420px"
			append-to-body
			class="result-dialog"
		>
			<div class="result-card result-dialog-card" :class="{ active: openedPrize }" :style="panelStyle">
				<template v-if="openedPrize">
					<div ref="shineRef" class="result-shine" />
					<div class="result-icon">{{ openedPrize.icon }}</div>
					<h3>{{ openedPrize.name }}</h3>
					<p class="result-desc">{{ openedPrize.description }}</p>
					<div class="result-tags">
						<span>主题 {{ openedPrize.theme }}</span>
						<span>编号 {{ openedPrize.id.toString().padStart(2, '0') }}</span>
					</div>
				</template>
			</div>
		</el-dialog>

		<el-dialog v-model="showHistoryDialog" title="扭蛋记录" width="560px" append-to-body style="margin-top: 12%;">
			<div class="history-dialog-body">
				<div v-if="history.length" class="history-summary">
					<div class="history-summary-card">
						<span class="history-summary-label">记录数</span>
						<strong>{{ history.length }}</strong>
					</div>
					<div class="history-summary-card">
						<span class="history-summary-label">最近稀有度</span>
						<strong>{{ history[0].rarity }}</strong>
					</div>
					<div class="history-summary-card accent">
						<span class="history-summary-label">最新主题</span>
						<strong>{{ history[0].theme }}</strong>
					</div>
				</div>

				<div class="history-dialog-actions">
					<button type="button" class="history-clear" @click="clearHistory">清空记录</button>
				</div>

				<div v-if="history.length" class="history-list">
					<div
						v-for="entry in history"
						:key="entry.historyId"
						class="history-item"
						:style="{ '--history-color': entry.color }"
					>
						<span class="history-icon">{{ entry.icon }}</span>
						<div class="history-content">
							<div class="history-main">
								<div>
									<p class="history-name">{{ entry.name }}</p>
									<p class="history-meta">{{ entry.rarity }} · 编号 {{ entry.id.toString().padStart(2, '0') }}</p>
								</div>
								<span class="history-time">{{ formatHistoryTime(entry.droppedAt) }}</span>
							</div>
							<p class="history-desc">{{ entry.description }}</p>
							<div class="history-tags">
								<span>主题 {{ entry.theme }}</span>
								<span>颜色 {{ entry.color }}</span>
							</div>
						</div>
					</div>
				</div>
				<p v-else class="history-empty">还没有扭蛋记录，先摇一颗试试。</p>
			</div>
		</el-dialog>

		<el-dialog v-model="showTradeDialog" title="交易记录" width="560px" append-to-body style="margin-top: 12%;">
			<div class="history-dialog-body">
				<div class="history-summary">
					<div class="history-summary-card">
						<span class="history-summary-label">记录数</span>
						<strong>{{ tradeSummary.total }}</strong>
					</div>
					<div class="history-summary-card">
						<span class="history-summary-label">最近类型</span>
						<strong>{{ tradeSummary.latestType }}</strong>
					</div>
					<div class="history-summary-card accent">
						<span class="history-summary-label">最近状态</span>
						<strong>{{ tradeSummary.latestStatus }}</strong>
					</div>
				</div>

				<div v-if="tradeRecords.length" class="history-list">
					<div
						v-for="record in tradeRecords"
						:key="record.tradeId"
						class="history-item trade-item"
						:style="{ '--history-color': record.color || '#ffb45f' }"
					>
						<span class="history-icon">{{ record.icon || '↔' }}</span>
						<div class="history-content">
							<div class="history-main">
								<div>
									<p class="history-name">{{ record.title }}</p>
									<p class="history-meta">{{ record.type }} · {{ record.status }}</p>
								</div>
								<span class="history-time">{{ formatHistoryTime(record.createdAt) }}</span>
							</div>
							<p class="history-desc">{{ record.description }}</p>
						</div>
					</div>
				</div>
				<p v-else class="history-empty">暂无交易记录，后续可直接接入后台接口。</p>
			</div>
		</el-dialog>
	</section>
</template>

<script>
export default {
	name: 'GashaponView',
}
</script>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'

const machineShellRef = ref(null)
const machineBodyRef = ref(null)
const bowlRef = ref(null)
const trayRef = ref(null)
const panelRef = ref(null)
const handleRef = ref(null)
const shineRef = ref(null)
const dispensedCapsuleRef = ref(null)

const isRolling = ref(false)
const canOpenCapsule = ref(false)
const dispensedPrize = ref(null)
const openedPrize = ref(null)
const showResultDialog = ref(false)
const showHistoryDialog = ref(false)
const showTradeDialog = ref(false)
const history = ref([])
const ownedPrizes = ref([])
const tradeRecords = ref([])
const machineBalls = ref([])

const prizes = [
	{ id: 1, name: '霓虹猫爪', icon: '🐾', description: '会在夜里发光的电子猫爪，尾灯会像流萤一样闪。', rarity: 'Rare', theme: '霓虹精灵', color: '#ff6fa9', weight: 2 },
	{ id: 2, name: '海盐水母', icon: '🪼', description: '带着微光海蓝的漂浮水母，晃一晃会洒出冷光粒子。', rarity: 'Epic', theme: '海洋蓝调', color: '#57c7ff', weight: 1 },
	{ id: 3, name: '黄油吐司', icon: '🍞', description: '软乎乎的一片吐司摆件，看起来像刚从烤箱出来。', rarity: 'Common', theme: '奶油黄昏', color: '#ffbf47', weight: 4 },
	{ id: 4, name: '流星唱片', icon: '📀', description: '透明唱片里封着一颗流星，转动时会看到银色拖尾。', rarity: 'Rare', theme: '银河漫游', color: '#8d9eff', weight: 2 },
	{ id: 5, name: '草莓火箭', icon: '🚀', description: '粉色小火箭胶囊玩具，虽然飞不走，但足够可爱。', rarity: 'Super Rare', theme: '莓果航线', color: '#ff7c6b', weight: 1 },
	{ id: 6, name: '四叶云朵', icon: '☁️', description: '软绵绵的小云朵挂件，像把好运压缩成了一团。', rarity: 'Common', theme: '薄雾花园', color: '#7ad9a7', weight: 4 },
]

const machineBallRows = [
	{ size: 48, overlap: 0.35 },
	{ size: 47, overlap: 0.34 },
	{ size: 46, overlap: 0.33 },
	{ size: 45, overlap: 0.31 },
]

const machineBallPalette = [
	{ shell: '#ff7ea8', core: '#ffd56b' },
	{ shell: '#63d2ff', core: '#8af2c7' },
	{ shell: '#8d9eff', core: '#ff9b86' },
	{ shell: '#8de3ff', core: '#ffe08a' },
	{ shell: '#b7efb0', core: '#7adf96' },
	{ shell: '#ffe79a', core: '#ffd05a' },
]

let bowlResizeObserver = null
let introTimeline = null
let bowlFloatTween = null
let currentRollTimeline = null
let shineTween = null

const pickRandomBallPalette = (previousIndex = -1) => {
	if (machineBallPalette.length === 1) {
		return { palette: machineBallPalette[0], index: 0 }
	}

	let nextIndex = Math.floor(Math.random() * machineBallPalette.length)
	while (nextIndex === previousIndex) {
		nextIndex = Math.floor(Math.random() * machineBallPalette.length)
	}

	return {
		palette: machineBallPalette[nextIndex],
		index: nextIndex,
	}
}

const buildMachineBalls = () => {
	const bowlEl = bowlRef.value
	if (!bowlEl) return

	const bowlWidth = bowlEl.clientWidth
	const bowlHeight = bowlEl.clientHeight
	if (!bowlWidth || !bowlHeight) return

	const nextBalls = []
	const maxRow = machineBallRows.length - 1
	const bottomContact = 1
	const rowLift = 36

	const getWallInset = (centerY, ballSize) => {
		const t = centerY / bowlHeight
		const topCurve = Math.max(0, (0.26 - t) / 0.26)
		const bottomCurve = Math.max(0, (t - 0.72) / 0.28)
		const baseInset = 1
		const inset = baseInset + topCurve * 14 + bottomCurve * 12 - ballSize * 0.02
		return Math.max(0, inset)
	}

	machineBallRows.forEach((rowConfig, rowIndex) => {
		const depth = 1 - rowIndex / maxRow
		const ballSize = rowConfig.size
		const y = bowlHeight - bottomContact - ballSize - rowIndex * rowLift
		const centerY = y + ballSize / 2
		const sideInset = getWallInset(centerY, ballSize)
		const usableWidth = bowlWidth - sideInset * 2
		const step = Math.max(ballSize * (1 - rowConfig.overlap), 18)
		const count = Math.max(2, Math.floor((usableWidth - ballSize) / step) + 1)
		const rowSpan = Math.max(0, usableWidth - ballSize)
		let previousPaletteIndex = -1

		for (let colIndex = 0; colIndex < count; colIndex += 1) {
			const progress = count === 1 ? 0.5 : colIndex / (count - 1)
			const edgeBias = colIndex === 0 || colIndex === count - 1 ? 1 : 0
			const centerPull = Math.abs(progress - 0.5) * 2
			const centerWeight = 1 - centerPull
			const x = sideInset + rowSpan * progress
			const archLift = centerPull * rowIndex * 3.4
			const jitterY = rowIndex === 0 ? 0 : Math.random() * 0.8 - 0.4
			const ballY = Math.max(0, y - archLift + jitterY)
			const { palette: paletteItem, index: paletteIndex } = pickRandomBallPalette(previousPaletteIndex)
			previousPaletteIndex = paletteIndex
			const zJitter = Math.floor(Math.random() * 4)

			nextBalls.push({
				id: `${rowIndex}-${colIndex}`,
				x,
				y: ballY,
				size: ballSize + (edgeBias ? 1 : 0),
				delay: Number((Math.random() * 1.8).toFixed(2)),
				zIndex: 20 + rowIndex * 20 + Math.round(centerWeight * 14) + zJitter,
				opacity: Number((0.86 + depth * 0.08).toFixed(2)),
				blur: Number(((1 - depth) * 0.18).toFixed(2)),
				shadowAlpha: Number((0.18 + depth * 0.08).toFixed(2)),
				outlineAlpha: Number((0.34 + depth * 0.1).toFixed(2)),
				shellColor: paletteItem.shell,
				coreColor: paletteItem.core,
			})
		}
	})

	machineBalls.value = nextBalls
}

const weightedPool = prizes.flatMap((item) => Array.from({ length: item.weight }, () => item))

const capsuleHint = computed(() => {
	if (dispensedPrize.value && canOpenCapsule.value) return '点击胶囊打开'
	if (dispensedPrize.value) return '胶囊滑出中...'
	return '转动把手开始抽取'
})

const panelStyle = computed(() => ({
	'--result-color': openedPrize.value?.color || '#6b7a90',
}))

const collectionSummary = computed(() => ({
	total: ownedPrizes.value.length,
	latestName: ownedPrizes.value[0]?.name || '--',
}))

const tradeSummary = computed(() => ({
	total: tradeRecords.value.length,
	latestType: tradeRecords.value[0]?.type || '--',
	latestStatus: tradeRecords.value[0]?.status || '--',
}))

const historyEntryTip = computed(() => {
	if (!history.value.length && !tradeRecords.value.length) {
		return '当前展示的是预留数据结构，后续可直接替换成后台接口返回值。'
	}

	return `当前已记录 ${history.value.length} 条扭蛋记录，${tradeRecords.value.length} 条交易记录。`
})

const formatHistoryTime = (value) => {
	if (!value) return '--:--'
	const date = new Date(value)
	const hh = `${date.getHours()}`.padStart(2, '0')
	const mm = `${date.getMinutes()}`.padStart(2, '0')
	return `${hh}:${mm}`
}

const tweenTo = (target, vars) =>
	new Promise((resolve) => {
		gsap.to(target, {
			...vars,
			onComplete: () => {
				vars.onComplete?.()
				resolve()
			},
		})
	})

const pickPrize = () => weightedPool[Math.floor(Math.random() * weightedPool.length)]

// 预留数据接入层：后续替换为后台接口时，优先改这几个方法即可。
const requestRollPrize = async () => pickPrize()
const setOwnedPrizes = (records = []) => {
	ownedPrizes.value = records
}
const setHistoryRecords = (records = []) => {
	history.value = records
}
const setTradeRecords = (records = []) => {
	tradeRecords.value = records
}

const createCollectionItem = (prize) => ({
	...prize,
	collectionId: `${prize.id}-${Date.now()}`,
	obtainedAt: Date.now(),
})

const createHistoryItem = (prize) => ({
	...prize,
	historyId: `${prize.id}-${Date.now()}`,
	droppedAt: Date.now(),
})

const startShineLoop = () => {
	if (!shineRef.value) return
	shineTween?.kill()
	shineTween = gsap.to(shineRef.value, { rotate: 360, duration: 8, ease: 'none', repeat: -1 })
}

const playIntro = () => {
	introTimeline?.kill()
	bowlFloatTween?.kill()

	gsap.set([machineShellRef.value, machineBodyRef.value, panelRef.value], { autoAlpha: 0, y: 40 })
	gsap.set(machineBodyRef.value, { rotateZ: -2, transformOrigin: '50% 100%' })
	gsap.set(handleRef.value, { rotate: 0, transformOrigin: '30% 50%' })

	introTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
	introTimeline
		.to(machineShellRef.value, { autoAlpha: 1, y: 0, duration: 0.7 })
		.to(machineBodyRef.value, { autoAlpha: 1, y: 0, duration: 0.8 }, '-=0.28')
		.to(panelRef.value, { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.45')
		.to(machineBodyRef.value, { rotateZ: 0, duration: 0.55, ease: 'elastic.out(1, 0.7)' }, '-=0.42')

	bowlFloatTween = gsap.to('.bowl-ball', {
		y: 'random(-4, 4)',
		x: 'random(-3, 3)',
		duration: 1.8,
		stagger: { each: 0.03, repeat: -1, yoyo: true },
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	})
}

const rollCapsule = async () => {
	if (isRolling.value) return

	isRolling.value = true
	canOpenCapsule.value = false
	openedPrize.value = null
	showResultDialog.value = false
	dispensedPrize.value = null
	currentRollTimeline?.kill()
	shineTween?.kill()

	const nextPrize = await requestRollPrize()
	await nextTick()

	currentRollTimeline = gsap.timeline({
		defaults: { ease: 'power2.inOut' },
		onComplete: async () => {
			dispensedPrize.value = nextPrize
			await nextTick()
			if (!dispensedCapsuleRef.value) {
				isRolling.value = false
				canOpenCapsule.value = true
				return
			}

			gsap.fromTo(
				dispensedCapsuleRef.value,
				{ y: -80, x: 70, rotate: -220, scale: 0.6, autoAlpha: 0 },
				{
					y: 0,
					x: 0,
					rotate: 0,
					scale: 1,
					autoAlpha: 1,
					duration: 0.9,
					ease: 'bounce.out',
					onComplete: () => {
						canOpenCapsule.value = true
						isRolling.value = false
						gsap.fromTo(dispensedCapsuleRef.value, { y: 0 }, { y: -8, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut' })
					},
				},
			)
		},
	})

	currentRollTimeline
		.to(handleRef.value, { rotate: 140, duration: 0.28, ease: 'power2.in' })
		.to(handleRef.value, { rotate: 0, duration: 0.46, ease: 'back.out(2.4)' })
		.to(
			machineBodyRef.value,
			{ keyframes: [{ x: -8, rotateZ: -1.5, duration: 0.08 }, { x: 8, rotateZ: 1.5, duration: 0.08 }, { x: -6, rotateZ: -1, duration: 0.08 }, { x: 6, rotateZ: 1, duration: 0.08 }, { x: 0, rotateZ: 0, duration: 0.1 }] },
			0.12,
		)
		.to(
			'.bowl-ball',
			{ keyframes: [{ x: 'random(-10, 10)', y: 'random(-12, 8)', duration: 0.08 }, { x: 'random(-12, 12)', y: 'random(-8, 12)', duration: 0.08 }, { x: 'random(-6, 6)', y: 'random(-4, 4)', duration: 0.1 }, { x: 0, y: 0, duration: 0.16 }], stagger: 0.01 },
			0.1,
		)
		.fromTo(trayRef.value, { y: 0 }, { y: 6, duration: 0.12, yoyo: true, repeat: 3 }, 0.52)
}

const openCapsule = async () => {
	if (!dispensedPrize.value || !canOpenCapsule.value || isRolling.value) return

	canOpenCapsule.value = false
	const targetPrize = dispensedPrize.value
	gsap.killTweensOf(dispensedCapsuleRef.value)

	await tweenTo(dispensedCapsuleRef.value, { scale: 1.12, y: -12, duration: 0.18, ease: 'power2.out' })
	await tweenTo(dispensedCapsuleRef.value, { scale: 0, rotate: 180, autoAlpha: 0, duration: 0.35, ease: 'back.in(1.8)' })

	dispensedPrize.value = null
	openedPrize.value = targetPrize
	showResultDialog.value = true
	setOwnedPrizes([createCollectionItem(targetPrize), ...ownedPrizes.value].slice(0, 6))
	setHistoryRecords([createHistoryItem(targetPrize), ...history.value].slice(0, 6))

	await nextTick()

	gsap.fromTo(panelRef.value, { y: 0 }, { keyframes: [{ y: -8, duration: 0.09 }, { y: 5, duration: 0.09 }, { y: -4, duration: 0.08 }, { y: 0, duration: 0.1 }], ease: 'power1.out' })
	gsap.fromTo('.result-card.active', { scale: 0.78, rotateX: -25, autoAlpha: 0 }, { scale: 1, rotateX: 0, autoAlpha: 1, duration: 0.55, ease: 'back.out(1.7)' })
	startShineLoop()
}

const clearHistory = () => {
	setHistoryRecords([])
}

onMounted(() => {
	buildMachineBalls()
	setTradeRecords([])

	if (typeof ResizeObserver !== 'undefined' && bowlRef.value) {
		bowlResizeObserver = new ResizeObserver(() => {
			buildMachineBalls()
		})
		bowlResizeObserver.observe(bowlRef.value)
	}

	playIntro()
})

onBeforeUnmount(() => {
	introTimeline?.kill()
	bowlFloatTween?.kill()
	currentRollTimeline?.kill()
	shineTween?.kill()
	bowlResizeObserver?.disconnect()
})
</script>

<style lang="scss">
.gashapon-page.home-view-page {
	position: relative;
	height: 100%;
	min-height: 0;
	overflow: hidden !important;
	background:
		radial-gradient(circle at top, rgba(255, 226, 194, 0.85), transparent 34%),
		linear-gradient(180deg, #fff5e8 0%, #ffe2c6 28%, #f8b67a 58%, #d16a38 100%);
}

.gashapon-scroll {
	position: relative;
	height: 100%;
	box-sizing: border-box;
	padding: 12px 0;
	overflow-x: hidden;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: rgba(147, 70, 29, 0.58) rgba(255, 244, 228, 0.34);
}

.gashapon-scroll::-webkit-scrollbar {
	width: 12px;
}

.gashapon-scroll::-webkit-scrollbar-track {
	background: rgba(255, 244, 228, 0.34);
	border-radius: 999px;
}

.gashapon-scroll::-webkit-scrollbar-thumb {
	border-radius: 999px;
	border: 3px solid rgba(255, 244, 228, 0.34);
	background: linear-gradient(180deg, rgba(201, 105, 51, 0.95), rgba(141, 60, 24, 0.95));
}

.gashapon-scroll::-webkit-scrollbar-thumb:hover {
	background: linear-gradient(180deg, rgba(216, 118, 62, 0.98), rgba(126, 50, 17, 0.98));
}

.gashapon-bg {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.glow {
	position: absolute;
	border-radius: 999px;
	filter: blur(40px);
	opacity: 0.5;
}

.glow-a {
	top: 80px;
	left: -40px;
	width: 260px;
	height: 260px;
	background: rgba(255, 255, 255, 0.7);
}

.glow-b {
	right: 0;
	bottom: 80px;
	width: 360px;
	height: 360px;
	background: rgba(255, 129, 72, 0.38);
}

.dot-grid {
	position: absolute;
	inset: 0;
	background-image: radial-gradient(rgba(126, 54, 21, 0.18) 1px, transparent 1px);
	background-size: 18px 18px;
	mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.22), transparent 80%);
}

.gashapon-stage {
	position: relative;
	z-index: 1;
	width: min(1200px, calc(100% - 32px));
	margin: 0 auto;
	padding: 25px 0 10px;
	min-height: calc(100% - 24px);
	box-sizing: border-box;
	display: flex;
}

.machine-layout {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	gap: 22px;
	justify-content: space-around;
}

.machine-shell {
	position: relative;
	width: calc(100% - 20px);
	margin: 0 auto;
	padding: 0 8px;
}

.machine-top {
	display: grid;
	grid-template-columns: max-content minmax(0, 1fr);
	align-items: center;
	gap: 18px;
	padding: 0 22px;
}

.brand-panel {
	display: flex;
	align-items: center;
	gap: 14px;
	min-width: 0;
}

.brand-mark {
	display: grid;
	place-items: center;
	width: 48px;
	height: 48px;
	border-radius: 16px;
	background: linear-gradient(180deg, #ffedb1, #ffb74a);
	color: #7c3404;
	font-size: 28px;
	font-weight: 800;
	box-shadow: inset 0 -6px 14px rgba(183, 96, 18, 0.18);
}

.brand-title {
	font-size: 26px;
	font-weight: 800;
	color: #68280a;
}

.brand-subtitle {
	margin-top: 4px;
	font-size: 13px;
	color: rgba(104, 40, 10, 0.68);
}

.prize-rail {
	display: flex;
	flex-wrap: nowrap;
	justify-content: flex-end;
	gap: 10px;
	width: auto;
	min-width: 0;
	max-width: 100%;
	justify-self: stretch;
	overflow-x: auto;
	overflow-y: hidden;
	scrollbar-width: thin;
	scrollbar-color: rgba(162, 83, 32, 0.58) rgba(255, 244, 228, 0.55);
}

.prize-rail::-webkit-scrollbar {
	height: 8px;
}

.prize-rail::-webkit-scrollbar-track {
	background: rgba(255, 244, 228, 0.55);
	border-radius: 999px;
}

.prize-rail::-webkit-scrollbar-thumb {
	background: linear-gradient(90deg, rgba(201, 105, 51, 0.95), rgba(141, 60, 24, 0.95));
	border-radius: 999px;
}

.prize-chip {
	display: inline-flex;
	flex: 0 0 auto;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	border-radius: 999px;
	border: 1px solid rgba(124, 52, 4, 0.12);
	background: rgba(255, 249, 239, 0.85);
	color: #6f3210;
	font-size: 13px;
	box-shadow: 0 12px 24px rgba(157, 78, 29, 0.08);
}

.chip-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	border-radius: 50%;
	background: var(--chip-color);
}

.machine-main {
	display: grid;
	grid-template-columns: minmax(0, 660px) minmax(280px, 360px);
	min-height: 0;
	height: calc(100% - 206px);
	gap: 42px;
	align-items: stretch;
}

.machine-body {
	position: relative;
	width: min(100%, 520px);
	height: 100%;
	margin: 0 auto;
	padding: 18px 18px 20px;
	border-radius: 30px;
	background: linear-gradient(180deg, #ff6b3d 0%, #ec512a 48%, #c73314 100%);
	box-shadow:
		0 30px 70px rgba(144, 55, 20, 0.28),
		inset 0 -10px 26px rgba(109, 18, 0, 0.18),
		inset 0 10px 18px rgba(255, 201, 143, 0.22);
}

.machine-lights {
	display: flex;
	justify-content: center;
	gap: 12px;
	margin-bottom: 12px;
}

.machine-lights span {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: #fff1a8;
	box-shadow: 0 0 16px rgba(255, 241, 168, 0.9);
	animation: twinkle 1.6s ease-in-out infinite;
}

.machine-lights span:nth-child(2n) {
	animation-delay: 0.2s;
}

.machine-lights span:nth-child(3n) {
	animation-delay: 0.4s;
}

.machine-window {
	position: relative;
	height: 344px;
	padding: 18px;
	border-radius: 26px;
	background:
		radial-gradient(circle at 50% 8%, rgba(255, 255, 255, 0.95), transparent 28%),
		linear-gradient(180deg, #fff6ea 0%, #fffdf9 54%, #ffe8d4 100%);
	border: 6px solid #fde0c0;
	box-shadow: inset 0 -14px 24px rgba(200, 94, 39, 0.12);
	overflow: hidden;
}

.window-shine {
	position: absolute;
	inset: 10px auto 16px 12px;
	width: 32%;
	border-radius: 30px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.1)),
		linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent);
	filter: blur(2px);
	opacity: 0.85;
}

.capsule-bowl {
	position: absolute;
	left: 50%;
	bottom: 35px;
	width: 65%;
	height: 70%;
	transform: translateX(-50%);
	border-radius: 32px 32px 86px 86px;
	background:
		radial-gradient(circle at 50% 6%, rgba(255, 255, 255, 0.92), transparent 28%),
		linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.12));
	border: 2px solid rgba(255, 255, 255, 0.82);
	box-shadow:
		inset 0 -16px 24px rgba(63, 110, 158, 0.12),
		inset 0 10px 18px rgba(255, 255, 255, 0.3),
		0 16px 32px rgba(77, 109, 138, 0.12);
	isolation: isolate;
	overflow: hidden;
}

.capsule-bowl::before,
.capsule-bowl::after {
	content: '';
	position: absolute;
	pointer-events: none;
}

.capsule-bowl::before {
	inset: 10px 14px auto;
	height: 28%;
	border-radius: 28px 28px 40px 40px;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0));
}

.capsule-bowl::after {
	left: 6%;
	right: 6%;
	bottom: 8px;
	height: 26%;
	border-radius: 999px;
	background: radial-gradient(circle at 50% 0%, rgba(106, 141, 177, 0.24), rgba(106, 141, 177, 0) 72%);
}

.bowl-ball {
	position: absolute;
	left: var(--ball-x);
	top: var(--ball-y);
	width: var(--ball-size);
	height: var(--ball-size);
	z-index: var(--ball-z);
	border-radius: 50%;
	border: 1px solid rgba(255, 255, 255, var(--ball-outline-alpha));
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0) 48%),
		linear-gradient(135deg, color-mix(in srgb, var(--ball-shell) 88%, white), var(--ball-shell));
	box-shadow:
		inset -8px -10px 16px rgba(0, 0, 0, 0.16),
		inset 8px 8px 14px rgba(255, 255, 255, 0.24),
		0 12px 20px rgba(39, 71, 99, var(--ball-shadow-alpha));
	opacity: var(--ball-opacity);
	filter: saturate(1.05) blur(var(--ball-blur));
	animation: bowlFloat 2.05s ease-in-out infinite;
	animation-delay: var(--ball-delay);
}

.bowl-ball::before,
.bowl-ball::after {
	content: '';
	position: absolute;
	pointer-events: none;
}

.bowl-ball::before {
	left: 10%;
	right: 10%;
	top: 47%;
	height: 10%;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.68);
	box-shadow:
		0 -1px 0 rgba(255, 255, 255, 0.9),
		0 1px 0 rgba(102, 132, 165, 0.18);
}

.bowl-ball::after {
	left: 50%;
	top: 50%;
	width: 44%;
	height: 44%;
	transform: translate(-50%, -28%);
	border-radius: 50%;
	background:
		radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0) 58%),
		linear-gradient(135deg, color-mix(in srgb, var(--ball-core) 78%, white), var(--ball-core));
	box-shadow:
		inset -4px -6px 8px rgba(0, 0, 0, 0.12),
		0 2px 4px rgba(79, 104, 132, 0.12);
}

.pointer {
	position: absolute;
	top: 12px;
	left: 50%;
	width: 58px;
	height: 58px;
	transform: translateX(-50%);
}

.pointer::before {
	content: '';
	position: absolute;
	left: 50%;
	top: 0;
	transform: translateX(-50%);
	width: 0;
	height: 0;
	border-left: 14px solid transparent;
	border-right: 14px solid transparent;
	border-top: 30px solid #ffda4a;
	filter: drop-shadow(0 8px 6px rgba(146, 88, 14, 0.18));
}

.pointer-core {
	position: absolute;
	left: 50%;
	top: 4px;
	transform: translateX(-50%);
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: #fff6c5;
	border: 3px solid #f15d2b;
}

.control-area {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 16px;
	padding: 16px 6px 8px;
}

.coin-slot {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 92px;
	height: 76px;
	border-radius: 20px;
	background: linear-gradient(180deg, #ffe2b8, #ffb85f);
	box-shadow: inset 0 -10px 20px rgba(180, 96, 22, 0.18);
	color: #74300d;
	font-size: 11px;
	font-weight: 700;
}

.slot-mouth {
	width: 42px;
	height: 10px;
	margin-bottom: 10px;
	border-radius: 999px;
	background: linear-gradient(180deg, #8b3a15, #51210b);
}

.handle-button {
	position: relative;
	display: block;
	width: 112px;
	height: 84px;
	border: 0;
	background: transparent;
	cursor: pointer;
}

.handle-button:disabled {
	cursor: progress;
	opacity: 0.85;
}

.handle-arm {
	position: absolute;
	left: 24px;
	top: 38px;
	width: 66px;
	height: 16px;
	border-radius: 999px;
	background: linear-gradient(180deg, #f8f5ff, #c5d0e8);
	box-shadow: inset 0 -4px 10px rgba(74, 97, 131, 0.18);
	transform-origin: 10px 50%;
}

.handle-knob {
	position: absolute;
	z-index: 1;
	right: 6px;
	top: 28px;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: radial-gradient(circle at 30% 30%, #fff9d1, #ffca4e 65%, #ea8f13 100%);
	box-shadow:
		0 12px 24px rgba(151, 82, 21, 0.22),
		inset -7px -10px 16px rgba(164, 91, 18, 0.2);
}

.machine-bottom {
	margin-top: 4px;
	padding: 8px 4px 0;
}

.tray-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10px;
	color: #fff2e6;
}

.tray-label {
	font-weight: 800;
	font-size: 12px;
	letter-spacing: 0.08em;
	text-transform: uppercase;
}

.tray-hint {
	font-size: 11px;
	color: rgba(255, 242, 230, 0.8);
}

.capsule-tray {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 84px;
	border-radius: 20px;
	background:
		linear-gradient(180deg, rgba(123, 24, 0, 0.28), rgba(255, 255, 255, 0.08)),
		linear-gradient(180deg, #7e2510, #55200c);
	box-shadow: inset 0 12px 22px rgba(255, 255, 255, 0.08);
	overflow: hidden;
}

.tray-empty {
	font-size: 12px;
	color: rgba(255, 227, 216, 0.72);
}

.dispensed-capsule {
	position: relative;
	width: 64px;
	height: 64px;
	border: 0;
	background: transparent;
	cursor: pointer;
}

.dispensed-capsule.ready {
	filter: drop-shadow(0 18px 28px rgba(63, 19, 5, 0.28));
}

.capsule-top,
.capsule-bottom {
	position: absolute;
	left: 0;
	width: 64px;
	height: 32px;
	border: 2px solid rgba(255, 255, 255, 0.9);
}

.capsule-top {
	top: 0;
	border-radius: 64px 64px 10px 10px;
	background:
		radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.9), transparent 24%),
		linear-gradient(135deg, color-mix(in srgb, var(--capsule-color) 60%, white), #ffffff);
}

.capsule-bottom {
	bottom: 0;
	border-radius: 10px 10px 64px 64px;
	background: linear-gradient(135deg, var(--capsule-color), color-mix(in srgb, var(--capsule-color) 70%, black));
}

.capsule-core {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	font-size: 21px;
}

.side-panel {
	display: grid;
	grid-template-rows: minmax(0, 1fr) auto;
	gap: 18px;
	min-height: 0;
	height: 100%;
}

.my-gashapon-panel,
.record-panel {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 24px;
	border-radius: 34px;
	background: rgba(255, 248, 238, 0.7);
	backdrop-filter: blur(14px);
	border: 1px solid rgba(255, 255, 255, 0.46);
	box-shadow: 0 30px 64px rgba(125, 60, 21, 0.16);
}

.my-gashapon-panel {
	min-height: 0;
}

.panel-kicker {
	font-size: 12px;
	letter-spacing: 0.22em;
	text-transform: uppercase;
	color: #a55320;
}

.panel-head h2 {
	margin-top: 8px;
	color: #642807;
	font-size: 30px;
}

.collection-card {
	display: flex;
	flex-direction: column;
	gap: 16px;
	flex: 1;
	min-height: 0;
	padding: 20px;
	border-radius: 28px;
	background:
		radial-gradient(circle at top, rgba(255, 255, 255, 0.75), transparent 36%),
		linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 247, 240, 0.94));
	border: 1px solid rgba(106, 57, 18, 0.08);
	box-shadow: inset 0 -14px 20px rgba(166, 95, 44, 0.08);
	color: #603112;
	overflow: hidden;
}

.collection-summary {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
}

.collection-stat {
	display: grid;
	gap: 6px;
	padding: 14px 16px;
	border-radius: 20px;
	background: rgba(255, 255, 255, 0.76);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
}

.collection-stat-label {
	font-size: 12px;
	color: rgba(103, 48, 16, 0.68);
}

.collection-stat strong {
	font-size: 24px;
	color: #673010;
}

.collection-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 10px;
	flex: 1;
	min-height: 0;
	padding-right: 4px;
	overflow-y: auto;
}

.collection-grid::-webkit-scrollbar {
	width: 8px;
}

.collection-grid::-webkit-scrollbar-track {
	background: rgba(255, 240, 229, 0.72);
	border-radius: 999px;
}

.collection-grid::-webkit-scrollbar-thumb {
	border-radius: 999px;
	background: linear-gradient(180deg, rgba(225, 123, 68, 0.95), rgba(171, 77, 30, 0.95));
}

.collection-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.74);
	border: 1px solid rgba(255, 255, 255, 0.78);
	box-shadow: 0 10px 20px rgba(130, 67, 27, 0.08);
}

.collection-item-icon {
	display: grid;
	place-items: center;
	width: 44px;
	height: 44px;
	border-radius: 14px;
	background: color-mix(in srgb, var(--collection-color) 20%, white);
	font-size: 24px;
}

.collection-item-content {
	min-width: 0;
}

.collection-item-name {
	font-size: 15px;
	font-weight: 700;
	color: #673010;
}

.collection-item-meta {
	margin-top: 4px;
	font-size: 12px;
	color: rgba(103, 48, 16, 0.68);
}

.collection-empty {
	display: grid;
	place-items: center;
	align-content: center;
	flex: 1;
	min-height: 220px;
	text-align: center;
}

.record-panel {
	justify-content: center;
	min-height: 154px;
}

.text-action-button {
	padding: 4px 0;
	border: 0;
	background: transparent;
	color: #8b471d;
	font-size: 18px;
	font-weight: 700;
	line-height: 1.5;
	text-align: left;
	cursor: pointer;
}

.text-action-button:hover {
	color: #c85c28;
}

.result-card {
	position: relative;
	min-height: 280px;
	padding: 22px;
	border-radius: 28px;
	background:
		radial-gradient(circle at top, rgba(255, 255, 255, 0.75), transparent 36%),
		linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 247, 240, 0.94));
	border: 1px solid rgba(106, 57, 18, 0.08);
	box-shadow: inset 0 -14px 20px rgba(166, 95, 44, 0.08);
	color: #603112;
	overflow: hidden;
}

.result-card.active {
	background:
		radial-gradient(circle at top, color-mix(in srgb, var(--result-color) 24%, white), transparent 32%),
		linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 247, 240, 0.96));
}

.result-dialog-card {
	min-height: 0;
}

.result-shine {
	position: absolute;
	left: 50%;
	top: 20px;
	width: 220px;
	height: 220px;
	transform: translateX(-50%);
	border-radius: 50%;
	background:
		radial-gradient(circle, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0) 65%),
		conic-gradient(from 0deg, transparent 0 12%, rgba(255, 255, 255, 0.8) 12% 20%, transparent 20% 42%, rgba(255, 255, 255, 0.55) 42% 48%, transparent 48% 100%);
	opacity: 0.7;
	pointer-events: none;
}

.result-icon,
.placeholder-icon {
	position: relative;
	z-index: 1;
	display: grid;
	place-items: center;
	width: 108px;
	height: 108px;
	margin: 22px auto 18px;
	border-radius: 28px;
	background: rgba(255, 255, 255, 0.7);
	font-size: 54px;
	box-shadow: 0 18px 30px rgba(125, 60, 21, 0.08);
}

.result-card h3,
.collection-empty h3 {
	position: relative;
	z-index: 1;
	text-align: center;
	font-size: 26px;
}

.result-desc {
	position: relative;
	z-index: 1;
	margin-top: 10px;
	line-height: 1.7;
	text-align: center;
	color: rgba(96, 49, 18, 0.78);
}

.result-tags {
	position: relative;
	z-index: 1;
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 10px;
	margin-top: 18px;
}

.result-tags span {
	padding: 8px 10px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.72);
	font-size: 12px;
	color: #7a4218;
}

.history-entry-tip {
	font-size: 13px;
	line-height: 1.6;
	color: rgba(103, 48, 16, 0.7);
}

.history-dialog-body {
	display: flex;
	flex-direction: column;
	gap: 14px;
	height: 520px;
}

.history-summary {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10px;
	height: 84px;
	flex: 0 0 auto;
}

.history-summary-card {
	display: grid;
	gap: 6px;
	padding: 12px;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.72);
	border: 1px solid rgba(255, 255, 255, 0.7);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.history-summary-card.accent {
	background: linear-gradient(135deg, rgba(255, 226, 190, 0.92), rgba(255, 184, 116, 0.82));
}

.history-summary-label {
	font-size: 11px;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: rgba(103, 48, 16, 0.62);
}

.history-summary-card strong {
	font-size: 16px;
	color: #66310f;
}

.history-dialog-actions {
	display: flex;
	justify-content: center;
	flex: 0 0 auto;
}

.history-clear {
	border: 0;
	background: transparent;
	font-size: 13px;
	color: #a55320;
	cursor: pointer;
}

.history-list {
	display: grid;
	gap: 10px;
	flex: 1 1 auto;
	align-content: start;
	min-height: 0;
	padding-right: 4px;
	overflow-y: auto;
}

.history-list::-webkit-scrollbar {
	width: 8px;
}

.history-list::-webkit-scrollbar-track {
	background: rgba(255, 240, 229, 0.72);
	border-radius: 999px;
}

.history-list::-webkit-scrollbar-thumb {
	border-radius: 999px;
	background: linear-gradient(180deg, rgba(225, 123, 68, 0.95), rgba(171, 77, 30, 0.95));
}

.history-item {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 12px;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.74);
	border: 1px solid rgba(255, 255, 255, 0.78);
	box-shadow: 0 10px 20px rgba(130, 67, 27, 0.08);
}

.trade-item {
	align-items: center;
}

.history-icon {
	display: grid;
	place-items: center;
	width: 42px;
	height: 42px;
	border-radius: 14px;
	background: color-mix(in srgb, var(--history-color) 20%, white);
	font-size: 24px;
}

.history-content {
	display: grid;
	gap: 8px;
	flex: 1;
	min-width: 0;
}

.history-main {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 12px;
}

.history-name {
	font-size: 15px;
	font-weight: 700;
	color: #673010;
}

.history-meta,
.history-empty {
	font-size: 13px;
	color: rgba(103, 48, 16, 0.68);
}

.history-empty {
	display: grid;
	place-items: center;
	flex: 1 1 auto;
	min-height: 0;
	text-align: center;
}

.history-time {
	flex: 0 0 auto;
	padding: 4px 8px;
	border-radius: 999px;
	background: rgba(255, 245, 235, 0.92);
	font-size: 12px;
	font-weight: 700;
	color: #9a4d1f;
}

.history-desc {
	line-height: 1.5;
	font-size: 13px;
	color: rgba(103, 48, 16, 0.82);
}

.history-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.history-tags span {
	padding: 6px 10px;
	border-radius: 999px;
	background: rgba(255, 247, 240, 0.9);
	font-size: 12px;
	color: #8b471d;
}

@keyframes twinkle {
	0%,
	100% {
		opacity: 0.6;
		transform: translateY(0) scale(1);
	}
	50% {
		opacity: 1;
		transform: translateY(-2px) scale(1.12);
	}
}

@keyframes bowlFloat {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-4px);
	}
}

@media (max-width: 980px) {
	.machine-shell {
		width: 100%;
		padding: 0;
	}

	.machine-top {
		grid-template-columns: 1fr;
	}

	.prize-rail {
		justify-content: flex-start;
	}

	.machine-main {
		grid-template-columns: minmax(0, 1.18fr) minmax(220px, 0.82fr);
		gap: 18px;
		height: auto;
	}

	.my-gashapon-panel,
	.record-panel {
		padding: 18px;
		border-radius: 28px;
	}

	.panel-head h2 {
		font-size: 24px;
	}

	.collection-card {
		padding: 16px;
	}
}

@media (max-width: 640px) {
	.gashapon-stage {
		width: min(100%, calc(100% - 16px));
		padding-top: 18px;
		padding-bottom: 24px;
	}

	.machine-main {
		grid-template-columns: minmax(0, 1.1fr) minmax(132px, 0.9fr);
		gap: 12px;
		align-items: stretch;
	}

	.machine-body {
		width: 100%;
		padding: 14px 14px 18px;
		border-radius: 28px;
	}

	.machine-window {
		height: 260px;
	}

	.control-area {
		gap: 10px;
	}

	.coin-slot {
		width: 78px;
		height: 68px;
	}

	.handle-button {
		width: 92px;
	}

	.my-gashapon-panel,
	.record-panel {
		padding: 14px;
		border-radius: 24px;
	}

	.collection-card {
		padding: 12px;
		border-radius: 22px;
	}

	.collection-summary {
		grid-template-columns: 1fr;
		gap: 8px;
	}

	.collection-stat {
		padding: 10px 12px;
	}

	.collection-stat strong {
		font-size: 20px;
	}

	.collection-empty {
		min-height: 160px;
	}

	.result-icon,
	.placeholder-icon {
		width: 84px;
		height: 84px;
		margin: 16px auto 14px;
		font-size: 42px;
	}

	.result-card h3,
	.collection-empty h3 {
		font-size: 22px;
	}

	.text-action-button {
		font-size: 15px;
	}

	.history-entry-tip {
		font-size: 12px;
	}

	.history-dialog-body {
		height: 60vh;
	}

	.history-summary {
		grid-template-columns: 1fr;
		height: auto;
	}
}
</style>
