const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '')

const resolveIsLocalRuntime = () => {
    if (typeof window === 'undefined') return false

    const hostname = String(window.location?.hostname || '').toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1'
}

const getRuntimeAppConfig = () => {
    if (typeof window === 'undefined') {
        return {}
    }

    return window.__APP_CONFIG__ || {}
}

const normalizeMode = (value) => {
    return String(value || '').toLowerCase() === 'local' ? 'local' : 'online'
}

const normalizePort = (value) => {
    const port = Number(value)
    return Number.isFinite(port) && port > 0 ? port : 3000
}

const normalizeHost = (value, fallback) => {
    const host = String(value || '').trim()
    return host || fallback
}

const resolveRuntimeHostname = () => {
    if (typeof window === 'undefined') return ''
    return String(window.location?.hostname || '').trim()
}

const runtimeConfig = getRuntimeAppConfig()
const service_mode = normalizeMode(runtimeConfig.mode)
const isOnlineService = service_mode === 'online'
const useHttpProtocol = Boolean(runtimeConfig.http)
const port = normalizePort(runtimeConfig.port)
const runtimeHostname = resolveRuntimeHostname()
const onlineHost = normalizeHost(runtimeConfig.serve_ip, runtimeHostname)
const localHost = normalizeHost(runtimeConfig.local_ip, runtimeHostname)

const protocol = useHttpProtocol ? 'http' : 'https'
const wsProtocol = useHttpProtocol ? 'ws' : 'wss'
const serviceHost = isOnlineService ? onlineHost : localHost

const selectedServiceHost = `${protocol}://${serviceHost}:${port}`
const selectedWsServiceHost = `${wsProtocol}://${serviceHost}:${port}`
const apiServiceHost = !isOnlineService && resolveIsLocalRuntime() ? '' : selectedServiceHost

export const globals_config = {
    service_mode,
    protocol,
    ws_protocol: wsProtocol,
    use_http_protocol: useHttpProtocol,
    service_host: serviceHost,
    online_host: onlineHost,
    local_host: localHost,
    service_port: port,
    // Use the dev proxy locally so captcha and login stay in the same session.
    api_service: trimTrailingSlash(apiServiceHost),
    // Keep absolute backend host for uploaded assets such as avatars.
    host_service: trimTrailingSlash(selectedServiceHost),
    // WebSocket base host, ChatRoom will append /ws and token query automatically.
    ws_service: trimTrailingSlash(selectedWsServiceHost),

    gitee_user_config: {
        owner: 'mc150324',
        repo: 'PicGo',
        path: '',
        access_token: 'd18bdb11f5111a41281baef050f7933d',
        message: 'image upload'
    },
}
