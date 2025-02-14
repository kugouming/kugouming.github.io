# How to use this:
# 	1. 查看版本列表: make protoc-list
# 	2. 安装最新版本: make protoc-install
#   3. 安装指定版本: make protoc-install VERSION=v29.0-rc3
#   3. 远程文件安装: curl -fsSL 'http://iskill.site/scripts/Makefile" | make -f - protoc-install
# 
# 
# How to debug makefile:
#   1. make -n protoc-install        - 使用 -n 参数查看将要执行的命令（不会实际执行）
# 	2. make VERBOSE=1 proto-installc - 使用 VERBOSE=1 查看详细输出（会实际执行）

.PHONY: all clean protoc-install protoc-list


# 系统相关变量
UNAME := $(shell uname)
ARCH  := $(shell uname -m)

# 安装目录
ifeq ($(UNAME),Darwin)
    OS := osx
    INSTALL_DIR := /usr/local/protoc
else ifeq ($(UNAME),Linux)
    OS := linux
    INSTALL_DIR := /usr/local/protoc
else
    OS := windows
    INSTALL_DIR := C:\protoc
endif

# 架构转换
ifeq ($(ARCH),x86_64)
    TARGET_ARCH := x86_64
else ifeq ($(ARCH),amd64)
    TARGET_ARCH := x86_64
else
    TARGET_ARCH := $(ARCH)
endif

# 临时文件
TMP_DIR    := $(shell mktemp -d)
PROTOC_ZIP := $(TMP_DIR)/protoc.zip

protoc-install:
	@echo "开始安装 protoc..."
	@if [ -n "$(VERSION)" ]; then \
		SELECTED_VERSION="$(VERSION)"; \
	else \
		SELECTED_VERSION=`curl -s https://api.github.com/repos/protocolbuffers/protobuf/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/'`; \
	fi && \
	echo "选择版本: $$SELECTED_VERSION" && \
	VERSION_NUM=`echo $$SELECTED_VERSION | sed 's/^v//'` && \
	if echo $$VERSION_NUM | grep -q "rc"; then \
		VERSION_NUM=`echo $$VERSION_NUM | sed -E 's/([0-9]+\.[0-9]+)-rc([0-9]+)/\1-rc-\2/'`; \
	fi && \
	DOWNLOAD_URL="https://github.com/protocolbuffers/protobuf/releases/download/$$SELECTED_VERSION/protoc-$$VERSION_NUM-$(OS)-$(TARGET_ARCH).zip" && \
	echo "下载地址: $$DOWNLOAD_URL" && \
	\
	curl -L "$$DOWNLOAD_URL" -o "$(PROTOC_ZIP)" && \
	\
	sudo mkdir -p $(INSTALL_DIR) && \
	\
	sudo unzip -o $(PROTOC_ZIP) -d $(INSTALL_DIR) && \
	\
	if [ "$(UNAME)" = "Darwin" ]; then \
		echo "export PATH=\$$PATH:$(INSTALL_DIR)/bin" >> ~/.zshrc; \
	elif [ "$(UNAME)" = "Linux" ]; then \
		echo "export PATH=\$$PATH:$(INSTALL_DIR)/bin" >> ~/.bashrc; \
	fi && \
	\
	rm -rf $(TMP_DIR) && \
	\
	echo "protoc 安装完成！"

protoc-list:
	@echo "获取所有发布版本..."
	@curl -s https://github.com/protocolbuffers/protobuf/releases | \
	grep -o '/protocolbuffers/protobuf/releases/tag/v[0-9][^"]*' | \
	sed 's/.*tag\///' | \
	sort -rV | \
	nl

# 清理
clean:
	sudo rm -rf $(INSTALL_DIR)
	rm -f $(PROTOC_ZIP)