#!/bin/bash
# 本地执行未生效

WORK_DIR=~/code/100tal
GITHUB_DIR=~/code/Github
GIT_CONFIG=~/.gitconfig
GIT_WORK_USER=~/.gitconfig.work
GIT_GITHUB_USER=~/.gitconfig.github

# 检查并创建 gitconfig 文件
if [ ! -f "${GIT_WORK_USER}" ]; then
    echo "创建 GitHub 用户配置文件..."
    cat > "${GIT_WORK_USER}" << EOF
[user]
    name = v_wangming6
    email = v_wangming6@tal.com
EOF
fi

if [ ! -f "${GIT_GITHUB_USER}" ]; then
    echo "创建 GitHub 用户配置文件..."
    cat > "${GIT_GITHUB_USER}" << EOF
[user]
    name = Mark.Wang
    email = kugouming@sina.com
EOF
fi

function append_config() {
	local dir=$1
	# cat ${GIT_CONFIG} 2>/dev/null| grep 'includeIf' | grep 'gitdir' | grep "${dir}"
    local last_three_levels=$(echo $dir | rev | cut -d'/' -f1-3 | rev)
    cat ${GIT_CONFIG} 2>/dev/null | grep 'includeIf' | grep 'gitdir' | grep "${last_three_levels}" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        return 0
    fi
    echo "[includeIf \"gitdir: ${dir}/\"]" >> ${GIT_CONFIG}
    if [[ $(echo ${dir} | grep ${WORK_DIR} | wc -l) -gt 0 ]]; then
        echo "    path = ${GIT_WORK_USER}" >> ${GIT_CONFIG}
    else
        echo "    path = ${GIT_GITHUB_USER}" >> ${GIT_CONFIG}
    fi
}

for dir in $(find "${WORK_DIR}" -mindepth 2 -maxdepth 2 -type d); do
    if [ ! -d "${dir}" ]; then
        continue
    fi
    append_config $dir
done

for dir in $(find "${GITHUB_DIR}" -mindepth 2 -maxdepth 2 -type d); do
    if [ ! -d "${dir}" ]; then
        continue
    fi
    append_config $dir
done

