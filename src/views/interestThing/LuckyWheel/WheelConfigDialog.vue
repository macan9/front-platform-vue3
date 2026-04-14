<template>
	<el-dialog
		:model-value="modelValue"
		title="转盘配置"
		width="720px"
		append-to-body
		class="lucky-wheel-config-dialog"
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<div class="config-dialog">
			<div class="config-summary">
				<div class="summary-card">
					<span class="summary-label">奖项数量</span>
					<strong>{{ draftItems.length }}</strong>
				</div>
				<div class="summary-card">
					<span class="summary-label">概率合计</span>
					<strong>{{ totalPercentage }}</strong>
				</div>
				<div class="summary-card accent">
					<span class="summary-label">数量限制</span>
					<strong>2 - 9 项</strong>
				</div>
			</div>

			<p class="config-tip">支持修改奖项名称、图标和概率；保存时会校验奖项数量必须在 2 到 9 之间，且概率合计必须等于 100。</p>

			<div class="config-toolbar">
				<button type="button" class="ghost-btn" :disabled="draftItems.length >= 9" @click="addItem">新增奖项</button>
				<span class="toolbar-tip">最多 9 个奖项，最少 2 个奖项</span>
			</div>

			<div class="config-list">
				<div v-for="(item, index) in draftItems" :key="item.id || index" class="config-item">
					<div class="item-index">#{{ index + 1 }}</div>
					<label class="field">
						<span>名称</span>
						<input v-model.trim="item.label" type="text" maxlength="20" placeholder="请输入奖项名称" />
					</label>
					<label class="field">
						<span>图标</span>
						<div class="icon-picker" tabindex="0">
							<button type="button" class="icon-display" :title="item.icon || '选择图标'">
								{{ item.icon || '☆' }}
							</button>
							<div class="icon-options">
								<button
									v-for="iconOption in iconOptions"
									:key="iconOption"
									type="button"
									class="icon-option"
									:class="{ active: item.icon === iconOption }"
									@click="item.icon = iconOption"
								>
									{{ iconOption }}
								</button>
							</div>
						</div>
					</label>
					<label class="field">
						<span>概率</span>
						<input v-model.number="item.percentage" type="number" min="0" step="0.1" placeholder="0" />
					</label>
					<button type="button" class="remove-btn" :disabled="draftItems.length <= 2" @click="removeItem(index)">
						删除
					</button>
				</div>
			</div>

			<div class="config-actions">
				<button type="button" class="ghost-btn" @click="handleReset">恢复默认</button>
				<div class="action-group">
					<button type="button" class="ghost-btn" @click="$emit('update:modelValue', false)">取消</button>
					<button type="button" class="primary-btn" @click="handleSave">保存配置</button>
				</div>
			</div>
		</div>
	</el-dialog>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
	modelValue: {
		type: Boolean,
		default: false,
	},
	items: {
		type: Array,
		default: () => [],
	},
})

const emit = defineEmits(['update:modelValue', 'save', 'reset'])
const iconOptions = [
	'🎁', '🎉', '🎯', '🎟', '🎬', '☕', '🍰', '🍔', '🍟', '🍕',
	'🍩', '🍪', '🍫', '🍎', '🍉', '🧋', '🥤', '🍀', '⭐', '🌈',
	'🔥', '💎', '🪙', '🎵', '🎮', '🚀', '🧸', '📚', '🛍', '🎈',
	'🧃', '🥳', '🎊', '🏆', '💝', '🌟', '🍓', '🪄', '🧧', '🎲',
]

const createDraftItem = (item = {}, index = 0) => ({
	id: item.id ?? `wheel-item-${Date.now()}-${index + 1}`,
	label: String(item.label || ''),
	icon: String(item.icon || ''),
	percentage: Number(item.percentage) || 0,
})

const cloneItems = (items = []) => items.map((item, index) => createDraftItem(item, index))

const draftItems = ref(cloneItems(props.items))

watch(
	() => [props.items, props.modelValue],
	() => {
		draftItems.value = cloneItems(props.items)
	},
	{ deep: true },
)

const totalPercentage = computed(() =>
	draftItems.value.reduce((sum, item) => sum + (Number(item.percentage) > 0 ? Number(item.percentage) : 0), 0),
)

const addItem = () => {
	if (draftItems.value.length >= 9) return
	draftItems.value.push(
		createDraftItem(
			{
				label: `新奖项${draftItems.value.length + 1}`,
				icon: '*',
				percentage: 0,
			},
			draftItems.value.length,
		),
	)
}

const removeItem = (index) => {
	if (draftItems.value.length <= 2) return
	draftItems.value.splice(index, 1)
}

const isValidPercentageTotal = (value) => Math.abs(Number(value) - 100) < 0.0001

const handleSave = () => {
	if (draftItems.value.length < 2 || draftItems.value.length > 9) {
		ElMessage.warning('奖项数量需保持在 2 到 9 个之间')
		return
	}

	if (draftItems.value.some((item) => !String(item.label || '').trim())) {
		ElMessage.warning('请填写所有奖项名称')
		return
	}

	if (draftItems.value.some((item) => !String(item.icon || '').trim())) {
		ElMessage.warning('请为所有奖项选择图标')
		return
	}

	if (draftItems.value.some((item) => Number(item.percentage) < 0)) {
		ElMessage.warning('概率不能小于 0')
		return
	}

	if (!isValidPercentageTotal(totalPercentage.value)) {
		ElMessage.warning('保存失败，所有奖项概率合计必须等于 100')
		return
	}

	emit('save', cloneItems(draftItems.value))
	emit('update:modelValue', false)
}

const handleReset = () => {
	emit('reset')
	emit('update:modelValue', false)
}
</script>

<style lang="scss" scoped>
.config-dialog {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.config-summary {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.summary-card {
	display: grid;
	gap: 6px;
	padding: 14px;
	border-radius: 18px;
	background: rgba(255, 249, 242, 0.92);
	border: 1px solid rgba(255, 255, 255, 0.72);

	&.accent {
		background: linear-gradient(135deg, rgba(255, 226, 190, 0.92), rgba(255, 184, 116, 0.82));
	}
}

.summary-label {
	font-size: 12px;
	color: rgba(103, 57, 33, 0.62);
}

.summary-card strong {
	font-size: 18px;
	color: #6f3218;
}

.config-tip,
.toolbar-tip {
	margin: 0;
	color: rgba(103, 57, 33, 0.72);
	line-height: 1.6;
}

.config-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.config-list {
	display: grid;
	gap: 12px;
	max-height: 52vh;
	overflow: auto;
	padding-right: 4px;
}

.config-item {
	display: grid;
	grid-template-columns: 56px minmax(0, 1.5fr) 120px 120px 88px;
	gap: 12px;
	padding: 14px;
	border-radius: 18px;
	background: rgba(255, 252, 247, 0.94);
	border: 1px solid rgba(255, 255, 255, 0.76);
	align-items: end;
}

.item-index {
	display: grid;
	place-items: center;
	height: 44px;
	border-radius: 14px;
	background: rgba(255, 240, 226, 0.9);
	color: #b65e2b;
	font-weight: 700;
}

.field {
	display: grid;
	gap: 6px;
}

.field span {
	font-size: 12px;
	color: rgba(103, 57, 33, 0.68);
}

.field input {
	width: 100%;
	height: 44px;
	padding: 0 12px;
	border: 1px solid rgba(214, 160, 128, 0.6);
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.94);
	color: #6f3218;
	font-size: 14px;
	outline: none;
	box-sizing: border-box;
}

.field input:focus {
	border-color: rgba(239, 93, 47, 0.72);
	box-shadow: 0 0 0 3px rgba(255, 154, 95, 0.16);
}

.icon-picker {
	position: relative;
}

.icon-picker::after {
	content: '';
	position: absolute;
	left: 0;
	top: 100%;
	width: 220px;
	height: 12px;
}

.icon-display {
	width: 100%;
	height: 44px;
	border: 1px solid rgba(214, 160, 128, 0.6);
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.94);
	color: #6f3218;
	font-size: 22px;
	cursor: pointer;
}

.icon-picker:hover .icon-display,
.icon-picker:focus-within .icon-display {
	border-color: rgba(239, 93, 47, 0.72);
	box-shadow: 0 0 0 3px rgba(255, 154, 95, 0.16);
}

.icon-options {
	position: absolute;
	left: 0;
	top: calc(100% + 8px);
	z-index: 10;
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	gap: 8px;
	width: 220px;
	padding: 10px;
	border-radius: 16px;
	background: rgba(255, 252, 247, 0.98);
	border: 1px solid rgba(255, 255, 255, 0.78);
	box-shadow: 0 18px 32px rgba(166, 101, 52, 0.16);
	opacity: 0;
	pointer-events: none;
	transform: translateY(6px);
	transition: opacity 0.18s ease, transform 0.18s ease;
}

.icon-picker:hover .icon-options,
.icon-picker:focus-within .icon-options {
	opacity: 1;
	pointer-events: auto;
	transform: translateY(0);
}

.icon-option {
	height: 40px;
	border: 1px solid rgba(214, 160, 128, 0.35);
	border-radius: 12px;
	background: rgba(255, 255, 255, 0.94);
	font-size: 22px;
	cursor: pointer;
	transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.icon-option:hover,
.icon-option.active {
	border-color: rgba(239, 93, 47, 0.7);
	box-shadow: 0 8px 18px rgba(206, 95, 44, 0.16);
	transform: translateY(-1px);
}

.remove-btn,
.primary-btn,
.ghost-btn {
	border: 0;
	cursor: pointer;
	transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.remove-btn:hover,
.primary-btn:hover,
.ghost-btn:hover {
	transform: translateY(-1px);
}

.remove-btn:disabled,
.primary-btn:disabled,
.ghost-btn:disabled {
	cursor: not-allowed;
	opacity: 0.65;
	transform: none;
}

.remove-btn {
	height: 44px;
	border-radius: 14px;
	background: rgba(126, 36, 8, 0.08);
	color: #9c4b22;
	font-weight: 700;
}

.config-actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.action-group {
	display: flex;
	gap: 12px;
}

.primary-btn {
	padding: 12px 18px;
	border-radius: 16px;
	background: linear-gradient(135deg, #ff965a, #ef5d2f);
	color: #fffaf4;
	font-size: 15px;
	font-weight: 700;
	box-shadow: 0 16px 28px rgba(206, 95, 44, 0.22);
}

.ghost-btn {
	padding: 10px 16px;
	border-radius: 14px;
	background: rgba(255, 248, 241, 0.95);
	color: #7a3a1d;
}

@media (max-width: 720px) {
	.config-summary,
	.config-item {
		grid-template-columns: 1fr;
	}

	.config-toolbar,
	.config-actions,
	.action-group {
		flex-direction: column;
		align-items: stretch;
	}

	.action-group,
	.primary-btn,
	.ghost-btn,
	.remove-btn {
		width: 100%;
	}
}
</style>
