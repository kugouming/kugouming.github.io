# 功能丰富的 Go 缓存库-bluele/gcache

`bluele/gcache` 是一个 **高性能、功能丰富的 Go 语言缓存库**，支持多种缓存策略，如 **LRU（最近最少使用）、LFU（最少使用频率）、ARC（自适应缓存替换）等**，可以灵活选择适合的缓存模式。

## **安装**

使用 `go get` 下载安装：

go get github.com/bluele/gcache  

然后在代码中导入：

import "github.com/bluele/gcache"  

## **主要特性**

- **支持多种缓存策略**
	- LRU（Least Recently Used，最近最少使用）
	- LFU（Least Frequently Used，最少使用频率）
	- ARC（Adaptive Replacement Cache，自适应缓存替换）
	- Simple（普通缓存）
- **可选自动过期（TTL）**
- **支持回调函数（OnEvicted）**
- **支持从数据源（如数据库）自动加载数据**
- **并发安全**

## **快速入门**

### **创建一个 LRU 缓存**

```go
package main

import (
	"fmt"

	"github.com/bluele/gcache"
)

func main() {
	// 创建一个 LRU 缓存，容量为 10
	cache := gcache.New(10).LRU().Build()
	// 存入数据
	cache.Set("key1", "value1")
	// 获取数据
	value, err := cache.Get("key1")
	if err != nil {
		fmt.Println("Key not found!")
	} else {
		fmt.Println("Cache value:", value) // 输出：Cache value: value1
	}
}
```

**解析：**

- `gcache.New(10)`    ：创建一个容量为 `10` 的缓存。
- `.LRU()`：使用 **LRU 缓存策略**。
- `.Build()`：构建缓存对象。
- `cache.Set("key1", "value1")`：存入键值对。
- `cache.Get("key1")`：获取缓存值。

## **进阶用法**

### **设置缓存过期时间（TTL）**

```go
import (
	"time"
)

// 创建带 TTL 的缓存
cache := gcache.New(10).
	LRU().
	Expiration(5 * time.Second). // 5秒后自动过期
	Build()

cache.Set("temp", "data")
time.Sleep(6 * time.Second)
_, err := cache.Get("temp")
fmt.Println(err) // 输出: "key not found"
```

**解析：**
- `.Expiration(5 * time.Second)`
     设置缓存 **5 秒后过期**。
- `time.Sleep(6 * time.Second)`
     后 `Get("temp")` 失效，返回 `key not found`。

### **使用 LFU（最少使用频率）缓存**

```
cache := gcache.New(10).
	LFU().
	Build()
```

**LFU 适用于访问模式偏向热点数据** 的场景，例如 **热点商品推荐**。

### **使用 ARC（自适应缓存替换）**

```
cache := gcache.New(10).
	ARC().
	Build()
```

**ARC（Adaptive Replacement Cache）** 结合了 LRU 和 LFU 的优点，能更智能地适应不同的访问模式。

### **自动加载（从数据库等数据源获取数据）**

```
cache := gcache.New(10).
	LRU().
	LoaderFunc(func(key interface{}) (interface{}, error) {
		// 模拟数据库查询
		return "data_for_" + key.(string), nil
	}).
	Build()

value, _ := cache.Get("user_123")
fmt.Println(value) // 输出: data_for_user_123
```

**解析：**

- `.LoaderFunc()`
     设置一个回调，当 `Get()` 访问不存在的 key 时，自动从数据源加载数据。

### **监听缓存淘汰（Eviction Callback）**

```
cache := gcache.New(2).
```

**解析：**

- `.OnEvicted()`
     注册回调，当缓存 **超过容量并淘汰数据** 时触发回调。

## **适用场景**

|**场景**|**推荐策略**|
|---|---|
|**普通缓存**|Simple|
|**热点数据缓存**|LFU|
|**动态访问模式**|ARC|
|**短时间存储（如 Token 过期）**|带 TTL 的缓存|
|**数据库查询缓存**|LoaderFunc|

## **对比 `gcache` 与 `golang/groupcache`**

| **特性**    | **bluele/gcache**        | **golang/groupcache** |
| --------- | ------------------------ | --------------------- |
| 缓存策略      | LRU / LFU / ARC / Simple | LRU                   |
| 过期时间（TTL） | ✔︎                       | ✘                     |
| 自动数据加载    | ✔︎                       | ✔︎                    |
| 并发安全      | ✔︎                       | ✔︎                    |
| 适用场景      | 单机缓存                     | 分布式缓存                 |

如果需要**分布式缓存**，可以考虑 `groupcache`，如果只需**本地缓存**，`gcache` 更灵活。

## **总结**

`bluele/gcache` 是一个 **功能丰富、支持多种策略、并发安全** 的本地缓存库，适用于 **高性能缓存、自动数据加载、LRU/LFU 需求** 等场景。

📌 **推荐使用场景：**

- **本地缓存**
	（例如数据库查询缓存）
- **LRU/LFU 需求**
	（例如热点数据存储）
- **自动数据加载**
	（避免 `nil` 结果）
- **支持 TTL（自动过期）**

如果你需要**高效、灵活的 Go 语言缓存库**，`gcache` 是一个非常不错的选择！