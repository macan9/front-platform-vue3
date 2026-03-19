<template>
	<div class="home-view-page image-bed-page">
		<div class="home-view-title">
			<span class="page-title">{{ currentDirName }}</span>
			<div class="title-tools">
				<el-button v-if="currentPath" plain @click="goParentDirectory">返回上级</el-button>
				<el-button plain @click="loadDirectory(currentPath)">刷新</el-button>
			</div>
		</div>

		<div class="image-bed-content">
			<div class="path-bar">
				<span class="path-label">当前路径</span>
				<span class="path-value">{{ displayPath }}</span>
			</div>

			<el-upload class="upload-panel" drag multiple action="#" :show-file-list="false"
				:before-upload="beforeUpload" :http-request="handleUpload">
				<el-icon class="upload-icon">
					<UploadFilled />
				</el-icon>
				<div class="el-upload__text">拖拽图片到这里，或点击上传</div>
				<template #tip>
					<div class="el-upload__tip">支持 JPG、PNG、WEBP、GIF，单文件不超过 10MB</div>
				</template>
			</el-upload>

			<div v-loading="loading" class="content-list">
				<div v-for="item in contentList" :key="item.path || item.relativePath || item.name" class="content-card"
					@click="handleItemClick(item)">
					<div class="thumb-wrap">
						<template v-if="item.type === 'dir'">
							<el-icon class="folder-icon">
								<FolderOpened />
							</el-icon>
						</template>
						<template v-else-if="isImageFile(item)">
							<el-image class="image-thumb" :src="getItemPreviewUrl(item)" fit="cover"
								@click.stop="previewImage(item)" />
						</template>
						<template v-else>
							<el-icon class="file-icon">
								<Document />
							</el-icon>
						</template>
					</div>

					<div class="item-info">
						<div class="item-name" :title="item.name">{{ item.name }}</div>
						<div class="item-meta">{{ item.type === 'dir' ? '文件夹' : '文件' }}</div>
					</div>

					<div class="item-actions">
						<el-button v-if="item.type !== 'dir' && isImageFile(item)" link type="primary"
							@click.stop="previewImage(item)">
							预览
						</el-button>
						<el-button v-if="item.type !== 'dir'" link type="primary" @click.stop="downloadFile(item)">
							下载
						</el-button>
						<el-button link type="danger" @click.stop="handleDelete(item)">删除</el-button>
					</div>
				</div>

				<el-empty v-if="!loading && !contentList.length" description="当前目录暂无内容" />
			</div>
		</div>

			<el-image-viewer v-if="previewVisible" :url-list="previewList" teleported @close="closePreview" />
	</div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElImageViewer, ElMessage, ElMessageBox } from 'element-plus'
import { Document, FolderOpened, UploadFilled } from '@element-plus/icons-vue'
import { deleteGiteeContent, getGiteeContents, uploadGiteeFile } from '@/apis/giteeApis'

const loading = ref(false)
const currentPath = ref('')
const contentList = ref([])
const previewVisible = ref(false)
const previewUrl = ref('')
const previewList = computed(() => (previewUrl.value ? [previewUrl.value] : []))

const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']

const getStoredConfig = () => {
	const configString = localStorage.getItem('giteeConfig')
	if (!configString) {
		return null
	}
	try {
		return JSON.parse(configString)
	} catch (error) {
		return null
	}
}

const currentDirName = computed(() => {
	if (currentPath.value) {
		const pathParts = currentPath.value.split('/').filter(Boolean)
		return pathParts[pathParts.length - 1]
	}
	const config = getStoredConfig()
	const basePath = config?.basePath || config?.path || ''
	if (!basePath) {
		return '根目录'
	}
	const pathParts = basePath.split('/').filter(Boolean)
	return pathParts[pathParts.length - 1] || '根目录'
})

const displayPath = computed(() => {
	const config = getStoredConfig()
	const basePath = config?.basePath || config?.path || ''
	const fullPath = [basePath, currentPath.value].filter(Boolean).join('/')
	return fullPath || '/'
})

const normalizeList = (response) => {
	if (Array.isArray(response)) {
		return response
	}
	if (Array.isArray(response?.items)) {
		return response.items
	}
	if (Array.isArray(response?.data)) {
		return response.data
	}
	if (Array.isArray(response?.data?.data)) {
		return response.data.data
	}
	if (Array.isArray(response?.data?.items)) {
		return response.data.items
	}
	if (Array.isArray(response?.contents)) {
		return response.contents
	}
	return []
}

const shouldDisplayItem = (item) => {
	if (!item?.name) {
		return false
	}
	return !item.name.toLowerCase().endsWith('.md')
}

const sortList = (list) => {
	return [...list].sort((prev, next) => {
		if (prev.type === next.type) {
			return prev.name.localeCompare(next.name)
		}
		return prev.type === 'dir' ? -1 : 1
	})
}

const getFolderPath = (item) => {
	return item.relativePath || item.path || [currentPath.value, item.name].filter(Boolean).join('/')
}

const loadDirectory = async (path = '') => {
	loading.value = true
	const result = await getGiteeContents(path)
	loading.value = false

	const list = normalizeList(result).filter(shouldDisplayItem)
	currentPath.value = path
	contentList.value = sortList(list)
}

const goParentDirectory = () => {
	const pathParts = currentPath.value.split('/').filter(Boolean)
	pathParts.pop()
	loadDirectory(pathParts.join('/'))
}

const getFileExtension = (item) => {
	const fileName = item.name || ''
	return fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : ''
}

const isImageFile = (item) => {
	return item.type !== 'dir' && imageExtensions.includes(getFileExtension(item))
}

const getItemPreviewUrl = (item) => {
	return item.downloadUrl || item.download_url || item.url || item.html_url || ''
}

const previewImage = (item) => {
	previewUrl.value = getItemPreviewUrl(item)
	previewVisible.value = true
}

const closePreview = () => {
	previewVisible.value = false
	previewUrl.value = ''
}

const triggerDownload = (downloadUrl, fileName) => {
	const link = document.createElement('a')
	link.href = downloadUrl
	link.download = fileName || 'download'
	link.rel = 'noopener'
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}

const openFile = (item) => {
	const targetUrl = getItemPreviewUrl(item)
	if (!targetUrl) {
		ElMessage.warning('当前文件没有可访问地址')
		return
	}
	window.open(targetUrl, '_blank')
}

const downloadFile = async (item) => {
	const targetUrl = getItemPreviewUrl(item)
	if (!targetUrl) {
		ElMessage.warning('当前文件没有可下载地址')
		return
	}

	try {
		const response = await fetch(targetUrl)
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`)
		}

		const blob = await response.blob()
		const blobUrl = URL.createObjectURL(blob)
		triggerDownload(blobUrl, item.name)
		window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
	} catch (error) {
		ElMessage.warning('直接下载失败，已为您打开文件链接')
		openFile(item)
	}
}

const handleDelete = async (item) => {
	const targetPath = getFolderPath(item)
	if (!targetPath) {
		ElMessage.warning('缺少可删除的路径')
		return
	}

	try {
		if (item.type === 'dir') {
			await ElMessageBox.confirm(`确认删除文件夹“${item.name}”及其内容吗？`, '删除确认', {
				type: 'warning',
				confirmButtonText: '删除',
				cancelButtonText: '取消',
			})
		}

		const result = await deleteGiteeContent(targetPath)
		if (result?.code === -1) {
			throw new Error(result.message || '删除失败')
		}

		ElMessage.success(`${item.name} 删除成功`)
		await loadDirectory(currentPath.value)
	} catch (error) {
		if (error === 'cancel' || error === 'close' || error?.message === 'cancel') {
			return
		}
		ElMessage.error(error?.message || '删除失败')
	}
}

const handleItemClick = (item) => {
	if (item.type === 'dir') {
		loadDirectory(getFolderPath(item))
		return
	}

	if (isImageFile(item)) {
		previewImage(item)
		return
	}

	downloadFile(item)
}

const beforeUpload = (rawFile) => {
	const isImage = rawFile.type.startsWith('image/')
	const isLt10M = rawFile.size / 1024 / 1024 < 10

	if (!isImage) {
		ElMessage.error('只能上传图片文件')
		return false
	}
	if (!isLt10M) {
		ElMessage.error('图片大小不能超过 10MB')
		return false
	}
	return true
}

const fileToBase64 = (file) => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.readAsBinaryString(file)
		reader.onload = () => {
			resolve(btoa(reader.result))
		}
		reader.onerror = reject
	})
}

const handleUpload = async (options) => {
	const rawFile = options.file

	try {
		const base64Content = await fileToBase64(rawFile)
		const result = await uploadGiteeFile(base64Content, rawFile.name, currentPath.value)

		if (result?.code === -1) {
			throw new Error(result.message || '上传失败')
		}

		ElMessage.success(`${rawFile.name} 上传成功`)
		await loadDirectory(currentPath.value)
		options.onSuccess?.(result)
	} catch (error) {
		ElMessage.error(error?.message || '上传失败')
		options.onError?.(error)
	}
}

loadDirectory('')
</script>

<style lang="scss">
.image-bed-page {
	display: flex;
	flex-direction: column;

	.home-view-title {
		justify-content: space-between;
		padding-right: 20px;
	}

	.title-tools {
		display: flex;
		gap: 12px;
	}

	.image-bed-content {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 20px 24px 24px;
		background: rgba(255, 255, 255, 0.96);
	}

	.path-bar {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 22px;
		color: #5f7085;
	}

	.path-label {
		font-size: 13px;
		color: #7f91a7;
	}

	.path-value {
		font-size: 14px;
		color: #314255;
		word-break: break-all;
	}

	.upload-panel {
		padding: 0 50px 15px;
		border-bottom: 1px solid gainsboro;

		.el-upload {
			width: 100%;
		}

		.el-upload-dragger {
			width: 100%;
			border-radius: 18px;
			border: 1px dashed #9cc7f2;
			background: linear-gradient(180deg, rgba(240, 248, 255, 0.95), rgba(249, 252, 255, 0.96));
		}
	}

	.upload-icon {
		margin-bottom: 12px;
		font-size: 30px;
		color: #5da8ff;
	}

	.content-list {
		flex: 1;
		min-height: 0;
		overflow: auto;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 16px;
		align-content: start;
	}

	.content-card {
		margin-top: 10px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 14px;
		border: 1px solid rgba(210, 224, 236, 0.95);
		border-radius: 18px;
		background: #fff;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

		&:hover {
			transform: translateY(-2px);
			border-color: #8fc2f5;
			box-shadow: 0 14px 30px rgba(111, 144, 176, 0.14);
		}
	}

	.thumb-wrap {
		height: 150px;
		border-radius: 14px;
		background: linear-gradient(180deg, #f5f9fd 0%, #eef4fa 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.folder-icon,
	.file-icon {
		font-size: 54px;
		color: #7aa7d9;
	}

	.image-thumb {
		width: 100%;
		height: 100%;
	}

	.item-info {
		min-width: 0;
		display: flex;
	}

	.item-name {
		flex: 3;
		font-size: 15px;
		font-weight: 600;
		color: #314255;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-meta {
		flex: 1;
		font-size: 12px;
		color: #8092a7;
		text-align: right;
	}

	.item-actions {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.preview-image {
		display: block;
		width: 100%;
	}
}
</style>
