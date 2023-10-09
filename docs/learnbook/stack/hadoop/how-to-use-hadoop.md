# hadoop使用

## Hadoop 命令

| 编号 | 操作                                                                                                                                                                                     | 命令                                                                                                                                                          |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 查看指定目录下内容                                                                                                                                                                       | hadoop dfs -ls <hadoop_dir>                                                                                                                                   |
| 2    | 打开某个已存在文件                                                                                                                                                                       | hadoop dfs -cat <hadoop_file>                                                                                                                                 |
| 3    | 查看压缩的文件                                                                                                                                                                           | hadoop fs -text <hadoop_file.gz>                                                                                                                              |
| 4    | 将本地文件存储至hadoop                                                                                                                                                                   | hadoop fs -put <local_file> <hadoop_dir>                                                                                                                      |
| 5    | 将本地文件夹存储至hadoop                                                                                                                                                                 | hadoop fs -put <local_dir> <hadoop_dir>                                                                                                                       |
| 6    | 将hadoop上某个文件下载至本地已有目录                                                                                                                                                     | hadoop fs -get <hadoop_dir> <local_dir>                                                                                                                       |
| 7    | 删除hadoop上指定文件                                                                                                                                                                     | hadoop fs -rm <hadoop_file>                                                                                                                                   |
| 8    | 删除hadoop上指定文件夹（包含子目录等）                                                                                                                                                   | hadoop fs -rmr <hadoop_dir>                                                                                                                                   |
| 9    | 在hadoop指定目录内创建新目录                                                                                                                                                             | hadoop fs -mkdir /user/t                                                                                                                                      |
| 10   | 在hadoop指定目录下新建一个空文件，使用touchz命令                                                                                                                                         | hadoop fs -touchz /user/new.txt                                                                                                                               |
| 11   | 将hadoop上某个文件重命名，使用mv命令                                                                                                                                                     | hadoop fs -mv /user/test.txt /user/ok.txt （将test.txt重命名为ok.txt）                                                                                        |
| 12   | 检查文件是否存在<br><br>-e 检查文件是否存在。如果存在则返回0；否则返回1。  <br>-z 检查文件是否是0字节。如果是则返回0；否则返回1。  <br>-d 检查路径是否是目录。如果是则返回0；否则返回1。 | hadoop fs -test -[ezd] /user/new.txt                                                                                                                          |
| 13   | 将hadoop指定目录下所有内容保存为一个文件，同时down至本地                                                                                                                                 | hadoop dfs -getmerge /user /home/t                                                                                                                            |
| 14   | 将正在运行的hadoop作业kill掉                                                                                                                                                             | hadoop job -kill [job-id]                                                                                                                                     |
| 15   | 将正在运行的Yarn作业kill掉，比如Spark                                                                                                                                                    | yarn application -kill [applicationId]                                                                                                                        |
| 16   | NameNode之间元数据同步命令                                                                                                                                                               | hdfs namenode -bootstrapStandby                                                                                                                               |
| 17   | 查看HDFS基本统计信息                                                                                                                                                                     | hadoop dfsadmin -report                                                                                                                                       |
| 18   | 进入和退出安全模式                                                                                                                                                                       | hadoop dfsadmin -safemode enter  <br>hadoop dfsadmin -safemode leave                                                                                          |
| 19   | 检查hdfs文件目录                                                                                                                                                                         | hadoop fsck / -files -blocks                                                                                                                                  |
| 20   | 修改hdfs副本个数，dfs.<br><br>replication参数不会修改已经存在的文件系统，可手动修改文件副本个数                                                                                          | hadoop fs -setrep -R 2 /                                                                                                                                      |
| 21   | 设置文件目录的大小限制                                                                                                                                                                   | hadoop dfsadmin -setSpaceQuota 1t /user/username                                                                                                              |
| 22   | 改变目录owner                                                                                                                                                                            | hadoop fs -chown [-R] [OWNER][:[GROUP]] URI [URI …]<br><br>使用-R让改变在目录结构下递归进行。命令的使用者必须是超级用户。(hadoop的ugi是源ugi，owner是目标ugi) |
 

## 常用参数  

| 选项                 | 参数名                                             | 含义                                                                                                                       |
| -------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| --config             |                                                    | 指定conf目录，用于本地多套配置 hadoop --config hadoop_conf_dir                                                             |
| -conf                |                                                    | 使用的指定客户端配置文件，例如 hadoop fs -conf conf/hadoop-site-xxx.xml -ls /xxx                                           |
| -mapper              |                                                    | mapper 执行的命令。                                                                                                        |
| -reducer             |                                                    | reducer执行的命令。如不需要做reduce，可以写为NONE。                                                                        |
| -input               |                                                    | 输入路径，多个路径用逗号分隔。                                                                                             |
| -output              |                                                    | 输出路径                                                                                                                   |
| -file                |                                                    | 需要从本地上传到环境的文件。                                                                                               |
| -cacheArchive        |                                                    | 需要从集群上get到环境的tar包，路径后面加#表示解压到#后面的目录下。<br><br>例如：/app/ecom/fcr-model/mydir/my.tar.gz#my_tar |
| 存储                 | dfs.client.block.write.retries                     | 写数据时retry的最大次数                                                                                                    |
|                      | dfs.replication                                    | 默认块的副本数                                                                                                             |
| -jobconf 或-D        | mapred.job.queue.name                              | 队列名                                                                                                                     |
| -D参数需要写在最前面 | mapred.job.name                                    | 任务名                                                                                                                     |
|                      | mapred.job.priority                                | 优先级                                                                                                                     |
|                      | mapred.max.split.size                              | map时最大处理的数据量，单位字节。如果文件太大，可以划分为多个map进行处理                                                   |
|                      | mapred.min.split.size                              | map时最小处理的数据量，单位字节。如果不想把一个输入划分为太多的小map任务，可以设为一个较大的值                             |
|                      | mapred.map.tasks                                   | map任务数                                                                                                                  |
|                      | mapred.reduce.tasks                                | reduce任务数，如填0则mr自动计算                                                                                            |
|                      | mapred.job.map.capacity                            | 同时执行的map任务数                                                                                                        |
|                      | mapred.job.reduce.capacity                         | 同时执行的reduce任务数                                                                                                     |
|                      | mapred.output.compress                             | 输出结果是否进行压缩                                                                                                       |
|                      | mapred.output.compression.codec                    | 输出结果的压缩方式，通常用org.apache.hadoop.io.compress.GzipCodec                                                          |
|                      | mapred.textoutputformat.ignoreseparator            | 去掉只有key，没有value时，后面多加的分隔，默认false， 设置为true只输出key的内容                                            |
|                      | mapred.textoutputformat.separator                  | 设置TextOutputFormat的输出key,value分隔符，默认Tab                                                                         |
|                      | stream.map.output.field.separator                  | 设置分隔符                                                                                                                 |
|                      | mapred.reduce.slowstart.completed.maps             | map完成多少百分比时，开始reduce的shuffle，避免reduce提前启动占用大量资源，造成map运行变慢。默认好像是0.7                   |
|                      | mapred.reduce.slowstart.completed.maps.low.thresh  |                                                                                                                            |
|                      | mapred.reduce.slowstart.completed.maps.high.thresh |                                                                                                                            |
|                      | mapred.map.over.capacity.allowed                   | map是否可以超过设置的capacity                                                                                              |
|                      | mapred.reduce.over.capacity.allowed                | reduce是否可以超过设置的capacity                                                                                           |
|                      | abaci.map.over.capacity.threshold (ms)             | 当map执行时间小于该阈值时，可以overcapacity。队列默认设置为720000，不可自己设置                                            |
|                      | abaci.reduce.over.capacity.threshold (ms)          | 当reduce执行时间小于该阈值时，可以overcapacity。队列默认设置为900000，不可自己设置                                         |
| -partitioner         | com.baidu.sos.mapred.lib.MapIntPartitioner         | map时按文件划分到对应的task执行，也就是有多少个输入文件，就对应执行多少个map                                               |


## 一些环境变量

- map任务编号：`self.map_id = os.getenv('mapred_task_partition').strip()`
- map任务的ip：`self.map_ip = os.getenv('MATRIX_HOST_IP').strip()`
- map的输入文件：`self.source = os.getenv('map_input_file').strip()`





