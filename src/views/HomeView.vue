<template>
  <div
    class="home"
    :class="{
      'is-mobile': isMobile,
      'is-page-fullscreen': pageFullscreen,
    }"
  >
    <MenuForMobile v-if="isMobile && pageMenuVisible" @update-menu-value="setTopMenuValue" />
    <MenuForTop v-else-if="pageMenuVisible" @update-menu-value="setTopMenuValue" />

    <div class="display-flex-main">
      <MenuForLeft v-if="!isMobile && pageMenuVisible && showLeftMenu" :topMenuValue="topMenuValue" />

      <div class="main-display" :class="hasPadding ? 'main-display-padding' : ''">
        <div v-if="showGlobalFullscreenToggle" class="home-fullscreen-toggle">
          <FullscreenToggle
            v-model:fullscreen="pageFullscreen"
            v-model:menu-visible="pageMenuVisible"
          />
        </div>
        <router-view />
      </div>
    </div>
  </div>
</template>

<script>
import MenuForTop from '@/components/menu/MenuForTop.vue'
import MenuForLeft from '@/components/menu/MenuForLeft.vue'
import MenuForMobile from '@/components/menu/MenuForMobile.vue'
import FullscreenToggle from '@/components/FullscreenToggle.vue'
import { ref, watch, computed, provide } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { menu_left_config } from '@/common/config/menu_left_config'

export default {
  name: 'HomeView',
  components: {
    MenuForTop,
    MenuForLeft,
    MenuForMobile,
    FullscreenToggle,
  },
  setup() {
    const store = useStore()
    const menuVal = localStorage.getItem('topMenuValue')
    const topMenuValue = menuVal ? ref(menuVal) : ref('1')
    const isMobile = computed(() => store.state.isMobile)
    const pageFullscreen = ref(false)
    const pageMenuVisible = ref(true)
    const route = useRoute()
    const localFullscreenRoutes = ['/DontHitTheSpike', '/GraffitiJump']
    const showGlobalFullscreenToggle = computed(() => !localFullscreenRoutes.includes(route.path))

    const setTopMenuValue = (val) => {
      topMenuValue.value = val
    }
    const hasPadding = ref(true)
    const noPaddingRoutes = ['/leafletMap', '/threeGuiBase', '/threePlanet', '/ThreeIsland', '/DontHitTheSpike', '/fireworks']
    const showLeftMenu = computed(() => {
      if (route.path === '/chatRoom') return false
      if (route.path !== '/DontHitTheSpike') return true
      return route.query.menuSource === 'left'
    })

    const syncTopMenuByRoute = (path) => {
      const currentPath = String(path || '').trim()
      if (!currentPath) return

      const matchedGroup = menu_left_config.find((group) => {
        const children = Array.isArray(group?.children) ? group.children : []
        return children.some((item) => String(item?.path || '').trim().split('?')[0] === currentPath)
      })

      if (matchedGroup?.pid && topMenuValue.value !== String(matchedGroup.pid)) {
        topMenuValue.value = String(matchedGroup.pid)
        localStorage.setItem('topMenuValue', topMenuValue.value)
      }
    }

    const judgePadding = (newPath) => {
      if (noPaddingRoutes.indexOf(newPath) > -1) {
        hasPadding.value = false
      } else {
        hasPadding.value = true
      }
    }

    watch(() => topMenuValue.value, () => {
      localStorage.setItem('topMenuValue', topMenuValue.value)
    })

    watch(
      () => route.path,
      (newPath) => {
        syncTopMenuByRoute(newPath)
        judgePadding(newPath)

        if (!localFullscreenRoutes.includes(newPath)) {
          pageFullscreen.value = false
          pageMenuVisible.value = true
        }
      },
      { immediate: true }
    )

    provide('homeLayoutControls', {
      setFullscreen(value) {
        pageFullscreen.value = Boolean(value)
      },
      setMenuVisible(value) {
        pageMenuVisible.value = Boolean(value)
      },
    })

    const getMockData = () => {
    }

    syncTopMenuByRoute(route.path)
    judgePadding(route.path)

    return {
      topMenuValue,
      isMobile,
      hasPadding,
      pageFullscreen,
      pageMenuVisible,
      showGlobalFullscreenToggle,
      showLeftMenu,
      getMockData,
      setTopMenuValue,
    }
  }
}
</script>

<style lang="scss">
.home {
  height: 100%;
  position: relative;
  background:
    radial-gradient(circle at top left, rgba(160, 207, 255, 0.18), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #f2f6fb 100%);

  .display-flex-main {
    height: calc(100% - 72px);
    display: flex;
    gap: 14px;
    padding: 14px;
    box-sizing: border-box;
  }

  &.is-mobile {
    .display-flex-main {
      height: calc(100% - 64px);
      padding: 10px 10px 12px;
      gap: 0;
    }

    .main-display {
      border-radius: 20px;
    }
  }

  .main-display {
    flex: 1;
    min-width: 0;
    position: relative;
    overflow: hidden;
  }

  .home-fullscreen-toggle {
    position: absolute;
    top: 18px;
    right: 18px;
    z-index: 20;
  }

  .main-display-padding {
    padding: 0;
    background: transparent;
  }

  .home-view-page {
    height: 100%;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(198, 213, 225, 0.9);
    border-radius: 24px;
    box-shadow: 0 16px 40px rgba(111, 144, 176, 0.12);
    overflow: hidden;

    .home-view-title {
      display: flex;
      align-items: center;
      position: relative;
      height: 58px;
      font-size: 18px;
      border-bottom: 1px solid rgba(216, 226, 235, 0.95);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(246, 250, 255, 0.92));

      .page-title {
        padding-left: 32px;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: #314255;
      }

      .page-title::before {
        content: "";
        position: absolute;
        top: 15px;
        left: 19px;
        width: 6px;
        height: 30px;
        border-radius: 999px;
        background: linear-gradient(180deg, #8dc3ff 0%, #5da8ff 100%);
      }
    }
  }

  &.is-page-fullscreen {
    .display-flex-main {
      height: 100%;
      padding: 0;
      gap: 0;
    }

    .main-display {
      border-radius: 0;
    }

    .home-view-page {
      height: 100%;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }

    .home-fullscreen-toggle {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 4000;
    }
  }
}
</style>
