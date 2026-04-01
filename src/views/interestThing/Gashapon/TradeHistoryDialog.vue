<template>
	<el-dialog
		:model-value="modelValue"
		title="交易记录"
		width="560px"
		append-to-body
		class="gashapon-dialog"
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<div class="trade-dialog">
			<div class="trade-summary">
				<div class="summary-card">
					<span class="summary-label">记录数</span>
					<strong>{{ summary.total }}</strong>
				</div>
				<div class="summary-card">
					<span class="summary-label">最近类型</span>
					<strong>{{ summary.latestType }}</strong>
				</div>
				<div class="summary-card accent">
					<span class="summary-label">最近状态</span>
					<strong>{{ summary.latestStatus }}</strong>
				</div>
			</div>

			<div class="dialog-actions">
				<button type="button" class="refresh-btn" :disabled="loading" @click="$emit('refresh')">
					{{ loading ? '刷新中...' : '刷新' }}
				</button>
			</div>

			<div v-if="records.length" class="trade-list">
				<div
					v-for="record in records"
					:key="record.tradeId"
					class="trade-item"
					:style="{ '--trade-color': record.color || '#ffb45f' }"
				>
					<span class="trade-icon">{{ record.icon || '记' }}</span>
					<div class="trade-content">
						<div class="trade-main">
							<div>
								<p class="trade-name">{{ record.title }}</p>
								<p class="trade-meta">{{ record.type }} · {{ record.status }}</p>
							</div>
							<span class="trade-time">{{ formatTime(record.createdAt) }}</span>
						</div>
						<p class="trade-desc">{{ record.description }}</p>
					</div>
				</div>
			</div>
			<p v-else class="trade-empty">暂无交易记录</p>
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
	summary: {
		type: Object,
		required: true,
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
.trade-dialog {
	display: flex;
	flex-direction: column;
	gap: 14px;
	height: 520px;
}

.trade-summary {
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

.trade-list {
	display: grid;
	gap: 10px;
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding-right: 4px;
}

.trade-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.74);
	border: 1px solid rgba(255, 255, 255, 0.78);
	box-shadow: 0 10px 20px rgba(130, 67, 27, 0.08);
}

.trade-icon {
	display: grid;
	place-items: center;
	width: 42px;
	height: 42px;
	border-radius: 14px;
	background: color-mix(in srgb, var(--trade-color) 20%, white);
	font-size: 16px;
	font-weight: 700;
}

.trade-content {
	display: grid;
	gap: 8px;
	flex: 1;
	min-width: 0;
}

.trade-main {
	display: flex;
	justify-content: space-between;
	gap: 12px;
}

.trade-name {
	font-size: 15px;
	font-weight: 700;
	color: #673010;
}

.trade-meta,
.trade-empty {
	font-size: 13px;
	color: rgba(103, 48, 16, 0.68);
}

.trade-empty {
	display: grid;
	place-items: center;
	flex: 1;
	text-align: center;
}

.trade-time {
	flex: 0 0 auto;
	padding: 4px 8px;
	border-radius: 999px;
	background: rgba(255, 245, 235, 0.92);
	font-size: 12px;
	font-weight: 700;
	color: #9a4d1f;
}

.trade-desc {
	line-height: 1.5;
	font-size: 13px;
	color: rgba(103, 48, 16, 0.82);
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
	.trade-summary {
		grid-template-columns: 1fr;
	}
}
</style>
