import api from '@/common/requests/axiosInstance.js'

const DEFAULT_ERROR_MESSAGE = '请求失败'

const isHttpSuccessStatus = (status) => {
  const numericStatus = Number(status)
  if (Number.isNaN(numericStatus)) return false
  return numericStatus === 304 || (numericStatus >= 200 && numericStatus < 300)
}

const normalizeResponse = (res) => {
  const payload = res?.data

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return {
      ...payload,
      __httpStatus: res?.status,
      __httpStatusText: res?.statusText,
    }
  }

  return {
    data: payload,
    __httpStatus: res?.status,
    __httpStatusText: res?.statusText,
  }
}

const buildErrorMessage = (error) => {
  return String(
    error?.response?.data?.message ||
    error?.message ||
    DEFAULT_ERROR_MESSAGE
  )
}

const buildFallback = (url, error) => {
  const u = String(url || '')

  if (u.startsWith('/gitee')) {
    return []
  }

  return {
    data: null,
    message: buildErrorMessage(error),
    __httpStatus: error?.response?.status ?? null,
    __httpStatusText: error?.response?.statusText || '',
    error: {
      status: error?.response?.status,
    },
  }
}

export const isApiSuccess = (response) => {
  return isHttpSuccessStatus(response?.__httpStatus)
}

export const ensureApiSuccess = (response, fallbackMessage = DEFAULT_ERROR_MESSAGE) => {
  if (isApiSuccess(response)) return response
  throw new Error(response?.message || fallbackMessage)
}

export const postApi = async (url, data) => {
  try {
    const res = await api.post(url, data)
    return normalizeResponse(res)
  } catch (error) {
    console.error(error)
    return buildFallback(url, error)
  }
}

export const getApi = async (url) => {
  try {
    const res = await api.get(url)
    return normalizeResponse(res)
  } catch (error) {
    console.error(error)
    return buildFallback(url, error)
  }
}

export const delApi = async (url) => {
  try {
    const res = await api.delete(url)
    return normalizeResponse(res)
  } catch (error) {
    console.error(error)
    return buildFallback(url, error)
  }
}

export const putApi = async (url, data) => {
  try {
    const res = await api.put(url, data)
    return normalizeResponse(res)
  } catch (error) {
    console.error(error)
    return buildFallback(url, error)
  }
}
