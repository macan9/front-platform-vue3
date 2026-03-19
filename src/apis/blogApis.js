import { postApi, getApi, delApi, putApi } from '@/common/requests/requests.js'

const BASE_URL = '/api/posts'

// 文章列表查询（支持可选查询参数）
export const postListGet = async (params = null) => {
	if (!params || Object.keys(params).length === 0) {
		return await getApi(`${BASE_URL}`)
	}
	let url_string = '?'
	Object.keys(params).map(k => {
		url_string += k + '=' + params[k] + '&'
	})
	url_string = url_string.slice(0, -1)
	return await getApi(`${BASE_URL}/${url_string}`)
}

// 文章详情查询
export const postInfoGet = async () => {
	return await getApi(`${BASE_URL}`)
}

export const postSingleInfoGet = async (id) => {
	return await getApi(`${BASE_URL}/single/${id}`)
}

// 新增文章
export const postCreateReq = async (data) => {
	return await postApi(`${BASE_URL}`, data)
}

// 修改文章
export const postInfoPut = async (id, data) => {
	return await putApi(`${BASE_URL}/${id}`, data)
}

// 删除文章
export const postDelete = async (id) => {
	return await delApi(`${BASE_URL}/${id}`)
}

