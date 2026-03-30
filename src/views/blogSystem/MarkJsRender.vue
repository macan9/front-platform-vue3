<template>
    <div class="home-view-page MarkJsRender">
        <el-button @click="isLightTheme=!isLightTheme" style="width:300px">change code style</el-button>
        <el-button @click="changeMdString" style="width:300px">change md</el-button>
        <div class="editor-main">
            <el-input
                type="textarea"
                placeholder="请输入内容"
                v-model="mds"
                @input="textareaChange"
            >
            </el-input>
            <div v-html="markdownHTML" id="mark-container" :class="themeClass"></div>
        </div>
        
    </div>
</template>

<script setup>

import { onMounted,ref,computed } from 'vue';
import { renderMarkdown } from '@/utils/markdown.js'
// import 'highlight.js/styles/github.css';
// import 'highlight.js/styles/atom-one-dark.css';
import 'highlight.js/styles/atom-one-light.css';
// const rendererMD = new marked.Renderer();



// marked.setOptions({ //基本设置
//     gfm: true, //默认为true。 允许 Git Hub标准的markdown.
//     tables: true, //默认为true。 允许支持表格语法。该选项要求 gfm 为true。
//     breaks: true, //默认为false。 允许回车换行。该选项要求 gfm 为true。
//     pedantic: false, //默认为false。 尽可能地兼容 markdown.pl的晦涩部分。不纠正原始模型任何的不良行为和错误。
//     sanitize: true, //对输出进行过滤（清理）
//     smartLists: true,
//     smartypants: true, //使用更为时髦的标点，比如在引用语法中加入破折号。
//     highlight: function(code) {
//         return hljs.highlightAuto(code).value;
//     },
// });


const markdownHTML = ref("")

const isLightTheme = ref(false)
const themeClass = computed(() => isLightTheme.value ? 'hljs-atom-one-light' : 'hljs-atom-one-dark')


const textareaChange = (val) => {
    markdownHTML.value = renderMarkdown(val);
}


const markdownString = '# front-platform-vue3\n### Compiles and hot-reloads for development \n```npm run serve```\n## 配置项记录\n### 默认运行端口\n ```js\nmodule.exports = {\n  devServer: {\n   port: 8010,\n  }\n } \n```';
const mds = ref(markdownString)
const changeMdString = () => {
    markdownHTML.value = renderMarkdown(mds.value);
}

onMounted(()=>{
    
    // # marked(markdownString [options] [callback])
    // markdownString 传入 md 字符串 返回一个 html 字符串
    // options是你渲染的设置——它是一个对象。
    // callback是回调函数。如果 options 参数没有定义，它就是第二个参数。
    markdownHTML.value = renderMarkdown(mds.value);
})

</script>

<style lang="scss">
    .MarkJsRender{
        padding: 10px;
        .editor-main{
            display: flex;
            margin: 10px;
            height: calc(100% - 40px);
            >div{
                margin: 10px;
                width: calc(50% - 20px);
                height:calc(100% - 20px);
                
            }
            #mark-container{
                overflow: auto;
                display: block;
                text-align: start;
                * {
                    margin: 15px 0 ;
                }
            }
            
        }
        .el-textarea{
            .el-textarea__inner{
                height: 100%;
            }
        }
    }
</style>
