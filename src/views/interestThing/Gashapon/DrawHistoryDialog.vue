<template>
	<el-dialog
		:model-value="modelValue"
		title="中奖记录"
		width="560px"
		append-to-body
		class="gashapon-dialog"
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<div class="history-dialog">
			<div v-if="records.length" class="history-summary">
				<div class="summary-card">
					<span class="summary-label">记录数</span>
					<strong>{{ records.length }}</strong>
				</div>
				<div class="summary-card">
					<span class="summary-label">最近稀有度</span>
					<strong>{{ records[0].rarity }}</strong>
				</div>
				<div class="summary-card accent">
					<span class="summary-label">最近主题</span>
					<strong>{{ records[0].theme }}</strong>
				</div>
			</div>

			<div class="dialog-actions">
				<button type="button" class="refresh-btn" :disabled="loading" @click="$emit('refresh')">
					{{ loading ? '刷新中...' : '刷新' }}
				</button>
			</div>

			<div v-if="records.length" class="history-list">
				<div
					v-for="entry in records"
					:key="entry.historyId"
					class="history-item"
					:style="{ '--history-color': entry.color }"
				>
					<span class="history-icon">{{ entry.icon }}</span>
					<div class="history-content">
						<div class="history-main">
							<div>
								<p class="history-name">{{ entry.name }}</p>
								<p class="history-meta">{{ entry.rarity }} · 编号 {{ String(entry.displayId || entry.id || 0).padStart(2, '0') }}</p>
							</div>
							<span class="history-time">{{ formatTime(entry.droppedAt) }}</span>
						</div>
						<p class="history-desc">{{ entry.description }}</p>
						<div class="history-tags">
							<span>主题 {{ entry.theme }}</span>
							<span>颜色 {{ entry.color }}</span>
						</div>
					</div>
				</div>
			</div>
			<p v-else class="history-empty">暂无中奖记录</p>
		</div>
	</el-dialog>
</template>

<script setup>
/* global defineProps, defineEmits */
defineProps({
	modelValue: {
		type: Boolean,
		default: false,
	},
	records: {
		type: Array,
		default: () => [],
	},
	loading: {
		type: Boolean,
		default: false,
	},
	formatTime: {
		type: Function,
		required: true,
	},
})

defineEmits(['update:modelValue', 'refresh'])
</script>

<style lang="scss" scoped>
.history-dialog {
	display: flex;
	flex-direction: column;
	gap: 14px;
	height: 520px;
}

.history-summary {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10px;
}

.summary-card {
	display: grid;
	gap: 6px;
	padding: 12px;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.72);
	border: 1px solid rgba(255, 255, 255, 0.7);

	&.accent {
		background: linear-gradient(135deg, rgba(255, 226, 190, 0.92), rgba(255, 184, 116, 0.82));
	}
}

.summary-label {
	font-size: 11px;
	letter-spacing: 0.08em;
	color: rgba(103, 48, 16, 0.62);
}

.summary-card strong {
	font-size: 16px;
	color: #66310f;
}

.dialog-actions {
	display: flex;
	justify-content: center;
}

.refresh-btn {
	border: 0;
	background: transparent;
	font-size: 13px;
	color: #a55320;
	cursor: pointer;

	&:disabled {
		cursor: progress;
		opacity: 0.65;
	}
}

.history-list {
	display: grid;
	gap: 10px;
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding-right: 4px;
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
	flex: 1;
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

	span {
		padding: 6px 10px;
		border-radius: 999px;
		background: rgba(255, 247, 240, 0.9);
		font-size: 12px;
		color: #8b471d;
	}
}

:deep(.gashapon-dialog .el-dialog) {
	border-radius: 28px;
	overflow: hidden;
	background: rgba(255, 250, 244, 0.98);
	box-shadow: 0 28px 64px rgba(145, 76, 34, 0.22);
}

:deep(.gashapon-dialog .el-dialog__header) {
	margin-right: 0;
	padding: 22px 24px 8px;
	background:
		radial-gradient(circle at top left, rgba(255, 228, 185, 0.75), transparent 30%),
		linear-gradient(180deg, rgba(255, 247, 238, 0.92), rgba(255, 250, 244, 0.92));
}

:deep(.gashapon-dialog .el-dialog__title) {
	font-size: 24px;
	font-weight: 800;
	color: #71341b;
}

:deep(.gashapon-dialog .el-dialog__body) {
	padding: 16px 24px 24px;
}

@media (max-width: 640px) {
	.history-summary {
		grid-template-columns: 1fr;
	}
}
</style>
