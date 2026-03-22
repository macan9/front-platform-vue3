<template>
  <el-dialog
    v-model="visible.attr"
    title="用户注册"
    width="560px"
    class="user-register-style"
    align-center
  >
    <div class="register-head">
      <div class="register-badge">Create Account</div>
      <p class="register-subtitle">请完成账号初始化。</p>
    </div>

    <el-form
      ref="userRuleFormRef"
      class="register-form"
      :model="userForm"
      :rules="userRules"
      label-width="96px"
    >
      <el-form-item label="用户名" prop="username">
        <el-input v-model="userForm.username" placeholder="请输入用户名" />
      </el-form-item>

      <el-form-item label="邮箱" prop="email">
        <el-input v-model="userForm.email" placeholder="请输入邮箱" />
      </el-form-item>

      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="userForm.nickname" placeholder="请输入昵称，可选" />
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
          
        </div>
      </el-form-item>
      <div class="captcha-preview">
            <button type="button" class="captcha-card" @click="loadCaptcha">
              <img
                v-if="captchaImg"
                :src="captchaImg"
                alt="验证码"
                class="captcha-img"
              >
              <span class="captcha-text">点击刷新</span>
            </button>
          </div>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button round @click="closeDialog">取消</el-button>
        <el-button type="primary" round @click="registerUser(userRuleFormRef)">
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
import { isApiSuccess } from '@/common/requests/requests.js'
import { encryptPasswordFields, validatePassword, validateUsername } from '@/common/utils/authSecurity.js'

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
    if (!isApiSuccess(res)) {
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
.user-register-style {
  .el-dialog {
    width: min(560px, calc(100vw - 24px));
    border-radius: 28px;
    overflow: hidden;
    border: 1px solid rgba(140, 174, 214, 0.24);
    background:
      radial-gradient(circle at top right, rgba(82, 214, 197, 0.16), transparent 26%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 250, 255, 0.96));
    box-shadow: 0 28px 60px rgba(94, 122, 156, 0.22);
    backdrop-filter: blur(18px);
  }

  .el-dialog__header {
    padding: 24px 28px 0;
    margin-right: 0;
  }

  .el-dialog__title {
    font-size: 24px;
    font-weight: 700;
    color: #1d3550;
    letter-spacing: 0.02em;
  }

  .el-dialog__body {
    padding: 10px 28px 18px;
  }

  .el-dialog__footer {
    padding: 0 28px 26px;
  }

  .register-head {
    margin-bottom: 18px;
  }

  .register-badge {
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(44, 137, 255, 0.14);
    background: rgba(44, 137, 255, 0.08);
    color: #1769d2;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .register-subtitle {
    margin: 10px 0 0;
    color: #74879b;
    font-size: 13px;
    line-height: 1.7;
  }

  .register-form {
    width: min(100%, 440px);
    margin: 0 auto;
  }

  .el-form-item {
    margin-bottom: 18px;
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    align-items: center;
  }

  .el-form-item__content {
    min-width: 0;
    margin-left: 0 !important;
  }

  .el-form-item__label {
    width: auto !important;
    justify-content: flex-end;
    color: #45607b;
    font-size: 14px;
    font-weight: 600;
    padding-right: 12px;
  }

  .el-input__wrapper {
    min-height: 46px;
    border-radius: 16px;
    box-shadow: none;
    border: 1px solid rgba(144, 174, 206, 0.38);
    background: rgba(255, 255, 255, 0.85);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .el-input__wrapper.is-focus {
    border-color: rgba(44, 137, 255, 0.7);
    box-shadow: 0 0 0 4px rgba(44, 137, 255, 0.12);
  }

  .el-textarea__inner {
    border-radius: 16px;
  }

  .captcha-row {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .captcha-row .el-input {
    width: 100%;
    min-width: 0;
  }

  .captcha-preview {
    margin-left: 22%;
    display: flex;
    justify-content: flex-start;
  }

  .captcha-card {
    min-width: 132px;
    padding: 8px 10px;
    border: 1px dashed rgba(111, 153, 201, 0.42);
    border-radius: 16px;
    background: rgba(247, 250, 255, 0.94);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .captcha-card:hover {
    transform: translateY(-1px);
    border-color: rgba(44, 137, 255, 0.42);
    box-shadow: 0 12px 22px rgba(120, 149, 185, 0.12);
  }

  .captcha-img {
    width: 112px;
    height: 44px;
    border-radius: 12px;
    background: #fff;
    border: 1px solid rgba(166, 188, 212, 0.38);
  }

  .captcha-text {
    font-size: 12px;
    color: #70849a;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .dialog-footer .el-button {
    min-width: 112px;
    height: 44px;
    margin-left: 0;
    border-radius: 16px;
    font-weight: 600;
  }

  .dialog-footer .el-button--primary {
    border: 0;
    background: linear-gradient(135deg, #2c89ff, #5db0ff);
    box-shadow: 0 16px 30px rgba(44, 137, 255, 0.22);
  }
}

@media (max-width: 640px) {
  .user-register-style {
    .el-dialog__header {
      padding: 20px 18px 0;
    }

    .el-dialog__body {
      padding: 8px 18px 16px;
    }

    .el-dialog__footer {
      padding: 0 18px 20px;
    }

    .el-form-item {
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }

    .el-form-item__label {
      width: 100% !important;
      justify-content: flex-start;
      text-align: left;
      padding: 0 0 8px;
    }

    .el-form-item__content {
      margin-left: 0 !important;
    }

    .captcha-card {
      width: 100%;
    }

    .dialog-footer {
      flex-direction: column-reverse;
    }

    .dialog-footer .el-button {
      width: 100%;
    }
  }
}
</style>
