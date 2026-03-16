<template>
  <div class="home">
    <MenuForTop @update-menu-value="setTopMenuValue" />

    <div class="display-flex-main">
      <MenuForLeft v-if="showLeftMenu" :topMenuValue="topMenuValue" />

      <div class="main-display" :class="hasPadding ? 'main-display-padding' : ''">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script>
import MenuForTop from '@/components/menu/MenuForTop.vue'
import MenuForLeft from '@/components/menu/MenuForLeft.vue'
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'

export default {
  name: 'HomeView',
  components: {
    MenuForTop,
    MenuForLeft,
  },
  setup() {
    const menuVal = localStorage.getItem('topMenuValue')
    const topMenuValue = menuVal ? ref(menuVal) : ref('1')

    const setTopMenuValue = (val) => {
      topMenuValue.value = val
    }

    const route = useRoute()
    const hasPadding = ref(true)
    const noPaddingRoutes = ['/leafletMap', '/threeGuiBase', '/threePlanet', '/ThreeIsland', '/DontHitTheSpike']
    const showLeftMenu = computed(() => {
      if (route.path !== '/DontHitTheSpike') return true
      return route.query.menuSource === 'left'
    })

    watch(() => topMenuValue.value, () => {
      localStorage.setItem('topMenuValue', topMenuValue.value)
    })

    watch(
      () => route.path,
      (newPath) => {
        judgePadding(newPath)
      }
    )

    const judgePadding = (newPath) => {
      if (noPaddingRoutes.indexOf(newPath) > -1) {
        hasPadding.value = false
      } else {
        hasPadding.value = true
      }
    }

    const getMockData = () => {
    }

    judgePadding(route.path)

    return {
      topMenuValue,
      hasPadding,
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

  .main-display {
    flex: 1;
    min-width: 0;
    border-radius: 24px;
    overflow: hidden;
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
        top: 18px;
        left: 16px;
        width: 6px;
        height: 22px;
        border-radius: 999px;
        background: linear-gradient(180deg, #8dc3ff 0%, #5da8ff 100%);
      }
    }
  }
}
</style>
