<template>
    <div class="home-view-page user-table">
        <div class="home-view-title">
            <div class="page-title">用户管理</div>
        </div>
       
        <div class="user-main">
            <div class="user-header">
                <el-button size="small" type="success" @click="handleAdd()">新增用户</el-button>
                <el-button size="small" type="primary" @click="getUserData()">刷新列表</el-button>
            </div>
            <el-table :data="filterTableData" style="width: 100%">
                <el-table-column label="用户名" prop="username" />
                <el-table-column label="昵称" prop="nickname" />
                <el-table-column label="邮箱" prop="email" width="200" />
                <el-table-column label="手机号" prop="mobile" />
                <!-- <el-table-column label="性别" prop="sex" width="80">
                    <template #default="scope">
                        {{scope.row.sex?"女":"男"}}
                    </template>
                </el-table-column> -->
                <el-table-column label="个性签名" prop="description" />
                <el-table-column align="right" width="200" >
                    <template #header>
                        <el-input v-model="search" size="small" placeholder="输入用户名过滤" />
                    </template>
                    <template #default="scope">
                        <el-button size="small" @click="handleEdit(scope.$index, scope.row)">
							编辑
						</el-button>
                        <el-button size="small" type="danger" @click="handleDelete(scope.$index, scope.row)">
                            删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <div class="user-bottom"></div>

        <UserRegister @update-user-data="getUserData" :dialogVisible="dialogAddVisible"></UserRegister>

        <UserEdit 
            v-if="dialogEditVisible.attr" 
            :userId="userId"
            :dialogVisible="dialogEditVisible" 
            @update-user-data="getUserData" 
        >
        </UserEdit>
    </div>
    
</template>

<script lang="js" setup>
    import { userListGet, userDelete } from "@/apis/userApis.js"
    import { computed, ref, reactive } from 'vue'
    import { ElMessage, ElMessageBox } from 'element-plus'
    import UserRegister from '@/components/user/UserRegister.vue'
    import UserEdit from '../../components/user/UserEdit.vue'


    const search = ref('')
    const tableData = ref([]);
    const userId = ref('')
    let dialogAddVisible = reactive({attr:false})
    let dialogEditVisible = reactive({attr:false})

    const filterTableData = computed(() =>
        tableData.value.filter(
            (data) =>
                !search.value ||
                data.username.toLowerCase().includes(search.value.toLowerCase())
        )
    )

    const getUserData = async () => {
        try {
            const  { data } = await userListGet()
            tableData.value = Array.isArray(data) ? data : []
        } catch (e) {
            console.error('getUserData failed', e)
            tableData.value = []
        }
    }

    const handleEdit = (index, row) => {
        console.log(index, row)
        dialogEditVisible.attr = true
        userId.value = row.id
    }
    const handleDelete = async (index, row) => {
        console.log(index, row)
        ElMessageBox.confirm('确定要删除该用户吗？')
        .then(async () => {
            await userDelete(row.id)
            ElMessage({
                message: '删除成功',
                type: 'success',
            })
            getUserData()
        })
        .catch(() => {
            // catch error
        })
        

    }
    const handleAdd = () => {
        dialogAddVisible.attr = true
    }

    getUserData()

    
</script>
<style lang="scss">
.user-table{
    padding: 10px;
    .user-main{
        padding: 15px;
    }
    .user-header{
        display: flex;
        align-items: center;
        padding-left: 15px;
        height: 40px;
    }
}
</style>
