<template>
    <el-menu active-text-color="#337ECC" background-color="#ECF5FF" class="el-menu-vertical-demo"
        :default-active="defaultActiveMenu" @open="handleOpen" @close="handleClose" @select="selectMenuAfter">
        <template v-for="item in leftMenu.leftMenuTree" :key="item.value">
            <template v-if="item.children && item.children.length">
                <el-sub-menu :index="item.value.toString()">
                    <template #title>
                        <el-icon>
                            <component :is="item.icon" />
                        </el-icon>
                        <span>{{ item.label }}</span>
                    </template>
                    <el-menu-item v-for="child in item.children" :key="child.value" :index="child.value.toString()"
                        @click="router.push(getRouteLocation(child.path, 'left'))">
                        {{ child.label }}
                    </el-menu-item>
                </el-sub-menu>
            </template>

            <template v-else>
                <el-menu-item :index="item.value.toString()" @click="router.push(getRouteLocation(item.path, 'left'))">
                    <el-icon>
                        <component :is="item.icon" />
                    </el-icon>
                    <span>{{ item.label }}</span>
                </el-menu-item>
            </template>
        </template>
    </el-menu>
</template>

<script lang="js" setup>
import { menu_left_config } from '@/common/config/menu_left_config'
import { menu_permission_config, resolveUserRoles } from '@/common/config/menu_permission_config'
import { useRouter } from 'vue-router'
import { reactive, watch } from 'vue'
import { defineProps, toRef } from 'vue'

const router = useRouter()

const props = defineProps({
    topMenuValue: {
        type: String,
        default: '1',
    },
})
const topMenuValue = toRef(props, 'topMenuValue')

let defaultActiveMenu = '1'

const leftMenu = reactive({
    leftMenuTree: []
})

const getRouteLocation = (path, source) => {
    const targetPath = String(path || '').trim()
    if (!targetPath) return ''
    if (targetPath !== '/DontHitTheSpike') return targetPath

    return {
        path: targetPath,
        query: {
            menuSource: source,
        },
    }
}

watch(() => topMenuValue.value, () => {
    const found = useMenu()
    if (found) {
        selectFirstMenu()
    }
})

const useMenu = () => {
    leftMenu.leftMenuTree = []
    let found = false
    menu_left_config.map(i => {
        if (i.pid == topMenuValue.value) {
            found = true
            leftMenu.leftMenuTree = i.children || []
        }
    })

    const userInfoStr = localStorage.getItem('userInfo')
    let user = {}
    try {
        user = JSON.parse(userInfoStr || '{}')?.user || {}
    } catch {
        user = {}
    }
    const roles = resolveUserRoles(user)
    const canShow = (item) => {
        const rule = menu_permission_config?.[String(item?.value || '')]
        if (!rule) return true
        const allowed = Array.isArray(rule.roles) ? rule.roles : []
        if (!allowed.length) return true
        return roles.some(r => allowed.includes(r))
    }
    const filterTree = (tree) => {
        const arr = Array.isArray(tree) ? tree : []
        return arr
            .filter(canShow)
            .map(n => (n?.children ? { ...n, children: filterTree(n.children) } : n))
            .filter(n => !(n?.children && Array.isArray(n.children) && n.children.length === 0))
    }
    leftMenu.leftMenuTree = filterTree(leftMenu.leftMenuTree)

    return found && leftMenu.leftMenuTree.length > 0
}

const selectFirstMenu = () => {
    const target = Array.from(leftMenu.leftMenuTree)
    if (target.length) {
        let targetItem
        if (target[0].children && target[0].children.length) {
            targetItem = target[0].children[0]
        } else {
            targetItem = target[0]
        }
        router.push(getRouteLocation(targetItem.path, 'left'))
        defaultActiveMenu = targetItem.value
    }
}

const setActiveMenu = () => {
    const activeLeftMenu = localStorage.getItem('activeLeftMenu')
    const spcialMenu = ['1-1-2']
    console.log(activeLeftMenu, 'activeLeftMenu')
    if (spcialMenu.indexOf(activeLeftMenu) > -1) {
        return
    }
    if (activeLeftMenu) {
        findMenu(activeLeftMenu, leftMenu.leftMenuTree)
    } else {
        selectFirstMenu()
    }
}

const findMenu = (key, tree) => {
    if (!tree) {
        selectFirstMenu()
        return
    }
    tree.map(i => {
        if (i.value === key) {
            router.push(getRouteLocation(i.path, 'left'))
            defaultActiveMenu = i.value
            return
        }
        if (i.children) {
            findMenu(key, i.children)
        }
    })
}

const selectMenuAfter = (index, indexPath, item) => {
    console.log(index, indexPath, item, 'indexPath')
    localStorage.setItem('activeLeftMenu', index)
}
const handleOpen = (key, keyPath) => {
    console.log(key, keyPath)
}
const handleClose = (key, keyPath) => {
    console.log(key, keyPath)
}

useMenu()
setActiveMenu()
</script>

<style lang="scss">
.el-menu-vertical-demo {
    width: 216px;
    height: 100%;
    padding: 14px 10px;
    border: 1px solid rgba(198, 213, 225, 0.85) !important;
    border-radius: 24px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(242, 247, 252, 0.96)) !important;
    box-shadow: 0 16px 36px rgba(111, 144, 176, 0.1);

    .el-menu-item,
    .el-sub-menu__title {
        height: 44px;
        line-height: 44px;
        border-radius: 14px;
        width: calc(100% - 12px);
        margin-left: 12px;
        margin-right: 6px;
        margin-bottom: 6px;
        box-sizing: border-box;
        color: #506274;
        transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }

    .el-menu-item:hover,
    .el-sub-menu__title:hover {
        background: rgba(160, 207, 255, 0.2) !important;
        color: #2d5f90 !important;
        transform: translateX(2px);
    }

    .el-menu-item.is-active {
        background: linear-gradient(135deg, #d9ecff 0%, #ecf7ff 100%) !important;
        color: #2368a2 !important;
        box-shadow: inset 0 0 0 1px rgba(110, 176, 255, 0.28);
    }

    .el-sub-menu .el-menu {
        background: transparent;
    }

    .el-sub-menu .el-sub-menu__icon-arrow {
        margin-right: -6px;
        color: #8ba1b5;
    }

    .el-icon {
        width: 18px;
        margin-right: 10px;
        font-size: 18px;
    }

    span {
        font-size: 14px;
        font-weight: 500;
    }
}
</style>
