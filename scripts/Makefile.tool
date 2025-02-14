# How to use this:
#   远程文件安装: curl -fsSL 'http://iskill.site/scripts/Makefile.tool" | make -f - lanch_mysql
# 
# 
# How to debug makefile:
#   1. make -n protoc-install        - 使用 -n 参数查看将要执行的命令（不会实际执行）
# 	2. make VERBOSE=1 proto-installc - 使用 VERBOSE=1 查看详细输出（会实际执行）

.PHONY: all clean install_sqlc install_migrate migrate_up

# migrate
migrateTag="postgres" # 支持 postgres / mysql / sqlite
install_migrate:
	go install -tags "${migrateTag}" github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# sqlc
install_sqlc:
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

databaseURL="postgres://lang:password@localhost:5432/urldb?sslmode=disable"
migrate_up:
	migrate -path="./database/migrate" -database=${databaseURL} up

migrate_drop:
	migrate -path="./database/migrate" -database=${databaseURL} drop -f

# 清理
clean: migrate_drop