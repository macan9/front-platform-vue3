<template>
	<el-dialog
		:model-value="visible"
		:title="title"
		width="760px"
		destroy-on-close
		@close="handleClose"
	>
		<el-form ref="formRef" :model="localForm" :rules="rules" label-width="80px">
			<el-form-item label="标题" prop="title">
				<el-input v-model="localForm.title" placeholder="请输入标题" />
			</el-form-item>
			<el-form-item label="摘要" prop="summary">
				<el-input v-model="localForm.summary" placeholder="可选" />
			</el-form-item>
			<el-form-item label="内容" prop="content">
				<el-input
					v-model="localForm.content"
					type="textarea"
					:rows="14"
					placeholder="请输入内容（支持 Markdown）"
				/>
			</el-form-item>
		</el-form>
		<template #footer>
			<div class="dialog-footer">
				<el-button @click="handlePreview">预览</el-button>
				<el-button @click="handleClose">取消</el-button>
				<el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script setup>
/* global defineProps, defineEmits */
import { reactive, ref, watch } from 'vue'

const props = defineProps({
	visible: {
		type: Boolean,
		default: false,
	},
	title: {
		type: String,
		default: '博客编辑',
	},
	form: {
		type: Object,
		default: () => ({
			title: '',
			summary: '',
			content: '',
		}),
	},
	rules: {
		type: Object,
		default: () => ({}),
	},
	submitting: {
		type: Boolean,
		default: false,
	},
})

const emit = defineEmits(['update:visible', 'submit', 'preview'])

const formRef = ref()
const localForm = reactive({
	title: '',
	summary: '',
	content: '',
})

const syncForm = (value = {}) => {
	localForm.title = value?.title || ''
	localForm.summary = value?.summary || ''
	localForm.content = value?.content || ''
}

watch(
	() => props.visible,
	(value) => {
		if (value) {
			syncForm(props.form)
			formRef.value?.clearValidate?.()
		}
	}
)

watch(
	() => props.form,
	(value) => {
		if (props.visible) {
			syncForm(value)
		}
	},
	{ deep: true }
)

const handleClose = () => {
	emit('update:visible', false)
}

const handlePreview = () => {
	emit('preview', { ...localForm })
}

const handleSubmit = async () => {
	const ok = await formRef.value?.validate?.().catch(() => false)
	if (!ok) return
	emit('submit', { ...localForm })
}
</script>

<style lang="scss" scoped>
.dialog-footer {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
}
</style>
