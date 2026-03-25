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

    <el-dialog
      v-model="newChatDialogVisible"
      title="新聊天"
      width="420px"
      append-to-body
      class="new-chat-dialog-wrap"
    >
      <div class="new-chat-dialog">
        <div
          v-for="user in selectableUsers"
          :key="user.id"
          class="new-chat-user"
        >
          <div class="new-chat-user-left">
            <div class="contact-avatar custom-avatar">
              <img
                v-if="hasAvatar(user)"
                :src="user.avatarDisplayUrl"
                :alt="getDisplayName(user)"
                class="avatar-image"
              >
              <span v-else>{{ getDisplayInitial(user) }}</span>
            </div>
            <div class="new-chat-user-main">
              <div class="new-chat-user-name">{{ getDisplayName(user) }}</div>
              <div v-if="user.username" class="new-chat-user-sub">{{ user.username }}</div>
            </div>
          </div>
          <el-button type="primary" plain round size="small" @click="chooseNewChatUser(user)">发起聊天</el-button>
        </div>

        <div v-if="!selectableUsers.length" class="new-chat-empty">
          没有可添加的用户
        </div>
      </div>
    </el-dialog>

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

              <div class="message-main">
                <div class="message-bubble">
                  <div class="message-content">{{ message.content }}</div>
                </div>
                <div class="message-meta outside">
                  <span>{{ formatMessageTime(message.createdAt) }}</span>
                  <span v-if="message.isMine">{{ getMessageStatusText(message) }}</span>
                </div>
              </div>

              <div
                v-if="message.isMine"
                class="message-avatar custom-avatar small-avatar"
              >
                <img
                  v-if="hasAvatar(currentUser)"
                  :src="currentUser.avatarDisplayUrl"
                  :alt="getDisplayName(currentUser)"
                  class="avatar-image"
                >
                <span v-else>{{ getDisplayInitial(currentUser) }}</span>
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

const normalizeMessageSent = (payload = {}) => {
  return {
    messageId: getMessageId(payload),
    clientTempId: getClientTempId(payload),
    fromUserId: getUserId(payload?.from_user),
    toUserId: getUserId(payload?.to_user),
    content: String(payload?.content || ''),
    createdAt: payload?.created_at || new Date().toISOString(),
    deliveredAt: payload?.delivered_at || '',
    readAt: payload?.read_at || '',
    status: String(payload?.status || 'pending'),
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
    const newChatDialogVisible = ref(false)
    const connectionStatus = ref('disconnected')
    const currentUser = ref({})
    const allUsers = ref([])
    const contacts = ref([])
    const conversationState = ref({})
    const messagesByPeer = ref({})
    const pendingMessagesByPeer = ref({})
    const activePeerId = ref('')
    const contactDetailLoading = new Set()
    const conversationLoadingPeerId = ref('')
    let unsubscribeWs = null

    const currentUserId = computed(() => getUserId(currentUser.value?.id))
    const chatListStorageKey = computed(() => `chatRoomChatList:${currentUserId.value || 'guest'}`)

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
        const aTime = new Date(a.latestTime || 0).getTime()
        const bTime = new Date(b.latestTime || 0).getTime()
        return bTime - aTime
      })
    })

    const selectableUsers = computed(() => {
      const selectedIds = new Set(contacts.value.map((item) => getUserId(item.id)))
      return allUsers.value
        .filter((item) => item.id && item.id !== currentUserId.value)
        .filter((item) => !selectedIds.has(getUserId(item.id)))
        .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b), 'zh-Hans-CN'))
    })

    const getConversationMeta = (peerId) => {
      const contact = contacts.value.find((item) => String(item.id) === String(peerId)) || {}
      const state = conversationState.value[String(peerId)] || {}
      return {
        latestTime: state.latestTime || contact.latestTime || '',
        latestPreview: state.latestPreview || contact.latestPreview || '',
        unreadCount: Number(state.unreadCount || contact.unreadCount || 0),
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

    const saveChatListToLocal = () => {
      try {
        const payload = contacts.value.map((item) => ({
          id: getUserId(item.id),
          username: String(item.username || ''),
          nickname: String(item.nickname || ''),
          avatar: String(item.avatar || ''),
          latestTime: String(item.latestTime || ''),
          latestPreview: String(item.latestPreview || ''),
          unreadCount: Number(item.unreadCount || 0),
        }))
        localStorage.setItem(chatListStorageKey.value, JSON.stringify(payload))
      } catch (error) {
        console.error('saveChatListToLocal failed', error)
      }
    }

    const loadChatListFromLocal = () => {
      try {
        const raw = localStorage.getItem(chatListStorageKey.value)
        const parsed = JSON.parse(raw || '[]')
        contacts.value = (Array.isArray(parsed) ? parsed : [])
          .map((item) => decorateContact(item))
          .filter((item) => item.id && item.id !== currentUserId.value)
      } catch (error) {
        contacts.value = []
        console.error('loadChatListFromLocal failed', error)
      }
    }

    const syncContactConversationMeta = (peerId, patch = {}) => {
      const numericId = getUserId(peerId)
      if (!numericId) return

      const nextList = [...contacts.value]
      const index = nextList.findIndex((item) => getUserId(item?.id) === numericId)
      if (index === -1) return

      nextList.splice(index, 1, {
        ...nextList[index],
        latestTime: patch.latestTime ?? nextList[index].latestTime ?? '',
        latestPreview: patch.latestPreview ?? nextList[index].latestPreview ?? '',
        unreadCount: Number(patch.unreadCount ?? nextList[index].unreadCount ?? 0),
      })

      contacts.value = nextList
      saveChatListToLocal()
    }

    const syncCurrentUserFromStorage = () => {
      try {
        const info = JSON.parse(localStorage.getItem('userInfo') || '{}')
        currentUser.value = mergeContactRecord(currentUser.value, info?.user || {})
      } catch {
        // keep current in-memory user when storage is unavailable
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
      saveChatListToLocal()
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
      syncContactConversationMeta(key, { unreadCount: 0 })
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
      syncContactConversationMeta(key, {
        latestTime: message.createdAt,
        latestPreview: message.content,
        unreadCount: !message.isMine && !message.isRead && String(activePeerId.value) !== key
          ? Number(currentState.unreadCount || 0) + 1
          : Number(currentState.unreadCount || 0),
      })

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
      allUsers.value = list
        .map((item) => decorateContact(item))
        .filter((item) => item.id && item.id !== currentUserId.value)
      contacts.value = contacts.value.map((item) => {
        const matched = allUsers.value.find((user) => getUserId(user.id) === getUserId(item.id))
        return matched ? mergeContactRecord(item, matched) : item
      })

      saveChatListToLocal()
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
        syncContactConversationMeta(peerId, {
          latestTime: latest?.createdAt || '',
          latestPreview: latest?.content || '',
          unreadCount: 0,
        })

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
      if (!allUsers.value.length) {
        await refreshContacts()
      }
      newChatDialogVisible.value = true
    }

    const chooseNewChatUser = async (user) => {
      upsertContact(user?.id, user || {})
      newChatDialogVisible.value = false
      await selectConversation(user)
    }

    const applyDeliveryReceipt = (payload) => {
      const receipt = normalizeDeliveryReceipt(payload)
      const peerId = getUserId(receipt.toUserId)
      const candidatePeerIds = peerId ? [String(peerId)] : Object.keys(messagesByPeer.value)

      console.log('delivery_receipt payload', JSON.parse(JSON.stringify(payload || {})))
      console.log('delivery_receipt normalized', JSON.parse(JSON.stringify(receipt || {})))
      console.log('delivery_receipt candidatePeerIds', JSON.parse(JSON.stringify(candidatePeerIds || [])))

      candidatePeerIds.forEach((peerId) => {
        const pendingMessages = pendingMessagesByPeer.value[peerId] || []
        console.log('pending before receipt', peerId, JSON.parse(JSON.stringify(pendingMessages)))
        console.log('confirmed before receipt', peerId, JSON.parse(JSON.stringify(messagesByPeer.value[peerId] || [])))
        const matchedPendingMessage = pendingMessages.find((item) => {
          const sameId = receipt.messageId && item.id && String(item.id) === String(receipt.messageId)
          const sameTempId = receipt.clientTempId && item.clientTempId && String(item.clientTempId) === String(receipt.clientTempId)
          const sameContent = String(item.content || '') === String(receipt.content || '')
          const samePeer = Number(item.toUserId || 0) === Number(receipt.toUserId || 0)
          const stillPending = String(item.status || '') === 'sending'
          return sameId || sameTempId || (sameContent && samePeer && stillPending)
        }) || null
        console.log('matched pending receipt', peerId, JSON.parse(JSON.stringify(matchedPendingMessage)))

        removePendingMessage(peerId, (item) => {
          if (!matchedPendingMessage) return false
          if (matchedPendingMessage.clientTempId && item.clientTempId) {
            return String(matchedPendingMessage.clientTempId) === String(item.clientTempId)
          }
          if (matchedPendingMessage.id && item.id) {
            return String(matchedPendingMessage.id) === String(item.id)
          }
          return (
            String(item.content || '') === String(matchedPendingMessage.content || '') &&
            Number(item.toUserId || 0) === Number(matchedPendingMessage.toUserId || 0) &&
            String(item.status || '') === String(matchedPendingMessage.status || '')
          )
        })

        let foundConfirmedMatch = false
        const nextMessages = (messagesByPeer.value[peerId] || []).map((item) => {
          const sameId = receipt.messageId && String(item.id) === String(receipt.messageId)
          const sameTempId = receipt.clientTempId && String(item.clientTempId) === String(receipt.clientTempId)
          if (!sameId && !sameTempId) return item
          foundConfirmedMatch = true
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

        if (!foundConfirmedMatch && matchedPendingMessage) {
          nextMessages.push({
            ...matchedPendingMessage,
            id: receipt.messageId || matchedPendingMessage.id,
            clientTempId: receipt.clientTempId || matchedPendingMessage.clientTempId,
            status: receipt.status,
            createdAt: receipt.createdAt || matchedPendingMessage.createdAt,
            deliveredAt: receipt.deliveredAt,
            content: receipt.content || matchedPendingMessage.content,
          })
        }

        setMessagesForPeer(peerId, nextMessages)
        console.log('confirmed after receipt', peerId, JSON.parse(JSON.stringify(nextMessages)))
        console.log('pending after receipt', peerId, JSON.parse(JSON.stringify(pendingMessagesByPeer.value[peerId] || [])))
      })
    }

    const applyMessageSent = (payload) => {
      const sentInfo = normalizeMessageSent(payload)
      const peerId = getUserId(sentInfo.toUserId)
      const candidatePeerIds = peerId ? [String(peerId)] : Object.keys(messagesByPeer.value)

      candidatePeerIds.forEach((peerId) => {
        const pendingMessages = pendingMessagesByPeer.value[peerId] || []
        const matchedPendingMessage = pendingMessages.find((item) => {
          const sameId = sentInfo.messageId && item.id && String(item.id) === String(sentInfo.messageId)
          const sameTempId = sentInfo.clientTempId && item.clientTempId && String(item.clientTempId) === String(sentInfo.clientTempId)
          const sameContent = String(item.content || '') === String(sentInfo.content || '')
          const samePeer = Number(item.toUserId || 0) === Number(sentInfo.toUserId || 0)
          return sameId || sameTempId || (sameContent && samePeer)
        }) || null

        removePendingMessage(peerId, (item) => {
          if (!matchedPendingMessage) return false
          if (matchedPendingMessage.clientTempId && item.clientTempId) {
            return String(matchedPendingMessage.clientTempId) === String(item.clientTempId)
          }
          if (matchedPendingMessage.id && item.id) {
            return String(matchedPendingMessage.id) === String(item.id)
          }
          return (
            String(item.content || '') === String(matchedPendingMessage.content || '') &&
            Number(item.toUserId || 0) === Number(matchedPendingMessage.toUserId || 0)
          )
        })

        let foundConfirmedMatch = false
        const nextMessages = (messagesByPeer.value[peerId] || []).map((item) => {
          const sameId = sentInfo.messageId && String(item.id) === String(sentInfo.messageId)
          const sameTempId = sentInfo.clientTempId && String(item.clientTempId) === String(sentInfo.clientTempId)
          if (!sameId && !sameTempId) return item
          foundConfirmedMatch = true
          return {
            ...item,
            id: sentInfo.messageId || item.id,
            clientTempId: sentInfo.clientTempId || item.clientTempId,
            status: sentInfo.status,
            createdAt: sentInfo.createdAt || item.createdAt,
            deliveredAt: sentInfo.deliveredAt || item.deliveredAt,
            readAt: sentInfo.readAt || item.readAt,
            content: sentInfo.content || item.content,
          }
        })

        if (!foundConfirmedMatch && matchedPendingMessage) {
          nextMessages.push({
            ...matchedPendingMessage,
            id: sentInfo.messageId || matchedPendingMessage.id,
            clientTempId: sentInfo.clientTempId || matchedPendingMessage.clientTempId,
            status: sentInfo.status,
            createdAt: sentInfo.createdAt || matchedPendingMessage.createdAt,
            deliveredAt: sentInfo.deliveredAt || matchedPendingMessage.deliveredAt,
            readAt: sentInfo.readAt || matchedPendingMessage.readAt,
            content: sentInfo.content || matchedPendingMessage.content,
          })
        }

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
      console.log('ws event received', eventType, JSON.parse(JSON.stringify(event || {})))

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
        currentUser.value = mergeContactRecord(currentUser.value, {
          ...currentUser.value,
          id: authInfo.userId || currentUser.value?.id,
          username: authInfo.username || currentUser.value?.username,
        })
        syncCurrentUserFromStorage()
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

      if (eventType === 'message_sent') {
        applyMessageSent(data)
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

      console.log('send message input', JSON.parse(JSON.stringify({
        peerId,
        content,
        clientTempId,
        activePeerId: activePeerId.value,
        currentUserId: currentUserId.value,
      })))
      console.log('optimistic message', JSON.parse(JSON.stringify(optimisticMessage)))

      upsertPendingMessage(peerId, optimisticMessage)
      console.log('pending after send', peerId, JSON.parse(JSON.stringify(pendingMessagesByPeer.value[String(peerId)] || [])))
      console.log('confirmed after send', peerId, JSON.parse(JSON.stringify(messagesByPeer.value[String(peerId)] || [])))
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
      syncContactConversationMeta(peerId, {
        latestTime: optimisticMessage.createdAt,
        latestPreview: optimisticMessage.content,
        unreadCount: Number(currentState.unreadCount || 0),
      })
      draftMessage.value = ''
      isSending.value = true

      nextTick(() => {
        console.log('active after send render', peerId, JSON.parse(JSON.stringify(activeMessages.value || [])))
      })

      const sent = wsService.sendMessage({
        to_user: peerId,
        content,
        client_temp_id: clientTempId,
      })
      console.log('ws send result', JSON.parse(JSON.stringify({ peerId, clientTempId, sent })))

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
      if (message.status === 'pending') return '已发送'
      if (message.status === 'sending') return '发送中'
      return '已发送'
    }

    onMounted(async () => {
      readLocalUser()
      syncCurrentUserFromStorage()
      loadChatListFromLocal()
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
      currentUser,
      newChatDialogVisible,
      contactList,
      selectableUsers,
      activePeerId,
      activeConversation,
      activeMessages,
      getDisplayName,
      getDisplayInitial,
      hasAvatar,
      getConversationMeta,
      startNewChat,
      chooseNewChatUser,
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
    radial-gradient(circle at top left, rgba(160, 207, 255, 0.18), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #f2f6fb 100%);
}

.chat-sidebar {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 22px 18px;
  border-right: 1px solid rgba(212, 223, 235, 0.9);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(242, 247, 252, 0.96));
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
  scrollbar-width: thin;
  scrollbar-color: rgba(138, 153, 168, 0.45) transparent;
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

.new-chat-dialog {
  max-height: 420px;
  overflow-y: auto;
  padding: 4px 2px;
}

.new-chat-user {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(219, 229, 238, 0.86);
  transition: background-color 0.18s ease;
}

.new-chat-user:hover {
  background: rgba(247, 251, 255, 0.96);
}

.new-chat-user + .new-chat-user {
  margin-top: 10px;
}

.new-chat-user-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.new-chat-user-main {
  min-width: 0;
}

.new-chat-user-name {
  font-size: 14px;
  font-weight: 600;
  color: #2b4157;
}

.new-chat-user-sub {
  margin-top: 3px;
  font-size: 12px;
  color: #7f93a6;
}

.new-chat-empty {
  padding: 24px 0;
  text-align: center;
  color: #7f93a6;
}

:deep(.new-chat-dialog-wrap .el-dialog) {
  border-radius: 22px;
  overflow: hidden;
}

:deep(.new-chat-dialog-wrap .el-dialog__body) {
  display: flex;
  justify-content: center;
  padding-top: 14px;
  padding-bottom: 18px;
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
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(245, 249, 253, 0.92));
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
    radial-gradient(circle at center top, rgba(223, 238, 252, 0.38), transparent 45%),
    linear-gradient(180deg, rgba(247, 250, 253, 0.96), rgba(241, 246, 251, 0.96));
  scrollbar-width: thin;
  scrollbar-color: rgba(138, 153, 168, 0.5) transparent;
}

.contact-list::-webkit-scrollbar,
.message-list::-webkit-scrollbar {
  width: 8px;
}

.contact-list::-webkit-scrollbar-button,
.message-list::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
  background: transparent;
}

.contact-list::-webkit-scrollbar-button:single-button,
.message-list::-webkit-scrollbar-button:single-button,
.contact-list::-webkit-scrollbar-button:double-button,
.message-list::-webkit-scrollbar-button:double-button,
.contact-list::-webkit-scrollbar-button:start,
.message-list::-webkit-scrollbar-button:start,
.contact-list::-webkit-scrollbar-button:end,
.message-list::-webkit-scrollbar-button:end,
.contact-list::-webkit-scrollbar-button:vertical:start:decrement,
.message-list::-webkit-scrollbar-button:vertical:start:decrement,
.contact-list::-webkit-scrollbar-button:vertical:end:increment,
.message-list::-webkit-scrollbar-button:vertical:end:increment {
  display: none;
  width: 0;
  height: 0;
  background: transparent;
}

.contact-list::-webkit-scrollbar-track,
.message-list::-webkit-scrollbar-track {
  background: transparent;
}

.contact-list::-webkit-scrollbar-thumb,
.message-list::-webkit-scrollbar-thumb {
  background: rgba(138, 153, 168, 0.38);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.contact-list::-webkit-scrollbar-thumb:hover,
.message-list::-webkit-scrollbar-thumb:hover {
  background: rgba(110, 125, 141, 0.55);
  border: 2px solid transparent;
  background-clip: padding-box;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 0 1 auto;
  min-width: 0;
  max-width: min(74%, 560px);
  margin: 0 5px;
}

.message-row.mine .message-main {
  align-items: flex-end;
}

.message-bubble {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  box-sizing: border-box;
  position: relative;
  min-height: 36px;
  padding: 8px 12px;
  background: #ffffff;
  border: 0;
  box-shadow: none;
}

.message-row:not(.mine) .message-bubble {
  border-radius: 6px 6px 6px 6px;
}

.message-row:not(.mine) .message-bubble::before {
  content: "";
  position: absolute;
  top: 13px;
  left: -5px;
  width: 10px;
  height: 10px;
  background: #ffffff;
  transform: rotate(45deg);
}

.message-row.mine .message-bubble {
  border-radius: 6px 6px 6px 6px;
  background: #95ec69;
  color: #22303a;
}

.message-row.mine .message-bubble::before {
  content: "";
  position: absolute;
  top: 13px;
  right: -5px;
  width: 10px;
  height: 10px;
  background: #95ec69;
  transform: rotate(45deg);
}

.message-content {
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
}

.message-meta {
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #8a99a8;
  line-height: 1;
  white-space: nowrap;
}

.message-meta.outside {
  padding: 0 2px;
}

.message-row.mine .message-meta {
  justify-content: flex-end;
}

.message-avatar {
  margin-top: 0;
}

.input-panel {
  position: relative;
  padding: 18px 28px 24px;
  border-top: 1px solid rgba(214, 224, 235, 0.9);
  background: linear-gradient(180deg, rgba(250, 252, 255, 0.96), rgba(243, 248, 252, 0.94));
}

.input-actions {
  position: absolute;
  right: 42px;
  bottom: 38px;
  margin-top: 0;
  z-index: 2;
  justify-content: flex-end;
  pointer-events: none;
}

.input-actions .el-button {
  pointer-events: auto;
  border-radius: 999px;
  padding-inline: 18px;
  box-shadow: 0 8px 20px rgba(86, 149, 226, 0.22);
}

.input-hint {
  display: none;
}

.input-panel :deep(.el-textarea__inner) {
  padding: 14px 108px 14px 14px;
  border-radius: 18px;
  min-height: 112px !important;
  line-height: 1.55;
  background: rgba(255, 255, 255, 0.96);
  border-color: rgba(206, 220, 232, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.input-panel :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px rgba(96, 160, 236, 0.32);
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
