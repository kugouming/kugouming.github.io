# Go数据库迁移的实现步骤

## 0. 简介

本文将介绍两个`Go`生态中常见的数据库迁移工具——`golang-migrate`和`gormigrate`。

## 1. golang-migrate

`golang-migrate`的官方`Github`是[链接](https://github.com/golang-migrate/migrate)。它提供了客户端的方式使用，也可以使用`Go SDK`调用的方式使用。其各种安装方式详见[链接](https://github.com/golang-migrate/migrate/tree/master/cmd/migrate)。

对于每次迁移而言，都需要有一个迁移文件，迁移文件需要命名为`{number}_xxx.up.sql`以及`{number}_xxx.down.sql`，其中`{number}`是数字，可以使用`migrate create`命令产生，如下，`-seq`表示按顺序产生文件：

```bash
migrate create -ext sql -dir ./migration_files -seq init_schema 
```

`{number}`将会是从1开始的递增的数字。如下，默认按照时间格式产生，`-tz`可以设置时区：

```bash
migrate create -ext sql -dir ./migration_files -tz Asia/Shanghai init_schema 
```

`{number}`将会是上海时区的时间格式。反正不管是什么格式，`golang-migration`按照从小到大的顺序依次执行。

在实际运行时，迁移时顺序运行`{number}_xxx.up.sql`文件，回滚时倒序运行`{number}_xxx.down.sql`。

### 1.1 通过migrate命令操作

#### 1.1.1 创建sql文件

初始化数据库

我们可以通过安装`migrate`工具，然后通过指令进行操作如下，生成`20230616164949_init.up.sql`和`20230616164949_init.down.sql`文件：