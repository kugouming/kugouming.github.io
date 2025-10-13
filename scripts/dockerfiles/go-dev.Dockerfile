# 基于Ubuntu 22.04构建
FROM ccr.ccs.tencentyun.com/library/ubuntu:22.04

# 维护者信息
LABEL maintainer="kugouming <kugouming@sina.com>"
LABEL description="A Linux-based code compilation environment with common tools, Go, and Git"

# 设置非交互模式，避免安装过程中出现交互提示
ENV DEBIAN_FRONTEND=noninteractive

# 使用阿里云镜像源
RUN sed -i 's/ports.ubuntu.com/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    sed -i 's/archive.ubuntu.com/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    sed -i 's/security.ubuntu.com/mirrors.aliyun.com/g' /etc/apt/sources.list

# 更新系统并安装常用系统命令和工具
RUN apt-get update && apt-get install -y \
    # 常用系统命令
    apt-utils \
    build-essential \
    curl \
    wget \
    vim \
    nano \
    git \
    ssh \
    zip \
    unzip \
    tar \
    gzip \
    bzip2 \
    rsync \
    tree \
    procps \
    net-tools \
    iputils-ping \
    dnsutils \
    lsof \
    psmisc \
    # 编译相关工具
    gcc \
    make \
    cmake \
    automake \
    autoconf \
    libtool \
    pkg-config \
    # 其他开发工具
    python3 \
    python3-pip \
    openjdk-17-jdk \
    # GVM 依赖
    bison \
    bsdmainutils \
    mercurial \
    && rm -rf /var/lib/apt/lists/*

# 设置 GVM 和 Go 环境变量
ENV GVM_GO_GET=https://golang.google.cn/dl/
ENV GOPROXY=https://goproxy.io,direct

# 安装 GVM (Go Version Manager)
RUN curl -s -S -L https://raw.githubusercontent.com/moovweb/gvm/master/binscripts/gvm-installer | bash

# 配置 GVM
ENV GVM_ROOT=/root/.gvm
ENV PATH=$PATH:$GVM_ROOT/scripts

# 设置 Go 版本
ENV GO_VERSION=1.22.11

# 安装 Go bootstrap 和目标版本
RUN bash -c "source $GVM_ROOT/scripts/gvm && \
    gvm install go${GO_VERSION} -B && \
    gvm use go${GO_VERSION} --default && \
    export GOPROXY=https://goproxy.io,direct && \
    go install github.com/go-delve/delve/cmd/dlv@v1.24.0" || true

## 安装Go (指定最新稳定版本，当前为1.22.5)
#ENV GO_VERSION=1.22.5
#ENV GO_DOWNLOAD_URL=https://dl.google.com/go/go${GO_VERSION}.linux-amd64.tar.gz
#
#RUN wget -q ${GO_DOWNLOAD_URL} -O go.tar.gz \
#    && tar -C /usr/local -xzf go.tar.gz \
#    && rm go.tar.gz

# 配置Go环境变量
ENV GOPATH=/go
ENV PATH=$PATH:$GOPATH/bin

# 创建Go工作目录
RUN mkdir -p $GOPATH/src $GOPATH/bin \
    && chmod -R 777 $GOPATH

# 安装 code-server (VS Code Web)
RUN curl -fsSL https://code-server.dev/install.sh | sh

# 配置 code-server
ENV PASSWORD=123456
EXPOSE 8080

# 创建配置目录
RUN mkdir -p /root/.config/code-server
RUN echo "bind-addr: 0.0.0.0:8080\nauth: password\npassword: ${PASSWORD}\ncert: false" > /root/.config/code-server/config.yaml

# 验证安装的版本
RUN echo "Git version: $(git --version)" \
    && echo "Go version: $(go version)" \
    && echo "GCC version: $(gcc --version | head -n1)" \
    && echo "Python3 version: $(python3 --version)" \
    && echo "Java version: $(java --version | head -n1)" \
    && echo "Code-server version: $(code-server --version)"

# 设置工作目录
WORKDIR /workspace

# 创建启动脚本
RUN echo '#!/bin/bash\n\
# 后台启动 code-server\n\
code-server --bind-addr 0.0.0.0:8080 /workspace &\n\
\n\
# 等待 code-server 启动\n\
echo "正在启动 VS Code Web 服务..."\n\
sleep 3\n\
echo "VS Code Web 服务已启动，访问 http://localhost:8080"\n\
\n\
# 启动 bash 交互\n\
exec /bin/bash\n\
' > /start.sh \
    && chmod +x /start.sh

# 启动脚本
CMD ["/start.sh"]
