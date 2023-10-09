# Context是什么,如何使用？

## Context是什么？

Context 是请求的上下文信息。对于RPC Server来说，一般每接收一个新的请求，会产生一个新的Context，在进行内部的函数调用的时候，通过传递Context，可以让不同的函数、协程保持相同的上下文信息，以达到数据传递、流程控制的目的。

Context 有很多实现，没有一个标准规定Context应该是什么样的。有众多实现版本，如：

1. 我们的GDP v1框架也有设计自己Context。
2. Go的标准库里的context package 有一套实现:context.Context。
3. 开源的 Gin、Echo、Beego等框架都设计了自己的Context。

这些不同的实现，有一个相同点，他们都是用来处理一次请求(Request)过程中的相关业务处理，但是其提供的功能却有些差别：

| Context | 提供的功能 |
| :---: | :---: |
| GDP V1 | 全链路的数据传递、取消信号传递、超时时间传递<br />读取请求数据、输出响应内容、传递数据等<br />日志打印 |
| 标准库context.Context | 全链路的数据传递、取消信号传递、超时时间传递 |
| Gin、Echo、Beego	| 全链路的数据传递、取消信号传递、超时时间传递<br />读取请求数据、输出响应内容、传递数据等|

各种自定义实现一般都会将标准库的实现也包含进去，所有也具有标准库的Context的能力。

## GDP1中的Context介绍

GDP1的Context 采用了和开源Gin类似的方案，是自定义的Context。

![](./../../statics/images/stack/practice/what-context/1.png)

上图是GDP1 HTTP Server的Context，该Context包含了很多种功能，从请求数据的解析读取，到业务逻辑中可能会用到的日志打印，再到最后面的响应内容输出，各个环节的功能都包含到了。

GDP1 的不同类型的Server定义了不同的Context，这些Context都实现了gdp.Context这个接口，以及协议专属的一些方法（请求和响应的处理，每种server不一样）：

| Server | Context |
| :---: | :---: |
| nshead server | NSHeadContext |
| http server | WebContext |
| pbrpc server | PbRPCContext |


如下是 NSHeadContext 的部分API：

![](./../../statics/images/stack/practice/what-context/2.png)

GDP v1 框架是在2018年初设计开发的，那个时候关于Context还没有一个最佳实践，所以其的 Context  的设计受到了 开源的Gin、Echo 框架影响，基本把所有的功能都集成在Context上面了。  Context的功能是满足需求了，但是这种设计违反了单一职责原则，在可扩展性方面并不是很好。

## 标准库的Context

### 发展历史
最初的Context是于2014年放在官方实验性的`golang.org/x/net/context`这个库里，并于2016年在Go 1.7版本加入到官方标准库context package。

最近几年，社区对Context有了更深刻的认识，标准库的net相关的功能也逐步的添加了context.Context的支持，开源的项目也加入了对标准库Context的支持。

如:

- 2017年2月， Go 1.8版本 的sql 添加了ExecContext 
- 2018年2月，Go 1.10版本，go fix tool 开始将 "golang.org/x/net/context"，替换为"context"  
- 2018年11月，go-GRPC框架将golang.org/x/net/context 替换为了标准库的context
- 2019年9月，Go 1.13版本http 添加了NewRequestWithContext
- 2019年9月，Go 1.13版本Context.WithValue 进行升级，可更方便传递数据


### 功能定义
标准库的Context 定义如下：

```go
// context.Context

type Context interface {
    // 获取运行截止时间
    Deadline() (deadline time.Time, ok bool)
 
    // 用于判断是否已经终止/取消
    Done() <-chan struct{}
    
    // 若已经终止/取消 将返回error
    Err() error
 
    // 查找key的值
    Value(key interface{}) interface{}
}
```

### 数据结构
Context的数据以一种链表数据结构进行存储，如添加超时、取消、数据都会新在原来的Context的基础上派生出一个新的Context。不会对原来的Context修改。

其数据结构、信号的传递、数据查找的顺序如下图所示：

![](./../../statics/images/stack/practice/what-context/3.png)

所有的Context 都是基于`context.Background()` 派生出来的。

### 最佳实践

目前context的最佳实践如下：

1. 每产生一个新的请求,产生一个新的Context
2. Context作为所有函数的第一个参数,逐层传递
3. 下层通过判断Context的状态来判断程序是否继续执行还是终止。

下图是在一个RPC Server中Context的使用情况：
![](./../../statics/images/stack/practice/what-context/4.png)


通过使用Context，可以做到统一的、全链路的流程控制和数据传递。

不会和具体的协议绑定、更通用。

PHP的业务逻辑里经常出现上游Client已超时取消请求，而Server端PHP程序还继续执行造成计算资源浪费的情况；而Go程序使用Ctx则可很轻松的将程序及时终止执行。

![](./../../statics/images/stack/practice/what-context/5.png)


## Context 的使用

### 取消信号的传递
如方法a里调用了另外两个方法b 和 方法c ，方法c 要执行1分钟，方法a 读取到方法b的返回值之后，决定立即放回，所以先取消方法c的调用。

```go
func A() {
   // 创建一个可取消的context
   ctx,cancel:=context.WithCancel(context.Background())
   defer cancel()
 
   var wg sync.WaitGroup
 
   wg.Add(1)
   var ok bool
   go func() {
      defer wg.Done()
      ok=B(ctx)
       
      if !ok{
         cancel() // 取消其他调用
      }
   }()
 
   wg.Add(1)
   var cv string
   go func() {
      defer wg.Done()
      cv=C(ctx)
   }()
    
   wg.Wait()
    
   fmt.Println("cv=",cv)
}
 
func B(ctx context.Context) bool {
   return false
}
 
func C(ctx context.Context) string {
   select {
   case <-ctx.Done():
      return "fail"
   case <-time.After(1 * time.Minute):
       // 这里用 time.After 来模拟一个长耗时行为
       // 若是其他调用的话，也需要将ctx继续传递
       if ctx.Err()!=nil{
         return "fail"
       }
      return "ok"
   }
}
```

### 超时取消信号的传递
如上游A调用下游C，上游A给只允许下游最长运行1秒。

```go
// 或者用 WithDeadline 也可以达到相同的效果，区别是参数不一样
ctx,cancel:=context.WithTimeout(context.Background(),1*time.Second)
defer cancel()
 
// 伪代码，下游B 和 下游C 会同时执行
go B(ctx)
go C(ctx)
```

### 传递数据

```go
// 给context 设置上一个值
// 会产生一个新的ctx，值存储在这个新的ctx上
ctx=context.WithValue(ctx,"my_key","my_value")
 
// 从ctx中查找key，只有key的类型和值完全匹配，才会返回，否则返回nil
val:=ctx.Value(my_key)
```