<template>
  <div class="login-page1">
    <div class="login-bg-grid"></div>
    <div class="login-orb orb-one"></div>
    <div class="login-orb orb-two"></div>
    <div class="login-orb orb-three"></div>

    <form method="post" class="box" @submit.prevent="handleSubmit">
      <div class="login-badge">Three.js Blog</div>
      <h1 class="login-title">用户登录</h1>
      <p class="login-subtitle">进入浅色风格的创作后台，继续管理内容与资源。</p>

      <div class="form-item">
        <label class="form-label" for="login-username">用户名</label>
        <input
          id="login-username"
          v-model="username"
          type="text"
          name="username"
          placeholder="请输入用户名"
          autocomplete="username"
        >
      </div>

      <div class="form-item">
        <label class="form-label" for="login-password">密码</label>
        <div class="password-field">
          <input
            id="login-password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            name="password"
            placeholder="请输入密码"
            autocomplete="current-password"
          >
          <button
            type="button"
            class="toggle-password"
            :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            @click="togglePassword"
          >
            <svg v-if="showPassword" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l2.32 2.32C2.89 7.39 1.61 9.27 1.18 9.94a1.9 1.9 0 0 0 0 2.12C2.29 13.8 5.85 18.5 12 18.5c2.33 0 4.3-.68 5.96-1.69l2.51 2.51a.75.75 0 1 0 1.06-1.06zm10.52 10.52-3.1-3.1a2.5 2.5 0 0 1 3.1 3.1m-4.17-4.17-3.82-3.82A9.7 9.7 0 0 1 12 5.5c6.15 0 9.71 4.7 10.82 6.44a1.9 1.9 0 0 1 0 2.12 17 17 0 0 1-3.77 4.07l-1.93-1.93A4 4 0 0 0 9.88 8.82"
              />
              <path
                d="M9.53 14.83a4 4 0 0 1-4.36-4.36l1.54 1.54a2.5 2.5 0 0 0 3.28 3.28z"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 5.5c6.15 0 9.71 4.7 10.82 6.44a1.9 1.9 0 0 1 0 2.12C21.71 15.8 18.15 20.5 12 20.5S2.29 15.8 1.18 14.06a1.9 1.9 0 0 1 0-2.12C2.29 10.2 5.85 5.5 12 5.5m0 2c-4.98 0-8.04 3.82-9.13 5.5C3.96 14.68 7.02 18.5 12 18.5s8.04-3.82 9.13-5.5C20.04 11.32 16.98 7.5 12 7.5"
              />
              <path
                d="M12 9a4 4 0 1 1 0 8 4 4 0 0 1 0-8m0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="form-item">
        <label class="form-label" for="login-captcha">验证码</label>
        <input
          id="login-captcha"
          v-model="captchaText"
          type="text"
          name="captcha"
          placeholder="请输入验证码"
          autocomplete="off"
        >
      </div>

      <div class="captcha-row">
        <button type="button" class="captcha-card" @click="loadCaptcha">
          <img
            v-if="captchaImg"
            :src="captchaImg"
            alt="验证码"
            class="captcha-img"
          >
          <span class="captcha-hint">点击刷新验证码</span>
        </button>
      </div>

      <div class="button-row">
        <el-button type="default" round @click="openRigsterPage">注册账号</el-button>
        <el-button type="primary" round native-type="submit">立即登录</el-button>
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
import { encryptPasswordFields, validateUsername } from '@/common/utils/authSecurity.js'
import UserRegister from '@/components/user/UserRegister.vue'

const isRequestSucceeded = (payload) => {
  return payload?.success === true || payload?.code === 0 || !!payload?.data
}

export default {
  components: { UserRegister },
  setup() {
    const username = ref('')
    const password = ref('')
    const showPassword = ref(false)
    const dialogVisible_ = reactive({ attr: false })
    const captchaText = ref('')
    const captchaImg = ref('')
    const captchaId = ref('')
    const router = useRouter()

    const openRigsterPage = () => {
      dialogVisible_.attr = true
    }

    const togglePassword = () => {
      showPassword.value = !showPassword.value
    }

    const loadCaptcha = async () => {
      const res = await getCaptcha()
      const payload = res?.data || res
      captchaId.value = payload?.captchaId || ''
      captchaText.value = ''
      captchaImg.value = payload?.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(payload.svg)}` : ''
    }

    async function handleSubmit() {
      const usernameMessage = validateUsername(username.value)
      if (usernameMessage) {
        ElMessage.warning(usernameMessage)
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

      const res = await loginReq(userData)
      const { data } = res || {}

      if (isRequestSucceeded(res) && data) {
        ElMessage({
          message: '登录成功，欢迎回来',
          type: 'success',
        })

        localStorage.setItem('loginStatus', 'true')
        localStorage.setItem('userInfo', JSON.stringify(data))
        router.push('/blogManage')
        return
      }

      loadCaptcha()
    }

    onMounted(() => {
      loadCaptcha()
    })

    return {
      username,
      password,
      showPassword,
      captchaText,
      captchaImg,
      dialogVisible_,
      handleSubmit,
      openRigsterPage,
      loadCaptcha,
      togglePassword,
    }
  },
}
</script>

<style lang="scss" scoped>
</style>
