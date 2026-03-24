const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '')

const resolveIsLocalRuntime = () => {
    if (typeof window === 'undefined') return false

    const hostname = String(window.location?.hostname || '').toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1'
}

const service_mode = 'online' // 'online' | 'local'
const isOnlineService = service_mode === 'online'

const localServiceHost = 'http://127.0.0.1:3000'
const onlineServiceHost = 'http://139.196.158.225:3000'
const selectedServiceHost = isOnlineService ? onlineServiceHost : localServiceHost

const localWsServiceHost = 'ws://127.0.0.1:3000'
const onlineWsServiceHost = 'ws://139.196.158.225:3000'
const selectedWsServiceHost = isOnlineService ? onlineWsServiceHost : localWsServiceHost

const apiServiceHost = !isOnlineService && resolveIsLocalRuntime() ? '' : selectedServiceHost

export const globals_config = {
    service_mode,
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
