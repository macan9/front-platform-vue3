<template>
	<div class="home-view-page BlogManage">
		<div class="home-view-title">
			<div class="page-title">博客列表</div>
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
						<el-table-column label="标题" prop="title" min-width="240">
							<template #default="scope">
								<div class="post-title" :title="scope.row.title || '-'">
									{{ scope.row.title || '-' }}
								</div>
							</template>
						</el-table-column>
						<el-table-column label="作者" prop="author" width="160">
							<template #default="scope">
								{{ scope.row.author_name || '-' }}
							</template>
						</el-table-column>
						<el-table-column label="创建时间" prop="created_at" width="200">
							<template #default="scope">
								{{ formatTime(scope.row.updated_at) }}
							</template>
						</el-table-column>
						<el-table-column label="摘要" prop="summary" min-width="220" show-overflow-tooltip>
							<template #default="scope">
								{{ scope.row.summary || '-' }}
							</template>
						</el-table-column>
						<el-table-column label="内容" prop="content" min-width="280" show-overflow-tooltip>
							<template #default="scope">
								{{ scope.row.content || '-' }}
							</template>
						</el-table-column>
						<el-table-column align="right" width="180">
							<template #default="scope">
								<el-button size="small" @click="openEdit(scope.row)">编辑</el-button>
								<el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
							</template>
						</el-table-column>
					</el-table>
				</template>
			</el-skeleton>
			</div>
		</div>

		<el-dialog v-model="createDialogVisible" title="新增博客" width="640px">
			<el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="80px">
				<el-form-item label="标题" prop="title">
					<el-input v-model="createForm.title" placeholder="请输入标题" />
				</el-form-item>
				<el-form-item label="摘要" prop="summary">
					<el-input v-model="createForm.summary" placeholder="可选" />
				</el-form-item>
				<el-form-item label="内容" prop="content">
					<el-input v-model="createForm.content" type="textarea" :rows="10" placeholder="请输入内容（支持 Markdown）" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="createDialogVisible = false">取消</el-button>
				<el-button type="primary" :loading="creating" @click="submitCreate()">提交</el-button>
			</template>
		</el-dialog>

		<el-dialog v-model="editDialogVisible" title="编辑博客" width="640px">
			<el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="80px">
				<el-form-item label="标题" prop="title">
					<el-input v-model="editForm.title" placeholder="请输入标题" />
				</el-form-item>
				<el-form-item label="摘要" prop="summary">
					<el-input v-model="editForm.summary" placeholder="可选" />
				</el-form-item>
				<el-form-item label="内容" prop="content">
					<el-input v-model="editForm.content" type="textarea" :rows="10" placeholder="请输入内容（支持 Markdown）" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="editDialogVisible = false">取消</el-button>
				<el-button type="primary" :loading="editing" @click="submitEdit()">保存</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { postCreateReq, postDelete, postInfoPut, postListGet } from '@/apis/blogApis.js'
import { useRoute } from 'vue-router';

const search = ref('')
const loading = ref(false)
const tableData = ref([])

const createDialogVisible = ref(false)
const creating = ref(false)
const createFormRef = ref()
const createForm = reactive({
	title: '',
	summary: '',
	content: '',
})
const createRules = {
	title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
}

const editDialogVisible = ref(false)
const editing = ref(false)
const editId = ref('')
const editFormRef = ref()
const editForm = reactive({
	title: '',
	summary: '',
	content: '',
})
const editRules = {
	title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
}

const filterTableData = computed(() => {
	const keyword = search.value?.trim()?.toLowerCase()
	if (!keyword) return tableData.value
	return tableData.value.filter((row) => (row?.title || '').toLowerCase().includes(keyword))
})

const getRowId = (row) => row?.id ?? row?._id ?? row?.postId ?? row?.post_id ?? ''

const formatTime = (val) => {
	if (!val) return '-'
	const d = new Date(val)
	if (Number.isNaN(d.getTime())) return String(val)
	const yyyy = d.getFullYear()
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const dd = String(d.getDate()).padStart(2, '0')
	const hh = String(d.getHours()).padStart(2, '0')
	const mi = String(d.getMinutes()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

// 判断路由参数 myBlog 是否为 '1'
const route = useRoute()
const isMyBlog = computed(() => {
	const myBlog = route.query.myBlog ?? route.query.myblog
	return String(myBlog || '') === '1'
})
console.log('isMyBlog', isMyBlog.value)

const getPostData = async () => {
	loading.value = true
	try {
		const userInfo = localStorage.getItem('userInfo');
		const userId = JSON.parse(userInfo)?.user?.id
		const query = isMyBlog.value ? { userId } : {}
		const { data } = await postListGet(query)
		tableData.value = Array.isArray(data.data) ? data.data : []
		
	} catch (e) {
		console.error('获取文章列表失败', e)
		ElMessage.error('获取文章列表失败')
		tableData.value = []
	} finally {
		loading.value = false
	}
}

const openCreate = () => {
	createDialogVisible.value = true
	createForm.title = ''
	createForm.summary = ''
	createForm.content = ''
	createFormRef.value?.clearValidate?.()
}

const submitCreate = async () => {
	if (creating.value) return
	const ok = await createFormRef.value?.validate?.().catch(() => false)
	if (!ok) return
	creating.value = true
	try {
		await postCreateReq({ ...createForm })
		ElMessage.success('新增成功')
		createDialogVisible.value = false
		getPostData()
	} catch (e) {
		ElMessage.error('新增失败')
	} finally {
		creating.value = false
	}
}

const openEdit = (row) => {
	const id = getRowId(row)
	if (!id) {
		ElMessage.warning('未找到文章 id')
		return
	}
	editId.value = id
	editDialogVisible.value = true
	editForm.title = row?.title || ''
	editForm.summary = row?.summary || row?.desc || row?.description || ''
	editForm.content = row?.content || row?.markdown || row?.md || ''
	editFormRef.value?.clearValidate?.()
}

const submitEdit = async () => {
	if (editing.value) return
	const ok = await editFormRef.value?.validate?.().catch(() => false)
	if (!ok) return
	if (!editId.value) {
		ElMessage.warning('未找到文章 id')
		return
	}
	editing.value = true
	try {
		await postInfoPut(editId.value, { ...editForm })
		ElMessage.success('保存成功')
		editDialogVisible.value = false
		getPostData()
	} catch (e) {
		ElMessage.error('保存失败')
	} finally {
		editing.value = false
	}
}

const handleDelete = async (row) => {
	const id = getRowId(row)
	if (!id) {
		ElMessage.warning('未找到文章 id')
		return
	}
	ElMessageBox.confirm('确定要删除该文章吗？')
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
.BlogManage{
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 10px;

	.blog-main{
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 15px;
	}

	.blog-header{
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

	.post-title{
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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
