#!/bin/bash

# 下载BeCrafter仓库软件安装包的脚本
# 使用方法: 
#    本地: ./becrafter-installer.sh <软件包名> [是否启用加速] [版本号]
#    远程: 
#       curl -fsSL 'http://iskill.site/scripts/becrafter-installer.sh' | bash -s prompt-manager true 0.1.6
#       curl -fsSL 'http://iskill.site/scripts/becrafter-installer.sh' | bash -s prompt-manager false 0.1.6

# 颜色定义
declare -r COLOR_RESET='\033[0m'
declare -r COLOR_BOLD='\033[1m'
declare -r COLOR_GREEN='\033[32m'
declare -r COLOR_BLUE='\033[34m'
declare -r COLOR_YELLOW='\033[33m'
declare -r COLOR_CYAN='\033[36m'
declare -r COLOR_RED='\033[31m'
declare -r COLOR_GRAY='\033[90m'

# 检查依赖
check_dependencies() {
    local os=$(uname -s)
    
    echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_BLUE}🔧 检查依赖${COLOR_RESET}"
    echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
    
    # 检查并安装 curl
    if ! command -v curl &> /dev/null; then
        echo -e "${COLOR_YELLOW}⚠ 未检测到 curl，正在安装...${COLOR_RESET}"
        
        if [ "$os" = "Darwin" ]; then
            # macOS系统
            if ! command -v brew &> /dev/null; then
                echo -e "${COLOR_YELLOW}⚠ 未检测到 Homebrew，正在安装...${COLOR_RESET}"
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            
            echo -e "${COLOR_GRAY}使用 Homebrew 安装 curl...${COLOR_RESET}"
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
                echo -e "${COLOR_RED}✗ 错误: 无法自动安装 curl，请手动安装${COLOR_RESET}" >&2
                exit 1
            fi
        else
            echo -e "${COLOR_RED}✗ 错误: 不支持的操作系统: $os${COLOR_RESET}" >&2
            exit 1
        fi
    else
        echo -e "${COLOR_GREEN}✓ curl 已安装${COLOR_RESET}"
    fi
    
    # 检查并安装 jq
    if ! command -v jq &> /dev/null; then
        echo -e "${COLOR_YELLOW}⚠ 未检测到 jq，正在安装...${COLOR_RESET}"
        
        if [ "$os" = "Darwin" ]; then
            # macOS系统
            if ! command -v brew &> /dev/null; then
                echo -e "${COLOR_YELLOW}⚠ 未检测到 Homebrew，正在安装...${COLOR_RESET}"
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            
            echo -e "${COLOR_GRAY}使用 Homebrew 安装 jq...${COLOR_RESET}"
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
                echo -e "${COLOR_RED}✗ 错误: 无法自动安装 jq，请手动安装${COLOR_RESET}" >&2
                exit 1
            fi
        else
            echo -e "${COLOR_RED}✗ 错误: 不支持的操作系统: $os${COLOR_RESET}" >&2
            exit 1
        fi
    else
        echo -e "${COLOR_GREEN}✓ jq 已安装${COLOR_RESET}"
    fi
    
    echo -e "${COLOR_GREEN}✓ 依赖检查完成${COLOR_RESET}"
    echo ""
}

# 检查是否提供了软件包名参数
if [ $# -lt 1 ] && [ -z "$REPO_NAME" ]; then
    echo -e "${COLOR_RED}✗ 错误: 缺少必需参数${COLOR_RESET}"
    echo ""
    echo -e "${COLOR_BOLD}使用方法:${COLOR_RESET}"
    echo "  $0 <软件包名> [是否启用加速] [版本号]"
    echo ""
    echo -e "${COLOR_BOLD}示例:${COLOR_RESET}"
    echo "  $0 prompt-manager false 0.1.5"
    echo "  $0 prompt-manager true 0.1.5"
    echo ""
    echo -e "${COLOR_BOLD}或使用环境变量:${COLOR_RESET}"
    echo "  curl -fsSL 'http://iskill.site/scripts/installer/becrafter-installer.sh' | bash -s prompt-manager true 0.1.6"
    exit 1
fi

check_dependencies

# 优先使用命令行参数，否则使用环境变量
REPO_NAME="${1:-$REPO_NAME}"
USE_PROXY="${2:-${USE_PROXY:-false}}"  # 是否使用加速地址，默认为false
VERSION="${3:-${VERSION:-latest}}"  # 版本号，默认为最新版本

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
echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
echo -e "${COLOR_BOLD}${COLOR_BLUE}📋 系统信息${COLOR_RESET}"
echo -e "${COLOR_GRAY}操作系统:${COLOR_RESET} $(uname -s)"
echo -e "${COLOR_GRAY}架构:${COLOR_RESET} $(uname -m)"
echo -e "${COLOR_GRAY}架构后缀:${COLOR_RESET} ${COLOR_BOLD}${ARCH_SUFFIX:-无}${COLOR_RESET}"
echo -e "${COLOR_GRAY}软件包:${COLOR_RESET} ${COLOR_BOLD}${REPO_NAME}${COLOR_RESET}"
echo -e "${COLOR_GRAY}版本:${COLOR_RESET} ${COLOR_BOLD}${VERSION}${COLOR_RESET}"
echo -e "${COLOR_GRAY}加速:${COLOR_RESET} ${COLOR_BOLD}${USE_PROXY}${COLOR_RESET}"
echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
echo ""

# URL转换函数：应用加速地址
apply_accelerator() {
    local url="$1"
    local USE_PROXY="$2"
    
    if [ "$USE_PROXY" = "true" ]; then
        # 将 https://github.com 替换为 https://gitclone.com/github.com
        #echo "$url" | sed 's|https://github.com|https://gitclone.com/github.com|'
        echo "https://gh-proxy.com/${url}"
    else
        echo "$url"
    fi
}

# 获取最新版本号
get_latest_version() {
    local api_url="https://api.github.com/repos/BeCrafter/$REPO_NAME/releases/latest"
    echo -e "${COLOR_GRAY}获取最新版本信息: $api_url${COLOR_RESET}" >&2
    
    # 使用curl和jq获取最新版本号
    local raw_version
    if ! raw_version=$(curl -s "$api_url" 2>/dev/null | jq -r '.tag_name' 2>/dev/null); then
        echo -e "${COLOR_RED}✗ 获取最新版本失败${COLOR_RESET}" >&2
        return 1
    fi
    
    # 处理可能的错误响应
    if [ "$raw_version" = "null" ] || [ -z "$raw_version" ]; then
        echo -e "${COLOR_RED}✗ 无法获取版本信息，可能仓库不存在或无发布版本${COLOR_RESET}" >&2
        return 1
    fi
    
    echo "$raw_version"
}

# 如果版本为latest，则获取最新版本号
if [ "$VERSION" = "latest" ]; then
    echo -e "${COLOR_YELLOW}🔍 检测到版本参数为 latest，正在获取最新版本...${COLOR_RESET}"
    if ! VERSION=$(get_latest_version); then
        exit 1
    fi
    echo -e "${COLOR_GREEN}✓ 最新版本: ${COLOR_BOLD}${VERSION}${COLOR_RESET}"
    echo ""
fi

# 从GitHub API获取下载链接
get_download_url() {
    local repo="$1"
    local version="$2"
    local arch_suffix="$3"
    
    local api_url="https://api.github.com/repos/BeCrafter/$repo/releases/tags/$version"
    echo -e "${COLOR_GRAY}获取发布信息: $api_url${COLOR_RESET}" >&2
    
    # 获取发布信息
    local release_info
    if ! release_info=$(curl -s "$api_url" 2>/dev/null); then
        echo -e "${COLOR_RED}✗ 获取发布信息失败${COLOR_RESET}" >&2
        return 1
    fi
    
    # 提取所有browser_download_url
    local download_urls
    download_urls=$(echo "$release_info" | jq -r '.assets[].browser_download_url' 2>/dev/null)
    
    if [ -z "$download_urls" ] || [ "$download_urls" = "null" ]; then
        echo -e "${COLOR_RED}✗ 未找到任何下载文件${COLOR_RESET}" >&2
        return 1
    fi
    
    echo -e "${COLOR_GRAY}可用的下载文件:${COLOR_RESET}" >&2
    echo "$download_urls" | while read -r url; do
        echo "  - $url" >&2
    done
    
    # 优先匹配带架构后缀的DMG文件
    local matched_url
	if [[ -z ${arch_suffix} ]]; then
		matched_url=$(echo "$download_urls" | grep -E "${version#v}\.dmg$" | head -n 1)
	else
		matched_url=$(echo "$download_urls" | grep -E "${version#v}-${arch_suffix}\.dmg$" | head -n 1)
	fi
    
    # 如果没有匹配到，尝试不带架构后缀的DMG文件
    if [ -z "$matched_url" ]; then
        matched_url=$(echo "$download_urls" | grep -E "\.dmg$" | head -n 1)
    fi
    
    if [ -z "$matched_url" ]; then
        echo -e "${COLOR_RED}✗ 未找到匹配的DMG文件${COLOR_RESET}" >&2
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
    echo -e "${COLOR_YELLOW}⚡ 启用加速地址${COLOR_RESET}"
    DOWNLOAD_URL=$(apply_accelerator "$DOWNLOAD_URL" "true")
fi

echo -e "${COLOR_GRAY}下载链接: ${COLOR_RESET}${DOWNLOAD_URL}"
echo ""

# 获取文件名
FILENAME=$(basename "$DOWNLOAD_URL")

# 检查本地文件是否存在且hash值相同
check_and_download() {
    local url="$1"
    local filename="$2"
    
    # 获取文件大小
    get_file_size() {
        local url="$1"
        local size
        size=$(curl -sI "$url" | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
        if [ -n "$size" ] && [ "$size" -gt 0 ] 2>/dev/null; then
            if [ "$size" -gt 1073741824 ]; then
                echo "$(echo "scale=2; $size/1073741824" | bc) GB"
            elif [ "$size" -gt 1048576 ]; then
                echo "$(echo "scale=2; $size/1048576" | bc) MB"
            elif [ "$size" -gt 1024 ]; then
                echo "$(echo "scale=2; $size/1024" | bc) KB"
            else
                echo "${size} B"
            fi
        else
            echo "未知"
        fi
    }
    
    local file_size
    file_size=$(get_file_size "$url")
    
    # 如果本地文件不存在，直接下载
    if [ ! -f "$filename" ]; then
        echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
        echo -e "${COLOR_BOLD}${COLOR_BLUE}📦 开始下载${COLOR_RESET}"
        echo -e "${COLOR_GRAY}文件名:${COLOR_RESET} ${COLOR_BOLD}${filename}${COLOR_RESET}"
        echo -e "${COLOR_GRAY}文件大小:${COLOR_RESET} ${COLOR_BOLD}${file_size}${COLOR_RESET}"
        echo -e "${COLOR_GRAY}下载地址:${COLOR_RESET} ${url}"
        echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
        echo ""
        
        if curl -fSL --progress-bar -o "$filename" "$url"; then
            echo ""
            echo -e "${COLOR_GREEN}✓ 下载完成${COLOR_RESET}"
            echo -e "${COLOR_GRAY}保存位置:${COLOR_RESET} $(pwd)/${filename}"
            echo ""
            return 0
        else
            echo ""
            echo -e "${COLOR_RED}✗ 下载失败${COLOR_RESET}" >&2
            return 1
        fi
    fi
    
    # 获取远程文件的hash值
    echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_YELLOW}🔍 验证文件${COLOR_RESET}"
    echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
    echo -e "${COLOR_YELLOW}🔍 正在验证远程文件...${COLOR_RESET}"
    
    # 显示下载进度条
    local temp_file=$(mktemp)
    local progress_pid=""
    local download_done=0
    
    # 启动持续旋转的进度显示
    (
        while [ $download_done -eq 0 ]; do
            for spin in '⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏'; do
                printf "\r${COLOR_YELLOW}${spin} 正在下载并计算 hash...${COLOR_RESET} "
                sleep 0.15
                [ $download_done -eq 1 ] && break
            done
        done
    ) &
    progress_pid=$!
    
    # 下载文件并计算hash
    remote_hash=$(curl -sL "$url" | tee "$temp_file" | shasum -a 256 | awk '{print $1}')
    
    # 标记下载完成
    download_done=1
    
    # 停止进度显示
    kill $progress_pid 2>/dev/null
    wait $progress_pid 2>/dev/null
    rm -f "$temp_file"
    printf "\r${COLOR_YELLOW}✓ 验证完成${COLOR_RESET}$(printf '%*s' 50 '')\n"
    if [ -z "$remote_hash" ]; then
        echo -e "${COLOR_YELLOW}⚠ 获取远程文件hash失败，强制重新下载...${COLOR_RESET}"
        echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
        echo -e "${COLOR_BOLD}${COLOR_BLUE}📦 开始下载${COLOR_RESET}"
        echo -e "${COLOR_GRAY}文件名:${COLOR_RESET} ${COLOR_BOLD}${filename}${COLOR_RESET}"
        echo -e "${COLOR_GRAY}文件大小:${COLOR_RESET} ${COLOR_BOLD}${file_size}${COLOR_RESET}"
        echo -e "${COLOR_GRAY}下载地址:${COLOR_RESET} ${url}"
        echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
        echo ""
        
        if curl -fSL --progress-bar -o "$filename" "$url"; then
            echo ""
            echo -e "${COLOR_GREEN}✓ 下载完成${COLOR_RESET}"
            echo -e "${COLOR_GRAY}保存位置:${COLOR_RESET} $(pwd)/${filename}"
            echo ""
            return 0
        else
            echo ""
            echo -e "${COLOR_RED}✗ 下载失败${COLOR_RESET}" >&2
            return 1
        fi
    fi
    
    # 获取本地文件的hash值
    echo -e "${COLOR_YELLOW}🔍 正在验证本地文件...${COLOR_RESET}"
    
    # 显示计算进度
    local progress_pid=""
    local hash_done=0
    
    # 启动持续旋转的进度显示
    (
        while [ $hash_done -eq 0 ]; do
            for spin in '⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏'; do
                printf "\r${COLOR_YELLOW}${spin} 正在计算本地 hash...${COLOR_RESET} "
                sleep 0.15
                [ $hash_done -eq 1 ] && break
            done
        done
    ) &
    progress_pid=$!
    
    # 计算本地文件hash
    local_hash=$(shasum -a 256 "$filename" | awk '{print $1}')
    
    # 标记计算完成
    hash_done=1
    
    # 停止进度显示
    kill $progress_pid 2>/dev/null
    wait $progress_pid 2>/dev/null
    printf "\r${COLOR_YELLOW}✓ 验证完成${COLOR_RESET}$(printf '%*s' 50 '')\n"
    
    # 比较hash值
    if [ "$remote_hash" = "$local_hash" ]; then
        echo -e "${COLOR_GREEN}✓ 本地文件已存在且内容相同，跳过下载${COLOR_RESET}"
        echo -e "${COLOR_GRAY}文件位置:${COLOR_RESET} $(pwd)/${filename}"
        echo ""
        return 0
    else
        echo -e "${COLOR_YELLOW}⚠ 本地文件内容不同，重新下载...${COLOR_RESET}"
        echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
        echo -e "${COLOR_BOLD}${COLOR_BLUE}📦 开始下载${COLOR_RESET}"
        echo -e "${COLOR_GRAY}文件名:${COLOR_RESET} ${COLOR_BOLD}${filename}${COLOR_RESET}"
        echo -e "${COLOR_GRAY}文件大小:${COLOR_RESET} ${COLOR_BOLD}${file_size}${COLOR_RESET}"
        echo -e "${COLOR_GRAY}下载地址:${COLOR_RESET} ${url}"
        echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
        echo ""
        
        if curl -fSL --progress-bar -o "$filename" "$url"; then
            echo ""
            echo -e "${COLOR_GREEN}✓ 下载完成${COLOR_RESET}"
            echo -e "${COLOR_GRAY}保存位置:${COLOR_RESET} $(pwd)/${filename}"
            echo ""
            return 0
        else
            echo ""
            echo -e "${COLOR_RED}✗ 下载失败${COLOR_RESET}" >&2
            return 1
        fi
    fi
}

if ! check_and_download "$DOWNLOAD_URL" "$FILENAME"; then
    exit 1
fi

# 移除隔离属性
echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
echo -e "${COLOR_BOLD}${COLOR_BLUE}🚀 安装${COLOR_RESET}"
echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
echo ""
echo -e "${COLOR_YELLOW}🔓 移除隔离属性...${COLOR_RESET}"
if sudo xattr -r -d com.apple.quarantine "./$FILENAME"; then
    echo -e "${COLOR_GREEN}✓ 隔离属性已移除${COLOR_RESET}"
else
    echo -e "${COLOR_YELLOW}⚠ 移除隔离属性失败，继续尝试打开...${COLOR_RESET}"
fi

# 打开DMG文件进行安装
echo ""
echo -e "${COLOR_YELLOW}📂 正在打开安装包...${COLOR_RESET}"
if open "./$FILENAME"; then
    echo -e "${COLOR_GREEN}✓ 安装包已打开，请按照提示完成安装${COLOR_RESET}"
    echo ""
    echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_GREEN}✨ 完成！${COLOR_RESET}"
    echo -e "${COLOR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
else
    echo -e "${COLOR_RED}✗ 打开安装包失败${COLOR_RESET}" >&2
    exit 1
fi