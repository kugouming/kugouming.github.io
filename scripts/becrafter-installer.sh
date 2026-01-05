#!/bin/bash

# 下载BeCrafter仓库软件安装包的脚本
# 使用方法: 
#    本地: ./becrafter-installer.sh <软件包名> [版本号]
#    远程: 
#       curl -fsSL 'http://iskill.site/scripts/becrafter-installer.sh' | bash prompt-manager 0.1.6 true
#       curl -fsSL 'http://iskill.site/scripts/becrafter-installer.sh' | bash prompt-manager 0.1.6 false

# 检查依赖
check_dependencies() {
    local os=$(uname -s)
    
    # 检查并安装 curl
    if ! command -v curl &> /dev/null; then
        echo "未检测到 curl，正在安装..."
        
        if [ "$os" = "Darwin" ]; then
            # macOS系统
            if ! command -v brew &> /dev/null; then
                echo "未检测到 Homebrew，正在安装..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            
            echo "使用 Homebrew 安装 curl..."
            brew install curl
        elif [ "$os" = "Linux" ]; then
            # Linux系统
            if command -v apt-get &> /dev/null; then
                sudo apt-get update && sudo apt-get install -y curl
            elif command -v yum &> /dev/null; then
                sudo yum install -y curl
            elif command -v dnf &> /dev/null; then
                sudo dnf install -y curl
            else
                echo "错误: 无法自动安装 curl，请手动安装"
                exit 1
            fi
        else
            echo "错误: 不支持的操作系统: $os"
            exit 1
        fi
    fi
    
    # 检查并安装 jq
    if ! command -v jq &> /dev/null; then
        echo "未检测到 jq，正在安装..."
        
        if [ "$os" = "Darwin" ]; then
            # macOS系统
            if ! command -v brew &> /dev/null; then
                echo "未检测到 Homebrew，正在安装..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            
            echo "使用 Homebrew 安装 jq..."
            brew install jq
        elif [ "$os" = "Linux" ]; then
            # Linux系统
            if command -v apt-get &> /dev/null; then
                sudo apt-get update && sudo apt-get install -y jq
            elif command -v yum &> /dev/null; then
                sudo yum install -y jq
            elif command -v dnf &> /dev/null; then
                sudo dnf install -y jq
            else
                echo "错误: 无法自动安装 jq，请手动安装"
                exit 1
            fi
        else
            echo "错误: 不支持的操作系统: $os"
            exit 1
        fi
    fi
    
    echo "依赖检查完成"
}

# 检查是否提供了软件包名参数
if [ $# -lt 1 ] && [ -z "$REPO_NAME" ]; then
    echo "使用方法: $0 <软件包名> [版本号] [是否启用加速]"
    echo "示例: $0 prompt-manager 0.1.5 false"
    echo "       $0 prompt-manager 0.1.5 true"
    echo ""
    echo "或使用环境变量:"
    echo "curl -fsSL 'http://iskill.site/scripts/becrafter-installer.sh' | bash prompt-manager 0.1.6 true"
    exit 1
fi

check_dependencies

# 优先使用命令行参数，否则使用环境变量
REPO_NAME="${1:-$REPO_NAME}"
VERSION="${2:-${VERSION:-latest}}"  # 版本号，默认为最新版本
USE_PROXY="${3:-${USE_PROXY:-false}}"  # 是否使用加速地址，默认为false

# 确定系统架构和对应的安装包后缀
get_arch_suffix() {
    local os=$(uname -s)
    local arch=$(uname -m)
    
    # 仅针对macOS的M芯片(arm64)添加后缀，其他系统默认无后缀
    if [ "$os" = "Darwin" ] && [ "$arch" = "arm64" ]; then
        echo "-arm64"
    else
        echo ""
    fi
}

ARCH_SUFFIX=$(get_arch_suffix)
echo "检测到系统架构: $(uname -s) $(uname -m)，使用后缀: $ARCH_SUFFIX"

# URL转换函数：应用加速地址
apply_accelerator() {
    local url="$1"
    local USE_PROXY="$2"
    
    if [ "$USE_PROXY" = "true" ]; then
        # 将 https://github.com 替换为 https://gitclone.com/github.com
        echo "$url" | sed 's|https://github.com|https://gitclone.com/github.com|'
    else
        echo "$url"
    fi
}

# 获取最新版本号
get_latest_version() {
    local api_url="https://api.github.com/repos/BeCrafter/$REPO_NAME/releases/latest"
    echo "获取最新版本信息: $api_url" >&2
    
    # 使用curl和jq获取最新版本号
    local raw_version
    if ! raw_version=$(curl -s "$api_url" 2>/dev/null | jq -r '.tag_name' 2>/dev/null); then
        echo "获取最新版本失败" >&2
        return 1
    fi
    
    # 处理可能的错误响应
    if [ "$raw_version" = "null" ] || [ -z "$raw_version" ]; then
        echo "无法获取版本信息，可能仓库不存在或无发布版本" >&2
        return 1
    fi
    
    echo "$raw_version"
}

# 如果版本为latest，则获取最新版本号
if [ "$VERSION" = "latest" ]; then
    if ! VERSION=$(get_latest_version); then
        exit 1
    fi
fi

echo "准备下载 $REPO_NAME 的版本: $VERSION"

# 从GitHub API获取下载链接
get_download_url() {
    local repo="$1"
    local version="$2"
    local arch_suffix="$3"
    
    local api_url="https://api.github.com/repos/BeCrafter/$repo/releases/tags/$version"
    echo "获取发布信息: $api_url" >&2
    
    # 获取发布信息
    local release_info
    if ! release_info=$(curl -s "$api_url" 2>/dev/null); then
        echo "获取发布信息失败" >&2
        return 1
    fi
    
    # 提取所有browser_download_url
    local download_urls
    download_urls=$(echo "$release_info" | jq -r '.assets[].browser_download_url' 2>/dev/null)
    
    if [ -z "$download_urls" ] || [ "$download_urls" = "null" ]; then
        echo "未找到任何下载文件" >&2
        return 1
    fi
    
    echo "可用的下载文件:" >&2
    echo "$download_urls" | while read -r url; do
        echo "  - $url" >&2
    done
    
    # 优先匹配带架构后缀的DMG文件
    local matched_url
	if [[ ${arch_suffix} -eq "" ]]; then
		matched_url=$(echo "$download_urls" | grep -E "${version#v}\.dmg$" | head -n 1)
	else
		matched_url=$(echo "$download_urls" | grep -E "${version#v}-${arch_suffix}\.dmg$" | head -n 1)
	fi
    
    # 如果没有匹配到，尝试不带架构后缀的DMG文件
    if [ -z "$matched_url" ]; then
        matched_url=$(echo "$download_urls" | grep -E "\.dmg$" | head -n 1)
    fi
    
    if [ -z "$matched_url" ]; then
        echo "未找到匹配的DMG文件" >&2
        return 1
    fi
    
    echo "$matched_url"
}

# 获取下载链接
if ! DOWNLOAD_URL=$(get_download_url "$REPO_NAME" "$VERSION" "$ARCH_SUFFIX"); then
    exit 1
fi

# 应用加速地址
if [ "$USE_PROXY" = "true" ]; then
    echo "启用加速地址"
    DOWNLOAD_URL=$(apply_accelerator "$DOWNLOAD_URL" "true")
fi

echo "确认下载链接: $DOWNLOAD_URL"

# 获取文件名并下载
FILENAME=$(basename "$DOWNLOAD_URL")
echo "开始下载: $FILENAME"

# 检查本地文件是否存在且hash值相同
check_and_download() {
    local url="$1"
    local filename="$2"
    
    # 如果本地文件不存在，直接下载
    if [ ! -f "$filename" ]; then
        echo "本地文件不存在，开始下载..."
        if curl -fsSL -o "$filename" "$url"; then
            echo "下载完成: $(pwd)/$filename"
            return 0
        else
            echo "下载失败" >&2
            return 1
        fi
    fi
    
    # 获取远程文件的hash值
    local remote_hash
    remote_hash=$(curl -sL "$url" | shasum -a 256 | awk '{print $1}')
    if [ -z "$remote_hash" ]; then
        echo "获取远程文件hash失败，强制重新下载..."
        if curl -fsSL -o "$filename" "$url"; then
            echo "下载完成: $(pwd)/$filename"
            return 0
        else
            echo "下载失败" >&2
            return 1
        fi
    fi
    
    # 获取本地文件的hash值
    local local_hash
    local_hash=$(shasum -a 256 "$filename" | awk '{print $1}')
    
    # 比较hash值
    if [ "$remote_hash" = "$local_hash" ]; then
        echo "本地文件已存在且内容相同，跳过下载"
        return 0
    else
        echo "本地文件内容不同，重新下载..."
        if curl -fsSL -o "$filename" "$url"; then
            echo "下载完成: $(pwd)/$filename"
            return 0
        else
            echo "下载失败" >&2
            return 1
        fi
    fi
}

if ! check_and_download "$DOWNLOAD_URL" "$FILENAME"; then
    exit 1
fi

# 移除隔离属性
echo "移除隔离属性..."
if sudo xattr -r -d com.apple.quarantine "./$FILENAME"; then
    echo "隔离属性已移除"
else
    echo "移除隔离属性失败，继续尝试打开..."
fi

# 打开DMG文件进行安装
echo "正在打开安装包..."
if open "./$FILENAME"; then
    echo "安装包已打开，请按照提示完成安装"
else
    echo "打开安装包失败" >&2
    exit 1
fi