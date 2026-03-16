<template>
    <el-dialog
        v-model="visible.attr"
        title="用户编辑"
        width="680px"
        align-center
        :modal="false"
        class="user-edit-style"
    >
        <el-form
            class="user-edit-form"
            :model="userForm"
            ref="userRuleFormRef"
            :rules="userRules"
            label-width="120px"
            :disabled="formDisabled"
        >
            <el-form-item label="用户名" prop="username">
                <el-input v-model="userForm.username" />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
                <el-input v-model="userForm.email" />
            </el-form-item>
            <el-form-item label="昵称" prop="nickname">
                <el-input v-model="userForm.nickname" />
            </el-form-item>

            <el-form-item label="头像">
                <div class="avatar-row">
                    <el-avatar :size="80" :src="avatarPreviewUrl || userForm.avatar">
                        <el-icon>
                            <UserFilled />
                        </el-icon>
                    </el-avatar>

                    <div class="avatar-actions">
                        <el-upload
                            action="#"
                            :show-file-list="false"
                            :before-upload="beforeAvatarUpload"
                            :http-request="handleAvatarUpload"
                            accept="image/*"
                            :disabled="avatarUploading || formDisabled"
                        >
                            <el-button type="primary" :icon="Plus" :loading="avatarUploading">
                                {{ avatarButtonText }}
                            </el-button>
                        </el-upload>
                    </div>
                </div>
            </el-form-item>

            <el-form-item v-if="editingSelf" label="原密码" prop="oldPassword">
                <el-input
                    v-model="userForm.oldPassword"
                    type="password"
                    show-password
                    autocomplete="current-password"
                    placeholder="修改密码时必填"
                />
            </el-form-item>
            <el-form-item :label="editingSelf ? '新密码' : '重置密码'" prop="newPassword">
                <el-input
                    v-model="userForm.newPassword"
                    type="password"
                    show-password
                    autocomplete="new-password"
                    placeholder="不修改可不填"
                />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
                <el-input
                    v-model="userForm.confirmPassword"
                    type="password"
                    show-password
                    autocomplete="new-password"
                    placeholder="请再次输入新密码"
                />
            </el-form-item>

            <el-form-item label="个性签名" prop="description">
                <el-input v-model="userForm.description" type="textarea" />
            </el-form-item>

            <el-form-item label="用户权限" prop="role">
                <el-select v-model="userForm.auth" placeholder="请选择用户类型" disabled>
                    <el-option
                        v-for="item in user_authority"
                        :label="item.label"
                        :value="item.value"
                        :key="item.value"
                    />
                </el-select>
            </el-form-item>
        </el-form>

        <template #footer>
            <span class="dialog-footer">
                <el-button type="primary" round @click="closeDialog">取消</el-button>
                <el-button type="success" round :disabled="formDisabled" @click="registerUser(userRuleFormRef)">
                    确认修改
                </el-button>
            </span>
        </template>
    </el-dialog>
</template>

<script lang="js" setup>
import { defineProps, toRef, ref, reactive, defineEmits, onBeforeUnmount, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { userInfoGet, userInfoPut } from '@/apis/userApis.js'
import { user_authority } from '@/common/plugins/user_config.js'
import api from '@/common/requests/axiosInstance.js'
import { Plus, UserFilled } from '@element-plus/icons-vue'
import { globals_config } from '/public/config/globals_config'

const props = defineProps({
    dialogVisible: {
        type: Object,
        default: () => { },
    },
    userId: {
        type: Number,
        default: 0,
    },
})
const visible = toRef(props, 'dialogVisible')
const userId = toRef(props, 'userId')

const avatarUploading = ref(false)
const avatarUploadPath = String(globals_config?.upload_avatar_path_default || 'avatar')
const avatarPreviewUrl = ref('')
let avatarPreviewObjectUrl = ''

const cleanupAvatarPreview = () => {
    if (avatarPreviewObjectUrl) {
        URL.revokeObjectURL(avatarPreviewObjectUrl)
        avatarPreviewObjectUrl = ''
    }
    avatarPreviewUrl.value = ''
}

onBeforeUnmount(() => {
    cleanupAvatarPreview()
})

const getToken = () => {
    const userInfoStr = localStorage.getItem('userInfo')
    if (!userInfoStr) return ''
    try {
        return JSON.parse(userInfoStr)?.token || ''
    } catch {
        return ''
    }
}

const safeParseJson = (str) => {
    const s = String(str || '').trim()
    if (!s) return null
    try {
        return JSON.parse(s)
    } catch {
        return null
    }
}

const getCurrentUserFromStorage = () => {
    const userInfoObj = safeParseJson(localStorage.getItem('userInfo')) || {}
    const u = userInfoObj?.user || {}
    const id = String(u?.id || '')
    const authRaw = u?.auth ?? u?.authority ?? u?.role
    const auth = authRaw === '' || authRaw === null || authRaw === undefined ? '' : Number(authRaw)
    return { id, auth }
}

const extractAvatarUrl = (payload) => {
    if (!payload) return ''
    if (typeof payload === 'string') return payload
    const data = payload?.data
    if (typeof data === 'string') return data
    return (
        data?.avatar ||
        data?.url ||
        data?.fileUrl ||
        data?.path ||
        payload?.avatar ||
        payload?.url ||
        payload?.fileUrl ||
        payload?.path ||
        ''
    )
}

const normalizeAvatarUrl = (url) => {
    const u = String(url || '').trim()
    if (!u) return ''
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:') || u.startsWith('blob:')) return u

    const base = String(globals_config?.host_service || '').replace(/\/+$/, '')
    if (!base) return u

    if (u.startsWith('/')) return `${base}${u}`
    return `${base}/${u}`
}

const beforeAvatarUpload = (rawFile) => {
    if (formDisabled.value) return false
    const okType = rawFile?.type?.startsWith('image/')
    if (!okType) {
        ElMessage.error('请选择图片文件')
        return false
    }
    if (rawFile.size / 1024 / 1024 > 5) {
        ElMessage.error('图片大小不能超过 5MB')
        return false
    }
    return true
}

const handleAvatarUpload = async (options) => {
    if (formDisabled.value) return
    const rawFile = options?.file
    if (!rawFile) return

    const token = getToken()
    if (!token) {
        ElMessage.error('未登录或登录已过期')
        options?.onError?.(new Error('missing token'))
        return
    }

    cleanupAvatarPreview()
    avatarPreviewObjectUrl = URL.createObjectURL(rawFile)
    avatarPreviewUrl.value = avatarPreviewObjectUrl

    avatarUploading.value = true
    try {
        const formData = new FormData()
        formData.append('file', rawFile)
        const path = String(avatarUploadPath || '').trim()
        if (path) formData.append('path', path)

        const headers = { Authorization: `Bearer ${token}` }
        let res
        try {
            res = await api.post('/api/upload/avatar', formData, { headers })
        } catch (e) {
            const status = e?.response?.status
            if (status === 404 || status === 405) {
                res = await api.post('/upload/avatar', formData, { headers })
            } else {
                throw e
            }
        }

        const payload = res?.data
        const avatarUrl = normalizeAvatarUrl(extractAvatarUrl(payload))
        if (avatarUrl) {
            userForm.avatar = avatarUrl
        }

        ElMessage.success(avatarUrl ? '头像上传成功' : '上传成功（未返回头像地址）')
        options?.onSuccess?.(payload, rawFile)
    } catch (e) {
        if (!e?.response) {
            const msg = e?.message || '头像上传失败'
            ElMessage.error(String(msg))
        }
        options?.onError?.(e)
    } finally {
        avatarUploading.value = false
    }
}

let userForm = reactive({
    username: '',
    email: '',
    auth: '',
    avatar: '',
    nickname: '',
    description: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
})

const avatarButtonText = computed(() => (avatarPreviewUrl.value || userForm.avatar) ? '更换头像' : '上传头像')

let userOldData = {}
const getUserInfo = async () => {
    try {
        currentUser.value = getCurrentUserFromStorage()
        const { data } = await userInfoGet(userId.value)
        userOldData = data || {}
        Object.assign(userForm, data || {})
        userForm.oldPassword = ''
        userForm.newPassword = ''
        userForm.confirmPassword = ''
    } catch (e) {
        console.error('getUserInfo failed', e)
        userOldData = {}
        Object.assign(userForm, {})
        userForm.oldPassword = ''
        userForm.newPassword = ''
        userForm.confirmPassword = ''
    }
}

const currentUser = ref(getCurrentUserFromStorage())
const editingSelf = computed(() => {
    const currentId = String(currentUser.value?.id || '')
    const targetId = String(userId.value || '')
    return Boolean(currentId && targetId && currentId === targetId)
})
const targetUserIsAdmin = computed(() => Number(userForm?.auth) === 1)
const currentUserIsAdmin = computed(() => Number(currentUser.value?.auth) === 1)
const editingOtherAdmin = computed(() => {
    const currentId = String(currentUser.value?.id || '')
    const targetId = String(userId.value || '')
    return Boolean(currentUserIsAdmin.value && targetUserIsAdmin.value && currentId && targetId && currentId !== targetId)
})
const formDisabled = computed(() => editingOtherAdmin.value)

const emit = defineEmits(['update-user-data'])
const closeDialog = () => {
    emit('update-user-data')
    cleanupAvatarPreview()
    userForm.oldPassword = ''
    userForm.newPassword = ''
    userForm.confirmPassword = ''
    visible.value.attr = false
}

const userRuleFormRef = ref(null)

const validateOldPassword = (rule, value, callback) => {
    const newPwd = String(userForm.newPassword || '').trim()
    const oldPwd = String(userForm.oldPassword || '').trim()
    if (!editingSelf.value) return callback()
    if (!newPwd) return callback()
    if (!oldPwd) return callback(new Error('请输入原密码'))
    callback()
}

const validateNewPassword = (rule, value, callback) => {
    const pwd = String(userForm.newPassword || '').trim()
    if (!pwd) return callback()
    if (pwd.length < 6) return callback(new Error('密码至少 6 位'))
    callback()
}

const validateConfirmPassword = (rule, value, callback) => {
    const pwd = String(userForm.newPassword || '').trim()
    const check = String(userForm.confirmPassword || '').trim()
    if (!pwd && !check) return callback()
    if (!pwd) return callback(new Error('请先输入新密码'))
    if (!check) return callback(new Error('请再次输入新密码'))
    if (pwd !== check) return callback(new Error('两次密码输入不一致'))
    callback()
}

const userRules = reactive({
    username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 2, max: 16, message: '用户名长度应为 2-16 个字符', trigger: 'blur' },
    ],
    email: [
        { required: true, message: '请输入邮箱', trigger: 'blur' },
        { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] },
    ],
    oldPassword: [{ validator: validateOldPassword, trigger: 'blur' }],
    newPassword: [{ validator: validateNewPassword, trigger: 'blur' }],
    confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }],
})

const registerUser = async (formEl) => {
    if (!formEl) return
    await formEl.validate(async (valid, fields) => {
        if (valid) {
            if (formDisabled.value) {
                ElMessage.warning('无权限修改其他管理员信息')
                return
            }

            const newData = findDifProperties(userOldData, userForm)

            const oldPwd = String(userForm.oldPassword || '').trim()
            const newPwd = String(userForm.newPassword || '').trim()
            delete newData.oldPassword
            delete newData.newPassword
            delete newData.confirmPassword

            if (newPwd) {
                if (editingSelf.value) {
                    newData.oldPassword = oldPwd
                    newData.newPassword = newPwd
                } else {
                    newData.password = newPwd
                }
            }

            if (!newData || Object.keys(newData).length === 0) {
                ElMessage.warning('用户未作修改')
                return
            }

            const res = await userInfoPut(userId.value, newData)
            if (res?.success === true) {
                ElMessage({ message: '修改成功', type: 'success' })
            }
            closeDialog()
        } else {
            console.log('error submit!', fields)
        }
    })
}

const findDifProperties = (o, u) => {
    const diffObj = {}

    for (let key in u) {
        if (!Object.prototype.hasOwnProperty.call(o, key)) {
            if (u[key] !== undefined) diffObj[key] = u[key]
            continue
        }
        if (o[key] !== u[key]) {
            diffObj[key] = u[key]
        }
    }

    return diffObj
}

watch(
    [() => visible.value.attr, () => userId.value],
    ([isOpen]) => {
        if (isOpen) {
            getUserInfo()
        }
    }
)
</script>

<style lang="scss">
.dialog-footer button:first-child {
    margin-right: 10px;
}

.user-edit-style {
    border-radius: 5px;
    width: min(720px, calc(100vw - 32px)) !important;
    margin: 0 auto;

    .user-edit-form {
        width: 100%;
        max-width: 560px;
        margin: 0 auto;

        .el-input,
        .el-select,
        .el-textarea {
            width: 100%;
        }
    }

    .avatar-row {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .avatar-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
}

@media (max-width: 640px) {
    .user-edit-style {
        width: calc(100vw - 24px) !important;

        .el-form-item {
            flex-direction: column;
            align-items: stretch;
        }

        .el-form-item__label {
            width: 100% !important;
            text-align: left;
            padding: 0 0 6px;
        }

        .el-form-item__content {
            margin-left: 0 !important;
        }
    }
}
</style>

