# README

## 构建镜像

- 本地文件构建：`docker build -t go-dev-env:1.20.6 -f ./go-dev.Dockerfile .`
- 远程文件构建：`curl -fsSL 'http://iskill.site/scripts/dockerfiles/go-dev.Dockerfile"  | docker build -t go-dev-env:1.20.6 -f - .`

**参数说明：**
- `-t go-dev-env:1.20.6`：设置镜像名称和标签
- `-f ./go-dev.Dockerfile`：指定 Dockerfile 的路径
- `.`：构建上下文路径

## 运行容器

- 临时运行：`docker run -it --rm -v $(pwd):/workspace -p 8080:8080 go-dev-env:1.20.6`
- 后台运行：`docker run -d --name go-dev -v $(pwd):/workspace -p 8080:8080 go-dev-env:1.20.6`

**参数说明：**
- `-it`：交互式终端
- `--rm`：容器退出后自动删除
- `-d`：后台运行
- `--name go-dev`：指定容器名称
- `-v $(pwd):/workspace`：将当前目录挂载到容器的 /workspace 目录
- `-p 8080:8080`：VSCode Web 服务端口映射

## 进入容器

> 一般与上面运行容器中的后台运行方式一起使用。

进入运行中的容器：`docker exec -it go-dev bash`

**参数说明：**
- `-it`：交互式终端

* `-i`：交互式（interactive）
* `-t`：分配一个终端（tty）

- `go-dev`：指定容器名称
- `bash`：要执行的命令，这里是启动 bash shell

## 修改 Docker 镜像源

```bash
# 创建配置目录（如果不存在）
sudo mkdir -p /etc/docker

# 创建或编辑 daemon.json 文件
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://registry.docker-cn.com",
    "https://docker.mirrors.ustc.edu.cn",
    "https://registry.cn-hangzhou.aliyuncs.com"
  ]
}
EOF

# 重启 Docker 服务
sudo systemctl restart docker
```