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

```bash
$ migrate create -ext sql -dir ./migration_files -tz Asia/Shanghai init       
xxx/migration_files/20230616164949_init.up.sql
xxx/migration_files/20230616164949_init.down.sql
```

在`20230616164949_init.up.sql`中填写：

```sql
-- ----------------------------
-- Table structure for person
-- ----------------------------
DROP TABLE IF EXISTS `person`;
CREATE TABLE `person` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `age` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

在`20230616164949_init.down.sql`中填写：

```sql
DROP TABLE IF EXISTS `person`; 
```

**新增一列**

然后我们给`person`表新增一个性别`gender`列，先使用命令创建`sql`文件：

```bash
$ migrate create -ext sql -dir ./migration_files -tz Asia/Shanghai add_gender
xxx/migration_files/20230616165624_add_gender.up.sql
xxx/migration_files/20230616165624_add_gender.down.sql
```

`20230616165624_add_gender.up.sql`：

```sql
ALTER TABLE `person` ADD COLUMN `gender` BIGINT(20) DEFAULT NULL AFTER `age`; 
```

`20230616165624_add_gender.down.sql`：

```sql
ALTER TABLE `person` DROP COLUMN `gender`; 
```

**新增name为index**

接下来，我们为`name`列创建一个索引，同样需要用命令创建`sql`文件：

```bash
$ migrate create -ext sql -dir ./migration_files -tz Asia/Shanghai add_index_name                                                                          
xxx/migration_files/20230619104829_add_index_name.up.sql
xxx/migration_files/20230619104829_add_index_name.down.sql
```

`20230619104829_add_index_name.up.sql`：

```sql
ALTER TABLE `person` ADD INDEX `idx_name`(`name`); 
```

`20230619104829_add_index_name.down.sql`：

```sql
ALTER TABLE `person` DROP INDEX `idx_name`; 
```

此时在迁移文件中有以下文件：

```bash
$ ll migration_files
total 48
-rw-r--r--  1 chenyiguo  staff    30B Jun 16 16:55 20230616164949_init.down.sql
-rw-r--r--  1 chenyiguo  staff   396B Jun 16 16:55 20230616164949_init.up.sql
-rw-r--r--  1 chenyiguo  staff    42B Jun 16 17:02 20230616165624_add_gender.down.sql
-rw-r--r--  1 chenyiguo  staff    77B Jun 16 17:01 20230616165624_add_gender.up.sql
-rw-r--r--  1 chenyiguo  staff    43B Jun 19 10:57 20230619104829_add_index_name.down.sql
-rw-r--r--  1 chenyiguo  staff    50B Jun 19 10:57 20230619104829_add_index_name.up.sql
```

#### 1.1.2 进行迁移

**一步迁移**

我们可以使用如下指令每次执行一步迁移：

```bash
$ migrate --path ./migration_files --database="mysql://root:IBHojwND.yo@tcp(10.117.49.6:13306)/migration_test?charset=utf8mb4&parseTime=true" -verbose up 1
2023/06/19 11:01:28 Start buffering 20230616164949/u init
2023/06/19 11:01:28 Read and execute 20230616164949/u init
2023/06/19 11:01:28 Finished 20230616164949/u init (read 133.166833ms, ran 286.737042ms)
2023/06/19 11:01:28 Finished after 566.083083ms
2023/06/19 11:01:28 Closing source and database
```

然后查看表`person`:

```bash
MariaDB [migration_test]> DESC `person`;
+-------+---------------------+------+-----+---------+----------------+
| Field | Type                | Null | Key | Default | Extra          |
+-------+---------------------+------+-----+---------+----------------+
| id    | bigint(20) unsigned | NO   | PRI | NULL    | auto_increment |
| name  | varchar(256)        | YES  |     | NULL    |                |
| age   | bigint(20)          | YES  |     | NULL    |                |
+-------+---------------------+------+-----+---------+----------------+
3 rows in set (0.001 sec)
```

这时候，会发现数据库会生成一个名为`schema_migrations`的表，可以看到其只有两列，其中第一列`version`表示现阶段的版本，比如以上我们只是执行了迁移的第一步，所以版本是`20230616164949`；第二列是`dirty`，0表示正常，1表示被出错了，一般而言需要手动处理。

```sql

```