//导入axios
import axios from 'axios'
import { globals_config } from '/public/config/globals_config'

import { ElMessage } from 'element-plus'
import { loginOut } from '@/common/plugins/user_manage_methods'


//使用axios下面的create([config])方法创建axios实例，其中config参数为axios最基本的配置信息。
const api = axios.create({
   baseURL: globals_config.api_service || globals_config.host_service,
	timeout: 4000,   //请求超时设置，单位ms
   withCredentials: true, // 携带 Cookie，保证验证码和登录在同一会话
})

// 请求相关处理 请求拦截 在请求拦截中可以补充请求相关的配置
// interceptors axios的拦截器对象
api.interceptors.request.use(config => {
   // console.log(config,'interceptors,request');

   // gitee baseurl 修改
   const isGiteeUrl = config.url.startsWith('/gitee');
   if(isGiteeUrl){
      // gitee 为第三方域名，不能携带本地 Cookie，否则会触发跨域 + withCredentials 限制
      config.baseURL = 'https://gitee.com';
      config.url = config.url.replace('/gitee','')
      config.withCredentials = false;
   }else{
      const userInfo_str = localStorage.getItem('userInfo')
      if(userInfo_str){
         // console.log(userInfo_str,'userInfo_str')
         const userInfo = JSON.parse(userInfo_str) 
         const token = userInfo.token; // 替换为你的实际 Token
         config.headers.Authorization = `JWT ${token}`;
      }
      config.headers['Accept-Language'] = 'zh-hans';
   }
   
   return config // 将配置完成的config对象返回出去 如果不返回 请求讲不会进行
}, err => {
   // 请求发生错误时的相关处理 抛出错误
  return Promise.reject(err)
})

api.interceptors.response.use(res => {
   // 我们一般在这里处理，请求成功后的错误状态码 例如状态码是500，404，403
   // console.log(res,'interceptors.response')
   return res
}, err => {
    // 服务器响应发生错误时的处理
    console.log(err,'interceptors.response.err')
    const msg = err?.response?.data?.message || err?.message || '请求失败'
    ElMessage({
      message: String(msg),
      type: 'error',
   })
   const loginStatus = String(localStorage.getItem('loginStatus') || '').trim()
   if(err.response && err.response.status == 401 && loginStatus){
      loginOut()
   }
    return Promise.reject(err)
})



//导出我们建立的axios实例模块，ES6 export用法
export default api
