const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '')

const resolveIsLocalRuntime = () => {
    if (typeof window === 'undefined') return false

    const hostname = String(window.location?.hostname || '').toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1'
}

const onlineServiceHost = 'http://139.196.158.225:3000'
const apiServiceHost = resolveIsLocalRuntime() ? '' : onlineServiceHost

export const globals_config = {
    // Use the dev proxy locally so captcha and login stay in the same session.
    api_service: trimTrailingSlash(apiServiceHost),
    // Keep absolute backend host for uploaded assets such as avatars.
    host_service: trimTrailingSlash(onlineServiceHost),

    gitee_user_config: {
        owner: 'mc150324',
        repo: 'PicGo',
        path: 'ceshi',
        access_token: 'd18bdb11f5111a41281baef050f7933d',
        message: 'image upload'
    },
}
