# explain 命令详解

## explain 命令

在 select 语句之前增加 explain 关键字，MySQL 会在查询上设置一个标记，从而在执行查询时，会返回执行计划的信息，而不是执行这条 SQL 。

explain 命令可以获取 MySQL 如何执行 SELECT 语句的信息，来查看一个这些 SQL 语句的执行计划，如该 SQL 语句有没有使用上了索引、有没有做全表扫描等。这是查询性能优化不可缺少的一部分，因此平时在进行 SQL 开发时，都要养成用 explain 分析的习惯。

```sql
mysql> explain select * from actor;
+----+-------------+-------+------+---------------+------+---------+------+------+-------+
| id | select_type | table | type | possible_keys | key  | key_len | ref  | rows | Extra |
+----+-------------+-------+------+---------------+------+---------+------+------+-------+
|  1 | SIMPLE      | actor | ALL  | NULL          | NULL | NULL    | NULL |    2 | NULL  |
+----+-------------+-------+------+---------------+------+---------+------+------+-------+
```

expain 出来的信息有 10 列，分别是 id、select_type、table、type、possible_keys、key、key_len、ref、rows、Extra 。下面对这些字段出现的可能进行解释：

|列名|说明|
|---|---|
|id|执行编号，有几个 select 就有几个 id|
|select_type|表示本行是简单的还是复杂的 select|
|table|正在访问哪一个表（表名或别名）|
|**`type`**|表示关联类型或访问类型，即 MySQL 决定如何查找表中的行|
|possible_keys|哪些索引可以优化查询|
|**`key`**|实际采用哪个索引来优化查询|
|key_len|索引字段的长度|
|ref|显示了之前的表在 key 列记录的索引中查找值所用的列或常量|
|**`rows`**|为了找到所需的行而需要读取的行数（估算值，并不精确）|
|**`Extra`**|执行情况的额外描述和说明|
|partitions  <br>（MySQL 8 新增）|如果查询是基于分区表的话，会显示查询将访问的分区|
|filtered  <br>（MySQL 8 新增）|按表条件过滤的行百分比。  <br>rows * filtered/100 可以估算出将要和 explain 中前一个表进行连接的行数（前一个表指 explain 中的 id 值比当前表 id 值小的表）|

explain 之后还可以通过 **show warnings** 命令得到优化后的查询语句，从而看出优化器优化了什么。

```sql
mysql> explain extended select * from film where id = 1;
+----+-------------+-------+-------+---------------+---------+---------+-------+------+----------+-------+
| id | select_type | table | type  | possible_keys | key     | key_len | ref   | rows | filtered | Extra |
+----+-------------+-------+-------+---------------+---------+---------+-------+------+----------+-------+
|  1 | SIMPLE      | film  | const | PRIMARY       | PRIMARY | 4       | const |    1 |   100.00 | NULL  |
+----+-------------+-------+-------+---------------+---------+---------+-------+------+----------+-------+

mysql> show warnings;
+-------+------+--------------------------------------------------------------------------------+
| Level | Code | Message                                                                        |
+-------+------+--------------------------------------------------------------------------------+
| Note  | 1003 | /* select#1 */ select '1' AS `id`,'film1' AS `name` from `test`.`film` where 1 |
+-------+------+--------------------------------------------------------------------------------+
```

## id

id 列的编号是 select 的序列号，有几个 select 就有几个 id，且 id 越大的语句越先执行。

- 如果是子查询，则会有递增的多个 id 值，那么 **id 值越大表示优先级越高，越先被执行**。
- id 值可能为 NULL，表示这一行是其他行的联合结果；
- id 如果相同，可以认为是一组，从上往下顺序执行。

MySQL 将 select 查询分为简单查询和复杂查询。复杂查询又分为三类：简单子查询、派生表（from 语句中的子查询）、union 查询。

**简单子查询**：

```sql
mysql> explain select (select 1 from actor limit 1) from film;
+----+-------------+-------+-------+---------------+----------+---------+------+------+-------------+
| id | select_type | table | type  | possible_keys | key      | key_len | ref  | rows | Extra       |
+----+-------------+-------+-------+---------------+----------+---------+------+------+-------------+
|  1 | PRIMARY     | film  | index | NULL          | idx_name | 32      | NULL |    1 | Using index |
|  2 | SUBQUERY    | actor | index | NULL          | PRIMARY  | 4       | NULL |    2 | Using index |
+----+-------------+-------+-------+---------------+----------+---------+------+------+-------------+ 
```

**from 子句中的子查询**：

```sql
mysql> explain select id from (select id from film) as der;
+----+-------------+------------+-------+---------------+----------+---------+------+------+-------------+
| id | select_type | table      | type  | possible_keys | key      | key_len | ref  | rows | Extra       |
+----+-------------+------------+-------+---------------+----------+---------+------+------+-------------+
|  1 | PRIMARY     | <derived2> | ALL   | NULL          | NULL     | NULL    | NULL |    2 | NULL        |
|  2 | DERIVED     | film       | index | NULL          | idx_name | 32      | NULL |    1 | Using index |
+----+-------------+------------+-------+---------------+----------+---------+------+------+-------------+
```

如上述查询执行时有个临时表别名为 der，外部 select 查询引用了这个临时表。

**union 查询**：

```sql
mysql> explain select 1 union all select 1;
+----+--------------+------------+------+---------------+------+---------+------+------+-----------------+
| id | select_type  | table      | type | possible_keys | key  | key_len | ref  | rows | Extra           |
+----+--------------+------------+------+---------------+------+---------+------+------+-----------------+
|  1 | PRIMARY      | NULL       | NULL | NULL          | NULL | NULL    | NULL | NULL | No tables used  |
|  2 | UNION        | NULL       | NULL | NULL          | NULL | NULL    | NULL | NULL | No tables used  |
| NULL | UNION RESULT | <union1,2> | ALL  | NULL          | NULL | NULL    | NULL | NULL | Using temporary |
+----+--------------+------------+------+---------------+------+---------+------+------+-----------------+
```

union 结果总是放在一个匿名临时表中，因为临时表不在 SQL 中出现，因此它的 id 是 NULL 。

  

## select_type

select_type 表示对应行是简单还是复杂的查询，如果是复杂的查询，又是上述三种复杂查询中的哪一种。

- **`simple`**：简单查询，即查询不包含子查询和 union。

```sql
mysql> explain select * from film where id = 2;
+----+-------------+-------+-------+---------------+---------+---------+-------+------+-------+
| id | select_type | table | type  | possible_keys | key     | key_len | ref   | rows | Extra |
+----+-------------+-------+-------+---------------+---------+---------+-------+------+-------+
|  1 | SIMPLE      | film  | const | PRIMARY       | PRIMARY | 4       | const |    1 | NULL  |
+----+-------------+-------+-------+---------------+---------+---------+-------+------+-------+
```

- **`primary`**：复杂查询中最外层的 select。
- **`subquery`**：包含在 select 中的子查询（不在 from 子句中）。
- **`derived`**：包含在 from 子句中的子查询。MySQL 会将结果存放在一个临时表中，也称为派生表（derived 的英文含义）。

```sql
mysql> explain select (select 1 from actor where id = 1) from (select * from film where id = 1) der;
+----+-------------+------------+--------+---------------+---------+---------+-------+------+-------------+
| id | select_type | table      | type   | possible_keys | key     | key_len | ref   | rows | Extra       |
+----+-------------+------------+--------+---------------+---------+---------+-------+------+-------------+
|  1 | PRIMARY     | <derived3> | system | NULL          | NULL    | NULL    | NULL  |    1 | NULL        |
|  3 | DERIVED     | film       | const  | PRIMARY       | PRIMARY | 4       | const |    1 | NULL        |
|  2 | SUBQUERY    | actor      | const  | PRIMARY       | PRIMARY | 4       | const |    1 | Using index |
+----+-------------+------------+--------+---------------+---------+---------+-------+------+-------------+ 
```

- **`union`**：在 union 中的第二个和之后的 select 。
- **`union result`**：从 union 临时表检索结果的 select 。

```sql
mysql> explain select 1 union all select 1;
+----+--------------+------------+------+---------------+------+---------+------+------+-----------------+
| id | select_type  | table      | type | possible_keys | key  | key_len | ref  | rows | Extra           |
+----+--------------+------------+------+---------------+------+---------+------+------+-----------------+
|  1 | PRIMARY      | NULL       | NULL | NULL          | NULL | NULL    | NULL | NULL | No tables used  |
|  2 | UNION        | NULL       | NULL | NULL          | NULL | NULL    | NULL | NULL | No tables used  |
| NULL | UNION RESULT | <union1,2> | ALL  | NULL          | NULL | NULL    | NULL | NULL | Using temporary |
+----+--------------+------------+------+---------------+------+---------+------+------+-----------------+
```

- **`dependent union`**：首先需要满足 UNION 的条件及 UNION 中第二个以及后面的 SELECT 语句，同时该语句依赖外部的查询。
- **`dependent subquery`**：和 DEPENDENT UNION 相对 UNION 一样。

  

## table

table 表示对应行正在访问哪一个表，表名或者别名。

- 关联优化器会为查询选择关联顺序，左侧深度优先。
- 当 from 子句中有子查询时，table 列是 <derivenN> 格式，表示的是当前查询依赖 id=N 的查询，于是先执行 id=N 的查询。
- 当有 union 时，UNION RESULT 的 table 列的值为 <union1, 2>，1 和 2 表示参与 union 的 select 行 id。

注意：MySQL 对待这些表和普通表一样，但是这些“临时表”是没有任何索引的。


## \*type

这一列表示关联类型或访问类型，即 MySQL 决定如何查找表中的行，是较为重要的一个指标。

结果值从好到坏依次是：**`NULL > system > const > eq_ref > ref > fulltext > ref_or_null > index_merge > unique_subquery > index_subquery > range > index > ALL`**。

一般来说，得保证查询至少达到 range 级别，最好能达到 ref 。

- **`NULL`**：MySQL 能够在优化阶段分解查询语句，在执行阶段用不着再访问表或索引。例如：在索引列中选取最小值，可以通过单独查找索引值来完成，不需要在执行时访问表。

```sql
mysql> explain select min(id) from film;
+----+-------------+-------+------+---------------+------+---------+------+------+------------------------------+
| id | select_type | table | type | possible_keys | key  | key_len | ref  | rows | Extra                        |
+----+-------------+-------+------+---------------+------+---------+------+------+------------------------------+
|  1 | SIMPLE      | NULL  | NULL | NULL          | NULL | NULL    | NULL | NULL | Select tables optimized away |
+----+-------------+-------+------+---------------+------+---------+------+------+------------------------------+
```

- **`const、system`**：MySQL 能对查询的某部分进行优化并将其转化成一个常量（可以看 show warnings 的结果），常用于 primary key 或 unique key 的所有列与常数比较时，因此表最多有一个匹配行，读取 1 次，速度比较快。

```sql
mysql> explain extended select * from (select * from film where id = 1) tmp;
+----+-------------+------------+--------+---------------+---------+---------+-------+------+----------+-------+
| id | select_type | table      | type   | possible_keys | key     | key_len | ref   | rows | filtered | Extra |
+----+-------------+------------+--------+---------------+---------+---------+-------+------+----------+-------+
|  1 | PRIMARY     | <derived2> | system | NULL          | NULL    | NULL    | NULL  |    1 |   100.00 | NULL  |
|  2 | DERIVED     | film       | const  | PRIMARY       | PRIMARY | 4       | const |    1 |   100.00 | NULL  |
+----+-------------+------------+--------+---------------+---------+---------+-------+------+----------+-------+

mysql> show warnings;
+-------+------+---------------------------------------------------------------+
| Level | Code | Message                                                       |
+-------+------+---------------------------------------------------------------+
| Note  | 1003 | /* select#1 */ select '1' AS `id`,'film1' AS `name` from dual |
+-------+------+---------------------------------------------------------------+
```

- **`eq_ref`**：primary key 或 unique key 索引的所有部分被连接使用 ，最多只会返回一条符合条件的记录。这可能是在 const 之外最好的联接类型了，简单的 select 查询不会出现这种 type。

```sql
mysql> explain select * from film_actor left join film on film_actor.film_id = film.id;
+----+-------------+------------+--------+---------------+-------------------+---------+-------------------------+------+-------------+
| id | select_type | table      | type   | possible_keys | key               | key_len | ref                     | rows | Extra       |
+----+-------------+------------+--------+---------------+-------------------+---------+-------------------------+------+-------------+
|  1 | SIMPLE      | film_actor | index  | NULL          | idx_film_actor_id | 8       | NULL                    |    3 | Using index |
|  1 | SIMPLE      | film       | eq_ref | PRIMARY       | PRIMARY           | 4       | test.film_actor.film_id |    1 | NULL        |
+----+-------------+------------+--------+---------------+-------------------+---------+-------------------------+------+-------------+
```

- **`ref`**：相比 eq_ref，不使用唯一索引，而是使用普通索引或者唯一索引的部分前缀。索引要和某个值相比较，可能会找到多个符合条件的行。

```sql
-- 1. 简单 select 查询，name 是普通索引（非唯一索引）
mysql> explain select * from film where name = "film1";
+----+-------------+-------+------+---------------+----------+---------+-------+------+--------------------------+
| id | select_type | table | type | possible_keys | key      | key_len | ref   | rows | Extra                    |
+----+-------------+-------+------+---------------+----------+---------+-------+------+--------------------------+
|  1 | SIMPLE      | film  | ref  | idx_name      | idx_name | 33      | const |    1 | Using where; Using index |
+----+-------------+-------+------+---------------+----------+---------+-------+------+--------------------------+

-- 2. 关联表查询，idx_film_actor_id 是 film_id 和 actor_id 的联合索引，这里使用到了 film_actor 的左边前缀 film_id 部分
mysql> explain select * from film left join film_actor on film.id = film_actor.film_id;
+----+-------------+------------+-------+-------------------+-------------------+---------+--------------+------+-------------+
| id | select_type | table      | type  | possible_keys     | key               | key_len | ref          | rows | Extra       |
+----+-------------+------------+-------+-------------------+-------------------+---------+--------------+------+-------------+
|  1 | SIMPLE      | film       | index | NULL              | idx_name          | 33      | NULL         |    3 | Using index |
|  1 | SIMPLE      | film_actor | ref   | idx_film_actor_id | idx_film_actor_id | 4       | test.film.id |    1 | Using index |
+----+-------------+------------+-------+-------------------+-------------------+---------+--------------+------+-------------+
```

- **`ref_or_null`**：类似 ref，但是可以搜索值为 NULL 的行。

```sql
mysql> explain select * from film where name = "film1" or name is null;
+----+-------------+-------+-------------+---------------+----------+---------+-------+------+--------------------------+
| id | select_type | table | type        | possible_keys | key      | key_len | ref   | rows | Extra                    |
+----+-------------+-------+-------------+---------------+----------+---------+-------+------+--------------------------+
|  1 | SIMPLE      | film  | ref_or_null | idx_name      | idx_name | 33      | const |    2 | Using where; Using index |
+----+-------------+-------+-------------+---------------+----------+---------+-------+------+--------------------------+
```

- **`index_merge`**：表示使用了索引合并的优化方法。例如下表：id 是主键，tenant_id 是普通索引。or 的时候没有用 primary key，而是使用了 primary key(id) 和 tenant_id 索引。

```sql
mysql> explain select * from role where id = 11011 or tenant_id = 8888;
+----+-------------+-------+-------------+-----------------------+-----------------------+---------+------+------+-------------------------------------------------+
| id | select_type | table | type        | possible_keys         | key                   | key_len | ref  | rows | Extra                                           |
+----+-------------+-------+-------------+-----------------------+-----------------------+---------+------+------+-------------------------------------------------+
|  1 | SIMPLE      | role  | index_merge | PRIMARY,idx_tenant_id | PRIMARY,idx_tenant_id | 4,4     | NULL |  134 | Using union(PRIMARY,idx_tenant_id); Using where |
+----+-------------+-------+-------------+-----------------------+-----------------------+---------+------+------+-------------------------------------------------+
```

- **`range`**：范围扫描通常出现在 in()、between、>、<、>= 等操作中，表示使用一个索引来检索给定范围的行。一个良好的 SQL 效率至少要保证到该级别。

```sql
mysql> explain select * from actor where id > 1;
+----+-------------+-------+-------+---------------+---------+---------+------+------+-------------+
| id | select_type | table | type  | possible_keys | key     | key_len | ref  | rows | Extra       |
+----+-------------+-------+-------+---------------+---------+---------+------+------+-------------+
|  1 | SIMPLE      | actor | range | PRIMARY       | PRIMARY | 4       | NULL |    2 | Using where |
+----+-------------+-------+-------+---------------+---------+---------+------+------+-------------+
```

- **`index`**：和 ALL 一样，不同就是 MySQL 只需扫描索引树，这通常比 ALL 快一些。

```sql
mysql> explain select count(*) from film;
+----+-------------+-------+-------+---------------+----------+---------+------+------+-------------+
| id | select_type | table | type  | possible_keys | key      | key_len | ref  | rows | Extra       |
+----+-------------+-------+-------+---------------+----------+---------+------+------+-------------+
|  1 | SIMPLE      | film  | index | NULL          | idx_name | 33      | NULL |    3 | Using index |
+----+-------------+-------+-------+---------------+----------+---------+------+------+-------------+
```

- **`ALL`**：全表扫描，意味着 MySQL 需要从头到尾去查找所需要的行。通常情况下这需要增加索引来进行优化了。

```sql
mysql> explain select * from actor;
+----+-------------+-------+------+---------------+------+---------+------+------+-------+
| id | select_type | table | type | possible_keys | key  | key_len | ref  | rows | Extra |
+----+-------------+-------+------+---------------+------+---------+------+------+-------+
|  1 | SIMPLE      | actor | ALL  | NULL          | NULL | NULL    | NULL |    2 | NULL  |
+----+-------------+-------+------+---------------+------+---------+------+------+-------+
```

  

## possible_keys

这一列显示查询可能使用哪些索引来查找，但是列出来的索引对于后续优化过程可能是没有用上的。

explain 时可能出现 possible_keys 列有值，而 key 列显示 NULL 的情况，通常是因为表中数据不多，MySQL 认为索引对此查询帮助不大，于是选择了全表查询。

如果该列是 NULL，则表示没有使用相关的索引。在这种情况下，可以通过检查 where 子句看是否可以创造一个适当的索引来提高查询性能，然后用 explain 查看效果。

  

## * key

key 列显示 MySQL 实际决定使用的键（索引）。

如果没有使用索引，则该列是 NULL。如果想强制 MySQL 使用或忽视 possible_keys 列中的索引，可以在查询中使用 force index、ignore index。

  

## key_len

key_len 列显示 MySQL 决定使用的索引长度（字节数），通过这个值可以算出具体使用了索引中的哪些列。

- 如果值是 NULL，则表示长度为 NULL。
- 在不损失精确性的情况下，索引长度越短越好 。

举例来说，film_actor 的联合索引 idx_film_actor_id 由 film_id 和 actor_id 这两个 int 列组成，并且每个 int 是 4 字节。通过结果中的 key_len=4 可推断出查询使用了第一个列：film_id 列来执行索引查找。

```sql
mysql> explain select * from film_actor where film_id = 2;
+----+-------------+------------+------+-------------------+-------------------+---------+-------+------+-------------+
| id | select_type | table      | type | possible_keys     | key               | key_len | ref   | rows | Extra       |
+----+-------------+------------+------+-------------------+-------------------+---------+-------+------+-------------+
|  1 | SIMPLE      | film_actor | ref  | idx_film_actor_id | idx_film_actor_id | 4       | const |    1 | Using index |
+----+-------------+------------+------+-------------------+-------------------+---------+-------+------+-------------+
```

key_len 计算规则如下：

- 字符串
    - char(n)：n 字节长度
    - varchar(n)：2 字节存储字符串长度；如果是 utf-8，则长度为 3*n + 2
- 数值类型
    - tinyint：1 字节
    - smallint：2 字节
    - int：4 字节
    - bigint：8 字节　　
- 时间类型　
    - date：3 字节
    - timestamp：4 字节
    - datetime：8 字节

- 如果字段允许为 NULL，则需要 1 字节记录是否为 NULL

索引最大长度是 768 字节，当字符串过长时，MySQL 会做一个类似左前缀索引的处理，将前半部分的字符提取出来做索引。

  

## ref

这一列显示了在 key 列记录的索引中，表查找值所用到的列或常量，常见的有：const（常量）、func、NULL、字段名（例：film.id）。

  

## * rows

rows 列显示 MySQL 认为它执行查询时必须检查的行数。注意这是一个预估值。

  

## * Extra

Extra 是 EXPLAIN 输出中另外一个很重要的列，该列显示 MySQL 在查询过程中的一些详细信息，MySQL 查询优化器执行查询的过程中对查询计划的重要补充信息。

- **`distinct`**: 一旦 MySQL 找到了与行相联合匹配的行，就不再搜索了。

```sql
mysql> explain select distinct name from film left join film_actor on film.id = film_actor.film_id;
+----+-------------+------------+-------+-------------------+-------------------+---------+--------------+------+------------------------------+
| id | select_type | table      | type  | possible_keys     | key               | key_len | ref          | rows | Extra                        |
+----+-------------+------------+-------+-------------------+-------------------+---------+--------------+------+------------------------------+
|  1 | SIMPLE      | film       | index | idx_name          | idx_name          | 33      | NULL         |    3 | Using index; Using temporary |
|  1 | SIMPLE      | film_actor | ref   | idx_film_actor_id | idx_film_actor_id | 4       | test.film.id |    1 | Using index; Distinct        |
+----+-------------+------------+-------+-------------------+-------------------+---------+--------------+------+------------------------------+
```

- **`Using index`**：这发生在对表的请求列都是索引的时候，不需要读取数据文件，而从索引树（索引文件）中即可获得信息。这也是`覆盖索引的标识，是性能高的表现`。这是 MySQL 服务层完成的，无需再回表查询记录。
    
    - 如果同时出现 using where，表明索引被用来执行索引键值的查找；
    - 没有 using where，表明索引用来读取数据而非执行查找动作。  
        mysql> explain select id from film order by id;  
        +----+-------------+-------+-------+---------------+---------+---------+------+------+-------------+  
        | id | select_type | table | type | possible_keys | key | key_len | ref | rows | Extra |  
        +----+-------------+-------+-------+---------------+---------+---------+------+------+-------------+  
        | 1 | SIMPLE | film | index | NULL | PRIMARY | 4 | NULL | 3 | Using index |  
        +----+-------------+-------+-------+---------------+---------+---------+------+------+-------------+
- **`Using where`**：使用了 WHERE 从句来限制哪些行将与下一张表匹配或者是返回给用户。**注意**：Extra 列出现 using where 表示 MySQL 服务器将存储引擎返回服务层以后再应用 WHERE 条件过滤，符合就留下，不符合就丢弃。
    

```sql
mysql> explain select * from film where id > 1;
+----+-------------+-------+-------+---------------+----------+---------+------+------+--------------------------+
| id | select_type | table | type  | possible_keys | key      | key_len | ref  | rows | Extra                    |
+----+-------------+-------+-------+---------------+----------+---------+------+------+--------------------------+
|  1 | SIMPLE      | film  | index | PRIMARY       | idx_name | 33      | NULL |    3 | Using where; Using index |
+----+-------------+-------+-------+---------------+----------+---------+------+------+--------------------------+
```

- **`Using temporary`**：表示需要用临时表保存中间结果，常用于 GROUP BY 和 ORDER BY 操作中，一般看到它说明查询需要优化了，就算避免不了临时表的使用也要尽量避免硬盘临时表的使用。

```sql
-- 1. actor.name 没有索引，此时创建了张临时表来 distinct
mysql> explain select distinct name from actor;
+----+-------------+-------+------+---------------+------+---------+------+------+-----------------+
| id | select_type | table | type | possible_keys | key  | key_len | ref  | rows | Extra           |
+----+-------------+-------+------+---------------+------+---------+------+------+-----------------+
|  1 | SIMPLE      | actor | ALL  | NULL          | NULL | NULL    | NULL |    2 | Using temporary |
+----+-------------+-------+------+---------------+------+---------+------+------+-----------------+

-- 2. film.name 建立了 idx_name 索引，此时查询时 extra 是 using index，没有用临时表
mysql> explain select distinct name from film;
+----+-------------+-------+-------+---------------+----------+---------+------+------+-------------+
| id | select_type | table | type  | possible_keys | key      | key_len | ref  | rows | Extra       |
+----+-------------+-------+-------+---------------+----------+---------+------+------+-------------+
|  1 | SIMPLE      | film  | index | idx_name      | idx_name | 33      | NULL |    3 | Using index |
+----+-------------+-------+-------+---------------+----------+---------+------+------+-------------+
```

- **`Using filesort`**：MySQL需要额外的一次传递，以找出如何按排序顺序检索行。通过根据联接类型浏览所有行并为所有匹配 WHERE 子句的行保存排序关键字和行的指针来完成排序。然后关键字被排序，并按排序顺序检索行。
    - MySQL 有两种方式可以生成有序的结果，通过排序操作或者使用索引。当 Extra 中出现了 Using filesort，说明查询排序使用了前者。注意虽然叫 filesort 但并不说明就是用了文件来进行排序，只要可能，排序都是在内存里完成的。大部分情况下利用索引排序更快，所以一般这时也要考虑优化查询了。
    - filesort 有两种排序方式：
        - 对需要排序的记录生成 **<sort_key, rowid>** 的元数据进行排序，该元数据仅包含排序字段和 rowid。排序完成后只有按字段排序的 rowid，因此还需要通过 rowid 进行**回表**操作获取所需要的列的值，可能会**导致大量的随机 I/O 读消耗**。其`解决方案是使用覆盖索引`。
        - 对需要排序的记录生成 **<sort_key, additional_fields>** 的元数据，该元数据包含排序字段和需要返回的所有列。排序完后不需要回表，但是元数据要比第一种方法长得多，**需要更多的空间用于排序**。其解决方案是：filesort 使用的算法是 QuickSort，即对需要排序的记录生成元数据进行分块排序，然后再使用 mergesort 方法合并块。其中 filesort 可以使用的内存空间大小为参数 sort_buffer_size 的值，默认为 2M。当排序记录太多导致 sort_buffer_size 不够用时，MySQL 会使用临时文件来存放各个分块，然后各个分块排序后再多次合并分块最终全局完成排序。因此`可以通过增大 sort_buffer_size 来解决 filesort 问题`。

```sql
-- 1. actor.name 未创建索引，会浏览 actor 整个表，保存排序关键字 name 和对应的 id，然后排序 name 并检索行记录
mysql> explain select * from actor order by name;
+----+-------------+-------+------+---------------+------+---------+------+------+----------------+
| id | select_type | table | type | possible_keys | key  | key_len | ref  | rows | Extra          |
+----+-------------+-------+------+---------------+------+---------+------+------+----------------+
|  1 | SIMPLE      | actor | ALL  | NULL          | NULL | NULL    | NULL |    2 | Using filesort |
+----+-------------+-------+------+---------------+------+---------+------+------+----------------+

-- 2. film.name 建立了 idx_name 索引，此时查询时 extra 是 using index
mysql> explain select * from film order by name;
+----+-------------+-------+-------+---------------+----------+---------+------+------+-------------+
| id | select_type | table | type  | possible_keys | key      | key_len | ref  | rows | Extra       |
+----+-------------+-------+-------+---------------+----------+---------+------+------+-------------+
|  1 | SIMPLE      | film  | index | NULL          | idx_name | 33      | NULL |    3 | Using index |
+----+-------------+-------+-------+---------------+----------+---------+------+------+-------------+
```

- **`Not exists`**：MYSQL 优化了 LEFT JOIN，一旦它找到了匹配 LEFT JOIN 标准的行，就不再搜索了。
    
- **`Using index condition`**：这是 MySQL 5.6 出来的新特性，叫做“索引条件推送"。简单点说就是 MySQL 原来在索引上是不能执行如 like 这样的操作的，但是现在可以了，这样就减少了不必要的 I/O 操作，但是只能用在二级索引上。
    
- **`Using join buffer`**：表示使用了连接缓存。
    
    - BlockNestedLoop，连接算法是块嵌套循环连接。
    - BatchedKeyAccess，连接算法是批量索引连接。
- **`impossible where`**：子句的值总是 false，不能用来获取任何元组。
    
- **`select tables optimized away`**：在没有 GROUP BY 子句的情况下，基于索引优化 MIN/MAX 操作，或者对于 MyISAM 存储引擎优化 COUNT(*) 操作，而不必等到执行阶段再进行计算，即在查询执行计划生成的阶段就完成优化。