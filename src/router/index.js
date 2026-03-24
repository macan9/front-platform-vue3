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
        path: '/chatRoom',
        name: 'chatRoom',
        component: () => import('@/views/chatRoom/ChatRoom.vue')
      },
      {
        path: '/BlogMain',
        name: 'BlogMain',
        meta: { public: true },
        component: () => import('@/views/blogSystem/BlogMain.vue')
      },
      {
        path: '/blogDisplay/:id',
        name: 'blogDisplay',
        meta: { public: true },
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
        meta: { public: true },
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
        path: '/gashapon',
        name: 'gashapon',
        meta: { public: true },
        component: () => import('@/views/interestThing/Gashapon.vue')
      },{
        path: '/luckyWheel',
        name: 'luckyWheel',
        meta: { public: true },
        component: () => import('@/views/interestThing/LuckyWheel.vue')
      },  {
        path: '/graffitiJump',
        name: 'graffitiJump',
        meta: { public: true },
        component: () => import('@/views/interestThing/GraffitiJump.vue')
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
    path: '/MyResume',
    name: 'MyResume',
    meta: { public: true },
    component: () => import(/* webpackChunkName: "resume" */ '@/views/MyResume.vue')
  },
  {
    path: '/login',
    name: 'login',
    meta: { public: true },
    component: () => import('@/views/login/LoginPages.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes
})

// 路由守卫白名单：支持直接填写路由 name 或 path
const isPublicRoute = (to) => to.matched.some((record) => record.meta?.public)

router.beforeEach((to, from, next) => {
  const loginStatus = localStorage.getItem('loginStatus')

  if (!isPublicRoute(to) && !loginStatus) {
    next({ name: 'login' })
    return
  }

  next()
})

export default router
