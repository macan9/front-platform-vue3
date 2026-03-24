import { getApi, postApi } from '@/common/requests/requests.js'

const unwrapPayload = (res) => {
  if (res?.data !== undefined) return res.data
  return res
}

export const postMessageApi = async (data) => {
  const res = await postApi('/api/messages', data)
  return {
    ...res,
    payload: unwrapPayload(res),
  }
}

export const getUnreadMessagesApi = async () => {
  const res = await getApi('/api/messages/unread')
  return {
    ...res,
    payload: unwrapPayload(res),
  }
}

export const getConversationMessagesApi = async (peerUserId) => {
  const res = await getApi(`/api/messages/conversation/${peerUserId}`)
  return {
    ...res,
    payload: unwrapPayload(res),
  }
}

export const markMessagesReadApi = async (data) => {
  const res = await postApi('/api/messages/read', data)
  return {
    ...res,
    payload: unwrapPayload(res),
  }
}
