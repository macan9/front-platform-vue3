<template>
  <div class="use-home">
      <div class="main-display">
        <div>use</div> 
        <el-button @click="routeBack"> 返回 </el-button>
      </div>
  </div>
</template>

<script>
// @ is an alias to /src
import { useRouter } from 'vue-router'



export default {
  name: 'UseView',
  components: {

  },
  setup(){
    const router = useRouter()
    const routeBack =()=>{
      router.push('/blogManage')
    } 
    return {
      routeBack
    };
  }
}
</script>
<style lang="scss">
.use-home{
  height: 100%;
  .display-flex{
    height: calc(100% - 60px);
    display: flex;
  }
  .main-display{
    width: calc(100% - 230px);
    padding: 10px;
  }
  // 子页面样式1
  .use-home-view-page{
     border: 1px solid gainsboro;
     border-radius: 5px;
     box-shadow: 2px 2px 8px gray;
     height: 100%;
  }
}
</style>
