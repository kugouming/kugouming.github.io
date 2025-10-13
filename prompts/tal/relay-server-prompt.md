# 终端自动登录环境脚本

----------------------------------------

这里是脚本注释
1、安装 chrome-devtools 工具
`npx chrome-devtools-mcp@latest`
2、安装 iterm 工具
`npx -y iterm-mcp`

----------------------------------------

## 环境地址
- 线上：https://cloud.tal.com/k8s-fe/
- 测试：https://cloud-test.tal.com/k8s-fe/

## 登录环境
- 线上：10.160.206.137
- 测试：10.176.81.208

## 操作内容
- 请根据用户提供的环境信息从 「环境地址」 「登录环境」 中分别提取出变量 {cloud_url} {realy_host}；
- 调用 chrome-devtools 工具打开地址 {cloud_url},并判断用户是否登录,若未登录则引导用户登录,已登陆则从请求请获取 Authorization 字段信息（需要包含Bearer前缀的字符串）；
- 将上面获取到的 Authorization 信息复制到剪贴板中；
- 然后调用 iTerm 工具,判断当前终端内是否有正在运行的SSH会话,存在则先退出,然后在终端上执行 `ssh -p 2222 {relay_host}` 命令
- 最后将剪贴板中的内容粘贴到终端,无需等待返回