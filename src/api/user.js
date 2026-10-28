// 用户相关所有请求

import request from "@/utils/request"

export const getUser = () => request({
    url: "/api/user",
    method: "get"
})

// 登录（账号密码由后端校验）
export const login = data => request({
    url: "/api/login",
    method: "post",
    data
})
