<template>
	<el-dialog
		:model-value="modelValue"
		title="My Prizes"
		width="620px"
		append-to-body
		class="gashapon-dialog"
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<div class="inventory-dialog">
			<div class="inventory-summary">
				<div class="summary-card">
					<span class="summary-label">Owned</span>
					<strong>{{ total }}</strong>
				</div>
				<div class="summary-card accent">
					<span class="summary-label">Sellable</span>
					<strong>{{ sellablePoints }}</strong>
				</div>
			</div>

			<div v-if="prizes.length" class="inventory-list">
				<div
					v-for="item in prizes"
					:key="item.inventoryId"
					class="inventory-item"
					:style="{ '--inventory-color': item.color }"
				>
					<span class="inventory-icon">{{ item.icon }}</span>
					<div class="inventory-content">
						<p class="inventory-name">{{ item.name }}</p>
						<p class="inventory-meta">{{ item.rarity }} · No. {{ String(item.displayId || item.id || 0).padStart(2, '0') }}</p>
						<p class="inventory-meta">Sell for {{ item.sellPoints }} pts</p>
					</div>
					<button
						type="button"
						class="inventory-sell"
						:disabled="sellingInventoryId === item.inventoryId"
						@click="$emit('sell', item)"
					>
						{{ sellingInventoryId === item.inventoryId ? 'Selling...' : 'Sell' }}
					</button>
				</div>
			</div>
			<div v-else class="inventory-empty">
				<div class="empty-icon">?</div>
				<h3>No Prizes Yet</h3>
				<p>Your synced inventory will appear here after a draw.</p>
			</div>
		</div>
	</el-dialog>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed } from 'vue'

const props = defineProps({
	modelValue: {
		type: Boolean,
		default: false,
	},
	prizes: {
		type: Array,
		default: () => [],
	},
	sellingInventoryId: {
		default: null,
	},
})

defineEmits(['update:modelValue', 'sell'])

const total = computed(() => props.prizes.length)
const sellablePoints = computed(() => props.prizes.reduce((sum, item) => sum + Number(item.sellPoints || 0), 0))
</script>

<style lang="scss" scoped>
.inventory-dialog {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.inventory-summary {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
}

.summary-card {
	display: grid;
	gap: 6px;
	padding: 14px 16px;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.86);
	border: 1px solid rgba(255, 255, 255, 0.8);

	&.accent {
		background: linear-gradient(135deg, rgba(255, 227, 189, 0.95), rgba(255, 191, 128, 0.88));
	}
}

.summary-label {
	font-size: 12px;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: rgba(103, 48, 16, 0.62);
}

.summary-card strong {
	font-size: 20px;
	color: #66310f;
}

.inventory-list {
	display: grid;
	gap: 12px;
	max-height: 54vh;
	overflow-y: auto;
	padding-right: 4px;
}

.inventory-item {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 14px;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.9);
	border: 1px solid rgba(255, 255, 255, 0.82);
	box-shadow: 0 12px 24px rgba(130, 67, 27, 0.08);
}

.inventory-icon {
	display: grid;
	place-items: center;
	width: 52px;
	height: 52px;
	border-radius: 16px;
	background: color-mix(in srgb, var(--inventory-color) 20%, white);
	font-size: 28px;
}

.inventory-content {
	flex: 1;
	min-width: 0;
}

.inventory-name {
	font-size: 16px;
	font-weight: 700;
	color: #673010;
}

.inventory-meta {
	margin-top: 4px;
	font-size: 12px;
	color: rgba(103, 48, 16, 0.68);
}

.inventory-sell {
	flex: 0 0 auto;
	padding: 9px 14px;
	border: 0;
	border-radius: 999px;
	background: linear-gradient(135deg, #ff9a5f, #ef5d2f);
	color: #fffaf4;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;

	&:disabled {
		cursor: progress;
		opacity: 0.7;
	}
}

.inventory-empty {
	display: grid;
	place-items: center;
	padding: 36px 16px 16px;
	text-align: center;
	color: rgba(103, 48, 16, 0.72);
}

.empty-icon {
	display: grid;
	place-items: center;
	width: 72px;
	height: 72px;
	margin-bottom: 14px;
	border-radius: 24px;
	background: rgba(255, 245, 236, 0.92);
	font-size: 30px;
	color: #c86b33;
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
	.inventory-summary {
		grid-template-columns: 1fr;
	}

	.inventory-item {
		flex-direction: column;
		align-items: flex-start;
	}

	.inventory-sell {
		width: 100%;
	}
}
</style>
