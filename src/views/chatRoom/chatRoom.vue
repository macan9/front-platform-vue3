<template>
  <div class="chat-room-page home-view-page">
    <div class="chat-sidebar">
      <div class="sidebar-header">
        <div>
          <div class="sidebar-title">消息中心</div>
          <div class="sidebar-subtitle">实时聊天与历史消息</div>
        </div>
        <el-button type="primary" plain @click="startNewChat">新聊天</el-button>
      </div>

      <div class="connection-banner" :class="connectionStatusClass">
        <span class="status-wrap">
          <span class="status-dot"></span>
          <span>{{ connectionStatusText }}</span>
        </span>
      </div>

      <div class="contact-list">
        <button
          v-for="contact in contactList"
          :key="contact.id"
          class="contact-item"
          :class="{ active: String(activePeerId) === String(contact.id) }"
          @click="selectConversation(contact)"
        >
          <div class="contact-avatar custom-avatar">
            <img
              v-if="hasAvatar(contact)"
              :src="contact.avatarDisplayUrl"
              :alt="getDisplayName(contact)"
              class="avatar-image"
            >
            <span v-else>{{ getDisplayInitial(contact) }}</span>
          </div>

          <div class="contact-main">
            <div class="contact-name-row">
              <span class="contact-name">{{ getDisplayName(contact) }}</span>
              <span class="contact-time">{{ formatConversationTime(getConversationMeta(contact.id).latestTime) }}</span>
            </div>
            <div class="contact-preview-row">
              <span class="contact-preview">{{ getConversationMeta(contact.id).latestPreview || '点击开始聊天' }}</span>
              <span v-if="getConversationMeta(contact.id).unreadCount" class="contact-badge">{{ getConversationMeta(contact.id).unreadCount }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <div class="chat-main">
      <template v-if="activeConversation">
        <div class="chat-header">
          <div class="chat-user-summary">
            <div class="summary-avatar custom-avatar large-avatar">
              <img
                v-if="hasAvatar(activeConversation)"
                :src="activeConversation.avatarDisplayUrl"
                :alt="getDisplayName(activeConversation)"
                class="avatar-image"
              >
              <span v-else>{{ getDisplayInitial(activeConversation) }}</span>
            </div>
            <div>
              <div class="chat-title">{{ getDisplayName(activeConversation) }}</div>
              <div class="chat-subtitle">
                <span>用户 ID: {{ activeConversation.id }}</span>
                <span v-if="activeConversation.username">用户名: {{ activeConversation.username }}</span>
              </div>
            </div>
          </div>
          <el-button text @click="refreshConversation(activeConversation?.id)">刷新消息</el-button>
        </div>

        <div ref="messageListRef" class="message-list">
          <div v-if="isConversationLoading" class="message-empty">消息加载中...</div>
          <template v-else-if="activeMessages.length">
            <div
              v-for="message in activeMessages"
              :key="message.localKey"
              class="message-row"
              :class="{ mine: message.isMine }"
            >
              <div
                v-if="!message.isMine"
                class="message-avatar custom-avatar small-avatar"
              >
                <img
                  v-if="hasAvatar(activeConversation)"
                  :src="activeConversation.avatarDisplayUrl"
                  :alt="getDisplayName(activeConversation)"
                  class="avatar-image"
                >
                <span v-else>{{ getDisplayInitial(activeConversation) }}</span>
              </div>

              <div class="message-bubble">
                <div class="message-content">{{ message.content }}</div>
                <div class="message-meta">
                  <span>{{ formatMessageTime(message.createdAt) }}</span>
                  <span v-if="message.isMine">{{ getMessageStatusText(message) }}</span>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="message-empty">还没有消息，开始打个招呼吧。</div>
        </div>

        <div class="input-panel">
          <el-input
            v-model="draftMessage"
            type="textarea"
            :rows="4"
            resize="none"
            placeholder="输入消息，按 Ctrl/Cmd + Enter 发送"
            @keydown="handleEditorKeydown"
          />
          <div class="input-actions">
            <span class="input-hint">支持 websocket 实时发送、送达回执和已读回执</span>
            <el-button type="primary" :loading="isSending" @click="sendCurrentMessage">发送</el-button>
          </div>
        </div>
      </template>

      <div v-else class="chat-placeholder">
        <div class="placeholder-title">选择一位联系人开始聊天</div>
        <div class="placeholder-subtitle">左侧会显示联系人、最新消息和未读数量。</div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { userInfoGet, userListGet } from '@/apis/userApis'
import {
  getConversationMessagesApi,
  getUnreadMessagesApi,
  markMessagesReadApi,
} from '@/apis/messageRoutes'
import { isApiSuccess } from '@/common/requests/requests'
import wsService from '@/services/wsService'
import { globals_config } from '/public/config/globals_config'

const normalizeAvatarUrl = (url) => {
  const u = String(url || '').trim()
  if (!u) return ''
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:') || u.startsWith('blob:')) {
    return u
  }

  const base = String(globals_config?.host_service || '').replace(/\/+$/, '')
  if (!base) return u
  if (u.startsWith('/')) return `${base}${u}`
  return `${base}/${u}`
}

const buildAvatarDisplayUrl = (url) => {
  const normalized = normalizeAvatarUrl(url)
  if (!normalized) return ''
  return normalized
}

const getMessageId = (message) => {
  return message?.id ?? message?.message_id ?? message?.messageId ?? message?.mid ?? ''
}

const getClientTempId = (message) => {
  return message?.client_temp_id ?? message?.clientTempId ?? ''
}

const getUserId = (value) => {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric : 0
}

const pickUserSnapshot = (source = {}) => {
  return {
    id: getUserId(source?.id),
    username: String(source?.username || ''),
    nickname: String(source?.nickname || ''),
    avatar: normalizeAvatarUrl(source?.avatar || source?.avatarUrl || source?.avatar_url || ''),
    avatarDisplayUrl: buildAvatarDisplayUrl(source?.avatar || source?.avatarUrl || source?.avatar_url || ''),
  }
}

const normalizeMessage = (message, currentUserId) => {
  const item = message || {}
  const sender = item.sender || item.from_user_info || item.fromUserInfo || item.from_user_profile || {}
  const receiver = item.receiver || item.to_user_info || item.toUserInfo || item.to_user_profile || {}

  const id = getMessageId(item)
  const fromUserId = getUserId(
    item.from_user ??
    item.fromUser ??
    item.sender_id ??
    item.senderId ??
    item.user_id ??
    sender?.id
  )
  const toUserId = getUserId(
    item.to_user ??
    item.toUser ??
    item.receiver_id ??
    item.receiverId ??
    item.target_user_id ??
    receiver?.id
  )
  const createdAt =
    item.created_at ||
    item.createdAt ||
    item.sent_at ||
    item.updated_at ||
    item.timestamp ||
    new Date().toISOString()
  const content = String(item.content ?? item.message ?? item.text ?? '')
  const localKey = String(id || getClientTempId(item) || `${fromUserId}-${toUserId}-${createdAt}-${content}`)
  const readAt = item.read_at || item.readAt || ''
  const status = String(item.status || '')
  const isMine = Number(currentUserId || 0) === fromUserId
  const isRead = Boolean((item.is_read ?? item.read ?? readAt) || status === 'read')

  return {
    raw: item,
    id,
    localKey,
    clientTempId: getClientTempId(item),
    fromUserId,
    toUserId,
    content,
    createdAt,
    readAt,
    isMine,
    isRead,
    status,
    fromUser: pickUserSnapshot(sender),
    toUser: pickUserSnapshot(receiver),
  }
}

const extractMessageArray = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.rows)) return payload.rows
  if (Array.isArray(payload?.messages)) return payload.messages
  if (Array.isArray(payload?.list)) return payload.list
  return []
}

const buildConversationMap = (messages, currentUserId) => {
  const map = new Map()
  ;(Array.isArray(messages) ? messages : []).forEach((item) => {
    const message = normalizeMessage(item, currentUserId)
    const peerId = message.isMine ? message.toUserId : message.fromUserId
    if (!peerId) return

    if (!map.has(peerId)) {
      map.set(peerId, {
        latestTime: '',
        latestPreview: '',
        unreadCount: 0,
      })
    }

    const state = map.get(peerId)
    const messageTime = new Date(message.createdAt).getTime()
    const stateTime = new Date(state.latestTime || 0).getTime()
    if (!state.latestTime || messageTime >= stateTime) {
      state.latestTime = message.createdAt
      state.latestPreview = message.content
    }
    if (!message.isMine && !message.isRead) {
      state.unreadCount += 1
    }
  })
  return map
}

const normalizeDeliveryReceipt = (payload = {}) => {
  return {
    messageId: getMessageId(payload),
    clientTempId: getClientTempId(payload),
    fromUserId: getUserId(payload?.from_user),
    toUserId: getUserId(payload?.to_user),
    content: String(payload?.content || ''),
    createdAt: payload?.created_at || new Date().toISOString(),
    deliveredAt: payload?.delivered_at || new Date().toISOString(),
    status: String(payload?.status || 'delivered'),
  }
}

const normalizeMessageRead = (payload = {}) => {
  return {
    messageId: getMessageId(payload),
    fromUserId: getUserId(payload?.from_user),
    toUserId: getUserId(payload?.to_user),
    status: String(payload?.status || 'read'),
    readAt: payload?.read_at || new Date().toISOString(),
  }
}

const normalizeAuthSuccess = (payload = {}) => {
  return {
    userId: getUserId(payload?.user_id),
    username: String(payload?.username || ''),
  }
}

export default {
  name: 'ChatRoom',
  setup() {
    const messageListRef = ref(null)
    const draftMessage = ref('')
    const isSending = ref(false)
    const isConversationLoading = ref(false)
    const connectionStatus = ref('disconnected')
    const currentUser = ref({})
    const contacts = ref([])
    const conversationState = ref({})
    const messagesByPeer = ref({})
    const pendingMessagesByPeer = ref({})
    const activePeerId = ref('')
    const contactDetailLoading = new Set()
    const conversationLoadingPeerId = ref('')
    let unsubscribeWs = null

    const currentUserId = computed(() => getUserId(currentUser.value?.id))

    const decorateContact = (contact = {}) => {
      const avatar = normalizeAvatarUrl(contact?.avatar || contact?.avatarUrl || contact?.avatar_url || '')
      return {
        ...contact,
        id: getUserId(contact?.id),
        username: String(contact?.username || ''),
        nickname: String(contact?.nickname || ''),
        avatar,
        avatarDisplayUrl: buildAvatarDisplayUrl(avatar),
      }
    }

    const mergeContactRecord = (current = {}, patch = {}) => {
      const currentDecorated = decorateContact(current)
      const patchDecorated = decorateContact(patch)

      const nextUsername = String(patchDecorated.username || '').trim() || currentDecorated.username || ''
      const nextNickname = String(patchDecorated.nickname || '').trim() || currentDecorated.nickname || ''
      const nextAvatar = String(patchDecorated.avatar || '').trim() || currentDecorated.avatar || ''

      return {
        ...currentDecorated,
        ...patchDecorated,
        id: getUserId(patchDecorated.id || currentDecorated.id),
        username: nextUsername,
        nickname: nextNickname,
        avatar: nextAvatar,
        avatarDisplayUrl: buildAvatarDisplayUrl(nextAvatar),
      }
    }

    const getDisplayName = (user) => {
      if (!user) return ''
      return String(user.nickname || user.username || `用户 ${user.id || ''}`)
    }

    const getDisplayInitial = (user) => {
      const displayName = getDisplayName(user).trim()
      return displayName ? displayName.slice(0, 1).toUpperCase() : 'U'
    }

    const hasAvatar = (user) => {
      return Boolean(String(user?.avatarDisplayUrl || user?.avatar || '').trim())
    }

    const activeConversation = computed(() => {
      return contacts.value.find((item) => String(item.id) === String(activePeerId.value)) || null
    })

    const activeMessages = computed(() => {
      const key = String(activePeerId.value || '')
      const confirmed = messagesByPeer.value[key] || []
      const pending = pendingMessagesByPeer.value[key] || []
      const merged = [...confirmed]

      pending.forEach((pendingItem) => {
        const exists = merged.some((confirmedItem) => {
          const sameId = pendingItem.id && confirmedItem.id && String(pendingItem.id) === String(confirmedItem.id)
          const sameTempId = pendingItem.clientTempId && confirmedItem.clientTempId && String(pendingItem.clientTempId) === String(confirmedItem.clientTempId)
          return sameId || sameTempId
        })

        if (!exists) {
          merged.push(pendingItem)
        }
      })

      return merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    })

    const contactList = computed(() => {
      return [...contacts.value].sort((a, b) => {
        const aState = conversationState.value[String(a.id)] || {}
        const bState = conversationState.value[String(b.id)] || {}
        const aTime = new Date(aState.latestTime || 0).getTime()
        const bTime = new Date(bState.latestTime || 0).getTime()
        return bTime - aTime
      })
    })

    const getConversationMeta = (peerId) => {
      const state = conversationState.value[String(peerId)] || {}
      return {
        latestTime: state.latestTime || '',
        latestPreview: state.latestPreview || '',
        unreadCount: Number(state.unreadCount || 0),
      }
    }

    const connectionStatusText = computed(() => {
      const map = {
        connected: 'WebSocket 已连接',
        connecting: 'WebSocket 连接中',
        disconnected: 'WebSocket 未连接',
      }
      return map[connectionStatus.value] || 'WebSocket 状态未知'
    })

    const connectionStatusClass = computed(() => ({
      connected: connectionStatus.value === 'connected',
      connecting: connectionStatus.value === 'connecting',
      disconnected: connectionStatus.value === 'disconnected',
    }))

    const scrollToBottom = async () => {
      await nextTick()
      const el = messageListRef.value
      if (!el) return
      el.scrollTop = el.scrollHeight
    }

    const readLocalUser = () => {
      try {
        const info = JSON.parse(localStorage.getItem('userInfo') || '{}')
        currentUser.value = decorateContact(info?.user || {})
      } catch {
        currentUser.value = {}
      }
    }

    const mergeConversationState = (patchMap) => {
      const next = { ...conversationState.value }
      patchMap.forEach((value, key) => {
        next[String(key)] = {
          ...(next[String(key)] || {}),
          ...value,
        }
      })
      conversationState.value = next
    }

    const ensureContactDetail = async (userId) => {
      const numericId = getUserId(userId)
      if (!numericId || numericId === currentUserId.value || contactDetailLoading.has(numericId)) return

      const existed = contacts.value.find((item) => Number(item?.id || 0) === numericId)
      if (existed?.nickname && existed?.avatar) return

      contactDetailLoading.add(numericId)
      try {
        const res = await userInfoGet(numericId)
        if (!isApiSuccess(res)) return
        upsertContact(numericId, decorateContact(res?.data || {}))
      } catch (error) {
        console.error('ensureContactDetail failed', error)
      } finally {
        contactDetailLoading.delete(numericId)
      }
    }

    const upsertContact = (userId, patch = {}) => {
      const numericId = getUserId(userId)
      if (!numericId || numericId === currentUserId.value) return

      const nextList = [...contacts.value]
      const index = nextList.findIndex((item) => Number(item?.id || 0) === numericId)
      if (index > -1) {
        nextList.splice(index, 1, mergeContactRecord(nextList[index], {
          ...(patch || {}),
          id: numericId,
        }))
      } else {
        nextList.push(mergeContactRecord({}, {
          ...(patch || {}),
          id: numericId,
        }))
      }
      contacts.value = nextList
    }

    const hydrateContactsFromMessage = (message) => {
      const peerId = message.isMine ? message.toUserId : message.fromUserId
      const peerUser = message.isMine ? message.toUser : message.fromUser
      upsertContact(peerId, peerUser)
      ensureContactDetail(peerId)
    }

    const setMessagesForPeer = (peerId, messages) => {
      messagesByPeer.value = {
        ...messagesByPeer.value,
        [String(peerId)]: [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
      }
    }

    const setPendingMessagesForPeer = (peerId, messages) => {
      pendingMessagesByPeer.value = {
        ...pendingMessagesByPeer.value,
        [String(peerId)]: [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
      }
    }

    const upsertPendingMessage = (peerId, message) => {
      const key = String(peerId)
      const currentMessages = [...(pendingMessagesByPeer.value[key] || [])]
      const existedIndex = currentMessages.findIndex((item) => {
        if (message.id && item.id) return String(item.id) === String(message.id)
        if (message.clientTempId && item.clientTempId) return String(item.clientTempId) === String(message.clientTempId)
        return false
      })

      if (existedIndex > -1) {
        currentMessages.splice(existedIndex, 1, {
          ...currentMessages[existedIndex],
          ...message,
        })
      } else {
        currentMessages.push(message)
      }

      setPendingMessagesForPeer(key, currentMessages)
    }

    const removePendingMessage = (peerId, matcher) => {
      const key = String(peerId)
      const nextMessages = (pendingMessagesByPeer.value[key] || []).filter((item) => !matcher(item))
      setPendingMessagesForPeer(key, nextMessages)
    }

    const mergeServerMessagesWithLocal = (peerId, serverMessages = []) => {
      const key = String(peerId || '')
      const normalizedServerMessages = Array.isArray(serverMessages) ? serverMessages : []
      const pendingLocalMessages = pendingMessagesByPeer.value[key] || []

      const merged = [...normalizedServerMessages]
      pendingLocalMessages.forEach((localItem) => {
        const exists = merged.some((serverItem) => {
          const sameId = localItem.id && serverItem.id && String(localItem.id) === String(serverItem.id)
          const sameTempId = localItem.clientTempId && serverItem.clientTempId && String(localItem.clientTempId) === String(serverItem.clientTempId)
          return sameId || sameTempId
        })

        if (!exists) {
          merged.push(localItem)
        }
      })

      return merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    }

    const markConversationAsRead = async (peerId, messageIds = []) => {
      const uniqueIds = [...new Set((Array.isArray(messageIds) ? messageIds : []).filter(Boolean))]
      if (!uniqueIds.length) return

      await markMessagesReadApi({ message_ids: uniqueIds })
      uniqueIds.forEach((id) => {
        wsService.sendReadAck(id)
      })

      const key = String(peerId)
      const nextMessages = (messagesByPeer.value[key] || []).map((item) => {
        if (!uniqueIds.includes(item.id)) return item
        return {
          ...item,
          isRead: true,
          readAt: item.readAt || new Date().toISOString(),
          status: item.status === 'delivered' ? 'read' : item.status || 'read',
        }
      })
      setMessagesForPeer(key, nextMessages)
      conversationState.value = {
        ...conversationState.value,
        [key]: {
          ...(conversationState.value[key] || {}),
          unreadCount: 0,
        },
      }
    }

    const upsertMessage = (incoming) => {
      const message = normalizeMessage(incoming, currentUserId.value)
      const peerId = message.isMine ? message.toUserId : message.fromUserId
      if (!peerId) return

      hydrateContactsFromMessage(message)

      const key = String(peerId)
      removePendingMessage(key, (item) => {
        const sameId = message.id && item.id && String(item.id) === String(message.id)
        const sameTempId = message.clientTempId && item.clientTempId && String(item.clientTempId) === String(message.clientTempId)
        return sameId || sameTempId
      })
      const currentMessages = [...(messagesByPeer.value[key] || [])]
      const existedIndex = currentMessages.findIndex((item) => {
        if (message.id && item.id) return String(item.id) === String(message.id)
        if (message.clientTempId && item.clientTempId) return String(item.clientTempId) === String(message.clientTempId)
        return false
      })

      if (existedIndex > -1) {
        currentMessages.splice(existedIndex, 1, {
          ...currentMessages[existedIndex],
          ...message,
          status: message.status || currentMessages[existedIndex].status,
          isRead: message.isRead || currentMessages[existedIndex].isRead,
        })
      } else {
        currentMessages.push(message)
      }

      setMessagesForPeer(key, currentMessages)

      const currentState = conversationState.value[key] || {}
      conversationState.value = {
        ...conversationState.value,
        [key]: {
          ...currentState,
          latestTime: message.createdAt,
          latestPreview: message.content,
          unreadCount: !message.isMine && !message.isRead && String(activePeerId.value) !== key
            ? Number(currentState.unreadCount || 0) + 1
            : Number(currentState.unreadCount || 0),
        },
      }

      if (String(activePeerId.value) === key) {
        scrollToBottom()
        if (!message.isMine && message.id) {
          markConversationAsRead(key, [message.id])
        }
      }
    }

    const refreshContacts = async () => {
      const res = await userListGet()
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      contacts.value = list
        .map((item) => decorateContact(item))
        .filter((item) => item.id && item.id !== currentUserId.value)
    }

    const refreshUnreadState = async () => {
      const res = await getUnreadMessagesApi()
      if (!isApiSuccess(res)) return
      const unreadList = extractMessageArray(res.payload)
      for (const item of unreadList) {
        const message = normalizeMessage(item, currentUserId.value)
        await hydrateContactsFromMessage(message)
      }
      mergeConversationState(buildConversationMap(unreadList, currentUserId.value))
    }

    const refreshConversation = async (peerIdArg = '') => {
      const peerId = String(peerIdArg || activePeerId.value || '')
      if (!peerId) return
      if (String(conversationLoadingPeerId.value) === peerId) return

      conversationLoadingPeerId.value = peerId
      isConversationLoading.value = true
      try {
        const res = await getConversationMessagesApi(peerId)
        if (!isApiSuccess(res)) return

        const list = extractMessageArray(res.payload).map((item) => normalizeMessage(item, currentUserId.value))
        list.forEach((item) => {
          const peerUser = item.isMine ? item.toUser : item.fromUser
          upsertContact(item.isMine ? item.toUserId : item.fromUserId, peerUser)
        })

        const mergedList = mergeServerMessagesWithLocal(peerId, list)
        setMessagesForPeer(peerId, mergedList)

        const latest = mergedList[mergedList.length - 1]
        conversationState.value = {
          ...conversationState.value,
          [peerId]: {
            ...(conversationState.value[peerId] || {}),
            latestTime: latest?.createdAt || conversationState.value[peerId]?.latestTime || '',
            latestPreview: latest?.content || conversationState.value[peerId]?.latestPreview || '',
            unreadCount: 0,
          },
        }

        const unreadIds = list.filter((item) => !item.isMine && !item.isRead && item.id).map((item) => item.id)
        if (unreadIds.length) {
          await markConversationAsRead(peerId, unreadIds)
        }
        await ensureContactDetail(peerId)
        await scrollToBottom()
      } finally {
        isConversationLoading.value = false
        conversationLoadingPeerId.value = ''
      }
    }

    const selectConversation = async (contact) => {
      const nextPeerId = String(contact?.id || '')
      if (!nextPeerId) return
      if (nextPeerId === String(activePeerId.value)) {
        return
      }

      activePeerId.value = nextPeerId
      await refreshConversation(nextPeerId)
    }

    const startNewChat = async () => {
      if (!contactList.value.length) {
        await refreshContacts()
      }
      if (contactList.value.length) {
        await selectConversation(contactList.value[0])
      }
    }

    const applyDeliveryReceipt = (payload) => {
      const receipt = normalizeDeliveryReceipt(payload)
      const peerId = getUserId(receipt.toUserId)
      const candidatePeerIds = peerId ? [String(peerId)] : Object.keys(messagesByPeer.value)

      candidatePeerIds.forEach((peerId) => {
        removePendingMessage(peerId, (item) => {
          const sameId = receipt.messageId && String(item.id) === String(receipt.messageId)
          const sameTempId = receipt.clientTempId && String(item.clientTempId) === String(receipt.clientTempId)
          return sameId || sameTempId
        })
        const nextMessages = (messagesByPeer.value[peerId] || []).map((item) => {
          const sameId = receipt.messageId && String(item.id) === String(receipt.messageId)
          const sameTempId = receipt.clientTempId && String(item.clientTempId) === String(receipt.clientTempId)
          if (!sameId && !sameTempId) return item
          return {
            ...item,
            id: receipt.messageId || item.id,
            clientTempId: receipt.clientTempId || item.clientTempId,
            status: receipt.status,
            createdAt: receipt.createdAt || item.createdAt,
            deliveredAt: receipt.deliveredAt,
            content: receipt.content || item.content,
          }
        })
        setMessagesForPeer(peerId, nextMessages)
      })
    }

    const applyMessageRead = (payload) => {
      const readInfo = normalizeMessageRead(payload)
      const peerId = getUserId(readInfo.toUserId)
      const candidatePeerIds = peerId ? [String(peerId)] : Object.keys(messagesByPeer.value)

      candidatePeerIds.forEach((peerId) => {
        const nextMessages = (messagesByPeer.value[peerId] || []).map((item) => {
          if (String(item.id) !== String(readInfo.messageId)) return item
          return {
            ...item,
            isRead: true,
            readAt: readInfo.readAt,
            status: readInfo.status || 'read',
          }
        })
        setMessagesForPeer(peerId, nextMessages)
      })
    }

    const handleWsEvent = async (event) => {
      const eventType = String(event?.type || '')
      const data = event?.data

      if (eventType === 'socket_open') {
        connectionStatus.value = 'connected'
        return
      }

      if (eventType === 'socket_close' || eventType === 'socket_error') {
        connectionStatus.value = 'disconnected'
        return
      }

      if (eventType === 'auth_success') {
        const authInfo = normalizeAuthSuccess(data)
        connectionStatus.value = 'connected'
        currentUser.value = decorateContact({
          ...currentUser.value,
          id: authInfo.userId || currentUser.value?.id,
          username: authInfo.username || currentUser.value?.username,
        })
        return
      }

      if (eventType === 'error') {
        console.error('ws business error', data)
        const message = String(event?.message || data?.message || '')
        if (message) {
          ElMessage.error(message)
        }
        return
      }

      if (eventType === 'message') {
        upsertMessage(data)
        return
      }

      if (eventType === 'unread_messages') {
        const list = Array.isArray(data) ? data : []
        if (!list.length) return
        for (const item of list) {
          upsertMessage(item)
        }
        return
      }

      if (eventType === 'delivery_receipt') {
        applyDeliveryReceipt(data)
        return
      }

      if (eventType === 'message_read') {
        applyMessageRead(data)
      }
    }

    const connectWebsocket = () => {
      let token = ''
      try {
        const info = JSON.parse(localStorage.getItem('userInfo') || '{}')
        token = info?.token || ''
      } catch {
        token = ''
      }

      if (!token) return

      connectionStatus.value = 'connecting'
      unsubscribeWs = wsService.subscribe(handleWsEvent)
      wsService.connect(token)
    }

    const sendCurrentMessage = async () => {
      const peerId = getUserId(activePeerId.value)
      const content = String(draftMessage.value || '').trim()
      if (!peerId) {
        ElMessage.warning('请先选择联系人')
        return
      }
      if (!content) {
        ElMessage.warning('请输入消息内容')
        return
      }

      const clientTempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
      const optimisticMessage = normalizeMessage({
        client_temp_id: clientTempId,
        from_user: currentUserId.value,
        to_user: peerId,
        content,
        created_at: new Date().toISOString(),
        status: 'sending',
        sender: currentUser.value,
        receiver: activeConversation.value,
      }, currentUserId.value)

      upsertPendingMessage(peerId, optimisticMessage)
      const currentState = conversationState.value[String(peerId)] || {}
      conversationState.value = {
        ...conversationState.value,
        [String(peerId)]: {
          ...currentState,
          latestTime: optimisticMessage.createdAt,
          latestPreview: optimisticMessage.content,
          unreadCount: Number(currentState.unreadCount || 0),
        },
      }
      draftMessage.value = ''
      isSending.value = true

      const sent = wsService.sendMessage({
        to_user: peerId,
        content,
        client_temp_id: clientTempId,
      })

      if (!sent) {
        const key = String(peerId)
        const nextMessages = (pendingMessagesByPeer.value[key] || []).map((item) => {
          if (item.clientTempId !== clientTempId) return item
          return { ...item, status: 'failed' }
        })
        setPendingMessagesForPeer(key, nextMessages)
        ElMessage.error('WebSocket 未连接，消息发送失败')
      }

      isSending.value = false
      scrollToBottom()
    }

    const handleEditorKeydown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        sendCurrentMessage()
      }
    }

    const formatConversationTime = (value) => {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    const formatMessageTime = (value) => {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    const getMessageStatusText = (message) => {
      if (message.status === 'failed') return '发送失败'
      if (message.isRead || message.status === 'read') return '已读'
      if (message.status === 'delivered') return '已送达'
      if (message.status === 'sending') return '发送中'
      return '已发送'
    }

    onMounted(async () => {
      readLocalUser()
      await refreshContacts()
      await refreshUnreadState()
      connectWebsocket()

      if (contactList.value.length) {
        const preferredByUnread = contactList.value.find((item) => getConversationMeta(item.id).unreadCount > 0)
        const preferred = preferredByUnread || contactList.value[0]
        if (preferred) {
          await selectConversation(preferred)
        }
      }
    })

    onBeforeUnmount(() => {
      if (typeof unsubscribeWs === 'function') {
        unsubscribeWs()
      }
      wsService.close()
    })

    return {
      messageListRef,
      draftMessage,
      isSending,
      isConversationLoading,
      connectionStatusText,
      connectionStatusClass,
      contactList,
      activePeerId,
      activeConversation,
      activeMessages,
      getDisplayName,
      getDisplayInitial,
      hasAvatar,
      getConversationMeta,
      startNewChat,
      selectConversation,
      refreshConversation,
      sendCurrentMessage,
      handleEditorKeydown,
      formatConversationTime,
      formatMessageTime,
      getMessageStatusText,
    }
  },
}
</script>

<style lang="scss" scoped>
.chat-room-page {
  display: flex;
  height: 100%;
  min-height: 0;
  background:
    radial-gradient(circle at top left, rgba(132, 198, 255, 0.18), transparent 30%),
    linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(240, 246, 252, 0.98));
}

.chat-sidebar {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 22px 18px;
  border-right: 1px solid rgba(212, 223, 235, 0.9);
  background: rgba(250, 253, 255, 0.88);
  backdrop-filter: blur(10px);
}

.sidebar-header,
.chat-header,
.input-actions,
.contact-name-row,
.contact-preview-row,
.connection-banner,
.status-wrap,
.chat-user-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-title,
.chat-title,
.placeholder-title {
  font-size: 20px;
  font-weight: 700;
  color: #24384d;
}

.sidebar-subtitle,
.chat-subtitle,
.placeholder-subtitle,
.input-hint {
  margin-top: 4px;
  font-size: 13px;
  color: #7d92a7;
}

.connection-banner {
  margin-top: 18px;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 13px;
  background: rgba(228, 236, 245, 0.75);
  color: #4d6074;
}

.connection-banner.connected {
  background: rgba(216, 243, 229, 0.9);
  color: #146a40;
}

.connection-banner.connecting {
  background: rgba(255, 241, 214, 0.95);
  color: #9b6608;
}

.status-wrap {
  justify-content: flex-start;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
}

.contact-list {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.contact-item {
  width: 100%;
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 14px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 10px 24px rgba(110, 141, 171, 0.08);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.contact-item:hover,
.contact-item.active {
  transform: translateY(-1px);
  background: linear-gradient(135deg, rgba(223, 239, 255, 0.95), rgba(242, 248, 255, 0.95));
  box-shadow: 0 14px 30px rgba(105, 148, 194, 0.14);
}

.contact-avatar,
.summary-avatar,
.message-avatar {
  flex-shrink: 0;
  background: linear-gradient(135deg, #8cc4ff, #6baeff);
  color: #fff;
  font-weight: 700;
}

.custom-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
}

.contact-avatar {
  width: 46px;
  height: 46px;
}

.large-avatar {
  width: 52px;
  height: 52px;
}

.small-avatar {
  width: 36px;
  height: 36px;
}

.avatar-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.contact-main {
  flex: 1;
  min-width: 0;
}

.contact-name {
  font-size: 15px;
  font-weight: 600;
  color: #2b4157;
}

.contact-time,
.contact-preview {
  font-size: 12px;
  color: #7990a8;
}

.contact-preview-row {
  margin-top: 8px;
  gap: 10px;
}

.contact-preview {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-badge {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  line-height: 22px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #ff7a59, #ff5c82);
}

.chat-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 24px 28px 20px;
  border-bottom: 1px solid rgba(214, 224, 235, 0.9);
  background: rgba(255, 255, 255, 0.6);
}

.chat-user-summary {
  justify-content: flex-start;
  gap: 14px;
}

.chat-subtitle {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 28px;
  background:
    radial-gradient(circle at center, rgba(236, 244, 252, 0.65), transparent 55%),
    linear-gradient(180deg, rgba(247, 250, 253, 0.96), rgba(241, 246, 251, 0.96));
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-bubble {
  max-width: min(70%, 560px);
  padding: 14px 16px;
  border-radius: 18px 18px 18px 6px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(110, 141, 171, 0.08);
}

.message-row.mine .message-bubble {
  border-radius: 18px 18px 6px 18px;
  background: linear-gradient(135deg, #7fb8ff, #63a5ff);
  color: #fff;
}

.message-content {
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-meta {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  font-size: 12px;
  opacity: 0.72;
}

.input-panel {
  padding: 18px 28px 24px;
  border-top: 1px solid rgba(214, 224, 235, 0.9);
  background: rgba(250, 252, 255, 0.92);
}

.input-actions {
  margin-top: 14px;
}

.message-empty,
.chat-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #7990a8;
}

@media (max-width: 960px) {
  .chat-room-page {
    flex-direction: column;
  }

  .chat-sidebar {
    width: 100%;
    border-right: 0;
    border-bottom: 1px solid rgba(212, 223, 235, 0.9);
  }

  .contact-list {
    max-height: 260px;
  }

  .message-bubble {
    max-width: 85%;
  }
}
</style>
