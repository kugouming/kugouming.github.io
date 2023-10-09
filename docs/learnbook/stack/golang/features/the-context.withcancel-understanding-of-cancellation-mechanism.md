# context.WithCancel()取消机制的理解

## 概念

Golang中`context`包提供上下文机制在 `goroutine` 之间传递 `deadline`、取消信号（cancellation signals）或者其他请求相关的信息。

其中 `context.WithCancel` 函数能够从 `context.Context` 中衍生出一个新的子上下文并返回用于取消该上下文的函数。一旦我们执行返回的取消函数，当前上下文以及它的子上下文都会被取消，所有的 Goroutine 都会同步收到这一取消信号。

## Demo
先来看一个简单的demo，父母在家小娃就得学习，小娃每隔1s告诉他父母 “I am working!”，但是过了5s后父母出门了，小娃就没必要学习了，于是开始 “playing”

```go
package main

import (
	"context"
	"fmt"
	"time"
)

func dosomething(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			fmt.Println("playing")
			return
		default:
			fmt.Println("I am working!")
			time.Sleep(time.Second)
		}
	}
}

func main() {
	ctx, cancelFunc := context.WithCancel(context.Background())
	go func() {
		time.Sleep(5 * time.Second)
		cancelFunc()
	}()
	dosomething(ctx)
}
```

```text
# Output:
I am working!
I am working!
I am working!
I am working!
I am working!
playing
```

这里基于根上下文 `context.Background()`，生成了一个带取消函数cancelFunc的子上下文ctx（可以理解为是：父母在家，小娃基于父母在家这个前提一直在学习），通过调用这个cancelFunc，释放一个信号（父母出门）结束基于这个子上下文的工作（还学个甚），也就是从ctx.Done()这个channel获取到值，执行了return操作。

**那么今天主要就是理解下为什么调用了cancelFunc就能从`ctx.Done()`里取得返回值**

## cancel()机制

首先提下非常关键的一点，今天要研究的这个机制，充分利用了Golang语言channel的一个特性：
从一个已经关闭的channel里可以一直获取对应的零值

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	//新建一个通道ch，其传递的数据类型为int
	ch := make(chan int, 10)
	//往通道里传入5个整数
	for i := 0; i < 5; i++ {
		ch <- i
	}
	//关闭通道
	close(ch)
	timeout := time.After(10 * time.Second)
	for {
		select {
		case <-timeout:
			fmt.Println("\ntimeout")
			return
		case out := <-ch:
			fmt.Printf("%d", out)
			time.Sleep(time.Second)
		}
	}
}
```
执行这段代码返回值是

```text
0123400000t
timeout
```

可以看到当传入的01234依次被取出后依旧取出了int类型的零值

回到context，先看下WithCancel函数的定义，最后返回的是子上下文和一个cancelFunc函数，而cancelFunc函数里调用了cancelCtx这个结构体的方法cancel

```go
func WithCancel(parent Context) (ctx Context, cancel CancelFunc) {
	if parent == nil {
		panic("cannot create context from nil parent")
	}
	c := newCancelCtx(parent)
	propagateCancel(parent, &c)
	return &c, func() { c.cancel(true, Canceled) }
}

// newCancelCtx returns an initialized cancelCtx.
func newCancelCtx(parent Context) cancelCtx {
	return cancelCtx{Context: parent}
}
```

注意到cancelCtx这个结构体，字段done是一个传递空结构体类型的channel，用来在上下文取消时关闭这个通道，err就是在上下文被取消时告诉用户这个上下文取消了，可以用`ctx.Err()`来获取信息

```go
type cancelCtx struct {
	Context

	mu       sync.Mutex            // protects following fields
	done     chan struct{}         // created lazily, closed by first cancel call
	children map[canceler]struct{} // set to nil by the first cancel call
	err      error                 // set to non-nil by the first cancel call
}
```
到这里问题的关键就在cancel函数，先看定义，cancel函数取消了基于该上下文的所有子上下文以及把自身从父上下文中取消

```go
// cancel closes c.done, cancels each of c's children, and, if
// removeFromParent is true, removes c from its parent's children.
func (c *cancelCtx) cancel(removeFromParent bool, err error) {
	...
	if c.done == nil {
		c.done = closedchan
	} else {
		close(c.done)
	}
	...
}
```

从上面的代码`close(c.done)`就可以看到通过执行cancel函数将c.done通道关闭了，也就是demo里的`ctx.Done()`通道（ps:可以简单看下Done方法的定义）

```go
func (c *cancelCtx) Done() <-chan struct{} {
	c.mu.Lock()
	if c.done == nil {
		c.done = make(chan struct{})
	}
	d := c.done
	c.mu.Unlock()
	return d
}
```

## 总结

1. 从一个被close的channel中接收数据不会被阻塞，而是立即返回，接收完已发送的数据后会返回传递的元素类型的零值(zero value)

2. `ctx, cancelFunc := context.WithCancel(context.Background())` 通过执行`cancelFunc`函数关闭`chan struct{}`通道，从而可以从`ctx.Done()`获取返回值`{}`，最后结束该上下文
