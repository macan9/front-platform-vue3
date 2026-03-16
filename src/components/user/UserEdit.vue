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
        <el-button type="success" round :disabled="formDisabled" @click="submitUser(userRuleFormRef)">
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
import { encryptPasswordFields, validatePassword, validateUsername } from '@/common/utils/authSecurity.js'
import { Plus, UserFilled } from '@element-plus/icons-vue'
import { globals_config } from '/public/config/globals_config'

const props = defineProps({
  dialogVisible: {
    type: Object,
    default: () => {},
  },
  userId: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['update-user-data'])
const visible = toRef(props, 'dialogVisible')
const userId = toRef(props, 'userId')

const avatarUploading = ref(false)
const avatarUploadPath = String(globals_config?.upload_avatar_path_default || 'avatar')
const avatarPreviewUrl = ref('')
const userRuleFormRef = ref(null)
const currentUser = ref(getCurrentUserFromStorage())
let avatarPreviewObjectUrl = ''
let userOldData = {}

const userForm = reactive({
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

function getCurrentUserFromStorage() {
  const userInfoStr = localStorage.getItem('userInfo')
  if (!userInfoStr) return { id: '', auth: '' }

  try {
    const parsed = JSON.parse(userInfoStr)
    const user = parsed?.user || {}
    const authRaw = user?.auth ?? user?.authority ?? user?.role
    return {
      id: String(user?.id || ''),
      auth: authRaw === '' || authRaw === null || authRaw === undefined ? '' : Number(authRaw),
    }
  } catch {
    return { id: '', auth: '' }
  }
}

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

const extractAvatarUrl = (payload) => {
  if (!payload) return ''
  if (typeof payload === 'string') return payload
  if (typeof payload?.data === 'string') return payload.data

  return (
    payload?.data?.avatar ||
    payload?.data?.url ||
    payload?.data?.fileUrl ||
    payload?.data?.path ||
    payload?.avatar ||
    payload?.url ||
    payload?.fileUrl ||
    payload?.path ||
    ''
  )
}

const normalizeAvatarUrl = (url) => {
  const normalizedUrl = String(url || '').trim()
  if (!normalizedUrl) return ''
  if (/^(https?:|data:|blob:)/.test(normalizedUrl)) return normalizedUrl

  const baseUrl = String(globals_config?.host_service || '').replace(/\/+$/, '')
  if (!baseUrl) return normalizedUrl

  return normalizedUrl.startsWith('/') ? `${baseUrl}${normalizedUrl}` : `${baseUrl}/${normalizedUrl}`
}

const beforeAvatarUpload = (rawFile) => {
  if (formDisabled.value) return false

  if (!rawFile?.type?.startsWith('image/')) {
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
    } catch (error) {
      if (error?.response?.status === 404 || error?.response?.status === 405) {
        res = await api.post('/upload/avatar', formData, { headers })
      } else {
        throw error
      }
    }

    const avatarUrl = normalizeAvatarUrl(extractAvatarUrl(res?.data))
    if (avatarUrl) {
      userForm.avatar = avatarUrl
    }

    ElMessage.success(avatarUrl ? '头像上传成功' : '上传成功，但未返回头像地址')
    options?.onSuccess?.(res?.data, rawFile)
  } catch (error) {
    if (!error?.response) {
      ElMessage.error(String(error?.message || '头像上传失败'))
    }
    options?.onError?.(error)
  } finally {
    avatarUploading.value = false
  }
}

const avatarButtonText = computed(() => (avatarPreviewUrl.value || userForm.avatar ? '更换头像' : '上传头像'))
const editingSelf = computed(() => String(currentUser.value?.id || '') === String(userId.value || ''))
const targetUserIsAdmin = computed(() => Number(userForm?.auth) === 1)
const currentUserIsAdmin = computed(() => Number(currentUser.value?.auth) === 1)
const editingOtherAdmin = computed(() => {
  return Boolean(
    currentUserIsAdmin.value &&
    targetUserIsAdmin.value &&
    String(currentUser.value?.id || '') &&
    String(userId.value || '') &&
    String(currentUser.value?.id || '') !== String(userId.value || '')
  )
})
const formDisabled = computed(() => editingOtherAdmin.value)

const resetPasswordFields = () => {
  userForm.oldPassword = ''
  userForm.newPassword = ''
  userForm.confirmPassword = ''
}

const getUserInfo = async () => {
  try {
    currentUser.value = getCurrentUserFromStorage()
    const { data } = await userInfoGet(userId.value)
    userOldData = data || {}
    Object.assign(userForm, data || {})
    resetPasswordFields()
  } catch (error) {
    console.error('getUserInfo failed', error)
    userOldData = {}
    resetPasswordFields()
  }
}

const closeDialog = () => {
  emit('update-user-data')
  cleanupAvatarPreview()
  resetPasswordFields()
  visible.value.attr = false
}

const validateUsernameField = (rule, value, callback) => {
  const message = validateUsername(value)
  if (message) return callback(new Error(message))
  callback()
}

const validateOldPassword = (rule, value, callback) => {
  const newPassword = String(userForm.newPassword || '').trim()
  const oldPassword = String(userForm.oldPassword || '').trim()

  if (!editingSelf.value || !newPassword) return callback()
  if (!oldPassword) return callback(new Error('请输入原密码'))
  callback()
}

const validateNewPassword = (rule, value, callback) => {
  const message = validatePassword(value, { required: false })
  if (message) return callback(new Error(message))
  callback()
}

const validateConfirmPassword = (rule, value, callback) => {
  const password = String(userForm.newPassword || '').trim()
  const confirmPassword = String(userForm.confirmPassword || '').trim()

  if (!password && !confirmPassword) return callback()
  if (!password) return callback(new Error('请先输入新密码'))
  if (!confirmPassword) return callback(new Error('请再次输入新密码'))
  if (password !== confirmPassword) return callback(new Error('两次密码输入不一致'))
  callback()
}

const userRules = reactive({
  username: [{ validator: validateUsernameField, trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] },
  ],
  oldPassword: [{ validator: validateOldPassword, trigger: 'blur' }],
  newPassword: [{ validator: validateNewPassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }],
})

const findDifProperties = (oldData, newForm) => {
  const diffObj = {}

  Object.keys(newForm).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(oldData, key)) {
      if (newForm[key] !== undefined) diffObj[key] = newForm[key]
      return
    }

    if (oldData[key] !== newForm[key]) {
      diffObj[key] = newForm[key]
    }
  })

  return diffObj
}

const submitUser = async (formEl) => {
  if (!formEl) return

  await formEl.validate(async (valid) => {
    if (!valid) return

    if (formDisabled.value) {
      ElMessage.warning('无权限修改其他管理员信息')
      return
    }

    const newData = findDifProperties(userOldData, userForm)
    const oldPassword = String(userForm.oldPassword || '').trim()
    const newPassword = String(userForm.newPassword || '').trim()

    delete newData.oldPassword
    delete newData.newPassword
    delete newData.confirmPassword

    if (newPassword) {
      if (editingSelf.value) {
        newData.oldPassword = oldPassword
        newData.newPassword = newPassword
      } else {
        newData.password = newPassword
      }
    }

    if (!Object.keys(newData).length) {
      ElMessage.warning('用户未作修改')
      return
    }

    const encryptedData = await encryptPasswordFields(newData, ['oldPassword', 'newPassword', 'password'])
    const res = await userInfoPut(userId.value, encryptedData)

    if (res?.success === true || res?.data) {
      ElMessage({ message: '修改成功', type: 'success' })
    }
    closeDialog()
  })
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
