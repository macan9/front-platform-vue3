<template>
  <div class="login-page1">
    <form method="post" class="box">
      <h1 class="login-title">用户登录</h1>
      <p class="login-subtitle">欢迎使用 Three.js 博客系统</p>
      <div class="form-item">
        <span class="form-label">用户名</span>
        <input v-model="username" type="text" name="username" placeholder="请输入用户名">
      </div>
      <div class="form-item">
        <span class="form-label">密码</span>
        <input v-model="password" type="password" name="password" placeholder="请输入密码">
      </div>
      <div class="form-item">
        <span class="form-label">验证码</span>
        <input v-model="captchaText" type="text" name="captcha" placeholder="请输入验证码">
      </div>
      <div class="form-item captcha-row">
        <span class="form-label"></span>
        <img
          v-if="captchaImg"
          :src="captchaImg"
          alt="验证码"
          class="captcha-img"
          @click="loadCaptcha"
        >
      </div>
      <div class="button-row">
        <el-button type="primary" round @click="openRigsterPage">注册账号</el-button>
        <el-button type="success" round @click="handleSubmit">立即登录</el-button>
      </div>
      <p class="login-tip">忘记密码请联系管理员重置</p>
    </form>
    <UserRegister :dialogVisible="dialogVisible_"></UserRegister>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { loginReq, getCaptcha } from '@/apis/userApis.js'
import { ElMessage } from 'element-plus'
import { encryptPasswordFields, validatePassword, validateUsername } from '@/common/utils/authSecurity.js'
import UserRegister from '@/components/user/UserRegister.vue'

export default {
  components: { UserRegister },
  setup() {
    const username = ref('')
    const password = ref('')
    const dialogVisible_ = reactive({ attr: false })
    const captchaText = ref('')
    const captchaImg = ref('')
    const captchaId = ref('')
    const router = useRouter()

    const openRigsterPage = () => {
      dialogVisible_.attr = true
    }

    const loadCaptcha = async () => {
      const res = await getCaptcha()
      const payload = res?.data || res
      captchaId.value = payload?.captchaId || ''
      captchaText.value = ''
      captchaImg.value = payload?.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(payload.svg)}` : ''
    }

    async function handleSubmit(event) {
      event?.preventDefault()

      const usernameMessage = validateUsername(username.value)
      if (usernameMessage) {
        ElMessage.warning(usernameMessage)
        return
      }

      const passwordMessage = validatePassword(password.value)
      if (passwordMessage) {
        ElMessage.warning(passwordMessage)
        return
      }

      if (!captchaText.value) {
        ElMessage({
          message: '请输入验证码',
          type: 'warning',
        })
        return
      }

      const userData = await encryptPasswordFields({
        username: username.value,
        password: password.value,
        captcha: captchaText.value,
        captchaId: captchaId.value,
      }, ['password'])

      const { data } = await loginReq(userData)
      if (data) {
        ElMessage({
          message: '登录成功，欢迎',
          type: 'success',
        })

        localStorage.setItem('loginStatus', 'true')
        localStorage.setItem('userInfo', JSON.stringify(data))
        router.push('/blogMain')
      }
    }

    onMounted(() => {
      loadCaptcha()
    })

    return {
      username,
      password,
      captchaText,
      captchaImg,
      dialogVisible_,
      handleSubmit,
      openRigsterPage,
      loadCaptcha,
    }
  },
}
</script>

<style lang="scss" scoped>
</style>
