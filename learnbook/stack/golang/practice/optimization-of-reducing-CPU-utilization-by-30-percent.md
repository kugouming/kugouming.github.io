# 记一次降低30%的CPU使用率的优化

> 文章来源: [地址](https://mp.weixin.qq.com/s/ntNGz6mjlWE7gb_ZBc5YeA)

## 01 背景

本文是项目中基于redis记录实时请求量的一个功能，因流量上涨造成redis服务器的CPU高于80%而触发了自动报警机制，经分析将实时写入redis的方式变更成批量写入的方式，从而将CPU使用率降低了30%左右的经历。

具体业务需求是这样的：我们会将接受到的请求按地域属性进行划分。目标是针对具体的国家请求进行总数的控制。当达到预设的最大请求数时，就不再处理该流量，直接给客户端返回204响应。如果没有达到最大请求数，则需要对实时请求数+1。如下图所示：

![](./../../statics/images/stack/practice/optimization/1.png)

## 02 实现版本一

第一个版本很简单，就是将最大值存放在redis中，然后按天的维度记录每个国家流量的实时请求数量。每次流量来了之后，先查询出该国家流量的最大值，以及当天的实时请求数，然后做比较，如果实时数已经超过了最大值，就直接返回，否则就对实时数进行+1操作即可。

下面我们以来自中国（用CN表示）流量为例进行说明。首先，我们存在redis中的key的规则如下：

- 代表某个国家最大请求数的key表示规则：`国家:max:req`
- 代表某个国家当天已产生的请求数的key表示规则：`国家:YYYYMMDD:req` ，有效期为N天。

第一个版本的实现代码如下：

```go
func HasExceedLimitReq() bool {
    key := "CN:max:req"

    maxReq := redis.Get(key)

    day := time.Now().Format("20060102")
    dailyKey := "CN:"+day+":req"
    dailyReq := redis.Get(dailyKey)

    if dailyReq > maxReq {
        return true
    }

    redis.Incr(dailyKey, dailyReq)
    redis.Expire(dailyKey, 7*24*time.Hour)
    
    return false
}
```

在上面的实现中，对于dailyKey我们不需要长期保留，实际上只要过了当天，该key的值就没用了，出于查询历史数据的原因，我们就设置了7天的有效期。但redis的Incr操作不带过期时间，所以就在Incr操作后增加了一个Expire的操作。

好了，我们看下这个实现会有什么问题。首先逻辑上没什么问题。当一个请求进来之后，在没有超量的情况下，我们会对redis有4次操作：两次查询操作和两次写操作（incr和expire）。也就是说，redis扛的QPS是流量本身的4倍。如果当流量QPS不断增长的时候，比如达到了10万，那么redis收到的请求量就是40万。redis的CPU消耗自然也就上来了。

那么我们看看哪些地方是可以优化的呢？首先就是Expire操作看起来不是每次都需要，理论上只要设置一次过期时间就可以了，不需要每次都设置，这样就可以减少一次写操作。如下实现版本二


## 03 实现版本二：减少Expire的执行次数

我们通过使用一个hasUpdateExpire的map类型，来记录某个key是否已经被设置了有效期的标识。如下：

```go
var hasUpdateExpire = make(map[string]struct{}) //全局变量

func HasExceedLimitReq() bool {
    key := "CN:max:req"

    maxReq := redis.Get(key)

    day := time.Now().Format("20060102")
    dailyKey := "CN:"+day+":req"
    dailyReq := redis.Get(dailyKey)

    if dailyReq > maxReq {
        return true
    }

    redis.Incr(dailyKey, dailyReq)
    if hasUpdateExpire[dailyKey]; !ok {
        redis.Expire(dailyKey, 7*24*time.Hour)
        hasUpdateExpire[dailyKey] = struct{}{}
    }
    
    return false
}
```

我们知道在Go中，map是非并发安全的。那么下面这段代码是存在并发安全的：

```go
if hasUpdateExpire[dailyKey]; !ok {
    redis.Expire(dailyKey, 7*24*time.Hour)
    hasUpdateExpire[dailyKey] = struct{}{}
}
```

也就是说有可能有多个协程同时执行到了`if hasUpdateExpire[dailyKey]`这里，并且都获取到了ok为false的值，那么这时就会有多个协程都会执行如下两行代码：

```go
redis.Expire(dailyKey, 7*24*time.Hour)
hasUpdateExpire[dailyKey] = struct{}{}
```

但这里根据我们业务的场景，即使多执行几次Expire操作也没关系，在QPS高的情况下，比起总的请求次数来说多设置expire几次可以忽略。

那如果qps再继续增加怎么办？那就是异步批量写入。这种写入方式适合于那种对计数不要求准确的场景。我们来看看版本三。


## 04 实现版本三：异步批量写入

在该版本中，我们的技术不直接写入redis，而是写在内存缓存中，即一个全局变量中，同时启动一个定时器，每隔一段时间就将内存中的数据批量写入到redis中。如下图所示： 

![](./../../statics/images/stack/practice/optimization/2.png)

所以 我们定义了如下数据结构：

```go
import (
   "sync"
   "time"

   "github.com/go-redis/redis"
)

const (
   DefaultExpiration  = 86400 * time.Second * 7
)

type CounterCache struct {
   rwMu        sync.RWMutex
   redisClient redis.Cmdable

   countCache   map[string]int64
   hasUpdateExpire map[string]struct{}
}

func NewCounterCache(redisClient redis.Cmdable) *CounterCache {
   c := &CounterCache{
      redisClient: redisClient,
      countCache:    make(map[string]int64),
   }
   go c.startFlushTicker()
   return c
}

func (c *CounterCache) IncrBy(key string, value int64) int64 {
   val := c.incrCacheBy(key, value)
   redisCount, _ := c.redisClient.Get(key).Int64()
   return val + redisCount
}

func (c *CounterCache) incrCacheBy(key string, value int64) int64 {
   c.rwMu.Lock()
   defer c.rwMu.Unlock()
    
   count := c.countCache[key]
   count += value
   c.countCache[key] = count
   return count
}

func (c *CounterCache) Get(key string) (int64, error) {
   cacheVal := c.get(key)
   redisValue, err := c.redisClient.Get(key).Int64()
   if err != nil && err != redis.Nil {
      return cacheVal, err
   }

   return redisValue + cacheVal, nil
}

func (c *CounterCache) get(key string) int64 {
   c.rwMu.RLock()
   defer c.rwMu.RUnlock()
   return c.countCache[key]
}

func (c *CounterCache) startFlushTicker() {
   ticker := time.NewTicker(time.Second * 5)
   for {
      select {
      case <-ticker.C:
         c.flush()
      }
   }
}

func (c *CounterCache) flush() {
   var oldCountCache map[string]int64
   c.rwMu.Lock()
   oldCountCache = c.countCache
   c.countCache = make(map[string]int64)
   c.rwMu.Unlock()

   for key, value := range oldCountCache {
      c.redisClient.IncrBy(key, value)
       if _, ok := c.hasUpdateExpire[key]; !ok {
         err := c.redisClient.Expire(key, DefaultExpiration)
         if err == nil {
             c.hasUpdateExpire[key] = struct{}{}
         }
      }
   }
}
```

这里主要的思想就是在写入数据的时候先暂存在结构体的countCache中。然后每个CounterCache实例都会启动一个定时器ticker，该定时器每隔一段时间就将countCache中的数据更新到redis中。我们看下这的使用方式：

```go
package main

import (
    "net/http"
    "sync"
    "time"

    "github.com/go-redis/redis"
)

var counterCache *CounterCache

func main() {
    redisClient := redis.NewClient(&redis.Options{
        Addr: "127.0.0.1:6379",
        Password: "",
    })
    counterCache = NewCounterCache(redisClient)

    http.HandleFunc("/", IndexHandler)
    http.ListenAndServe(":8080", nil)
}

func IndexHandler(w http.ResponseWriter, r *http.Request) {
    if HasExceedLimitReq() {
        return
    }
    //处理正常逻辑
}

func HasExceedLimitReq() bool {
    maxKey := "CN:max:req"
    maxCount, _ := counterCache.Get(maxKey)

    dailyKey := "CN:" + time.Now().Format("20060102") + ":req"
    dailyCount, _ := counterCache.Get(dailyKey)

    if dailyCount > maxCount {
        return true
    }

    counterCache.IncrBy(dailyKey, 1)
    return false
}
```

这里的使用场景就是在对计数不要求准确的情况下使用的。比如说如果服务器异常退出了，那么暂存在countCache中还没来得及刷新到redis中的数据就会造成丢失。

另外一点需要注意的就是countCache变量是一个map，我们知道，在Go中map是非并发安全的操作，所以要注意加读写锁。


## 05 总结

随着服务qps的增长，我们在不限制qps的前提下，各种资源的使用率都会增长。我们的优化思路就是减少不必要的写次数、由实时写更改成批量写的思想，从而达到减少对redis操作的目的。这种计数方式使用的场景是在对计数要求不那么准确的情况，例如视频的播放量、微博大V的阅读量等等。

