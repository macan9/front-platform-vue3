<template>
	<div class="home-view-page blog-add-page">
		<div class="home-view-title">
			<div class="page-title">新增博客</div>
		</div>

		<div class="blog-add-main">
			<div class="editor-toolbar">
				<div class="toolbar-left">
					<el-button v-if="showBackButton" @click="goBack">返回</el-button>
					<el-input v-model="form.title" class="title-input" placeholder="请输入博客标题" />
				</div>

				<div class="toolbar-right">
					<el-radio-group v-model="editorMode" size="default">
						<el-radio-button label="source">源码编辑</el-radio-button>
						<el-radio-button label="wysiwyg">正常编辑</el-radio-button>
					</el-radio-group>
					<el-button circle @click="settingsVisible = true">
						<el-icon><Setting /></el-icon>
					</el-button>
					<el-button type="primary" :loading="submitting" @click="handleSubmit">发布</el-button>
				</div>
			</div>

			<div class="editor-meta">
				<el-tag v-if="form.is_top" type="danger" effect="light">置顶</el-tag>
				<el-tag v-for="item in currentTags" :key="item" effect="plain">{{ item }}</el-tag>
				<span v-if="uploadingPasteImage" class="upload-status">图片上传中...</span>
			</div>

			<div class="editor-shell">
				<div v-show="editorMode === 'source'" class="editor-pane">
					<textarea
						ref="editorRef"
						v-model="form.content"
						class="editor-textarea"
						placeholder="# 开始写博客\n\n支持 Markdown，支持直接粘贴图片上传。"
						@paste="handleEditorPaste"
					></textarea>
				</div>

				<div v-show="editorMode === 'wysiwyg'" class="editor-pane visual-editor-pane">
					<div ref="vditorRef" class="vditor-shell vditor-shell--modern"></div>
				</div>
			</div>
		</div>

		<BlogAddSettingsDialog
			v-model:visible="settingsVisible"
			:form="form"
			:rules="settingsRules"
			:submitting="settingsSubmitting"
			@submit="handleSettingsSubmit"
		/>
	</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import Vditor from 'vditor'
import { postCreateReq } from '@/apis/blogApis.js'
import { uploadGiteeFile } from '@/apis/giteeApis.js'
import { isApiSuccess } from '@/common/requests/requests.js'
import BlogAddSettingsDialog from '@/views/blogSystem/components/BlogAddSettingsDialog.vue'
import {
	buildBlogSubmitPayload,
	fileToBase64,
	normalizeBlogTags,
	resolveGiteeUploadedUrl,
} from '@/views/blogSystem/blogHelpers.js'
import { normalizeMarkdownContent } from '@/utils/markdown.js'
import 'highlight.js/styles/atom-one-light.css'
import 'vditor/dist/index.css'

const router = useRouter()
const route = useRoute()
const editorRef = ref(null)
const vditorRef = ref(null)
const vditorInstance = ref(null)
const toolbarObserver = ref(null)
const editorMode = ref('wysiwyg')
const settingsVisible = ref(false)
const settingsSubmitting = ref(false)
const submitting = ref(false)
const uploadingPasteImage = ref(false)
const syncingFromVditor = ref(false)

const form = reactive({
	title: '',
	summary: '',
	content: '',
	cover_image: '',
	tags: [],
	is_top: false,
})

const settingsRules = {}

const routeSource = computed(() => String(route.query?.from || '').trim())
const showBackButton = computed(() => Boolean(routeSource.value))
const currentTags = computed(() => normalizeBlogTags(form.tags))

const goBack = () => {
	if (window.history.length > 1) {
		router.back()
		return
	}

	if (routeSource.value === 'blogManage') {
		localStorage.setItem('topMenuValue', '1')
		localStorage.setItem('activeLeftMenu', '1-7')
		router.push('/BlogMain')
		return
	}

	if (routeSource.value === 'BlogMain') {
		router.push('/BlogMain')
		return
	}

	router.push('/blogManage')
}

const handleSettingsSubmit = (payload) => {
	form.summary = payload.summary
	form.content = payload.content
	form.cover_image = payload.cover_image
	form.tags = normalizeBlogTags(payload.tags)
	form.is_top = payload.is_top
	settingsVisible.value = false
}

const syncContentFromVditor = () => {
	if (!vditorInstance.value) return

	syncingFromVditor.value = true
	form.content = vditorInstance.value.getValue()
	nextTick(() => {
		syncingFromVditor.value = false
	})
}

const uploadEditorImage = async (file) => {
	const isLt10M = file.size / 1024 / 1024 < 10
	if (!isLt10M) {
		ElMessage.warning('图片大小不能超过 10MB')
		throw new Error('图片大小不能超过 10MB')
	}

	const ext = file.type.split('/')[1] || 'png'
	const fileName = `paste-${Date.now()}.${ext}`
	const base64Content = await fileToBase64(file)
	const response = await uploadGiteeFile(base64Content, fileName, 'blogImg')
	const imageUrl = resolveGiteeUploadedUrl(response, '')

	if (!imageUrl) {
		throw new Error('未获取到图片地址')
	}

	return imageUrl
}

const normalizeToolbarLayout = () => {
	const root = vditorRef.value
	if (!root) return

	const toolbar = root.querySelector('.vditor-toolbar')
	if (!toolbar) return

	toolbar.style.paddingLeft = '14px'
	toolbar.style.paddingRight = '14px'
	toolbar.style.left = '0'
	toolbar.style.right = '0'
	toolbar.style.width = '100%'
	toolbar.style.boxSizing = 'border-box'
	toolbar.style.display = 'flex'
	toolbar.style.justifyContent = 'center'
	toolbar.style.alignItems = 'center'

	const items = toolbar.querySelector('.vditor-toolbar__items')
	if (items) {
		items.style.display = 'flex'
		items.style.justifyContent = 'center'
		items.style.alignItems = 'center'
		items.style.flexWrap = 'wrap'
		items.style.width = '100%'
		items.style.margin = '0 auto'
	}
}

const bindToolbarLayoutGuard = () => {
	if (toolbarObserver.value) {
		toolbarObserver.value.disconnect()
		toolbarObserver.value = null
	}

	const root = vditorRef.value
	if (!root || typeof MutationObserver === 'undefined') return

	const toolbar = root.querySelector('.vditor-toolbar')
	if (!toolbar) return

	normalizeToolbarLayout()

	toolbarObserver.value = new MutationObserver(() => {
		normalizeToolbarLayout()
	})

	toolbarObserver.value.observe(toolbar, {
		attributes: true,
		attributeFilter: ['style', 'class'],
		subtree: true,
	})
}

const initVditor = async () => {
	if (vditorInstance.value || !vditorRef.value) return

	vditorInstance.value = new Vditor(vditorRef.value, {
		height: '100%',
		mode: 'wysiwyg',
		lang: 'zh_CN',
		cache: {
			enable: false,
		},
		counter: {
			enable: false,
		},
		outline: {
			enable: false,
			position: 'left',
		},
		toolbarConfig: {
			pin: true,
		},
		toolbar: [
			'emoji',
			'headings',
			'bold',
			'italic',
			'strike',
			'link',
			'|',
			'list',
			'ordered-list',
			'check',
			'quote',
			'line',
			'code',
			'inline-code',
			'table',
			'upload',
			'|',
			'undo',
			'redo',
			'outline',
		],
		upload: {
			accept: 'image/*',
			max: 10 * 1024 * 1024,
			multiple: false,
			handler: async (files) => {
				const rawFile = files?.[0]
				if (!rawFile) return

				uploadingPasteImage.value = true
				try {
					const imageUrl = await uploadEditorImage(rawFile)
					vditorInstance.value?.insertValue(`![image](${imageUrl})`)
					syncContentFromVditor()
					ElMessage.success('图片上传成功')
				} catch (error) {
					console.error('可视化编辑器图片上传失败', error)
					ElMessage.error(String(error?.message || '图片上传失败'))
				} finally {
					uploadingPasteImage.value = false
				}
			},
		},
		after: () => {
			vditorInstance.value?.setValue(normalizeMarkdownContent(form.content || ''))
			nextTick(() => {
				bindToolbarLayoutGuard()
			})
		},
		input: () => {
			syncContentFromVditor()
		},
		blur: () => {
			syncContentFromVditor()
		},
	})
}

const insertTextAtCursor = async (text) => {
	const textarea = editorRef.value
	if (!textarea) {
		form.content += text
		return
	}

	const start = textarea.selectionStart ?? form.content.length
	const end = textarea.selectionEnd ?? form.content.length
	form.content = `${form.content.slice(0, start)}${text}${form.content.slice(end)}`

	await nextTick()
	const position = start + text.length
	textarea.focus()
	textarea.setSelectionRange(position, position)
}

const handleEditorPaste = async (event) => {
	const items = Array.from(event.clipboardData?.items || [])
	const imageItem = items.find((item) => String(item.type || '').startsWith('image/'))
	if (!imageItem) return

	event.preventDefault()
	const file = imageItem.getAsFile()
	if (!file) return

	const isLt10M = file.size / 1024 / 1024 < 10
	if (!isLt10M) {
		ElMessage.warning('图片大小不能超过 10MB')
		return
	}

	uploadingPasteImage.value = true
	try {
		const imageUrl = await uploadEditorImage(file)
		const markdownImage = `\n![image](${imageUrl})\n`
		await insertTextAtCursor(markdownImage)
		ElMessage.success('图片上传成功')
	} catch (error) {
		console.error('粘贴图片上传失败', error)
		ElMessage.error('粘贴图片上传失败')
	} finally {
		uploadingPasteImage.value = false
	}
}

const handleSubmit = async () => {
	if (submitting.value) return
	const payload = buildBlogSubmitPayload(form)

	if (!payload.title) {
		ElMessage.warning('请输入标题')
		return
	}

	if (!payload.content.trim()) {
		ElMessage.warning('请输入正文内容')
		return
	}

	submitting.value = true
	try {
		const response = await postCreateReq(payload)
		if (!isApiSuccess(response)) {
			ElMessage.error(String(response?.message || '发布失败'))
			return
		}

		ElMessage.success('发布成功')
		router.push('/blogManage')
	} catch (error) {
		console.error('发布失败', error)
		ElMessage.error(String(error?.message || '发布失败'))
	} finally {
		submitting.value = false
	}
}

watch(
	() => editorMode.value,
	async (mode) => {
		if (mode !== 'wysiwyg') {
			syncContentFromVditor()
			return
		}

		await nextTick()
		await initVditor()
		vditorInstance.value?.setValue(normalizeMarkdownContent(form.content || ''))
	}
)

watch(
	() => form.content,
	(value) => {
		if (editorMode.value !== 'wysiwyg' || !vditorInstance.value || syncingFromVditor.value) return

		const nextValue = normalizeMarkdownContent(value || '')
		if (nextValue === vditorInstance.value.getValue()) return
		vditorInstance.value.setValue(nextValue)
	}
)

onMounted(async () => {
	if (editorMode.value !== 'wysiwyg') return

	await nextTick()
	await initVditor()
})

onBeforeUnmount(() => {
	toolbarObserver.value?.disconnect?.()
	toolbarObserver.value = null
	vditorInstance.value?.destroy()
	vditorInstance.value = null
})
</script>

<style lang="scss">
	.blog-add-page {
		--editor-border-color: rgba(201, 214, 228, 0.95);
		--editor-border-strong: rgba(168, 190, 212, 0.92);
		--editor-surface: rgba(255, 255, 255, 0.97);
		--editor-surface-soft: rgba(244, 248, 252, 0.98);
		--editor-surface-muted: rgba(237, 243, 248, 0.88);
		--editor-shadow: 0 24px 54px rgba(69, 95, 122, 0.1);
		--editor-shadow-focus: 0 30px 68px rgba(69, 95, 122, 0.16);
		--editor-text: #22384d;
		--editor-muted: #6c8095;
		--editor-accent: #2f6ea6;
		--editor-accent-soft: rgba(47, 110, 166, 0.1);
		--editor-toolbar-bg: rgba(250, 252, 255, 0.94);
		--editor-toolbar-border: rgba(214, 224, 234, 0.92);
		--editor-vditor-bg: rgba(249, 251, 253, 0.98);

		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 16px;

		.home-view-title {
			padding: 4px 4px 0;
		}

		.page-title {
			font-size: 28px;
			font-weight: 700;
			letter-spacing: 0.04em;
			color: #1e3348;
		}

		.blog-add-main {
			flex: 1;
			min-height: 0;
			display: flex;
			flex-direction: column;
			gap: 18px;
			padding: 22px;
			border: 1px solid rgba(216, 225, 234, 0.9);
			border-radius: 28px;
			background:
				radial-gradient(circle at top right, rgba(226, 236, 246, 0.92), transparent 28%),
				linear-gradient(180deg, rgba(251, 253, 255, 0.98), rgba(245, 248, 251, 0.94));
			box-shadow: var(--editor-shadow);
		}

		.editor-toolbar {
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 16px;
			flex-wrap: wrap;
			padding: 4px;
		}

		.toolbar-left,
		.toolbar-right {
			display: flex;
			align-items: center;
			gap: 12px;
			flex-wrap: wrap;
		}

		.title-input {
			width: min(520px, calc(100vw - 180px));

			:deep(.el-input__wrapper) {
				min-height: 46px;
				padding: 0 16px;
				border-radius: 16px;
				background: rgba(255, 255, 255, 0.92);
				box-shadow: 0 0 0 1px rgba(208, 219, 230, 0.95);
				transition: box-shadow 0.2s ease, transform 0.2s ease;
			}

			:deep(.el-input__wrapper.is-focus) {
				box-shadow:
					0 0 0 1px rgba(70, 126, 177, 0.95),
					0 14px 30px rgba(70, 126, 177, 0.12);
				transform: translateY(-1px);
			}

			:deep(.el-input__inner) {
				font-size: 16px;
				font-weight: 600;
				color: #1e3348;
			}
		}

		.editor-meta {
			display: flex;
			align-items: center;
			gap: 10px;
			flex-wrap: wrap;
			min-height: 32px;
			padding: 0 4px;

			:deep(.el-tag) {
				border-radius: 999px;
				padding-inline: 12px;
			}
		}

		.upload-status {
			font-size: 13px;
			color: var(--editor-muted);
		}

		.editor-shell {
			flex: 1;
			min-height: 0;
			display: flex;
			padding: 4px;
		}

		.editor-shell > .editor-pane:not(.visual-editor-pane) {
			max-width: 1240px;
			width: 100%;
			margin: 0 auto;
		}

		.editor-pane {
			flex: 1;
			min-height: 0;
			border-radius: 26px;
			border: 1px solid var(--editor-border-color);
			background: var(--editor-surface);
			box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78), var(--editor-shadow);
			transition: box-shadow 0.24s ease, transform 0.24s ease, border-color 0.24s ease;
		}

		.editor-pane:hover {
			border-color: rgba(173, 189, 205, 0.95);
			box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), var(--editor-shadow-focus);
		}

		.editor-pane:focus-within {
			border-color: rgba(70, 126, 177, 0.7);
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.88),
				0 0 0 4px rgba(70, 126, 177, 0.12),
				var(--editor-shadow-focus);
			transform: translateY(-1px);
		}

		.editor-textarea {
			display: block;
			width: 100%;
			height: 100%;
			min-height: 520px;
			border: 0;
			border-radius: 26px;
			outline: none;
			resize: none;
			padding: 28px 30px;
			font-size: 16px;
			line-height: 2;
			letter-spacing: 0.01em;
			color: var(--editor-text);
			background: transparent;
			font-family: Consolas, Monaco, 'Courier New', monospace;
		}

		.visual-editor-pane {
			padding: 0;
			overflow: visible;
			position: relative;
			border: 1px solid rgba(210, 221, 233, 0.82);
			background:
				radial-gradient(circle at top left, rgba(225, 236, 247, 0.72), transparent 28%),
				linear-gradient(180deg, rgba(253, 254, 255, 0.98), rgba(244, 248, 251, 0.96));
			box-shadow:
				0 0 0 1px rgba(255, 255, 255, 0.72) inset,
				0 20px 42px rgba(92, 123, 153, 0.12),
				var(--editor-shadow);
			max-width: 1240px;
			width: 100%;
			margin: 0 auto;
		}

		.visual-editor-pane::before {
			content: '';
			position: absolute;
			inset: 14px 18px auto;
			height: 90px;
			border-radius: 22px;
			background: linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0));
			pointer-events: none;
			opacity: 0.75;
		}

		.visual-editor-pane:hover,
		.visual-editor-pane:focus-within {
			border-color: var(--editor-border-strong);
			box-shadow:
				0 0 0 1px rgba(255, 255, 255, 0.82) inset,
				0 26px 54px rgba(92, 123, 153, 0.16),
				var(--editor-shadow-focus);
			transform: none;
		}

		.vditor-shell {
			height: 100%;
			min-height: 520px;
			padding: 14px;
			border-radius: 26px;
			background: var(--editor-vditor-bg);
		}

		.vditor-shell--modern {
			position: relative;
		}

		:deep(.vditor) {
			height: 100%;
			min-height: 492px;
			border: 1px solid rgba(214, 224, 235, 0.85) !important;
			border-radius: 24px;
			background: var(--editor-vditor-bg);
			overflow: hidden;
			box-shadow:
				0 1px 0 rgba(255, 255, 255, 0.8) inset,
				0 16px 38px rgba(99, 128, 156, 0.1) !important;
		}

		:deep(.vditor-toolbar) {
			position: sticky;
			top: 0;
			z-index: 8;
			padding: 14px 18px 12px;
			border-bottom: 1px solid var(--editor-toolbar-border);
			background:
				linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(246, 249, 252, 0.9));
			backdrop-filter: blur(16px);
			border-radius: 24px 24px 0 0;
			display: flex;
			justify-content: center;
			align-items: center;
			width: 100%;
			box-sizing: border-box;
		}

		:deep(.vditor-toolbar.vditor-toolbar--pin) {
			left: 0 !important;
			right: 0 !important;
			width: 100% !important;
			padding-left: 18px !important;
			padding-right: 18px !important;
			margin: 0 auto !important;
			box-sizing: border-box;
		}

		:deep(.vditor-toolbar__item),
		:deep(.vditor-toolbar__divider) {
			float: none;
			flex: 0 0 auto;
		}

		:deep(.vditor-toolbar__items) {
			display: flex;
			justify-content: center;
			align-items: center;
			flex-wrap: wrap;
			gap: 6px;
			width: 100%;
			margin: 0 auto;
		}

		:deep(.vditor-toolbar__br) {
			display: block;
			flex-basis: 100%;
		}

		:deep(.vditor-content) {
			height: calc(100% - 52px);
			background: var(--editor-vditor-bg);
			border: 0 !important;
			box-shadow: none !important;
		}

		:deep(.vditor-reset),
		:deep(.vditor-ir),
		:deep(.vditor-sv) {
			border: 0 !important;
			box-shadow: none !important;
			background: var(--editor-vditor-bg);
		}

		:deep(.vditor-reset--outline),
		:deep(.vditor-ir__layout),
		:deep(.vditor-sv__marker),
		:deep(.vditor-sv__preview),
		:deep(.vditor-ir__preview),
		:deep(.vditor-ir__editor),
		:deep(.vditor-ir pre),
		:deep(.vditor-ir .vditor-reset),
		:deep(.vditor-sv .vditor-reset),
		:deep(.vditor textarea),
		:deep(.vditor textarea:focus),
		:deep(.vditor-input),
		:deep(.vditor textarea.vditor-textarea),
		:deep(.vditor .CodeMirror),
		:deep(.vditor .CodeMirror-scroll),
		:deep(.vditor .CodeMirror-gutters),
		:deep(.vditor .CodeMirror-lines),
		:deep(.vditor .CodeMirror-line),
		:deep(.vditor .CodeMirror-code),
		:deep(.vditor .CodeMirror-sizer) {
			background: var(--editor-vditor-bg) !important;
		}

		:deep(.vditor-wysiwyg) {
			max-width: 980px;
			width: 100%;
			margin: 0 auto;
			padding: 40px 56px 48px;
			font-size: 16px;
			line-height: 1.95;
			letter-spacing: 0.01em;
			color: var(--editor-text);
			background: var(--editor-vditor-bg);
		}

		:deep(.vditor-wysiwyg p),
		:deep(.vditor-wysiwyg li) {
			color: var(--editor-text);
		}

		:deep(.vditor-wysiwyg h1),
		:deep(.vditor-wysiwyg h2),
		:deep(.vditor-wysiwyg h3),
		:deep(.vditor-wysiwyg h4) {
			color: #1b3044;
			letter-spacing: 0.02em;
		}

		:deep(.vditor-wysiwyg h1) {
			font-size: 34px;
			margin-bottom: 0.85em;
		}

		:deep(.vditor-wysiwyg h2) {
			font-size: 26px;
			margin-top: 1.8em;
		}

		:deep(.vditor-wysiwyg p code),
		:deep(.vditor-wysiwyg li code) {
			padding: 0.18em 0.5em;
			border-radius: 8px;
			background: rgba(41, 92, 138, 0.08);
			color: #1f527f;
			font-size: 0.92em;
		}

		:deep(.vditor-wysiwyg blockquote) {
			border-left: 4px solid rgba(83, 129, 170, 0.32);
			margin: 1.4em 0;
			padding: 1em 1.2em;
			background: rgba(242, 246, 250, 0.96);
			border-radius: 0 16px 16px 0;
		}

		:deep(.vditor-wysiwyg pre) {
			border-radius: 20px;
			box-shadow: 0 10px 24px rgba(42, 63, 84, 0.12);
			border: 1px solid rgba(29, 43, 56, 0.06);
		}

		:deep(.vditor-wysiwyg img) {
			border-radius: 18px;
			box-shadow: 0 14px 32px rgba(88, 112, 135, 0.16);
		}

		:deep(.vditor-counter) {
			padding: 12px 22px 16px;
			color: var(--editor-muted);
			background: transparent;
		}

		:deep(.vditor-outline) {
			background: var(--editor-vditor-bg);
			border-right: 1px solid rgba(220, 229, 238, 0.88);
			border-radius: 0 0 0 24px;
			overflow: hidden;
		}

		:deep(.vditor-outline__title) {
			font-weight: 700;
			color: #27425d;
			padding-top: 20px;
			padding-inline: 16px;
		}

		:deep(.vditor-outline__content) {
			font-size: 13px;
			color: var(--editor-muted);
			padding-inline: 8px;
		}

		:deep(.vditor-toolbar__item) {
			border-radius: 12px;
			color: #45607b;
			transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
		}

		:deep(.vditor-toolbar__item:hover) {
			background: rgba(89, 128, 165, 0.1);
			color: #274f77;
			transform: translateY(-1px);
		}

		:deep(.vditor-toolbar__item--current),
		:deep(.vditor-toolbar__item--current:hover) {
			background: var(--editor-accent-soft);
			color: var(--editor-accent);
		}

		@media (max-width: 980px) {
			padding: 12px;

			.blog-add-main {
				padding: 16px;
				border-radius: 22px;
			}

			.title-input {
				width: 100%;
			}

			.toolbar-left,
			.toolbar-right {
				width: 100%;
			}

			.toolbar-right {
				justify-content: flex-end;
			}

			.vditor-shell {
				padding: 10px;
			}

			.editor-textarea,
			:deep(.vditor-wysiwyg) {
				padding: 22px 24px;
			}

			:deep(.vditor-toolbar) {
				padding: 12px 14px 10px;
			}

			:deep(.vditor-outline) {
				display: none;
			}
		}
	}
</style>
