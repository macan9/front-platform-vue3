import { createRouter, createWebHashHistory } from 'vue-router'

import HomeView from '../views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    children: [
      {
        path: '/blogManage',
        name: 'blogManage',
        component: () => import('@/views/blogSystem/BlogManage.vue')
      },
      {
        path: '/BlogMain',
        name: 'BlogMain',
        component: () => import('@/views/blogSystem/BlogMain.vue')
      },
      {
        path: '/blogDisplay/:id',
        name: 'blogDisplay',
        component: () => import('@/views/blogSystem/BlogDisplay.vue')
      },
      {
        path: '/userEdit',
        name: 'userEdit',
        component: () => import('@/components/user/UserEdit.vue')
      }, {
        path: '/userTable',
        name: 'userTable',
        component: () => import('@/views/userManage/UserTable.vue')
      }, {
        path: '/userLog',
        name: 'userLog',
        component: () => import('@/views/userManage/UserLog.vue')
      }, {
        path: '/leafletMap',
        name: 'leafletMap',
        component: () => import('@/views/leafletMap/LeafletMap.vue')
      }, {
        path: '/threeGuiBase',
        name: 'threeGuiBase',
        component: () => import('@/views/three/ThreeGuiBase.vue')
      }, {
        path: '/ThreeIsland',
        name: 'ThreeIsland',
        component: () => import('@/views/three/ThreeIsland.vue')
      }, {
        path: '/DontHitTheSpike',
        name: 'DontHitTheSpike',
        component: () => import('@/views/three/DontHitTheSpike.vue')
      }, {
        path: '/threePlanet',
        name: 'threePlanet',
        component: () => import('@/views/three/ThreePlanet.vue')
      }, {
        path: '/imgUpload',
        name: 'imgUpload',
        component: () => import('@/views/imgBed/ImageBedManager.vue')
      }, {
        path: '/starSea',
        name: 'starSea',
        component: () => import('@/views/interestThing/StarSea.vue')
      }, {
        path: '/fireworks',
        name: 'fireworks',
        component: () => import('@/views/interestThing/Fireworks.vue')
      }, {
        path: '/markJsRender',
        name: 'markJsRender',
        component: () => import('@/views/blogSystem/MarkJsRender.vue')
      }, {
        path: '/markEditor',
        name: 'markEditor',
        component: () => import('@/views/blogSystem/MarkEditor.vue')
      }
    ]
  },
  {
    path: '/useView',
    name: 'useView',
    component: () => import(/* webpackChunkName: "about" */ '@/views/UseView.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/LoginPages.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes
})

// 路由守卫白名单：支持直接填写路由 name 或 path
const routeGuardWhiteList = [
  'login',
  'DontHitTheSpike'
]

const isWhiteListRoute = (to) => {
  return routeGuardWhiteList.includes(to.name) || routeGuardWhiteList.includes(to.path)
}

router.beforeEach((to, from, next) => {
  const loginStatus = localStorage.getItem('loginStatus')

  if (!isWhiteListRoute(to) && !loginStatus) {
    next({ name: 'login' })
    return
  }

  next()
})

export default router
