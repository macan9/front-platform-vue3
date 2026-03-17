<template>
  <el-dialog
    v-model="visible.attr"
    title="用户注册"
    width="480px"
    class="user-register-style"
  >
    <el-form :model="userForm" ref="userRuleFormRef" :rules="userRules" label-width="100px">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="userForm.username" placeholder="请输入用户名" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="userForm.email" placeholder="请输入邮箱" />
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="userForm.nickname" placeholder="请输入昵称（可选）" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="userForm.password"
          type="password"
          show-password
          autocomplete="new-password"
          placeholder="至少 8 位，包含大小写字母、数字和特殊字符"
        />
      </el-form-item>
      <el-form-item label="确认密码" prop="check_password">
        <el-input
          v-model="userForm.check_password"
          type="password"
          show-password
          autocomplete="new-password"
          placeholder="请再次输入密码"
        />
      </el-form-item>
      <el-form-item label="图形验证码" prop="captcha">
        <div class="captcha-row">
          <el-input v-model="userForm.captcha" placeholder="请输入验证码" />
          <img
            v-if="captchaImg"
            :src="captchaImg"
            alt="验证码"
            class="captcha-img"
            @click="loadCaptcha"
          />
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="success" @click="registerUser(userRuleFormRef)">
          确认注册
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script lang="js" setup>
import { defineProps, defineEmits, toRef, ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { registerReq, getCaptcha } from '@/apis/userApis.js'
import { encryptPasswordFields, validatePassword, validateUsername } from '@/common/utils/authSecurity.js'

const isRequestSucceeded = (payload) => {
  return payload?.success === true || payload?.code === 0 || !!payload?.data
}

const props = defineProps({
  dialogVisible: {
    type: Object,
    default: () => {},
  },
})

const emit = defineEmits(['update-user-data'])
const visible = toRef(props, 'dialogVisible')

const userForm = reactive({
  username: '',
  email: '',
  nickname: '',
  password: '',
  check_password: '',
  role: '',
  description: '',
  captcha: '',
  captchaId: '',
})

const captchaImg = ref('')
const userRuleFormRef = ref(null)

const resetForm = () => {
  userForm.username = ''
  userForm.email = ''
  userForm.nickname = ''
  userForm.password = ''
  userForm.check_password = ''
  userForm.role = ''
  userForm.description = ''
  userForm.captcha = ''
  userForm.captchaId = ''
}

const loadCaptcha = async () => {
  const res = await getCaptcha()
  const payload = res?.data || res
  userForm.captchaId = payload?.captchaId || ''
  userForm.captcha = ''
  captchaImg.value = payload?.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(payload.svg)}` : ''
}

const validateUsernameField = (rule, value, callback) => {
  const message = validateUsername(value)
  if (message) return callback(new Error(message))
  callback()
}

const validatePasswordField = (rule, value, callback) => {
  const message = validatePassword(value)
  if (message) return callback(new Error(message))
  callback()
}

const validateConfirmPassword = (rule, value, callback) => {
  const password = String(userForm.password || '').trim()
  const confirmPassword = String(value || '').trim()

  if (!confirmPassword) return callback(new Error('请再次输入密码'))
  if (password !== confirmPassword) return callback(new Error('两次密码输入不一致'))
  callback()
}

const userRules = reactive({
  username: [{ validator: validateUsernameField, trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] },
  ],
  password: [{ validator: validatePasswordField, trigger: 'blur' }],
  check_password: [{ validator: validateConfirmPassword, trigger: 'blur' }],
  captcha: [{ required: true, message: '请输入图形验证码', trigger: 'blur' }],
})

const closeDialog = () => {
  visible.value.attr = false
  resetForm()
  captchaImg.value = ''
}

const registerUser = async (formEl) => {
  if (!formEl) return

  await formEl.validate(async (valid) => {
    if (!valid) return

    const submitData = await encryptPasswordFields({ ...userForm }, ['password'])
    delete submitData.check_password

    const res = await registerReq(submitData)
    if (!isRequestSucceeded(res)) {
      loadCaptcha()
      return
    }

    ElMessage({
      message: '注册成功',
      type: 'success',
    })
    emit('update-user-data')
    closeDialog()
  })
}

watch(
  () => visible.value.attr,
  (isOpen) => {
    if (isOpen) {
      loadCaptcha()
      return
    }
    resetForm()
  }
)
</script>

<style lang="scss">
.dialog-footer button:first-child {
  margin-right: 10px;
}

.user-register-style {
  margin-top: 30vh;
  border-radius: 8px;

  .el-dialog__body {
    padding: 12px 0 20px;
  }

  .el-form {
    width: 100%;
    padding: 0 50px;
  }

  .el-form-item__label {
    text-align: right;
    padding-right: 8px;
    color: #374151;
    font-size: 14px;
  }

  .captcha-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .captcha-img {
    height: 32px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid #d1d5db;
  }
}
</style>
