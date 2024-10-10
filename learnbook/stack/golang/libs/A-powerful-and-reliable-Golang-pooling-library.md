# 一个强大可靠的Golang池化库

> Github 地址: https://github.com/panjf2000/ants

ants是golang语言的一个强大的、可靠的池化解决方案库。

ants是一个高性能的goroutine池，实现了对大规模goroutine的调度管理、goroutine复用，允许使用者在开发并发程序的时候限制goroutine数量，复用资源，达到更高效执行任务的效果。

它可以自动调度海量的goroutine，复用goroutine，以及定期清理过期的goroutine，可以节省资源，提高资源利用率。它还提供了大量的接口，用来调整goroutine数量，Pool大小，以及控制Pool等。它通过资源复用，可以节省内存使用量，在大规模批量并发场景下比原生goroutine并发具有更高性能，它是非阻塞机制，并可优雅处理panic，防止程序崩溃。  

在使用go写高并发程序的时候会启动大量的goroutine，这会消耗大量的系统资源，通过使用ants，可以实例化一个goroutine池，复用goroutine，节省资源，提升性能。  

下面是使用ants的一个示例：

```go
package main

import (
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/panjf2000/ants/v2"
)

var sum int32

func myFunc(i interface{}) {
	n := i.(int32)
	atomic.AddInt32(&sum, n)
	fmt.Printf("run with %d\n", n)
}

func demoFunc() {
	time.Sleep(10 * time.Millisecond)
	fmt.Println("Hello World!")
}
func main() {
	defer ants.Release()
	runTimes := 1000
	
	// Use the common pool.
	var wg sync.WaitGroup
	syncCalculateSum := func() {
		demoFunc()
		wg.Done()
	}
	for i := 0; i < runTimes; i++ {
		wg.Add(1)
		_ = ants.Submit(syncCalculateSum)
	}
	wg.Wait()
	fmt.Printf("running goroutines: %d\n", ants.Running())
	fmt.Printf("finish all tasks.\n")

	// Use the pool with a function,
	// set 10 to the capacity of goroutine pool and 1 second for expired duration.
	p, _ := ants.NewPoolWithFunc(10, func(i interface{}) {
		myFunc(i)
		wg.Done()
	})
	defer p.Release()

	// Submit tasks one by one.
	for i := 0; i < runTimes; i++ {
		wg.Add(1)
		_ = p.Invoke(int32(i))
	}
	wg.Wait()
	fmt.Printf("running goroutines: %d\n", p.Running())
	fmt.Printf("finish all tasks, result is %d\n", sum)
	if sum != 499500 {
		panic("the final result is wrong!!!")
	}

	// Use the MultiPool and set the capacity of the 10 goroutine pools to unlimited.
	// If you use -1 as the pool size parameter, the size will be unlimited.
	// There are two load-balancing algorithms for pools: ants.RoundRobin and ants.LeastTasks.
	mp, _ := ants.NewMultiPool(10, -1, ants.RoundRobin)
	defer mp.ReleaseTimeout(5 * time.Second)
	for i := 0; i < runTimes; i++ {
		wg.Add(1)
		_ = mp.Submit(syncCalculateSum)
	}
	wg.Wait()
	fmt.Printf("running goroutines: %d\n", mp.Running())
	fmt.Printf("finish all tasks.\n")

	// Use the MultiPoolFunc and set the capacity of 10 goroutine pools to (runTimes/10).
	mpf, _ := ants.NewMultiPoolWithFunc(10, runTimes/10, func(i interface{}) {
		myFunc(i)
		wg.Done()
	}, ants.LeastTasks)
	defer mpf.ReleaseTimeout(5 * time.Second)
	for i := 0; i < runTimes; i++ {
		wg.Add(1)
		_ = mpf.Invoke(int32(i))
	}
	wg.Wait()
	fmt.Printf("running goroutines: %d\n", mpf.Running())
	fmt.Printf("finish all tasks, result is %d\n", sum)
	if sum != 499500*2 {
		panic("the final result is wrong!!!")
	}
}

```

我也在项目中使用过ants，有这样一个场景，当消息提交过来后，需要将消息提交到第三方推送平台。第三方平台通过HTTP请求进行交互，如果不使用goroutine，可以感觉到明显的延迟，特别是消息大量涌进来之后。所以将执行提交的任务，通过goroutine进行异步化。基本满足应用的性能需求。运行一段时间后，发现这种方式goroutine不可控，在经过优化后，使用ants将消息提交和消息处理进行分离。在达到需求的同时，减少了内存占用。善用ants，可以大大提高资源利用率。