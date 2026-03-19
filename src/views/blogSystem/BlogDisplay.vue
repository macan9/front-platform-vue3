<template>
	<div class="BlogDisplay">
		<el-skeleton :loading="loading" animated :rows="8">
			<template #default>
				<el-empty v-if="!loading && !blogDetail" description="未找到博客内容" />

				<div v-else-if="blogDetail" class="detail-page">
					<div class="cover-wrap">
						<img class="cover-image" :src="coverUrl" :alt="blogDetail.title || '博客封面'">
					</div>

					<div class="detail-main">
						<div class="detail-head">
							<div class="title-wrap">
								<el-button text class="back-button" @click="goBack">返回</el-button>
								<h1 class="detail-title">{{ blogDetail.title || '未命名博客' }}</h1>
							</div>

							<div class="detail-meta">
								<div class="meta-author">{{ author }}</div>
								<div class="meta-time">{{ publishTime }}</div>
							</div>
						</div>

						<div v-if="summaryText" class="detail-summary">
							{{ summaryText }}
						</div>

						<div class="detail-content markdown-body" v-html="markdownHTML"></div>
					</div>
				</div>
			</template>
		</el-skeleton>
	</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import 'highlight.js/styles/atom-one-light.css'
import { postSingleInfoGet } from '@/apis/blogApis.js'
import { renderMarkdown } from '@/utils/markdown.js'
import {
	detailCoverList,
	formatDateTime,
	getAuthor,
	getContent,
	getCover,
	getRandomCover,
	getSummary,
} from '@/views/blogSystem/blogHelpers.js'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const blogDetail = ref(null)
const coverUrl = ref(getRandomCover(detailCoverList))

const author = computed(() => {
	return blogDetail.value ? getAuthor(blogDetail.value) : ''
})

const publishTime = computed(() => {
	const value = blogDetail.value?.updated_at || blogDetail.value?.created_at
	return formatDateTime(value)
})

const summaryText = computed(() => {
	return blogDetail.value ? getSummary(blogDetail.value) : ''
})

const markdownHTML = computed(() => {
	const content = blogDetail.value ? getContent(blogDetail.value) : ''
	if (!content) {
		return '<p>这篇博客暂时还没有正文内容。</p>'
	}
	return renderMarkdown(content)
})

const goBack = () => {
	router.back()
}

const loadBlogDetail = async () => {
	const { id } = route.params
	if (!id) {
		blogDetail.value = null
		return
	}

	loading.value = true
	try {
		const { data } = await postSingleInfoGet(id)
		const detail = data?.data || data || null
		blogDetail.value = detail
		coverUrl.value = getCover(detail) || getRandomCover(detailCoverList)
	} catch (error) {
		console.error('获取博客详情失败', error)
		ElMessage.error('获取博客详情失败')
		blogDetail.value = null
		coverUrl.value = getRandomCover(detailCoverList)
	} finally {
		loading.value = false
	}
}

watch(
	() => route.params.id,
	() => {
		loadBlogDetail()
	},
	{ immediate: true }
)
</script>

<style lang="scss">
.BlogDisplay {
	--detail-scrollbar-width: 6px;
	--detail-scrollbar-gap: 8px;
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	padding: 0 calc(var(--detail-scrollbar-width) + var(--detail-scrollbar-gap)) 0 0;
	box-sizing: border-box;
	background: linear-gradient(180deg, #f7fbff 0%, #f4f7fb 100%);

	:deep(.el-skeleton) {
		flex: 1;
		height: 100%;
		min-height: 0;
		display: block;
		overflow: visible;
	}

	:deep(.el-skeleton__content) {
		height: 100%;
		min-height: 0;
	}

	:deep(.el-empty) {
		min-height: 420px;
	}

	.detail-page {
		min-height: 0;
		height: 100%;
		overflow-y: auto;
		padding-right: var(--detail-scrollbar-gap);
		margin-right: calc(-1 * var(--detail-scrollbar-gap));
		box-sizing: border-box;
		scrollbar-width: thin;
		scrollbar-color: rgba(126, 146, 166, 0.55) transparent;
	}

	.detail-page::-webkit-scrollbar {
		width: var(--detail-scrollbar-width);
	}

	.detail-page::-webkit-scrollbar-track {
		background: transparent;
	}

	.detail-page::-webkit-scrollbar-thumb {
		border-radius: 999px;
		background: rgba(126, 146, 166, 0.5);
	}

	.detail-page::-webkit-scrollbar-thumb:hover {
		background: rgba(106, 126, 146, 0.72);
	}

	.cover-wrap {
		width: 100%;
		height: 180px;
		overflow: hidden;
		box-sizing: border-box;
	}

	.cover-image {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
		background: #dde7f2;
	}

	.detail-main {
		max-width: 980px;
		margin: 22px auto 0;
		padding: 0 24px;
	}

	.detail-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24px;
		padding-bottom: 16px;
		border-bottom: 1px solid rgba(213, 225, 235, 0.95);
	}

	.title-wrap {
		flex: 1;
		min-width: 0;
	}

	.back-button {
		padding-left: 0;
		margin-bottom: 10px;
		color: #6a7c90;
	}

	.detail-title {
		margin: 0;
		font-size: 38px;
		line-height: 1.2;
		font-weight: 800;
		color: #213346;
		word-break: break-word;
	}

	.detail-meta {
		flex: 0 0 auto;
		min-width: 180px;
		padding-top: 42px;
		text-align: right;
		color: #6d7f93;
	}

	.meta-author {
		font-size: 16px;
		font-weight: 700;
		color: #2c4056;
	}

	.meta-time {
		margin-top: 8px;
		font-size: 13px;
	}

	.detail-summary {
		margin-top: 18px;
		padding: 16px 18px;
		border-radius: 18px;
		background: rgba(242, 247, 252, 0.95);
		color: #5d7083;
		font-size: 15px;
		line-height: 1.8;
	}

	.detail-content {
		margin-top: 24px;
		padding: 0 2px 6px;
		color: #33475b;
		font-size: 16px;
		line-height: 1.9;
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

	@media (max-width: 900px) {
		.cover-wrap {
			height: 180px;
		}

		.detail-head {
			flex-direction: column;
			gap: 14px;
		}

		.detail-title {
			font-size: 28px;
		}

		.detail-meta {
			min-width: 0;
			padding-top: 0;
			text-align: left;
		}

		.detail-main {
			padding: 0 14px;
		}
	}
}
</style>
