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
MariaDB [migration_test]> SELECT * FROM `schema_migrations`;
+----------------+-------+
| version        | dirty |
+----------------+-------+
| 20230616164949 |     0 |
+----------------+-------+
1 row in set (0.001 sec)
```

同样的，我们可以使用以下指令回滚这一次操作：

```bash
$ migrate --path ./migration_files --database="mysql://root:IBHojwND.yo@tcp(10.117.49.6:13306)/migration_test?charset=utf8mb4&parseTime=true" -verbose down 1
2023/06/19 11:12:57 Start buffering 20230616164949/d init
2023/06/19 11:12:57 Read and execute 20230616164949/d init
2023/06/19 11:12:58 Finished 20230616164949/d init (read 238.931375ms, ran 167.683125ms)
2023/06/19 11:12:58 Finished after 552.185792ms
2023/06/19 11:12:58 Closing source and database
```

可以发现操作被回滚，整个数据库只保留了`schema_migrations`表，执行了`20230616164949_init.down.sql`中的指令，`person`表被删除了。

**整体升级**

```bash
$ migrate --path ./migration_files --database="mysql://root:IBHojwND.yo@tcp(10.117.49.6:13306)/migration_test?charset=utf8mb4&parseTime=true" -verbose up    
2023/06/19 11:14:52 Start buffering 20230616164949/u init
2023/06/19 11:14:52 Start buffering 20230616165624/u add_gender
2023/06/19 11:14:52 Start buffering 20230619104829/u add_index_name
2023/06/19 11:14:53 Read and execute 20230616164949/u init
2023/06/19 11:14:53 Finished 20230616164949/u init (read 143.943417ms, ran 167.257042ms)
2023/06/19 11:14:53 Read and execute 20230616165624/u add_gender
2023/06/19 11:14:53 Finished 20230616165624/u add_gender (read 463.350333ms, ran 304.728208ms)
2023/06/19 11:14:53 Read and execute 20230619104829/u add_index_name
2023/06/19 11:14:54 Finished 20230619104829/u add_index_name (read 987.893333ms, ran 227.057417ms)
2023/06/19 11:14:54 Finished after 1.391094s
2023/06/19 11:14:54 Closing source and database
```

这时候可以发现，`person`表的所有改动都被付诸实现：

```sql
MariaDB [migration_test]> DESC `person`;
+--------+---------------------+------+-----+---------+----------------+
| Field  | Type                | Null | Key | Default | Extra          |
+--------+---------------------+------+-----+---------+----------------+
| id     | bigint(20) unsigned | NO   | PRI | NULL    | auto_increment |
| name   | varchar(256)        | YES  | MUL | NULL    |                |
| age    | bigint(20)          | YES  |     | NULL    |                |
| gender | bigint(20)          | YES  |     | NULL    |                |
+--------+---------------------+------+-----+---------+----------------+
4 rows in set (0.001 sec)
```

而`schema_migrations`表里的数据版本变成了最新的`20230619104829`，可以发现，此表中并没有存储历史版本。

```sql
MariaDB [migration_test]> SELECT * FROM `schema_migrations`;
+----------------+-------+
| version        | dirty |
+----------------+-------+
| 20230619104829 |     0 |
+----------------+-------+
1 row in set (0.000 sec)
```

同样，也可以使用`down`来回滚整个表。

当然，`golang-migrate`还有一些其他的操作，大家可以使用`migrate -help`命令学习。

### 1.2 通过Go SDK实现

除了以上通过命令的方式使用`golang-migrate`，也可以使用其`Go SDK`的方式运用于`Go project`中。

`sql`文件的创建这里就不赘述了，当然可以为了方便，使用以下的`shell`文件简化创建`sql`的流程：

```bash
#!/bin/bash
read -p "Please input sql change tag: " tag
if [ x"${tag}" = x ]; then
  echo "Please input sql change tag!!!"
  exit 1
fi
# TIMEZONE是时区的环境变量，默认 Asia/Shanghai
if [ x"${TIMEZONE}" = x ]; then
  echo "Not set TIMEZONE, set default Asia/Shanghai"
  TIMEZONE="Asia/Shanghai"
fi
migrate create -ext sql -dir ./migration_files -tz "${TIMEZONE}" ${tag}
```

#### 1.2.1 代码实现

```go
package main
import (
   "context"
   "database/sql"
   "errors"
   "fmt"
   "github.com/golang-migrate/migrate/v4"
   "github.com/sirupsen/logrus"
   "os"
   "time"
   _ "github.com/go-sql-driver/mysql"
   _ "github.com/golang-migrate/migrate/v4/database/mysql"
   _ "github.com/golang-migrate/migrate/v4/source/file"
)
const (
   dbUser     = "DB_USER"
   dbPassWord = "DEVOPS_INFRA_PASSWORD"
   dbUrl      = "DB_URL"
)
var (
   username = "root"
   password = "IBHojwND.yo"
   hostname = "10.117.49.6:13306"
   dbname   = "migration_test"
   errUpFailed = errors.New("migration up failed")
)
func dsn(dbName string) string {
   return fmt.Sprintf("%s:%s@tcp(%s)/%s?charset=utf8mb4&parseTime=true", username, password, hostname, dbName)
}
func createDBIfNotExist() error {
   db, err := sql.Open("mysql", dsn(""))
   if err != nil {
      logrus.Errorf("opening DB err : %+v\n", err)
      return err
   }
   defer db.Close()
   ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
   defer cancel()
   res, err := db.ExecContext(ctx, "CREATE DATABASE IF NOT EXISTS "+dbname)
   if err != nil {
      logrus.Errorf("creating DB err: %+v\n", err)
      return err
   }
   no, err := res.RowsAffected()
   if err != nil {
      logrus.Errorf("affected rows err: %+v", err)
      return err
   }
   logrus.Infof("rows affected %d\n", no)
   return nil
}
func migration() (e error) {
   // 新建migrate对象
   m, err := migrate.New("file://migration_files", "mysql://"+dsn(dbname))
   if err != nil {
      logrus.Errorf("new migrate err: %+v", err)
      return err
   }
   // 进行up操作
   err = m.Up()
   version, dirty, _ := m.Version()
   if err == nil || err == migrate.ErrNoChange {
      logrus.Infof("migrate up success, version: %+v, dirty: %+v", version, dirty)
      return
   }
   logrus.Errorf("migrate up failed, version: %+v, dirty: %+v, err: %+v", version, dirty, err)
   // 只要up没有成功，后续都是失败
   e = errUpFailed
   // 如果up失败，尝试回滚一步
   version, dirty, _ = m.Version()
   err = m.Steps(-1)
   if err == nil || err == os.ErrNotExist {
      logrus.Infof("migrate down -1 success, version: %+v, dirty: %+v", version, dirty)
      return
   }
   logrus.Errorf("migrate down -1 failed, version: %+v, dirty: %+v, err: %+v", version, dirty, err)
   // 如果回滚失败，判断是不是因为dirty
   er, ok := err.(migrate.ErrDirty)
   if !ok {
      // 不是dirty错误
      return
   }
   // 是dirty错误，那我们强制设置version，再利用这个版本进行回滚
   err = m.Force(er.Version)
   if err != nil {
      logrus.Printf("migrate force %+v err: %+v", er.Version, err)
      return
   }
   err = m.Steps(-1)
   if err == nil || err == os.ErrNotExist {
      logrus.Printf("migrate down -1 after force success, version: %+v, dirty: %+v", version, dirty)
      return
   }
   logrus.Printf("migrate down -1 after force failed, version: %+v, dirty: %+v, err: %+v", version, dirty, err)
   return
}
func main() {
   // 如果数据库不存在则创建数据库
   err := createDBIfNotExist()
   if err != nil {
      os.Exit(1)
   }
   // migration操作
   err = migration()
   if err != nil {
      os.Exit(1)
   }
}
```

这样，程序执行后，就能达到和命令执行一样的效果，实现数据库的迁移。

## 2. gormigrate

当然，如果我们使用的是`gorm`，那么推荐使用`gromigrate`，`gorm`本身提供了`AutoMigrate`以及相应的`Migrator`的DDL接口，但是其更着重于`ORM`层面的功能，在`ORM Schema Version Control（数据库版本控制）`方面有所欠缺。而`gromigrate`就是一个轻量化的`Schema Migration Helper（迁移助手）`，基于`GORM AutoMigrate`和`Migrator`进行封装，用于弥补这一块的缺失。

和`golang-migrate`不同的是，`AutoMigrate`会根据程序中数据结构的变化来改变表结构，无需自己写`sql`文件，我们仿照上述例子，来实现一遍。

### 2.1 InitSchema

应用于初始化没有表的场景，可以通过`InitSchema`函数实现注册函数，注意，这里的注册函数只有初始化函数，没有`Rollback`操作。

```go
package main
import (
   "context"
   "database/sql"
   "fmt"
   "log"
   "time"
   "github.com/go-gormigrate/gormigrate/v2"
   "gorm.io/driver/mysql"
   "gorm.io/gorm"
   "gorm.io/gorm/schema"
)
type Person struct {
   ID   int64  `gorm:"autoIncrement:true;primaryKey;column:id;type:bigint(20);not null"`
   Name string `gorm:"column:name;type:varchar(64);not null;comment:'姓名'"`
   Age  int    `gorm:"column:age;type:int(11);not null;comment:'年龄'"`
}
const (
   username = "root"
   password = "IBHojwND.yo"
   hostname = "10.117.49.6:13306"
   dbname   = "migration_test"
)
func dsn(dbName string) string {
   return fmt.Sprintf("%s:%s@tcp(%s)/%s?charset=utf8mb4&parseTime=true", username, password, hostname, dbName)
}
func createDBIfNotExist() error {
   db, err := sql.Open("mysql", dsn(""))
   if err != nil {
      log.Printf("Error %s when opening DB\n", err)
      return err
   }
   defer db.Close()
   ctx, cancelfunc := context.WithTimeout(context.Background(), 5*time.Second)
   defer cancelfunc()
   res, err := db.ExecContext(ctx, "CREATE DATABASE IF NOT EXISTS "+dbname)
   if err != nil {
      log.Printf("Error %s when creating DB\n", err)
      return err
   }
   no, err := res.RowsAffected()
   if err != nil {
      log.Printf("Error %s when fetching rows", err)
      return err
   }
   log.Printf("rows affected %d\n", no)
   return nil
}
func initScheme(db *gorm.DB) {
   m := gormigrate.New(db, gormigrate.DefaultOptions, []*gormigrate.Migration{})
   m.InitSchema(func(db *gorm.DB) error {
      err := db.AutoMigrate(
         &Person{},
      )
      if err != nil {
         panic(err)
      }
      return nil
   })
   err := m.Migrate()
   if err != nil {
      panic(err)
   }
}
func main() {
   err := createDBIfNotExist()
   if err != nil {
      panic(err)
   }
   db, err := gorm.Open(mysql.New(mysql.Config{
      DSN:                       dsn(dbname), // DSN data source name
      DefaultStringSize:         256,         // string 类型字段的默认长度
      DisableDatetimePrecision:  true,        // 禁用 datetime 精度，MySQL 5.6 之前的数据库不支持
      DontSupportRenameIndex:    true,        // 重命名索引时采用删除并新建的方式，MySQL 5.7 之前的数据库和 MariaDB 不支持重命名索引
      DontSupportRenameColumn:   true,        // 用 `change` 重命名列，MySQL 8 之前的数据库和 MariaDB 不支持重命名列
      SkipInitializeWithVersion: false,       // 根据当前 MySQL 版本自动配置
   }), &gorm.Config{
      NamingStrategy: &schema.NamingStrategy{
         TablePrefix:   "",
         SingularTable: true,
      },
      //SkipDefaultTransaction: true, // 开启提高性能，https://gorm.io/docs/transactions.html
   })
   if err != nil {
      panic(err)
   }
   initScheme(db)
}
```

可以看到，此时的`Person`结构体：

```go
type Person struct {
   ID   int64  `gorm:"autoIncrement:true;primaryKey;column:id;type:bigint(20);not null"`
   Name string `gorm:"column:name;type:varchar(64);not null;comment:'姓名'"`
   Age  int    `gorm:"column:age;type:int(11);not null;comment:'年龄'"`
}
```

然后在可以看到生成了两个表：

```sql
MariaDB [migration_test6]> SHOW TABLES;
+---------------------------+
| Tables_in_migration_test6 |
+---------------------------+
| migrations                |
| person                    |
+---------------------------+
2 rows in set (0.000 sec)
```

其中，`person`是我们生成的表，其结构和`Person`结构体一致

```sql
MariaDB [migration_test6]> DESC `person`;
+-------+-------------+------+-----+---------+----------------+
| Field | Type        | Null | Key | Default | Extra          |
+-------+-------------+------+-----+---------+----------------+
| id    | bigint(20)  | NO   | PRI | NULL    | auto_increment |
| name  | varchar(64) | NO   |     | NULL    |                |
| age   | int(11)     | NO   |     | NULL    |                |
+-------+-------------+------+-----+---------+----------------+
3 rows in set (0.001 sec)
```

而`migrations`表是迁移版本记录表，可以发现其只有一列，记录的就是版本号，`InitSchema`成功后版本号是`SCHEMA_INIT`。

```sql
MariaDB [migration_test6]> SELECT * FROM `migrations`;
+-------------+
| id          |
+-------------+
| SCHEMA_INIT |
+-------------+
1 row in set (0.000 sec)
```

### 2.2 增量迁移

需要注意的是，当使用`InitSchema`+`增量迁移`的时候，不能使用同一个实例对象。

#### 2.2.1 新增一列

比如接下来，我们将`Person`结构体新增一个属性`Gender`表示性别：

```go
type Person struct {
   ID     int64  `gorm:"autoIncrement:true;primaryKey;column:id;type:bigint(20);not null"`
   Name   string `gorm:"column:name;type:varchar(64);not null;comment:'姓名'"`
   Age    int    `gorm:"column:age;type:int(11);not null;comment:'年龄'"`
   Gender int    `gorm:"column:gender;type:int(11);not null;comment:'性别：0-未知，1-男性，2-女性'"`
}
```

其实这时候调用`gorm.AutoMigrate`就已经能够自动创建列了，但是为了版本的管理，我们建立以下的版本管理：

```go
func migration(db *gorm.DB) {
   m := gormigrate.New(db, gormigrate.DefaultOptions, []*gormigrate.Migration{
      {
         ID: "20230616165624",
         Migrate: func(tx *gorm.DB) error {
            return tx.AutoMigrate(&Person{})
         },
         Rollback: func(tx *gorm.DB) error { return tx.Migrator().DropColumn("person", "gender") },
      },
   })
   if err := m.Migrate(); err != nil {
      log.Fatalf("Could not migrate: %v", err)
   }
   log.Printf("Migration did run successfully")
}
```

然后在`main`函数最后加上`migration(db)`：

```go
func main() {
   ...
   // 初始化
   initScheme(db)
   // 增量迁移
   migration(db)
}
```

执行完之后，`person`表的结构变为

```sql
MariaDB [migration_test6]> DESC `person`;
+--------+-------------+------+-----+---------+----------------+
| Field  | Type        | Null | Key | Default | Extra          |
+--------+-------------+------+-----+---------+----------------+
| id     | bigint(20)  | NO   | PRI | NULL    | auto_increment |
| name   | varchar(64) | NO   |     | NULL    |                |
| age    | int(11)     | NO   |     | NULL    |                |
| gender | int(11)     | NO   |     | NULL    |                |
+--------+-------------+------+-----+---------+----------------+
4 rows in set (0.001 sec)
```

然后会发现`migrations`表里变为两条：

```sql
MariaDB [migration_test6]> SELECT * FROM `migrations`;
+----------------+
| id             |
+----------------+
| 20230616165624 |
| SCHEMA_INIT    |
+----------------+
2 rows in set (0.000 sec)
```

#### 2.2.2 新增name为index

同样的，首先修改`Person`结构体，给`Name`列加上了名为`idx_name`的索引：

```go
type Person struct {
   ID     int64  `gorm:"autoIncrement:true;primaryKey;column:id;type:bigint(20);not null"`
   Name   string `gorm:"index:idx_name;column:name;type:varchar(64);not null;comment:'姓名'"`
   Age    int    `gorm:"column:age;type:int(11);not null;comment:'年龄'"`
   Gender int    `gorm:"column:gender;type:int(11);not null;comment:'性别：0-未知，1-男性，2-女性'"`
}
```

然后新增版本：

```go
func migration(db *gorm.DB) {
   m := gormigrate.New(db, gormigrate.DefaultOptions, []*gormigrate.Migration{
      {
         ID: "20230616165624",
         Migrate: func(tx *gorm.DB) error {
            return tx.AutoMigrate(&Person{})
         },
         Rollback: func(tx *gorm.DB) error { return tx.Migrator().DropColumn("person", "gender") },
      },
      {
         ID: "20230619104829",
         Migrate: func(tx *gorm.DB) error {
            return tx.AutoMigrate(&Person{})
         },
         Rollback: func(tx *gorm.DB) error { return tx.Migrator().DropIndex("person", "idx_name") },
      },
   })
   if err := m.Migrate(); err != nil {
      log.Fatalf("Could not migrate: %v", err)
   }
   log.Printf("Migration did run successfully")
}
```

执行完会发现，`person`表结构如下：

```sql
MariaDB [migration_test6]> DESC `person`;
+--------+-------------+------+-----+---------+----------------+
| Field  | Type        | Null | Key | Default | Extra          |
+--------+-------------+------+-----+---------+----------------+
| id     | bigint(20)  | NO   | PRI | NULL    | auto_increment |
| name   | varchar(64) | NO   | MUL | NULL    |                |
| age    | int(11)     | NO   |     | NULL    |                |
| gender | int(11)     | NO   |     | NULL    |                |
+--------+-------------+------+-----+---------+----------------+
4 rows in set (0.001 sec)
```

而`migrations`表里会新增一个版本：

```sql
MariaDB [migration_test6]> SELECT * FROM `migrations`;
+----------------+
| id             |
+----------------+
| 20230616165624 |
| 20230619104829 |
| SCHEMA_INIT    |
+----------------+
3 rows in set (0.000 sec)
```

#### 2.2.3 加联合索引

假如我们希望加一个名为`idx_gender_name`的联合索引，使用`gender`和`name`列作为索引，那么需要修改`Person`结构体如下，一定要在每个相关字段上标注联合索引`idx_gender_name`，并且需要按照先后顺序利用`priority`确定优先级，数字越低，优先级越高。

```go
type Person struct {
   ID     int64  `gorm:"autoIncrement:true;primaryKey;column:id;type:bigint(20);not null"`
   Name   string `gorm:"index:idx_name;index:idx_gender_name,priority:2;column:name;type:varchar(64);not null;comment:''姓名''"` // '姓名'
   Age    int    `gorm:"column:age;type:int(11);not null;comment:''年龄''"`                                                      // '年龄'
   Gender int    `gorm:"index:idx_gender_name,priority:1;column:gender;type:int(11);not null;comment:''性别：0-未知，1-男性，2-女性''"`   // '性别：0-未知，1-男性，2-女性'
}
```

然后同样加上版本规划：

```go
{
   ID: "20230619112345",
   Migrate: func(tx *gorm.DB) error {
      return tx.AutoMigrate(&Person{})
   },
   Rollback: func(tx *gorm.DB) error { return tx.Migrator().DropIndex("person", "idx_gender_name") },
},
```

可以发现`person`的索引如下：

```sql
MariaDB [migration_test6]> SHOW INDEX FROM `person`;
+--------+------------+-----------------+--------------+-------------+-----------+-------------+----------+--------+------+------------+---------+---------------+
| Table  | Non_unique | Key_name        | Seq_in_index | Column_name | Collation | Cardinality | Sub_part | Packed | Null | Index_type | Comment | Index_comment |
+--------+------------+-----------------+--------------+-------------+-----------+-------------+----------+--------+------+------------+---------+---------------+
| person |          0 | PRIMARY         |            1 | id          | A         |           0 |     NULL | NULL   |      | BTREE      |         |               |
| person |          1 | idx_name        |            1 | name        | A         |           0 |     NULL | NULL   |      | BTREE      |         |               |
| person |          1 | idx_gender_name |            1 | gender      | A         |           0 |     NULL | NULL   |      | BTREE      |         |               |
| person |          1 | idx_gender_name |            2 | name        | A         |           0 |     NULL | NULL   |      | BTREE      |         |               |
+--------+------------+-----------------+--------------+-------------+-----------+-------------+----------+--------+------+------------+---------+---------------+
4 rows in set (0.000 sec)
```

可以发现，`gormigrate`可以实现数据库的版本迁移，并且是对`Go`语言友好的。在微服务中，如果数据库版本管理不是很复杂，且使用的是`gorm`组件，那么可以使用`gormigrate`。

## 3. 参考文献
- [在 Golang 利用 golang-migrate 實現 database migration](https://bingdoal.github.io/backend/2022/04/golang-golang-migrate-db-migration/)
- [Golang后端学习笔记 — 3.使用Golang编写和执行数据库迁移](https://juejin.cn/post/7084781020205023239)
- [对比 11 个 Go 数据库迁移（migration）工具](https://learnku.com/go/t/52493)
- [Go 语言编程 — gormigrate GORM 的数据库迁移助手](https://bbs.huaweicloud.com/blogs/291765)