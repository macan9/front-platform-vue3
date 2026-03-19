<template>
	<div class="home-view-page BlogManage">
		<div class="home-view-title">
			<div class="page-title">博客管理</div>
		</div>

		<div class="blog-main">
			<div class="blog-header">
				<div class="header-search">
					<el-input v-model="search" placeholder="输入标题过滤" />
				</div>
				<div class="header-actions">
					<el-button type="primary" @click="openCreate()">新增</el-button>
					<el-button type="success" @click="getPostData()">刷新</el-button>
				</div>
			</div>

			<div class="table-wrap">
				<el-skeleton :loading="loading" animated :rows="6">
					<template #default>
						<el-empty v-if="!filterTableData.length" description="暂无文章" />
						<el-table v-else :data="filterTableData" height="100%" style="width: 100%">
							<el-table-column label="标题" prop="title" min-width="140">
								<template #default="scope">
									<div class="post-title" :title="scope.row.title || '-'">
										{{ scope.row.title || '-' }}
									</div>
								</template>
							</el-table-column>
							<el-table-column label="作者" prop="author" min-width="120">
								<template #default="scope">
									{{ scope.row.author_name || '-' }}
								</template>
							</el-table-column>
							<el-table-column label="创建时间" prop="created_at" width="200">
								<template #default="scope">
									{{ formatDateTime(scope.row.updated_at) || '-' }}
								</template>
							</el-table-column>
							<el-table-column label="摘要" prop="summary" min-width="160" show-overflow-tooltip>
								<template #default="scope">
									{{ scope.row.summary || '-' }}
								</template>
							</el-table-column>
							<el-table-column label="标签" prop="tags" min-width="180" show-overflow-tooltip>
								<template #default="scope">
									{{ scope.row.tags || '-' }}
								</template>
							</el-table-column>
							<el-table-column label="置顶" prop="is_top" width="90" align="center">
								<template #default="scope">
									<el-tag :type="scope.row.is_top ? 'danger' : 'info'" size="small">
										{{ scope.row.is_top ? '是' : '否' }}
									</el-tag>
								</template>
							</el-table-column>
							<el-table-column label="内容" prop="content" min-width="280">
								<template #default="scope">
									<div class="post-content-cell">
										{{ getContent(scope.row) || '-' }}
									</div>
								</template>
							</el-table-column>
							<el-table-column align="right" width="240">
								<template #default="scope">
									<el-button size="small" @click="openPreview(scope.row)">预览</el-button>
									<el-button size="small" @click="openEdit(scope.row)">编辑</el-button>
									<el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
								</template>
							</el-table-column>
						</el-table>
					</template>
				</el-skeleton>
			</div>
		</div>

		<BlogEditorDialog
			v-model:visible="editorVisible"
			:title="editorMode === 'create' ? '新增博客' : '编辑博客'"
			:form="editorForm"
			:rules="editorRules"
			:submitting="submitting"
			@submit="handleEditorSubmit"
			@preview="openPreview"
		/>

		<BlogPreviewDialog
			v-model:visible="previewVisible"
			:title="previewData.title"
			:summary="previewData.summary"
			:cover-image="previewData.cover_image"
			:tags="previewData.tags"
			:is-top="previewData.is_top"
			:content="previewData.content"
		/>
	</div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'
import { postCreateReq, postDelete, postInfoPut, postListGet } from '@/apis/blogApis.js'
import BlogEditorDialog from '@/views/blogSystem/components/BlogEditorDialog.vue'
import BlogPreviewDialog from '@/views/blogSystem/components/BlogPreviewDialog.vue'
import { formatDateTime, getContent, getRowId } from '@/views/blogSystem/blogHelpers.js'

const search = ref('')
const loading = ref(false)
const tableData = ref([])

const editorVisible = ref(false)
const editorMode = ref('create')
const editingId = ref('')
const submitting = ref(false)
const editorForm = reactive({
	title: '',
	summary: '',
	content: '',
	cover_image: '',
	tags: '',
	is_top: false,
})

const previewVisible = ref(false)
const previewData = reactive({
	title: '',
	summary: '',
	content: '',
	cover_image: '',
	tags: '',
	is_top: false,
})

const editorRules = {
	title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
}

const route = useRoute()

const isMyBlog = computed(() => {
	const myBlog = route.query.myBlog ?? route.query.myblog
	return String(myBlog || '') === '1'
})

const filterTableData = computed(() => {
	const keyword = search.value?.trim()?.toLowerCase()
	if (!keyword) return tableData.value
	return tableData.value.filter((row) => (row?.title || '').toLowerCase().includes(keyword))
})

const resetEditorForm = () => {
	editorForm.title = ''
	editorForm.summary = ''
	editorForm.content = ''
	editorForm.cover_image = ''
	editorForm.tags = ''
	editorForm.is_top = false
}

const fillEditorForm = (row = {}) => {
	editorForm.title = row?.title || ''
	editorForm.summary = row?.summary || row?.desc || row?.description || ''
	editorForm.content = getContent(row) || ''
	editorForm.cover_image = row?.cover_image || ''
	editorForm.tags = row?.tags || ''
	editorForm.is_top = Boolean(row?.is_top)
}

const getPostData = async () => {
	loading.value = true
	try {
		const rawUserInfo = localStorage.getItem('userInfo')
		const userId = rawUserInfo ? JSON.parse(rawUserInfo)?.user?.id : undefined
		const query = isMyBlog.value && userId ? { userId } : {}
		const { data } = await postListGet(query)
		tableData.value = Array.isArray(data?.data) ? data.data : []
	} catch (e) {
		console.error('获取文章列表失败', e)
		ElMessage.error('获取文章列表失败')
		tableData.value = []
	} finally {
		loading.value = false
	}
}

const openCreate = () => {
	editorMode.value = 'create'
	editingId.value = ''
	resetEditorForm()
	editorVisible.value = true
}

const openEdit = (row) => {
	const id = getRowId(row)
	if (!id) {
		ElMessage.warning('未找到文章 id')
		return
	}

	editorMode.value = 'edit'
	editingId.value = id
	fillEditorForm(row)
	editorVisible.value = true
}

const openPreview = (payload = {}) => {
	previewData.title = payload?.title || ''
	previewData.summary = payload?.summary || payload?.desc || payload?.description || ''
	previewData.content = getContent(payload) || payload?.content || ''
	previewData.cover_image = payload?.cover_image || ''
	previewData.tags = payload?.tags || ''
	previewData.is_top = Boolean(payload?.is_top)
	previewVisible.value = true
}

const handleEditorSubmit = async (formData) => {
	if (submitting.value) return
	submitting.value = true
	try {
		if (editorMode.value === 'create') {
			await postCreateReq({ ...formData })
			ElMessage.success('新增成功')
		} else {
			if (!editingId.value) {
				ElMessage.warning('未找到文章 id')
				return
			}
			await postInfoPut(editingId.value, { ...formData })
			ElMessage.success('保存成功')
		}
		editorVisible.value = false
		await getPostData()
	} catch (e) {
		console.error(editorMode.value === 'create' ? '新增失败' : '保存失败', e)
		ElMessage.error(editorMode.value === 'create' ? '新增失败' : '保存失败')
	} finally {
		submitting.value = false
	}
}

const handleDelete = async (row) => {
	const id = getRowId(row)
	if (!id) {
		ElMessage.warning('未找到文章 id')
		return
	}

	ElMessageBox.confirm('确定要删除这篇文章吗？')
		.then(async () => {
			await postDelete(id)
			ElMessage.success('删除成功')
			getPostData()
		})
		.catch(() => {})
}

getPostData()
</script>

<style lang="scss">
.BlogManage {
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 10px;

	.blog-main {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 15px;
	}

	.blog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 4px 6px 0;
		flex-wrap: wrap;
	}

	.header-search {
		flex: 0 0 auto;
	}

	.header-actions {
		margin-left: auto;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		flex-wrap: wrap;
	}

	.table-wrap {
		flex: 1;
		min-height: 0;
		padding: 8px 6px 0;
		display: flex;
		flex-direction: column;
	}

	:deep(.el-skeleton) {
		flex: 1;
		min-height: 0;
	}

	:deep(.el-empty) {
		height: 100%;
	}

	:deep(.el-input) {
		width: 280px;
		max-width: 100%;
	}

	:deep(.el-table) {
		border-radius: 18px;
		overflow: hidden;
	}

	:deep(.el-table__inner-wrapper::before) {
		display: none;
	}

	.post-title {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.post-content-cell {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
		word-break: break-word;
		line-height: 1.6;
		max-height: calc(1.6em * 2);
	}

	@media (max-width: 900px) {
		.header-search {
			width: 100%;
		}

		.header-actions {
			margin-left: 0;
			width: 100%;
			justify-content: flex-end;
		}

		:deep(.el-input) {
			width: 100%;
		}
	}
}
</style>
