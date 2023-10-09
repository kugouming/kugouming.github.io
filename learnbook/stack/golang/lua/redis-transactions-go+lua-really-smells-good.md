# Redis的事务，Go+lua用起来真香

Redis是应对高并发的常用工具，在[常用缓存技巧](https://www.shouxicto.com/?url=aHR0cHM6Ly9tcC53ZWl4aW4ucXEuY29tL3M/X19iaXo9TXpVek56QXpNVGMzTUE9PSZtaWQ9MjI0NzQ4MzcxNSZpZHg9MSZzbj1kNmEzMjIzMjg5NDQzYzBkZDFjZmQ4ZWNhZmUyY2JkOSZzY2VuZT0yMSN3ZWNoYXRfcmVkaXJlY3Q=)中讲过相关技巧。但有些业务场景，使用Redis会遇到问题，如电商里的秒杀、扣减库存等。

拿减库存举例，一般需要两步：

- 先扣减库存，获取扣减后的库存值V
- 如果V小于0，说明库存不够，需要将扣减的值再加回去；如果V大于等于0，则执行后续操作

但这两步是分开的，很可能扣减时成功，但增加回去时失败，导致库存不一致。

另一种方案是：

- t1时刻，先查询库存，判断是否够用
- t2时刻，再减库存

但这两步也是分开的，而且t1和t2有时间差，t2时刻扣减库存时，真正的库存和t1时刻已经不一致了。

Redis有没有像MySQL原子性一样的能力，来解决这个问题呢？

## 事务

要解决扣减库存的问题，可以借助Redis的事务能力。

## 基本介绍

Redis的基本事务（basic transaction）需要用到MULTI命令和EXEC命令，这种事务可以让一个客户端在不被其他客户端打断的情况下执行多个命令。

和关系数据库那种可以在执行的过程中进行回滚（rollback）的事务不同，在Redis里面，被MULTI命令和EXEC命令包围的所有命令会一个接一个地执行，直到所有命令都执行完毕为止。当一个事务执行完毕之后，Redis才会处理其他客户端的命令。

Redis事务在执行的中途遇到错误，不会回滚，而是继续执行后续命令；

- 还未执行exec就报错：如果事务中出现语法错误，则事务会成功回滚，整个事务中的命令都不会提交
- 成功执行exec后才报错：如果事务中出现的不是语法错误，而是执行错误，不会触发回滚，该事务中仅有该错误命令不会提交，其他命令依旧会继续提交

另外，Redis里遇到有查询的情况穿插在事务中间，不会返回结果，如下所示，只有执行exec才能返回查询结果：

```bash
127.0.0.1:6379> multi
OK
127.0.0.1:6379(TX)> set a aaa
QUEUED
127.0.0.1:6379(TX)> get a
QUEUED
127.0.0.1:6379(TX)> exec
1) OK
2) "aaa"
```

对于事务，做个简单的总结：

1. Redis事务作为一个整体被执行，执行期间不会被其它客户端打断
2. Redis事务在执行的中途遇到错误，不会回滚，而是继续执行后续命令
3. Redis里遇到有查询的情况穿插在事务中间，不会返回结果

Redis事务执行的时候不会被其它客户端打断，所以多个命令可以进行打包，当做一个命令执行。但Redis的原生命令无法提供根据Redis查询结果执行相关动作的功能，这时我们就可以用lua脚本了。

## Lua

Redis2.6之后新增的功能，我们可以在Redis中通过lua脚本操作Redis。

脚本会将多个命令和操作当成一个命令在Redis中执行，也就是说该脚本在执行的过程中，不会被任何其他脚本或命令打断干扰。

正是因此这种原子性，lua脚本才可以代替multi和exec的事务功能。同时也是因此，在lua脚本中不宜进行过大的开销操作，避免影响后续的其他请求的正常执行。

使用lua脚本的好处：

- lua脚本是作为一个整体执行的，所以中间不会被其他命令插入
- 可以把多条命令一次性打包，所以可以有效减少网络开销
- lua脚本可以常驻在Redis内存中，所以在使用的时候,可以直接拿来复用，也减少了代码量

lua脚本在Redis里的样子如下图所示：

![](../../statics/images/stack/golang/redis-transactions-go+lua-really-smells-good_files/1.jpg)

### 场景

秒杀系统里画过秒杀的流程图，其中秒杀库存相关代码为：

```go
 //加库存
goodsKey := getGoodsKey(p.AppLocal, tag, tid, goods_id)
cacheQty, err := app.Global().RedisStore.Incr(goodsKey)
if err != nil {
    return nil, 11008, fmt.Errorf(SERVICE_BUSY)
}
//和本次秒杀总数量进行比较
if cacheQty > int64(goodsInfo.Qty) {
//不符合条件，则减去库存
    _, err := app.Global().RedisStore.Decr(goodsKey)
    if err != nil {
        ctx.Warn("%s seckill %s ,incr the cnt but not decr success in count process, err:%s", userId, goods_id, err.Error())
    }
    return nil, 11009, fmt.Errorf(NOT_SUCCESS)
}
```

可以看出，先增加库存，然后和本次秒杀总数量进行比较，如果超出范围，需减去库存。这种分开的操作，增加了失败的可能性。扣减商品库存，也是类似的逻辑。

### 使用lua

在Go语言里用lua脚本实现扣减库存操作。我们可以先查询，后比较，最后扣减，脚本将操作打包，代码为：

```go
package main

import (
    "fmt"
    "github.com/go-redis/redis"
)

var Client *redis.Client

func init() {
    Client = redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "111111", // no password set
        DB:       0,        // use default DB
    })
}

func useLua() {
    Client.FlushAll()
    //设置初始值
    Client.Set("stock", "10", 0)
    //编写脚本 - 检查数值，是否够用，够用再减，否则返回减掉后的结果
    var luaScript = redis.NewScript(`
        local value = redis.call("Get", KEYS[1])
        print("当前值为 " .. value);
        if( value - KEYS[2] >= 0 ) then
            local leftStock = redis.call("DecrBy" , KEYS[1],KEYS[2])
            print("剩余值为" .. leftStock );
            return leftStock
        else
            print("数量不够，无法扣减");
            return value - KEYS[2]
        end
        return -1
    `)
    //执行脚本
    n, err := luaScript.Run(Client, []string{"stock", "6"}).Result()
    if err != nil {
        panic(err)
    }
    fmt.Println("结果", n, err)
}


func main() {
    useLua()
}
```

客户端将lua加载到Redis，脚本被Redis执行：

![](../../statics/images/stack/golang/redis-transactions-go+lua-really-smells-good_files/2.jpg)

如果将扣减值设置为25，执行之后，观察到返回值为负数，但再次查询，值未变

```bash
myproject go run main.go

// 当前值为 10
// 数量不够，无法扣减
// 结果 -15
```

```bash
myproject redis-cli -p 6379 -a 111111
127.0.0.1:6379> get stock

// "10"
```

如果将扣减值设置为6，扣减成功，执行后查看结果

```bash
myproject go run main.go

// 当前值为 10
// 剩余值为4
// 结果 4
```

```bash
myproject redis-cli -p 6379 -a 111111

127.0.0.1:6379> get stock

// "4"
```

### 优化lua使用

当脚本会被多次执行时，可考虑使用ScriptLoad和EvalSha代替RUN节省带宽。

- 先用命令ScriptLoad将脚本缓存到Redis，Redis返回一个sha1的标识符
- 命令EvalSha基于sha1执行脚本

这种方案只有标识符sha1通过网络传输，而不需传输lua代码块，节省流量，流程如下图所示：

![](../../statics/images/stack/golang/redis-transactions-go+lua-really-smells-good_files/3.jpg)

具体代码为：

```go
package main

import (
    "fmt"
    "github.com/go-redis/redis"
)

var Client *redis.Client
var script string = `
        local value = redis.call("Get", KEYS[1])
        print("当前值为 " .. value);
        if( value - KEYS[2] >= 0 ) then
            local leftStock = redis.call("DecrBy" , KEYS[1],KEYS[2])
            print("剩余值为" .. leftStock );
            return leftStock
        else
            print("数量不够，无法扣减");
            return value - KEYS[2]
        end
        return -1
    `
var luaHash string

func init() {
    Client = redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "111111", // no password set
        DB:       0,        // use default DB
    })
    luaHash, _ = Client.ScriptLoad(script).Result() //返回的脚本会产生一个sha1哈希值,下次用的时候可以直接使用这个值
}

func useLuaHash() {
    n, err := Client.EvalSha(luaHash, []string{"stock", "6"}).Result()
    if err != nil {
        panic(err)
    }
    fmt.Println("结果", n, err)
}

func main() {
    useLuaHash()
}
```

## 定制

如果大家觉得在Go中自己写lua不优雅，我们可选择定制方案。

找Redis的运维同学，让运维人员通过lua定制命令，将这些命令常驻Redis内存， 实现复用效果。使用这些定制的命令与使用Redis自身提供的命令没有区别。

当然，前提是运维同学同意做。

## 问题

虽然使用lua利用Redis事务能力，保证执行过程中不会插入其他命令，但无法解决所有问题：

- 不确定的返回结果：如请求超时了，要不要归还库存？
- 这种情况一般不要归还，因为很可能没扣减成功，超卖容易造成资损，少卖问题要小一些
- 归还失败：扣减成功，但后续操作失败，仍要归还库存，始终有归还失败的可能
- 这种情况需要重试，而且必须是确定类型的错误才可重试，例如超时就不可重试，同时要做好记录

这也是要求SLA要高，要常记日志的原因，无形中能解决很多问题。

## 搭建

记录一下在Mac机上搭建Redis的过程，大家可以安装一下Redis，执行Go+lua的代码。

## 安装

Redis搭建比较简单，使用如下命令即可安装完毕

```bash
brew install redis
```

## 密码

为了安全，可以设置密码。打开 redis.conf 文件，然后按 command + f 进行搜索：#requirepass foobared 修改为：requirepass 你的密码

## 服务端启动

执行如下命令，在服务端启动redis

```bash
/usr/local/bin/redis-server /usr/local/etc/redis.conf
```

执行redis-server命令时，如果没有redis.conf文件，则按照默认配置启动，这种情况下登录无需auth

## 命令行登录

如果设置了auth，命令行登录如下：

```bash
redis-cli -p 端口 -a 密码
```

如果未设置auth，直接执行

```bash
redis-cli
```

## 总结

有些问题无法百分之百解决，我们要接受这个事实。但并不意味着妥协，我们要能发现问题，确定解决方案，即使是手动解决的方案。有一个前提，解决频率要足够低，这时就没必要把关注点放在100%自动化解决上，产出比特别低的事尽量少做。

## 资料

1. 在golang中使用lua脚本
2. redis登录及设置密码
3. 为什么说Redis是单线程的以及Redis为什么这么快！
4. go-redis 事务提交
5. Golang使用lua脚本实现redis原子操作
6. Redis事务与Lua
7. Redis事务的分析及改进
8. Redis系列(九)、Redis的“事务”及Lua脚本操作
