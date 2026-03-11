<template>
    <div class="home-view-page user-log">
        <div class="home-view-title">
            <div class="page-title">用户日志</div>
        </div>

        <div class="user-main">
            <div class="user-header">
                <el-button size="small" type="success" @click="UpDateInfo()">UpDate</el-button>
                <div style="margin-left:20px">
                    <span>时间筛选：</span>
                    <el-date-picker v-model="time_values" type="datetimerange" start-placeholder="Start Date"
                        end-placeholder="End Date" :default-time="defaultTime" size="small" />
                </div>
            </div>
            <el-table :data="filterTableData" style="width: 100%">
                <el-table-column label="用户名" prop="username" width="100" />
                <el-table-column label="ip" prop="ip" width="160" />
                <el-table-column label="登录时间" prop="login_time" width="200" />
                <el-table-column label="登录状态" prop="status" width="120">
                    <template #default="scope">
                        {{ scope.row.status ? "登录成功" : "登录失败" }}
                    </template>
                </el-table-column>
                <el-table-column label="失败理由" prop="fail_reason">
                    <template #default="scope">
                        {{ scope.row.fail_reason ? scope.row.fail_reason : "--" }}
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <div class="user-bottom">
            <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="total"
                layout="prev, pager, next" @current-change="handleCurrentChange" />
        </div>

    </div>

</template>

<script lang="js" setup>
import { userLogGet } from "@/apis/userApis.js"
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DailyTimeFormat } from '@/utils/utils.js'

const tableData = ref([]);

const currentDate = new Date();
// 获取当前日期时间的年份
const currentYear = currentDate.getFullYear();
const oneYearAgoYear = currentYear - 1;
const oneYearAgoDate = new Date(oneYearAgoYear,
    currentDate.getMonth(), currentDate.getDate(),
    currentDate.getHours(), currentDate.getMinutes(),
    currentDate.getSeconds()
);
const defaultRange = [
    oneYearAgoDate,
    currentDate,
]
const time_values = ref(defaultRange)

// Element Plus: datetimerange 的 default-time 是“默认时分秒”，不是默认日期范围
const defaultTime = [
    new Date(2000, 0, 1, 0, 0, 0),
    new Date(2000, 0, 1, 23, 59, 59),
]

// 分页逻辑
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const filterTableData = computed(() =>
    tableData.value
)

const getUserLogData = async () => {
    const [start, end] = Array.isArray(time_values.value) ? time_values.value : []
    if (!start || !end) {
        ElMessage({
            message: '请选择完整的时间范围',
            type: 'warning',
        })
        return -1
    }
    const params = {
        currentPage: currentPage.value,
        pageSize: pageSize.value,
        start_time: DailyTimeFormat(start),
        end_time: DailyTimeFormat(end),
    }
    const res = await userLogGet(params)
    const { code, data } = res
    const { list, pagination } = data
    // 后端字段映射：created_at/success/message -> login_time/status/fail_reason，供表格显示使用
    tableData.value = Array.isArray(list)
        ? list.map(item => ({
            ...item,
            login_time: DailyTimeFormat(new Date(item.created_at)),
            status: item.success === 1,
            fail_reason: item.success === 1 ? '' : item.message,
        }))
        : []
    // 根据后端字段名来，比如 pagination.total / pagination.count
    total.value = pagination?.total ?? 0
    return code
}

const UpDateInfo = async () => {
    const code = await getUserLogData()
    if (code == 0) {
        ElMessage({
            message: '刷新成功',
            type: 'success',
        })
    }
}
const handleCurrentChange = (val) => {
    currentPage.value = val
    getUserLogData()
}

onMounted(() => {
    getUserLogData()
})


</script>
<style lang="scss">
.user-log {

    // padding: 10px;
    .user-main {
        padding: 15px;
    }

    .user-header {
        display: flex;
        align-items: center;
        padding-left: 15px;
        height: 40px;
    }

    .user-bottom {
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
}
</style>
