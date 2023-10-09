# Lua 在 Redis 中的应用

!> Lua 脚本功能是 Reids 2.6 版本的最大亮点， 通过内嵌对 Lua 环境的支持， Redis 解决了长久以来不能高效地处理 CAS （check-and-set）命令的缺点， 并且可以通过组合使用多个命令， 轻松实现以前很难实现或者不能高效实现的模式。

## 为什么要使用lua

先看一个任务分配的问题（两个步骤）：

1. redis zset结构获取任务id
2. redis zrem删除已获取的任务id

用php代码简单实现如下：

```php
$key = "key_20190505_77";
$ids = $redis->zRevRange($key,0,29);
foreach ($ids as $v) {
    $redis->zRem($key,$v);
}
return $ids;
```

这段代码其实存在问题，在审核人员并发获取任务时，会获取相同的任务。如果要避免这个问题可以使用加锁的方式，这里使用简洁高效的Lua脚本来解决：

```php
local key = "key_20190505_77";
local ids = redis.call("ZREVRANGE",key,0,4);
for i, v in ipairs(tab) do
    redis.call("ZREM",key,v);
end
return ids
```

这段脚本代码虽然是 Lua 语言编写，但是其实就是 PHP版本的翻译版。那为什么这样，Lua 脚本就能解决获取重复任务的问题了呢？

Redis 中嵌入 Lua 脚本，所具有的几个特性为：

1. 原子操作：Redis 将整个 Lua 脚本作为一个原子执行，无需考虑并发，无需使用事务来保证数据一致性；
2. 高性能：嵌入 Lua 脚本后，可以减少多个命令执行的网络开销，进而间接提高 Redis 性能；
3. 可复用：Lua 脚本会保存于 Redis 中，客户端都可以使用这些脚本；

## 使用Lua解析器

Redis 提供了 `EVAL`（直接执行脚本） 和 `EVALSHA`（执行 SHA1 值的脚本） 这两个命令，可以使用内置的 Lua 解析器执行 Lua 脚本。语法格式为：

- `EVAL script numkeys key [key …] arg [arg …]`
- `EVALSHA sha1 numkeys key [key …] arg [arg …]`

参数说明：

- `script / sha1`：EVAL 命令的第一个参数为需要执行的 Lua 脚本字符，EVALSHA 命令的一个参数为 Lua 脚本的 SHA1 值
- `numkeys`：表示 key 的个数
- `key [key …]`：从第三个参数开始算起，表示在脚本中所用到的那些 Redis 键（key），这些键名参数可以在 Lua 中通过全局数组 KYES[i] 访问
- `arg [arg …]`：附加参数，在 Lua 中通过全局数组 ARGV[i] 访问

**栗子**

- EVAL 简单执行，不加参数：

```bash
127.0.0.1:6379> flushall
OK
127.0.0.1:6379> EVAL "redis.call('SET','name','lua')" 0
(nil)
127.0.0.1:6379> get name
"lua"
127.0.0.1:6379>
```

redis还提供了`redis.pcall`函数，功能与`redis.call`相同，唯一的区别是当命令执行出错时，`redis.pcall`会记录错误并继续执行，而`redis.call`会直接返回错误，不会继续执行。在脚本中可以使用return语句将值返回给客户端，如果没有执行return语句则默认返回nil:

```bash
127.0.0.1:6379> EVAL "redis.call('SETN','height',18);redis.call('SET','class',3)" 0
(error) ERR Error running script (call to f_cb80dd41db48d93efbdff8f7b8923a0d69ae2d1c): @user_script:1: @user_script: 1: Unknown Redis command called from Lua script
127.0.0.1:6379> get class
(nil)
127.0.0.1:6379> EVAL "redis.pcall('SETN','height',18);redis.pcall('SET','class',3)" 0
(nil)
127.0.0.1:6379> get class
"3"
```

- EVAL 动态传参数，执行：

```bash
127.0.0.1:6379> EVAL "redis.call('SET',KEYS[1],ARGV[1]);" 1 age 18
(nil)
127.0.0.1:6379> get age
"18"
127.0.0.1:6379>
```

- 使用EVALSHA 执行

```bash
127.0.0.1:6379> script load "redis.call('SET',KEYS[1],ARGV[1])"
"f1f1999d350f1c9e3b0c73daf4693af091d2a099"
127.0.0.1:6379> evalsha f1f1999d350f1c9e3b0c73daf4693af091d2a099 1 sex male
(nil)
127.0.0.1:6379> get sex
"male"
```

每次使用 `EVAL` 命令都会传递需执行的 Lua 脚本内容，这样增加了宽带的浪费。Redis 内部会永久保存被运行在脚本缓存中，所以使用 `EVALSHA`（建议使用） 命令就可以根据脚本 SHA1 值执行对应的 Lua 脚本。

**Redis 中有关脚本的命令除了 EVAL 和 EVALSHA 外，其他常用命令 如下：**

| 命令 | 描述 |
| :-- | :-- |
| `SCRIPT EXISTS script [script …]` | 查看脚本是是否保存在缓存中 |
| `SCRIPT FLUSH` | 从缓存中移除所有脚本 |
| `SCRIPT KILL` | 杀死当前运行的脚本 |
| `SCRIPT LOAD script` | 将脚本添加到缓存中,不立即执行返回脚本SHA1值 |

演示`SCRIPT KILL`命令，一段死循环lua脚本如下：

```lua
-- filename: loops.lua
local i = 1
while true
    do
    i = i + 2
    i = i - 1
    redis.debug(i)
end
return "ok"
```

?> 执行命令：`redis-cli --eval loops.lua`

```bash
127.0.0.1:6379> keys *
(error) BUSY Redis is busy running a script. You can only call SCRIPT KILL or SHUTDOWN NOSAVE.
127.0.0.1:6379> script kill
OK
127.0.0.1:6379> keys *
1) "test"
2) "sex"
3) "name"
4) "class"
5) "age"
```

### lua与redis交互中数据类型转换

由于 Redis 和 Lua 都有各自定义的数据类型，所以在使用执行完 Lua 脚本后，会存在一个数据类型转换的过程。

| Lua 类型 | Redis 返回类型 | 说明 |
| :-- | :-- | :-- |
| number | integer | 浮点数会转换为整数 3.333–>3 |
| string | bulk | |
| table（array）| multi bulk | |
| boolean false | nil | |
| boolean true | integer | 返回整型1 |

```bash
127.0.0.1:6379> EVAL "return 3.333" 0
(integer) 3
127.0.0.1:6379> EVAL "return 'baidu'" 0
"baidu"
127.0.0.1:6379> EVAL "return {'shang ban','chi fan','xia ban'}" 0
1) "shang ban"
2) "chi fan"
3) "xia ban"
127.0.0.1:6379> EVAL "return true" 0
(integer) 1
127.0.0.1:6379> EVAL "return false" 0
(nil)
```

### 全局变量保护

为了防止不必要的数据泄漏进 Lua 环境， Redis 脚本不允许创建全局变量。

```lua
-- filename: function.lua
function fn(n)
    return n*2
end
return fn(4)
```

执行则会报错:

```bash
➜  lua redis-cli --eval function.lua
(error) ERR Error running script (call to f_ce66c95f635e739c9ac2d539b7c8f3a0f0dda6fa): @enable_strict_lua:8: user_script:1: Script attempted to create global variable 'fn'
```

### redis日志

在 Lua 脚本中，可以通过调用 `redis.log()` 函数来写 Redis 日志。格式为：

```bash
redis.log(loglevel, message)
```

**loglevel** 参数可以是：

- `redis.LOG_DEBUG`
- `redis.LOG_VERBOSE`
- `redis.LOG_NOTICE`
- `redis.LOG_WARNING`

脚本：`log.lua`

```lua
print("测试log日志...")
redis.log(redis.LOG_DEBUG,'this is a debug...')
redis.log(redis.LOG_VERBOSE,'long long verbose log...')
redis.log(redis.LOG_NOTICE,'notice notice...')
redis.log(redis.LOG_WARNING,'warning...')
```

```bash
redis-cli --eval log.lua
```

日志打印：

```
72675:M 12 May 2019 18:51:58.177 . this is a debug...
72675:M 12 May 2019 18:51:58.178 - long long verbose log...
72675:M 12 May 2019 18:51:58.178 * notice notice...
72675:M 12 May 2019 18:51:58.178 # warning...
```

### redis lua脚本调试

从 Redis 3.2 版本开始， Redis 将内置一个完整的 Lua 调试器，支持单步调试、静态动态断点、全部变量追踪观察等多种功能，可以很容易调试复杂的lua脚本。

调试命令：

```bash
# key 和 参数直接的逗号，前后均需要留空，否则无法识别
redis-cli --ldb --eval loops.lua key1 , arg1
```

进入终端后，按`h(help)`可以打印出所有可用的调试命令:

```bash
➜  lua redis-cli --ldb --eval loops.lua key1 , arg1
Lua debugging session started, please use:
quit    -- End the session.
restart -- Restart the script in debug mode again.
help    -- Show Lua script debugging commands.

* Stopped at 1, stop reason = step over
-> 1   local i = 1
lua debugger> h
Redis Lua debugger help:
[h]elp               Show this help.
[s]tep               Run current line and stop again.
[n]ext               Alias for step.
[c]continue          Run till next breakpoint.
[l]list              List source code around current line.
[l]list [line]       List source code around [line].
                     line = 0 means: current position.
[l]list [line] [ctx] In this form [ctx] specifies how many lines
                     to show before/after [line].
[w]hole              List all source code. Alias for 'list 1 1000000'.
[p]rint              Show all the local variables.
[p]rint <var>        Show the value of the specified variable.
                     Can also show global vars KEYS and ARGV.
[b]reak              Show all breakpoints.
[b]reak <line>       Add a breakpoint to the specified line.
[b]reak -<line>      Remove breakpoint from the specified line.
[b]reak 0            Remove all breakpoints.
[t]race              Show a backtrace.
[e]eval <code>       Execute some Lua code (in a different callframe).
[r]edis <cmd>        Execute a Redis command.
[m]axlen [len]       Trim logged Redis replies and Lua var dumps to len.
                     Specifying zero as <len> means unlimited.
[a]bort              Stop the execution of the script. In sync
                     mode dataset changes will be retained.

Debugger functions you can call from Lua scripts:
redis.debug()        Produce logs in the debugger console.
redis.breakpoint()   Stop execution like if there was a breakpoing.
                     in the next line of code.
lua debugger> s
* Stopped at 4, stop reason = step over
-> 4       i = i + 2
```

### redis lua脚本执行流程

举个例子， 以下是执行命令 `EVAL "return redis.call('GET','name')"` 0时， 调用者客户端（caller）、伪客户端（fake client）、Redis 服务器和 Lua 环境之间的数据流表示图：

```bash
       发送命令请求
          EVAL "return redis.call('GET','name')" 0
Caller ------------------------------------------> Redis

          为脚本 "return redis.call('GET','name')"
          创建 Lua 函数
Redis  ------------------------------------------> Lua

          绑定超时处理钩子
Redis  ------------------------------------------> Lua

          执行脚本函数
Redis  ------------------------------------------> Lua

               执行 redis.call('GET','name')
Fake Client <------------------------------------- Lua

               伪客户端向服务器发送
               GET name 命令请求
Fake Client -------------------------------------> Redis

               服务器将 GET name 的结果
               （Redis 回复）返回给伪客户端
Fake Client <------------------------------------- Redis

               将命令回复转换为 Lua 值
               并返回给 Lua 环境
Fake Client -------------------------------------> Lua

          返回函数执行结果（一个 Lua 值）
Redis  <------------------------------------------ Lua

          将 Lua 值转换为 Redis 回复
          并将该回复返回给客户端
Caller <------------------------------------------ Redis
```

其中第二步redis会为lua脚本创建一个lua函数：

```lua
function f_5332031c6b470dc5a0dd9b4bf2030dea6d65de91()
   return redis.call('GET','name')
end
```

以函数为单位保存 Lua 脚本有以下好处：

1. 执行脚本的步骤非常简单，只要调用和脚本相对应的函数即可。
2. Lua 环境可以保持清洁，已有的脚本和新加入的脚本不会互相干扰，也可以将重置 Lua 环境和调用 Lua GC 的次数降到最低。
3. 如果某个脚本所对应的函数在 Lua 环境中被定义过至少一次，那么只要记得这个脚本的 SHA1 校验和，就可以直接执行该脚本。

## 案例
redis锁的释放

### 加锁

```php
class RedisTool {    
    const LOCK_SUCCESS = 'OK';    
    const IF_NOT_EXIST = 'NX';    
    const MILLISECONDS_EXPIRE_TIME = 'PX';    
    const RELEASE_SUCCESS = 1;    /**
     * 尝试获取锁
     * @param $redis       redis客户端
     * @param $key         锁
     * @param $requestId   请求id
     * @param $expireTime  过期时间
     * @return bool        是否获取成功
     */
    public static function tryGetLock($redis, $key, $requestId, $expireTime) {
        $result = $redis->set(
            $key, 
            $requestId, 
            self::MILLISECONDS_EXPIRE_TIME, 
            $expireTime, 
            self::IF_NOT_EXIST
        );        
        return self::LOCK_SUCCESS === (string)$result;
    }
}
```

### 释放锁

#### 错误释放一

```php
public static function wrongRelease1($redis, $key) {
    $redis->del([$key]);
}
```

这是最典型的错误了, 这样的做法没判断锁的拥有者, 会使得任何一个客户端都可以解锁, 甚至会把别人的锁给解除了.

#### 错误释放二

```php
public static function wrongRelease2($redis, $key, $requestId) {        
    if ($requestId === $redis->get($key)) {            
        $redis->del([$key]);
    }
}
```

上面的解锁也是没有保证原子性, 有这样的场景来复现: 客户端A加锁成功后一段时间再来解锁, 在执行删除del操作的时候锁过期了, 而且这时候又有其他客户端B来加锁(这时候加锁是肯定成功的, 因为客户端A的锁过期了), 这是客户端A再执行删除del操作, 会把客户端B的锁给清了.

#### 正确释放锁（lua）：

```php
public static function releaseLock($redis, $key, $requestId) {
    $lua = "if redis.call('get', KEYS[1]) == ARGV[1] then 
            return redis.call('del', KEYS[1]) 
        else 
            return 0 
        end";
    $result = $redis->eval($lua, 1, $key, $requestId);
    return $result;
}
```