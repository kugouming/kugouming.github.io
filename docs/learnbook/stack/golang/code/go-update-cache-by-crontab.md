# Go实现周期性刷新缓存

周期性刷新缓存在很多场景中都会出现，用Go可以实现吗？本文，将通过实现背后的理论来帮助你理解其工作原理。

## 周期性执行任务
在这个例子中，假设我们的缓存是一个map：

```go
var cache map[string]interface{}
```

我们需要一个线程来每隔X秒钟就更新该缓存。用Go来实现的话，我们将使用一个Goroutine创建一个线程，其任务就是周期性的更新缓存。这里有两个概念：创建新的线程和周期性执行操作。


```go
var cache map[string]interface{}

func main() {
 ticker = time.NewTicker(3 * time.Second)
 defer ticker.Stop() // stop the ticker

 updaterChan = make(chan struct{})
 defer close(updaterChan) // close the channel

 // ...

 // launch a go routine to update the cache in the background
 go startUpdaterDaemon(ticker, updaterChan)
}

// startUpdaterDaemon is running in background
func startUpdaterDaemon(ticker *time.Ticker, updaterChan chan struct{}) {
  for {
    select {
      case <- ticker.C:
        // update cache
        // ...
      case <-updaterChan:
       // stop the daemon
       return                         
    }
  }
}
```

## Goroutine和channel
如你所见，为了执行startUpdaterDaemon函数，我们把go关键词放在函数调用前面。意味着，我们使用一个新的协程来调用这个函数。同时你也看到传递来一个channel参数。channel是协程之间通信机制，实现协程间传数据。这里我们用channel能够在协程外面控制它停止工作。仅需要关闭channel就能使goroutine停止。


```go
defer close(updaterChan)
```

将进入select代码块的第二部分并从函数中退出，因此无限循环停止。


```go
case <-updaterChan:
  // stop the daemon
  return
```

## 计时器
第二个重要部分是time.Ticker。这个对象可以实现定时执行操作。当你创建time.Ticker，传入一个时间值，之后你就可以使用ticker.C来读取channel中的值来执行操作。（原理是每隔一段时间就会往对应的channel里面写值）

```go
ticker = time.NewTicker(3 * time.Second)
defer ticker.Stop() // stop the ticker
//...
case <- ticker.C:
        // update cache
        // ...
```

结束后别忘记使用Stop函数关闭time.Ticker对象。了解更多time.Ticker点击链接

## 管理缓存的读写

要实现好的缓存就要考虑写/修改缓存同时，其他代码可能会对其进行读操作。要管理并发操作，我们将使用mutex互斥锁。Go中有一个完美的对象用来处理缓存并发读写：sync.RWmutex。读写锁可以更高效的处理并发读多写少的场景。
更新缓存前，需要调用互斥锁的Lock()函数。更新完后调用Unlock()函数释放锁。

```go
// 更新缓存操作
mutex.Lock() // 写入缓存前获取所
cache["key3"] = time.Now()
mutex.Unlock() // 写完缓存后释放锁
```

第二个要考虑的是读缓存。同样是获取锁和释放锁，但使用的是Rlock()和Runlock()函数，可以允许多个读操作同时进行。

```go
mutex.RLock() // 读缓存前加锁
fmt.Println(cache["key3"])
mutex.RUnlock() // 读完后解锁
```

## 完整代码

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

var mutex      sync.RWMutex
var cache map[string]interface{}

func main() {
    // init
    ticker := time.NewTicker(3 * time.Second)
    defer ticker.Stop() // stop the ticker

    updaterChan := make(chan struct{})
    defer close(updaterChan) // close the channel

    mutex = sync.RWMutex{}

    // cache initialization
    cache = map[string]interface{}{
        "key1": "value1",
        "key2": "value2",
        "key3": time.Now(),
    }

    // launch a go routine to update the cache in the background
    go startUpdaterDaemon(ticker, updaterChan)

    // Wait to see the updated cache
    for i:=0;i<100;i++{
        time.Sleep(1*time.Second)
        value,_:=getCacheEntry("key3")
        fmt.Println(value)
    }
}

// startUpdaterDaemon is running in background and update key3 on the ticker.
func startUpdaterDaemon(ticker *time.Ticker, updaterChan chan struct{}) {
    for {
        select {
        case <- ticker.C:
            // update cache
            mutex.Lock() // lock the cache before writing into it
            cache["key3"] = time.Now()
            mutex.Unlock() // unlock the cache before writing into it
        case <-updaterChan:
            // stop the daemon
            return
        }
    }
}

// getCacheEntry return the value of a cache entry.
func getCacheEntry(key string) (interface{},error) {
    mutex.RLock() // add a read lock before reading the cache
    defer mutex.RUnlock() // release the read lock when reading is done

    value, ok := cache[key]
    if !ok{
        return nil,fmt.Errorf("key not found in cache")
    }

    return value, nil
}
```