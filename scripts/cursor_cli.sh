# 在 ～/.bash_profile or ~/.zshrc 文件内追加下面内容，实现快速切换目录并运行 cursor cli 命令
cc() {
  # 目标目录：用 $HOME 替代 ~，路径更明确
  target_dir="$HOME/cursor-agents"

  # 判断当前目录（$PWD）是否等于目标目录
  if [ "$PWD" != "$target_dir" ]; then
    # 切换到目标目录，失败则退出
    cd "$target_dir" || {
      echo "错误：无法进入目录 $target_dir"
      return 1
    }
  fi

  # 直接执行命令（带参数）
  cursor-agent $@"
}