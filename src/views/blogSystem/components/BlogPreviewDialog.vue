<template>
	<el-dialog
		:model-value="visible"
		title="博客预览"
		width="900px"
		destroy-on-close
		class="blog-preview-dialog"
		@close="handleClose"
	>
		<div class="preview-shell">
			<div v-if="coverImage" class="preview-cover">
				<img :src="coverImage" alt="博客封面预览">
			</div>

			<div class="preview-head">
				<div class="preview-title-row">
					<h2 class="preview-title">{{ previewTitle }}</h2>
					<el-tag v-if="isTop" type="danger" size="small">置顶</el-tag>
				</div>
				<div v-if="previewTags.length" class="preview-tags">
					<el-tag v-for="item in previewTags" :key="item" size="small" effect="plain">
						{{ item }}
					</el-tag>
				</div>
				<div v-if="previewSummary" class="preview-summary">{{ previewSummary }}</div>
			</div>

			<div class="preview-content markdown-body" v-html="htmlContent"></div>
		</div>
	</el-dialog>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown.js'
import 'highlight.js/styles/atom-one-light.css'

const props = defineProps({
	visible: {
		type: Boolean,
		default: false,
	},
	title: {
		type: String,
		default: '',
	},
	summary: {
		type: String,
		default: '',
	},
	coverImage: {
		type: String,
		default: '',
	},
	tags: {
		type: [String, Array],
		default: '',
	},
	isTop: {
		type: Boolean,
		default: false,
	},
	content: {
		type: String,
		default: '',
	},
})

const emit = defineEmits(['update:visible'])

const previewTitle = computed(() => props.title || '未命名博客')
const previewSummary = computed(() => props.summary || '')
const coverImage = computed(() => props.coverImage || '')
const isTop = computed(() => props.isTop)
const previewTags = computed(() => {
	if (Array.isArray(props.tags)) {
		return props.tags.filter(Boolean)
	}
	return String(props.tags || '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
})
const htmlContent = computed(() => {
	if (!props.content) {
		return '<p>暂无正文内容。</p>'
	}
	return renderMarkdown(props.content)
})

const handleClose = () => {
	emit('update:visible', false)
}
</script>

<style lang="scss">
.blog-preview-dialog {
	.preview-shell {
		max-height: 70vh;
		overflow: auto;
		padding: 0 12px;
	}

	.preview-head {
		padding-bottom: 16px;
		border-bottom: 1px solid rgba(213, 225, 235, 0.95);
	}

	.preview-cover {
		margin-bottom: 22px;
		height: 220px;
		border-radius: 18px;
		overflow: hidden;
		background: #eef3f8;
	}

	.preview-cover img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
	}

	.preview-title-row {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.preview-title {
		margin: 0;
		font-size: 30px;
		line-height: 1.2;
		font-weight: 800;
		color: #213346;
		word-break: break-word;
	}

	.preview-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 14px;
	}

	.preview-summary {
		margin-top: 16px;
		padding: 14px 16px;
		border-radius: 16px;
		background: rgba(242, 247, 252, 0.95);
		color: #5d7083;
		font-size: 14px;
		line-height: 1.8;
	}

	.preview-content {
		margin-top: 24px;
		color: #33475b;
		font-size: 16px;
		line-height: 1.9;
	}

	.preview-shell::-webkit-scrollbar {
		width: 6px;
	}

	.preview-shell::-webkit-scrollbar-track {
		background: transparent;
	}

	.preview-shell::-webkit-scrollbar-thumb {
		border-radius: 999px;
		background: rgba(126, 146, 166, 0.5);
	}

	.preview-shell {
		scrollbar-width: thin;
		scrollbar-color: rgba(126, 146, 166, 0.55) transparent;
	}

	.markdown-body h1,
	.markdown-body h2,
	.markdown-body h3,
	.markdown-body h4,
	.markdown-body h5,
	.markdown-body h6 {
		margin: 1.6em 0 0.7em;
		line-height: 1.35;
		color: #1f3144;
	}

	.markdown-body p,
	.markdown-body ul,
	.markdown-body ol,
	.markdown-body blockquote {
		margin: 1em 0;
	}

	.markdown-body a {
		color: #2f7ddc;
		text-decoration: none;
	}

	.markdown-body a:hover {
		text-decoration: underline;
	}

	.markdown-body img {
		max-width: 100%;
		border-radius: 16px;
	}

	.markdown-body pre {
		margin: 1.4em 0;
		padding: 18px 20px;
		border-radius: 18px;
		overflow: auto;
		background: #f6f8fb;
		border: 1px solid rgba(219, 229, 238, 0.95);
	}

	.markdown-body code {
		font-family: Consolas, Monaco, monospace;
		font-size: 0.92em;
	}

	.markdown-body :not(pre) > code {
		padding: 0.18em 0.45em;
		border-radius: 8px;
		background: rgba(228, 236, 245, 0.95);
		color: #28435f;
	}

	.markdown-body blockquote {
		padding: 8px 0 8px 16px;
		border-left: 4px solid #9bc3ef;
		color: #607387;
		background: rgba(245, 249, 253, 0.9);
		border-radius: 0 12px 12px 0;
	}

	.markdown-body table {
		width: 100%;
		border-collapse: collapse;
		margin: 1.4em 0;
		overflow: hidden;
		border-radius: 14px;
	}

	.markdown-body th,
	.markdown-body td {
		padding: 12px 14px;
		border: 1px solid rgba(219, 229, 238, 0.95);
		text-align: left;
	}

	.markdown-body th {
		background: #f6f9fc;
		color: #23384d;
	}
}
</style>
