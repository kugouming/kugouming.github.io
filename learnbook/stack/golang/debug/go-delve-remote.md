# Golang 远程调试

当线上或其它非本地环境遇到问题无法本地复现时，往往需要远程调试，在服务端运行服务，本地使用 IDE 进行调试，本文介绍在 IDEA 使用 Delve 做远程调试，虽然 IDEA Go Remote 有比较清楚说明，但使用中还是有几点需要注意。

## Delve 安装

根据环境分别在服务端和本地安装`dlv`工具，[Installation](https://github.com/go-delve/delve/tree/master/Documentation/installation)

## Delve 使用

具体使用参见：[dlv-coredump](./stack/golang/debug/dlv-coredump.md) 文档

## Go Remote

首先在 IDEA 的 Run/Debug Configurations 选择**➕**添加 Go Remote，`Host`填主机 IP，`Port`可以默认不变，同时窗口中有以下说明：

```bash
# 原文：Before running this configuration, please start your application and Delve as described bellow. Allow Delve to compile your application:
# 译文：在运行此配置之前，请按照如下所述启动您的应用程序和 Delve。允许 Delve 编译您的应用程序：

dlv debug --headless --listen=:2345 --api-version=2 --accept-multiclient

# 原文：Or compile the application using one of these commands:
# 译文：或者使用以下命令之一编译应用程序：

go build -gcflags "all=-N -l" github.com/app/demo

# 原文：for Go 1.10 or later
# 译文：对于 Go 1.10 或更高版本

go build -gcflags "-N -l" github.com/app/demo

# 原文：for Go 1.9 or earlier
# 译文：对于 Go 1.9 或更早版本

# 原文：and then run it via Delve with the following command:
# 译文：然后通过 Delve 使用以下命令运行它：

dlv --listen=:2345 --headless=true --api-version=2 --accept-multiclient exec ./demo
```

基本了解后开始介绍具体使用流程，**此时可以把 Host 填好并 Apply**。

## 编译

使用`go build -gcflags "all=-N -l" github.com/app/demo`编译，以[golearn/proxy](https://github.com/kugouming/golearn/blob/main/proxy/main.go)为例：

```bash
cd $GOPATH/src/github.com/kugouming/golearn

# 编译 linux

GOOS=linux go build -gcflags "all=-N -l" ./proxy/main.go
```

**上传执行文件服务端**

```bash
scp main root@{HOST_IP}:/workdir/
```

## Delve 运行服务

接下来在服务端运行服务，这时有个问题，**命令行参数**怎么添加？答案是需要使用`--`与 Delve 运行命令分隔开，如`gateway`示例添加`-e`参数使用标准输出打印日志，命令如下：

```bash
# 无参数
dlv --listen=:2345 --headless=true --api-version=2 --accept-multiclient exec ./main

# 有参数
dlv --listen=:2345 --headless=true --api-version=2 --accept-multiclient exec ./main -- -e
# 参数说明：
#    --: 为分隔符
#    -e: 为参数
```

## 调试

此时回到 IDEA 启动 Debug 就可以远程调试了

调试时如果需要修改`gateway`的启动参数，又会遇到另一个问题，在服务端的终端`ctl + c`无法退出，这时需要使用本地安装的`dlv`工具连接到服务端，然后执行`exit`会询问`Would you like to kill the headless instance? [Y/n]`选择`Y`，此时服务端终端退出，再重新启动。

```bash
dlv connect {HOST_IP}:2345

Type 'help' for list of commands.

(dlv) exit

Would you like to kill the headless instance? [Y/n] Y
```