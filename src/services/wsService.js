import { globals_config } from '/public/config/globals_config'

const WS_READY_STATE_CONNECTING = 0
const WS_READY_STATE_OPEN = 1
const RECONNECT_DELAY = 3000

const buildWsBaseUrl = () => {
  if (typeof window === 'undefined') {
    return ''
  }

  const wsServiceHost = String(globals_config?.ws_service || '').trim()
  if (!wsServiceHost) return ''

  const wsBase = wsServiceHost
    .replace(/^http:/i, 'ws:')
    .replace(/^https:/i, 'wss:')
    .replace(/\/+$/, '')

  return `${wsBase}/ws`
}

class WsService {
  constructor() {
    this.socket = null
    this.token = ''
    this.listeners = new Set()
    this.manuallyClosed = false
    this.reconnectTimer = null
    this.connectingToken = ''
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {}
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(event) {
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error('ws listener error', error)
      }
    })
  }

  connect(token) {
    const nextToken = String(token || '').trim()
    if (!nextToken) {
      this.emit({ type: 'socket_error', data: { message: 'JWT token is required for websocket connection.' } })
      return
    }

    this.token = nextToken
    this.manuallyClosed = false
    this.clearReconnectTimer()

    if (
      this.socket &&
      (this.socket.readyState === WS_READY_STATE_OPEN || this.socket.readyState === WS_READY_STATE_CONNECTING) &&
      this.connectingToken === nextToken
    ) {
      return
    }

    if (this.socket && this.socket.readyState === WS_READY_STATE_CONNECTING && this.connectingToken !== nextToken) {
      this.socket.close()
      this.socket = null
    }

    const wsBaseUrl = buildWsBaseUrl()
    if (!wsBaseUrl) {
      this.connectingToken = ''
      this.emit({ type: 'socket_error', data: { message: 'WebSocket service url is not configured.' } })
      return
    }

    const url = `${wsBaseUrl}?token=${encodeURIComponent(nextToken)}`
    this.connectingToken = nextToken
    this.socket = new WebSocket(url)

    this.socket.onopen = () => {
      this.connectingToken = ''
      this.emit({ type: 'socket_open', data: null })
    }

    this.socket.onmessage = (event) => {
      let payload = null
      try {
        payload = JSON.parse(event.data)
      } catch (error) {
        payload = { type: 'raw', data: event.data }
      }
      this.emit(payload)
    }

    this.socket.onerror = (event) => {
      this.emit({ type: 'socket_error', data: event })
    }

    this.socket.onclose = (event) => {
      this.connectingToken = ''
      this.emit({ type: 'socket_close', data: event })
      this.socket = null

      if (!this.manuallyClosed) {
        this.reconnectTimer = window.setTimeout(() => {
          this.connect(this.token)
        }, RECONNECT_DELAY)
      }
    }
  }

  clearReconnectTimer() {
    if (!this.reconnectTimer) return
    window.clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  close() {
    this.manuallyClosed = true
    this.clearReconnectTimer()
    this.connectingToken = ''
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  send(type, data = {}) {
    if (!this.socket || this.socket.readyState !== WS_READY_STATE_OPEN) {
      return false
    }

    this.socket.send(JSON.stringify({ type, data }))
    return true
  }

  sendMessage(data) {
    return this.send('send_message', data)
  }

  sendReadAck(messageId) {
    return this.send('read_ack', { message_id: messageId })
  }
}

const wsService = new WsService()

export default wsService
