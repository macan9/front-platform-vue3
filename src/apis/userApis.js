import { postApi, getApi, delApi, putApi } from '@/common/requests/requests.js'
import { globals_config } from '/public/config/globals_config'

// 用户登录
export const loginReq = async (data)=>{
  return await postApi('/api/users/login/',data)
}

// 用户注册
export const registerReq = async (data)=>{
  return await postApi('/api/v1/users/',data)
}

// 用户列表查询
export const userListGet = async ()=>{
  return await getApi('/api/v1/users/')
}

// 个人信息查询
export const userInfoGet = async (id)=>{
  return await getApi(`/api/v1/users/${id}/`)
}

// 个人信息修改
export const userInfoPut = async (id,data)=>{
  return await putApi(`/api/users/${id}/`,data)
}

// 用户删除
export const userDelete = async (id)=>{
  return await delApi(`/api/v1/users/delete/${id}/`)
}

// 用户登录日志
export const userLogGet = async (params)=>{
  let url_string = '?'
  Object.keys(params).map(k=>{
    url_string += k + "=" + params[k] + "&"
  })
  url_string = url_string.slice(0, -1)
  return await getApi(`/api/v1/users/login_log/${url_string}`)
}


function upDateGiteeConfig() {
  let giteeConfig
  const configString = localStorage.getItem('giteeConfig')
  if(configString && JSON.parse(configString)){
    giteeConfig = JSON.parse(configString)
  }else{
    giteeConfig = globals_config.gitee_user_config
  }
  return giteeConfig
}


// gitee 上传图片
export const uploadUserAvatarReq = async (file,name)=>{
  const { owner, repo, path, access_token, message } = upDateGiteeConfig()
  const data_ = { content: file, access_token, message }
  return await postApi(`/gitee/api/v5/repos/${owner}/${repo}/contents/${path}/${name}`,data_)
}

// gitee 获取图片列表
export const getGiteeImgList =  async () => {
  const { owner, repo, path, access_token } = upDateGiteeConfig()
  return await getApi(`/gitee/api/v5/repos/${owner}/${repo}/contents/${path}?access_token=${access_token}`)
}

export const delGiteeImg =  async (sha,name) => {
  const { owner, repo, path, access_token, message } = upDateGiteeConfig()
  const data = { access_token, message, sha }
  const delStr = `?access_token=${access_token}&message=${message}&sha=${sha}`
  return await delApi(`/gitee/api/v5/repos/${owner}/${repo}/contents/${path}/${name}${delStr}`,data)
}










