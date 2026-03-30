# front-platform-vue3

### Compiles and hot-reloads for development
```
npm run serve
```
## 配置项记录
### 默认运行端口
``` js
module.exports = {
  devServer: {
    port: 8010,
  },
}
```
### 配置公共路径
``` js
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  },
  publicPath: './',
```
### 安装好node-sass，sass-loader， 配置vue文件中可以解析  lang = 'scss' 
``` js
  pluginOptions: {
    'style-resources-loader': {
      preProcessor: 'scss',
      patterns: []
    }
  },
```
### 引入公共的 scss 文件
``` js
  css: {
    loaderOptions: {
      scss: {
        additionalData: `@import "@/styles/main.scss";`,
      },
    },
  },
```

### 遇到的坑
1. 没有服务器支持下使用历史路由模式导致刷新页面报404
2. 原生的 form submit 没有阻止原始事件，导致多次提交，多次路由跳转
3. element plus icon 部分功能需要全局注册才能正常使用
4. mock 会拦截浏览器 http。如果mock配置正确，反而不会产生 http 请求
5. axios全局注册目前看来没有节约多少代码量，不如将各种 api 放在一起管理
6. 不能使用 debugger的问题在 package.json 里的 eslintConfig 配置 rules 即可解决


vue3 语法学习
1. 在 setup 中定义 props, 以及取到 props的值，setup 一定要定义类型, toRef toRefs 会产生一个新的引用变量!
```js
 import { defineProps,toRefs } from 'vue'
 <script lang="js" setup>
    const props = defineProps({
       dialogVisible: {
         type: Boolean,
         default: false,
       },
    });
    const {dialogVisible} = toRefs(props)
  </script>
```
2. emit 引入
```js
const emit = defineEmits(['update-value']);
const updateValue = (val) => {
   emit('update-value', val)
}
```
3. 定义 let leftMenu = reactive([])，关于直接对 leftMenu 数组赋值时会让它本身失去响应式
   解决办法
方案1：创建一个响应式对象，对象的属性是数组
```js
const state = reactive({
    arr: []
});
state.arr = [1, 2, 3]
```
方案2: 使用 ref 函数 
```js
const state = ref([])
state.value = [1, 2, 3]
```
方案3: 使用数组的push方法
```js
const arr = reactive([])
arr.push(...[1, 2, 3])
```
1. 将 proxy 数组对象转化为 可读数组
```js
const leftMenu = reactive({
   leftMenuVal:[]
})
const target = Array.from(leftMenu.leftMenuVal);
```


### 还没解决的问题
1. 无
   



