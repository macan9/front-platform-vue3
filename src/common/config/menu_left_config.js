export const menu_left_config = [
    {
        pid: '1',
        children: [
            {
                label: '我的博客',
                value: '1-7',
                path: '/BlogMain',
                icon: 'HomeFilled',
            },
            {
                label: '博客管理',
                value: '1-1',
                path: '/blogManage?myBlog=1',
                icon: 'Management',
            },
            {
                label: '用户管理',
                value: '1-2',
                path: '/userTable',
                icon: 'User',
            },
            {
                label: '用户日志',
                value: '1-3',
                path: '/userLog',
                icon: 'Document',
            },
            {
                label: '图床管理',
                value: '1-4',
                path: '/imgUpload',
                icon: 'UploadFilled',
            },
            // {
            //     label: 'MD 解析',
            //     value: '1-5',
            //     path: '/markJsRender',
            //     icon: 'Notebook',
            // },
            // {
            //     label: '富文本',
            //     value: '1-6',
            //     path: '/markEditor',
            //     icon: 'EditPen',
            // },
        ],
    },
    {
        pid: '2',
        children: [
            {
                label: '地图展示',
                value: '2-1',
                path: '/leafletMap',
                icon: 'MapLocation',
            },
            {
                label: '标记管理',
                path: '/blogManage',
                value: '2-2',
                icon: 'Location',
            },
        ],
    },
    {
        pid: '3',
        children: [
            {
                label: '场景演示',
                value: '3-1',
                path: '/threeGuiBase',
                icon: 'Monitor',
            },
            {
                label: '躲避尖刺',
                value: '3-4',
                path: '/DontHitTheSpike',
                icon: 'Aim',
            },
            {
                label: '行星示例',
                value: '3-2',
                path: '/threePlanet',
                icon: 'Sunny',
            },
            {
                label: '三维小岛',
                value: '3-3',
                path: '/ThreeIsland',
                icon: 'Compass',
            },
        ],
    },
    {
        pid: '4',
        children: [
            {
                label: '博客管理',
                value: '4-1',
                path: '/blogManage',
                icon: 'Management',
            },
        ],
    },
    {
        pid: '5',
        children: [
            {
                label: '用户简历',
                value: '5-1',
                path: '/MyResume',
                icon: 'Tickets',
            },
        ],
    },
    {
        pid: '6',
        children: [
            {
                label: '聊天室间',
                value: '6-1',
                path: '/blogManage',
                icon: 'ChatDotRound',
            },
        ],
    },
    {
        pid: '7',
        children: [
            {
                label: '星海',
                value: '7-1',
                path: '/starSea',
                icon: 'StarFilled',
            },
            {
                label: '烟花',
                value: '7-2',
                path: '/fireworks',
                icon: 'Promotion',
            },
            {
                label: '涂鸦',
                value: '7-4',
                path: '/blogManage',
                icon: 'Pointer',
            },
            {
                label: '转盘',
                value: '7-3',
                path: '/blogManage',
                icon: 'Refresh',
            },
        ],
    },
]
