export const coverFieldList = [
	'cover',
	'coverUrl',
	'cover_url',
	'image',
	'imageUrl',
	'image_url',
	'img',
	'imgUrl',
	'img_url',
	'thumbnail',
	'thumb',
	'banner',
]

export const summaryFieldList = [
	'summary',
	'desc',
	'description',
	'introduction',
	'intro',
	'content',
	'markdown',
	'md',
]

export const contentFieldList = [
	'content',
	'markdown',
	'md',
]

export const authorFieldList = [
	'author_name',
	'authorName',
	'author',
	'user_name',
	'username',
	'nickname',
	'nickName',
]

export const thumbnailCoverList = Array.from(
	{ length: 10 },
	(_, index) => `/img/blogThumbnails/cover-${String(index + 1).padStart(2, '0')}.svg`
)

export const detailCoverList = Array.from(
	{ length: 10 },
	(_, index) => `/img/blogCovers/banner-${String(index + 1).padStart(2, '0')}.svg`
)

export const getRowId = (row, index = 0) => {
	return row?.id ?? row?._id ?? row?.postId ?? row?.post_id ?? `${row?.title || 'blog'}-${index}`
}

export const pickField = (row, fieldList) => {
	for (const field of fieldList) {
		const value = row?.[field]
		if (typeof value === 'string' && value.trim()) {
			return value.trim()
		}
	}
	return ''
}

export const stripMarkdown = (value = '') => {
	return String(value)
		.replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
		.replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
		.replace(/[`>#*_~-]/g, ' ')
		.replace(/\n+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

export const getRandomCover = (coverList) => {
	const randomIndex = Math.floor(Math.random() * coverList.length)
	return coverList[randomIndex]
}

export const getCover = (row) => {
	return pickField(row, coverFieldList) || row?.fallbackCover || ''
}

export const getSummary = (row) => {
	const rawText = pickField(row, summaryFieldList)
	const text = stripMarkdown(rawText)
	if (!text) return '这篇博客暂时还没有简介内容。'
	return text.length > 120 ? `${text.slice(0, 120)}...` : text
}

export const getAuthor = (row) => {
	return pickField(row, authorFieldList) || '匿名作者'
}

export const getContent = (row) => {
	return pickField(row, contentFieldList)
}

export const formatDate = (val) => {
	if (!val) return ''
	const date = new Date(val)
	if (Number.isNaN(date.getTime())) return String(val)
	const yyyy = date.getFullYear()
	const mm = String(date.getMonth() + 1).padStart(2, '0')
	const dd = String(date.getDate()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd}`
}

export const formatDateTime = (val) => {
	if (!val) return ''
	const date = new Date(val)
	if (Number.isNaN(date.getTime())) return String(val)
	const yyyy = date.getFullYear()
	const mm = String(date.getMonth() + 1).padStart(2, '0')
	const dd = String(date.getDate()).padStart(2, '0')
	const hh = String(date.getHours()).padStart(2, '0')
	const mi = String(date.getMinutes()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}
