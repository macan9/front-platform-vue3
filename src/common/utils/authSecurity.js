const DIGITS_ONLY_REGEX = /^\d+$/
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export const validateUsername = (value) => {
    const username = String(value || '').trim()

    if (!username) {
        return '请输入用户名'
    }
    if (username.length <= 3) {
        return '用户名长度必须大于 3'
    }
    if (DIGITS_ONLY_REGEX.test(username)) {
        return '用户名不能为纯数字'
    }

    return ''
}

export const validatePassword = (value, { required = true, emptyMessage = '请输入密码' } = {}) => {
    const password = String(value || '').trim()

    if (!password) {
        return required ? emptyMessage : ''
    }
    if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
        return '密码至少 8 位，且必须包含大写字母、小写字母、数字和特殊字符'
    }

    return ''
}

export const encryptTextBySha256 = async (value) => {
    const normalizedValue = String(value || '')
    const buffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizedValue))
    const byteArray = Array.from(new Uint8Array(buffer))
    const binary = byteArray.map((item) => String.fromCharCode(item)).join('')
    return window.btoa(binary)
}

export const encryptPasswordFields = async (payload, fields) => {
    const nextPayload = { ...payload }
    let hasEncryptedField = false

    for (const field of fields) {
        const value = String(nextPayload[field] || '').trim()
        if (!value) continue
        nextPayload[field] = await encryptTextBySha256(value)
        hasEncryptedField = true
    }

    if (hasEncryptedField) {
        nextPayload.passwordEncrypted = true
        nextPayload.passwordEncryptType = 'SHA-256'
    }

    return nextPayload
}
