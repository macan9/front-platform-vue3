<template>
    <el-menu
        :default-active="activeIndex"
        class="el-menu-for-top"
        mode="horizontal"
        background-color="#ECF5FF"
        @select="handleSelect"
    >
        <el-menu-item
            v-for="item in menu_top_config"
            :key="item.value"
            :index="item.value.toString()"
            @click="onTopMenuClick(item)"
        >
            <el-icon>
                <component :is="item.icon" style="width: 20px; height:20px;" />
            </el-icon>
            <span>{{ item.label }}</span>
        </el-menu-item>

        <el-sub-menu index="99" class="position-left">
            <template #title>
                <el-avatar :size="28" :src="avatarDisplayUrl" class="user-avatar" @error="handleAvatarError">
                    <el-icon>
                        <UserFilled />
                    </el-icon>
                </el-avatar>
                <span class="user-name">{{ displayName }}</span>
            </template>
            <el-menu-item class="el-menu-item-center" index="99-1" @click="openUserProfile">个人信息</el-menu-item>
            <el-menu-item class="el-menu-item-center" index="99-2" @click="loginOut">退出登录</el-menu-item>
        </el-sub-menu>
    </el-menu>

    <UserEdit v-if="userId" :dialogVisible="userEditDialog" :userId="userId" @update-user-data="refreshUserInfo" />
</template>

<script lang="js" setup>
import { ref, reactive, defineEmits, watch, computed } from 'vue'
import { UserFilled } from '@element-plus/icons-vue'
import { loginOut } from '@/common/plugins/user_manage_methods'
import { useRouter } from 'vue-router'
import { userInfoGet } from '@/apis/userApis.js'
import { globals_config } from '/public/config/globals_config'
import UserEdit from '@/components/user/UserEdit.vue'
import { menu_top_config } from '@/common/config/menu_top_config'

const menuVal = localStorage.getItem('topMenuValue')
const activeIndex = menuVal ? ref(menuVal) : ref('1')

const emit = defineEmits(['update-menu-value'])
const router = useRouter()

const onTopMenuClick = (item) => {
    const nextVal = String(item?.value ?? '')
    if (!nextVal) return

    activeIndex.value = nextVal
    localStorage.setItem('topMenuValue', nextVal)
    emit('update-menu-value', nextVal)

    const path = String(item?.path || '').trim()
    if (path) router.push(path)
}
const handleSelect = () => { }

const userEditDialog = reactive({ attr: false })

const userId = ref('')
const username = ref('')
const nickname = ref('')
const avatarUrl = ref('')
const avatarDisplayUrl = ref('')
const displayName = computed(() => nickname.value || username.value || '')

const safeParseJson = (str) => {
    const s = String(str || '').trim()
    if (!s) return null
    try {
        return JSON.parse(s)
    } catch {
        return null
    }
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

const buildAvatarDisplayUrl = (url) => {
    const u = String(url || '').trim()
    if (!u) return ''
    if (u.startsWith('data:') || u.startsWith('blob:')) return u
    const sep = u.includes('?') ? '&' : '?'
    return `${u}${sep}_t=${Date.now()}`
}

const loadUserFromStorage = () => {
    const userInfoObj = safeParseJson(localStorage.getItem('userInfo')) || {}
    const u = userInfoObj?.user || {}
    userId.value = String(u?.id || '')
    username.value = String(u?.username || '')
    nickname.value = String(u?.nickname || '')
    avatarUrl.value = normalizeAvatarUrl(u?.avatar || u?.avatarUrl || u?.avatar_url || '')
}

const refreshUserInfo = async () => {
    loadUserFromStorage()
    if (!userId.value) return

    try {
        const res = await userInfoGet(userId.value)
        const nextUser = res?.data || {}

        username.value = String(nextUser?.username || username.value || '')
        nickname.value = String(nextUser?.nickname || nickname.value || '')
        avatarUrl.value = normalizeAvatarUrl(nextUser?.avatar || nextUser?.avatarUrl || nextUser?.avatar_url || '')

        const userInfoObj = safeParseJson(localStorage.getItem('userInfo')) || {}
        userInfoObj.user = { ...(userInfoObj.user || {}), ...(nextUser || {}) }
        localStorage.setItem('userInfo', JSON.stringify(userInfoObj))
    } catch (e) {
        console.error('refreshUserInfo failed', e)
        loadUserFromStorage()
    }
}

const openUserProfile = () => {
    loadUserFromStorage()
    if (!userId.value) return
    userEditDialog.attr = true
}

const handleAvatarError = () => {
    avatarUrl.value = ''
    avatarDisplayUrl.value = ''
}

watch(
    avatarUrl,
    () => {
        avatarDisplayUrl.value = buildAvatarDisplayUrl(avatarUrl.value)
    },
    { immediate: true }
)

refreshUserInfo()
</script>

<style lang="scss">
.el-menu-for-top {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 72px;
    padding: 10px 140px 10px 16px;
    border: 0 !important;
    border-bottom: 1px solid rgba(206, 220, 232, 0.85) !important;
    background: linear-gradient(180deg, rgba(252, 254, 255, 0.98), rgba(239, 246, 252, 0.96)) !important;
    box-shadow: 0 8px 28px rgba(111, 144, 176, 0.08);

    &::before {
        content: "";
        position: absolute;
        inset: auto 18px 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(160, 207, 255, 0.7), transparent);
    }

    >.el-menu-item,
    .el-sub-menu__title {
        height: 48px;
        line-height: 48px;
        margin: 0 4px !important;
        border-radius: 14px;
        color: #506274;
        transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
    }

    .el-menu-item:hover,
    .el-sub-menu__title:hover {
        background: rgba(160, 207, 255, 0.18) !important;
        color: #2d5f90 !important;
    }

    .el-menu-item.is-active {
        color: #2368a2 !important;
        background: linear-gradient(135deg, #dcedff 0%, #eef7ff 100%) !important;
        box-shadow: inset 0 0 0 1px rgba(110, 176, 255, 0.24);
    }

    .position-left {
        position: absolute;
        right: 16px;
        height: 100%;
        border-bottom: none !important;
    }

    .position-left .el-sub-menu__title {
        border-bottom: none !important;
    }

    .user-avatar {
        margin-right: 10px;
        vertical-align: middle;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        border: 2px solid rgba(255, 255, 255, 0.95);
        box-shadow: 0 6px 18px rgba(136, 166, 196, 0.2);

        .el-icon {
            width: 100%;
            height: 100%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            font-size: 18px;
        }

        svg {
            width: 18px;
            height: 18px;
        }
    }

    .el-icon {
        margin-right: 8px;
    }

    .el-sub-menu .el-icon {
        margin-right: 0;
    }

    .user-name {
        vertical-align: middle;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.01em;
    }
}

.el-popper {
    border: none !important;
    border-radius: 18px !important;
    overflow: hidden;
    background: linear-gradient(180deg, rgba(252, 254, 255, 0.98), rgba(239, 246, 252, 0.96)) !important;
    box-shadow: 0 18px 36px rgba(111, 144, 176, 0.14) !important;

    .el-popper__arrow::before {
        border: none !important;
        background: rgba(244, 249, 253, 0.98) !important;
    }

    .el-menu--popup {
        min-width: 132px;
        padding: 6px;
        border-radius: 18px;
        border: none !important;
        background: linear-gradient(180deg, rgba(252, 254, 255, 0.98), rgba(239, 246, 252, 0.96)) !important;
        box-shadow: none;
    }

    .el-menu-item-center {
        justify-content: center;
        border-radius: 12px;
        background: transparent !important;
        color: #506274;
        transition: background-color 0.2s ease, color 0.2s ease;
    }

    .el-menu-item-center:hover {
        background: rgba(160, 207, 255, 0.18) !important;
        color: #2d5f90 !important;
    }

    .el-menu-item-center.is-active {
        color: #2368a2 !important;
        background: linear-gradient(135deg, #dcedff 0%, #eef7ff 100%) !important;
    }
}
</style>
