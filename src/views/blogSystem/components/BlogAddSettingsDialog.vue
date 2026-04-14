<template>
	<el-dialog
		:model-value="visible"
		width="820px"
		destroy-on-close
		align-center
		class="blog-add-settings-dialog"
		@close="handleClose"
	>
		<el-form ref="formRef" :model="localForm" :rules="rules" label-width="92px">
			<el-form-item label="封面图" prop="cover_image">
				<div class="cover-editor">
					<div v-if="localForm.cover_image" class="cover-preview">
						<img :src="localForm.cover_image" alt="博客封面预览">
					</div>
					<div class="cover-actions">
						<el-input
							v-model="localForm.cover_image"
							class="field-limit"
							placeholder="上传后自动填入封面地址"
							clearable
						/>
						<div class="cover-buttons">
							<el-upload
								action="#"
								:show-file-list="false"
								:before-upload="beforeCoverUpload"
								:http-request="handleCoverUpload"
							>
								<el-button :loading="uploadingCover">上传到 Gitee</el-button>
							</el-upload>
							<el-button v-if="localForm.cover_image" @click="clearCover">清空封面</el-button>
						</div>
						<div class="cover-tip">封面将上传到 Gitee 的 `blogCover` 目录</div>
					</div>
				</div>
			</el-form-item>

			<el-form-item label="博客标签" prop="tags">
				<el-select
					v-model="localForm.tags"
					class="field-limit"
					multiple
					filterable
					allow-create
					default-first-option
					collapse-tags
					collapse-tags-tooltip
					placeholder="请选择或输入标签"
				>
					<el-option
						v-for="item in tagOptions"
						:key="item"
						:label="item"
						:value="item"
					/>
				</el-select>
			</el-form-item>

			<el-form-item label="置顶" prop="is_top">
				<el-switch v-model="localForm.is_top" />
			</el-form-item>

			<el-form-item label="摘要" prop="summary">
				<el-input v-model="localForm.summary" placeholder="可选" />
			</el-form-item>
		</el-form>

		<template #footer>
			<div class="dialog-footer">
				<el-button @click="handleClose">取消</el-button>
				<el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script setup>
/* global defineProps, defineEmits */
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadGiteeFile } from '@/apis/giteeApis'
import {
	normalizeBlogTags,
	fileToBase64,
	resolveGiteeUploadedUrl,
	buildBlogSubmitPayload,
} from '@/views/blogSystem/blogHelpers.js'
import { blog_tag_options } from '/public/config/blog_tags'

const props = defineProps({
	visible: {
		type: Boolean,
		default: false,
	},
	form: {
		type: Object,
		default: () => ({
			summary: '',
			content: '',
			cover_image: '',
			tags: '',
			is_top: false,
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

const emit = defineEmits(['update:visible', 'submit'])

const formRef = ref()
const uploadingCover = ref(false)
const tagOptions = blog_tag_options

const localForm = reactive({
	summary: '',
	content: '',
	cover_image: '',
	tags: [],
	is_top: false,
})

const syncForm = (value = {}) => {
	localForm.summary = value?.summary || ''
	localForm.content = value?.content || ''
	localForm.cover_image = value?.cover_image || value?.cover || value?.coverUrl || ''
	localForm.tags = normalizeBlogTags(value?.tags)
	localForm.is_top = Boolean(value?.is_top)
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

const beforeCoverUpload = (file) => {
	const isImage = String(file.type || '').startsWith('image/')
	if (!isImage) {
		ElMessage.warning('封面仅支持图片文件')
		return false
	}

	const isLt10M = file.size / 1024 / 1024 < 10
	if (!isLt10M) {
		ElMessage.warning('图片大小不能超过 10MB')
		return false
	}

	return true
}

const handleCoverUpload = async ({ file }) => {
	uploadingCover.value = true
	try {
		const fileName = `${Date.now()}-${String(file.name || 'cover').replace(/\s+/g, '-')}`
		const base64Content = await fileToBase64(file)
		const response = await uploadGiteeFile(base64Content, fileName, 'blogCover')
		const coverUrl = resolveGiteeUploadedUrl(response, '')

		if (!coverUrl) {
			throw new Error('未获取到封面地址')
		}

		localForm.cover_image = coverUrl
		ElMessage.success('封面上传成功')
	} catch (error) {
		console.error('封面上传失败', error)
		ElMessage.error('封面上传失败')
	} finally {
		uploadingCover.value = false
	}
}

const clearCover = () => {
	localForm.cover_image = ''
}

const handleSubmit = async () => {
	const ok = await formRef.value?.validate?.().catch(() => false)
	if (!ok) return
	const payload = buildBlogSubmitPayload(localForm)
	emit('submit', payload)
}
</script>

<style lang="scss">
.blog-add-settings-dialog {
	.el-dialog {
		margin: 0 auto;
	}

	.el-dialog__header {
		padding: 0;
		min-height: 0;
	}

	.el-dialog__body {
		max-height: calc(90vh - 68px);
		overflow-y: auto;
		padding-top: 26px;
		padding-right: 32px;
	}

	.el-dialog__headerbtn {
		top: 16px;
		right: 16px;
	}
}

.field-limit {
	width: 100%;
	max-width: 350px;
}

.cover-editor {
	display: flex;
	align-items: flex-start;
	gap: 16px;
	width: 100%;
}

.cover-preview {
	flex: 0 0 168px;
	height: 108px;
	border-radius: 14px;
	overflow: hidden;
	background: #eef3f8;
	border: 1px solid rgba(219, 229, 238, 0.95);

	img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
	}
}

.cover-actions {
	flex: 1;
	min-width: 0;
}

.cover-buttons {
	display: flex;
	gap: 10px;
	margin-top: 10px;
	flex-wrap: wrap;
}

.cover-tip {
	margin-top: 8px;
	font-size: 12px;
	color: #7a8da1;
}

.dialog-footer {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
}

@media (max-width: 900px) {
	.blog-add-settings-dialog {
		.el-dialog {
			width: calc(100vw - 24px) !important;
		}

		.el-dialog__body {
			max-height: calc(100vh - 80px);
			padding-top: 22px;
			padding-right: 20px;
		}
	}

	.field-limit {
		max-width: 100%;
	}

	.cover-editor {
		flex-direction: column;
	}

	.cover-preview {
		width: 100%;
		max-width: 280px;
	}
}
</style>
