# 高级并发用法-sync.Pool

## 含义

Go语言中的sync.Pool是一个可以存储和复用临时对象的集合。

这个Pool是用来存储那些被分配了但是没有被使用，并且可能会再次被使用的对象，它能大大减少堆上内存的分配，降低GC的压力。

主要有以下两个方法：
1. `New`：当Pool中没有可用对象时，会调用此函数生成新对象。
2. `Put`：将对象放回Pool中。
3. `Get`：从Pool中获取对象。

请注意，对象被放入Pool后，你就不应该再引用它。如果一个对象被同时从两个goroutine引用，并且每个都把它放回Pool，则该对象的状态会被并发修改，这可能会导致错误。

## 作用

以下是sync.Pool的主要用途和作用：

1. 解决临时对象过多导致的内存压力：如果你的应用创建了大量的临时对象，这些对象只用一次就丢弃，那么这就造成了不必要的内存分配和垃圾回收的压力。在这种情况下，你可以使用sync.Pool来存储和复用这些临时对象。
2. 减少垃圾回收的负担：因为sync.Pool的设计目标之一就是要减轻垃圾回收的压力，所以当垃圾回收器运行时，sync.Pool中的所有对象都会被立即丢弃，这意味着垃圾回收器不需要去检查和回收这些对象，从而减轻了其负担。
3. 提高程序的运行效率：通过重复使用对象，可以减少内存分配和垃圾回收的次数，这会使程序运行得更快。
4. 对象的线程安全复用：sync.Pool自带线程安全性，无需额外进行锁定操作，从Pool中Get或Put对象是线程安全的。

## 示例

在这个示例中，我们首先创建了一个可以包含MyObject类型的Pool。然后我们创建了一个新的MyObject，并把它放入Pool。接着我们从Pool中获取一个MyObject并打印它。最后，我们尝试再次从Pool中获取一个MyObject，但因为Pool现在是空的，所以这将触发我们提供的New函数，用来创建一个新的MyObject。

```go
package main

import (
	"fmt"
	"sync"
)

type MyObject struct {
	Name string
	ID   int
}

func main() {
	// 创建一个可以包含 MyObject 的 Pool
	myPool := &sync.Pool{
		New: func() interface{} {
			fmt.Println("创建一个新的 MyObject")
			return &MyObject{}
		},
	}

	// 创建一个新的 MyObject 并放入 Pool
	myPool.Put(&MyObject{"object1", 1})

	// 从 Pool 中取出 MyObject
	obj := myPool.Get().(*MyObject)
	fmt.Println("从 Pool 中取出的 MyObject 为:", obj)

	// 再次从 Pool 中取出 MyObject
	// 因为 Pool 是空的，所以这会触发 New 函数的调用
	obj2 := myPool.Get().(*MyObject)
	fmt.Println("再一次从 Pool 中取出的 MyObject 为:", obj2)
}
```

## 源码讲解

```go
type Pool struct {
    noCache    // 在实际源码中，sync.Pool有一个noCache变量，用于垃圾收集
    localPool  // 在源码中，本地Pool对象数组用于提供和每个P（处理器）相对应的本地Pool
    localSize  // pool数组的长度
    New func() interface{}  // 用户自定义的创建新对象的函数
}

func NewPool(createObject func() interface{}) *Pool {
    return &Pool{
        New: createObject,
    }
}

func (p *Pool) Put(x interface{}) {
    // 根据当前P的位置，找到对应的local pool
    l := p.localPool[当前P的ID]
    if len(l.frees) < size {
        // 将对象添加到local pool的自由列表
        l.frees = append(l.frees, x)
    } 
}

func (p *Pool) Get() interface{} {
    // 根据当前P的位置，找到对应的local pool
    l := p.localPool[当前P的ID]
    if len(l.frees) > 0 {
        x := l.frees[len(l.frees)-1]
        l.frees = l.frees[:len(l.frees)-1]
        return x
    }
    // 如果local pool为空，则创建新的对象
    return p.New()
}
```

上面的伪代码主要将`sync.Pool`的核心数据结构和操作给简化了，但实际的源码要比这复杂得多，包括处理GC、并发、内存缓存的partial Pools等等。特别的，`sync.Pool`的源码十分注重效率，所以有大量的优化，包括通过runtime包来获取更多的信息和权限。