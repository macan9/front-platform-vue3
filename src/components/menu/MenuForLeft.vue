<template>
  <el-menu
    active-text-color="#337ECC"
    background-color="#ECF5FF"
    class="el-menu-vertical-demo"
    :default-active='defaultActiveMenu'
    @open="handleOpen"
    @close="handleClose"
    @select="selectMenuAfter"
  >  
    
    
    <template v-for="item in leftMenu.leftMenuTree" :key="item.value">

      <!-- 存在子路由 -->
      <template v-if="item.children && item.children.length">
        <el-sub-menu :index="item.value.toString()">
          <template #title>
            <el-icon><component :is="item.icon"/></el-icon>
            <span>{{ item.label }}</span>
          </template>
          <el-menu-item v-for="child in item.children" :key="child.value" :index="child.value.toString()"
           @click="router.push(child.path)">
            {{ child.label }}
          </el-menu-item>
        </el-sub-menu>
      </template>
      <!-- 不存在子路由 -->
      <template v-else>
        <el-menu-item :index="item.value.toString()" @click="router.push(item.path)">
          <el-icon><component :is="item.icon"/></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </template>

    </template>

  </el-menu>
</template>
  
  <script lang="js" setup>
    import { menu_left_config } from '@/common/config/menu_left_config'
    import { useRouter } from 'vue-router';
    import { reactive , watch} from 'vue';
    import { defineProps, toRef} from 'vue'
    const router = useRouter();

    // data
    const props = defineProps({
      topMenuValue: {
        type: String,
        default: '1',
      },
    });
    const topMenuValue  = toRef(props,'topMenuValue')

    let defaultActiveMenu = "1"

    const leftMenu = reactive({
      leftMenuTree:[]
    })

    watch(() => topMenuValue.value, () => {
      useMenu()
      selectFirstMenu()
    });

    
    // methods
    // topMenuValue 和 defaultActiveMenu 都需要存储在 localStorage, 当页面重载时读取，当页面销毁时存储
    const useMenu = () => {
      // console.log(topMenuValue.value,menu_left_config,'topMenuValue')
      menu_left_config.map(i=>{
        if(i.pid == topMenuValue.value){
          i.children && (leftMenu.leftMenuTree = i.children)
        }
      })
    }

    const selectFirstMenu = () =>{
      // 默认选中第一项
      const target = Array.from(leftMenu.leftMenuTree); // 将 proxy 数组对象转化为 可读数组
      if(target.length){
        let targetItem
        if(target[0].children && target[0].children.length){
          targetItem = target[0].children[0]
        }else{
          targetItem = target[0]
        }
        router.push(targetItem.path)
        defaultActiveMenu = targetItem.value
      }
    }

    const setActiveMenu = () => {
      const activeLeftMenu = localStorage.getItem('activeLeftMenu')
      // 特殊情况不执行 自动菜单跳转
      const spcialMenu = ['1-1-2']
      console.log(activeLeftMenu,'activeLeftMenu')
      if(spcialMenu.indexOf(activeLeftMenu)>-1){
        return
      }
      if(activeLeftMenu) {
        // 递归找出对应 item，如果存在跳转并设置默认值
        findMenu( activeLeftMenu, leftMenu.leftMenuTree )
      }else{
        selectFirstMenu()
      }
    }

    const findMenu = (key,tree) => {
      if(!tree){
        // 未匹配到结果 终止递归
        selectFirstMenu()
        return
      }
      tree.map(i=>{
        if(i.value===key){
          // 匹配到结果终止递归
          router.push(i.path)
          defaultActiveMenu = i.value
          return
        }
        if(i.children){
          findMenu(key,i.children)
        }
      })
    }

    const selectMenuAfter = (index,indexPath,item)=>{
      console.log( index, indexPath,item, 'indexPath')
      localStorage.setItem('activeLeftMenu',index)
    }
    const handleOpen = (key, keyPath) => {
      console.log(key, keyPath)
    }
    const handleClose = (key, keyPath) => {
      console.log(key, keyPath)
    }

    // 初始化调用
    useMenu()
    setActiveMenu()

  </script>

  <style lang="scss">
    .el-menu-vertical-demo{
      height: 100%;
      width: 125px;
      .el-sub-menu .el-sub-menu__icon-arrow{
        margin-right: -15px;
      }
    }
  </style>
  