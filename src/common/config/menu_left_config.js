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
                path: '/blogManage',
                icon: 'Management',
                moblieHide: true,
            },
            {
                label: '用户管理',
                value: '1-2',
                path: '/userTable',
                icon: 'User',
                moblieHide: true,
            },
            {
                label: '用户日志',
                value: '1-3',
                path: '/userLog',
                icon: 'Document',
                moblieHide: true,
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
                moblieHide: true,
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
                moblieHide: true,
            },
            {
                label: '三维小岛',
                value: '3-3',
                path: '/ThreeIsland',
                icon: 'Compass',
                moblieHide: true,
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
                moblieHide: true,
            },
        ],
    },
    {
        pid: '6',
        children: [
            {
                label: '聊天室间',
                value: '6-1',
                path: '/chatRoom',
                icon: 'ChatDotRound',
            },
        ],
    },
    {
        pid: '7',
        children: [
            {
                label: '梦幻扭蛋',
                value: '7-3',
                path: '/gashapon',
                icon: 'GoodsFilled',
            },
            {
                label: '幸运转盘',
                value: '7-5',
                path: '/luckyWheel',
                icon: 'Refresh',
            },
            {
                label: '涂鸦跳跃',
                value: '7-4',
                path: '/graffitiJump',
                icon: 'Pointer',
            },
            {
                label: '绚烂烟花',
                value: '7-2',
                path: '/fireworks',
                icon: 'Promotion',
                moblieHide: true,
            },
            {
                label: '浩瀚星海',
                value: '7-1',
                path: '/starSea',
                icon: 'StarFilled',
                moblieHide: true,
            },
            
        ],
    },
]
