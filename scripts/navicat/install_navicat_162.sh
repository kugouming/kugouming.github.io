#!/bin/bash
#
# How to:
#    curl -fsSL 'http://iskill.site/scripts/navicat/install_navicat_162.sh' | bash -C
#

# 设置下载URL和目标文件
DOWNLOAD_URL="https://download.navicat.com/download/navicat162_premium_cs.dmg"
TARGET_FILE="${HOME}/Downloads/navicat162_premium_cs.dmg"

echo "开始下载 Navicat Premium..."

# 下载文件
curl -L "${DOWNLOAD_URL}" -o "${TARGET_FILE}"

# 检查下载是否成功
if [ $? -eq 0 ]; then
    echo "下载完成！正在打开安装程序..."
    open "${TARGET_FILE}"
else
    echo "下载失败，请检查网络连接后重试。"
    exit 1
fi