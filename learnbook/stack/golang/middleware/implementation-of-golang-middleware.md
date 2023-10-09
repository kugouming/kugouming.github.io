# golang中间件的实现

> 原文: http://t.zoukankan.com/zhaohaiyu-p-11578490.html

## 中间件是什么
开发者在处理请求的过程中，加入用户自己的钩子（Hook）函数。这个钩子函数就叫中间件，中间件适合处理一些公共的业务逻辑，比如登录认证、权限校验、数据分页、记录日志、耗时统计等。

## 代码实现

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// 中间件的函数
type MiddlewareFunc func(ctx context.Context, req interface{}) (resp interface{}, err error)

// 构建中间件函数使用
type Middleware func(MiddlewareFunc) MiddlewareFunc

type LogFile struct {
    logName string
}

// 构建一个中间件函数 
func buildMiddleWare(handle MiddlewareFunc) MiddlewareFunc {
    var chain []Middleware
    var LogFiler LogFile
    chain = append(chain,ExeaTime)
    chain = append(chain,NewPrintLOg(LogFiler))
    chain = append(chain,judgeReq)

    middle := buildChain(chain)
    return middle(handle)
}

// 把中间件的数组构建成个链 
// 最先执行的在最外层
// next执行下一个 下面的为执行完请求函数handle之后执行 执行顺序和数组顺序相反
// 
// 最终形成的调用链如下：
//      judgeReq(NewPrintLOg(LogFiler)(ExeaTime(handle)))
// 
func buildChain(chain []Middleware) Middleware {
    return func(next MiddlewareFunc) MiddlewareFunc {
        for i := len(chain) - 1; i >= 0; i-- {
            next = chain[i](next)
        }
        return next
    }
}

// 执行时间中间件
func ExeaTime(next MiddlewareFunc) MiddlewareFunc {
    return func(ctx context.Context, req interface{}) (resp interface{}, err error) {
        fmt.Println("执行时间中间件")
        startTime := time.Now().UnixNano()
        resp, err = next(ctx, req) // 执行下一个
        if err != nil {
            fmt.Println("执行函数失败")
            return
        }
        endTime := time.Now().UnixNano()
        fmt.Println("函数执行时间为:", endTime-startTime)
        return
    }
}

// 打印日志中间件
func NewPrintLOg(LogFiler LogFile) Middleware {
    return func(next MiddlewareFunc) MiddlewareFunc {
        return func(ctx context.Context, req interface{}) (resp interface{}, err error) {
            fmt.Println("打印日志中间件")
            fmt.Println(LogFiler.logName)
            resp, err = next(ctx, req)
            return
        }
    }
}

// 判断req是否为空中间件
func judgeReq(next MiddlewareFunc) MiddlewareFunc {
    return func(ctx context.Context, req interface{}) (resp interface{}, err error) {
        fmt.Println("判断req是否为空中间件")
        if req == "" {
            fmt.Println("req为空")
            return
        }
        resp, err = next(ctx, req)
        return
    }
}

// 请求函数
func Handle(ctx context.Context, req interface{}) (resp interface{}, err error) {
    resp = req
    fmt.Println("Handle")
    time.Sleep(time.Second)
    return
}

func main() {
    MiddlewareFunction := buildMiddleWare(Handle)         // 把请求函数传进去并形成个带中间件的函数
    resp,err := MiddlewareFunction(context.TODO(),"zhy")  // 执行函数
    if err != nil {
        fmt.Println("main err:",err)
        return
    }
    fmt.Println("main resp:",resp)
```

执行结果:
```
执行时间中间件
打印日志中间件

判断req是否为空中间件
Handle
函数执行时间为: 1001447800
main resp: zhy
```

## 执行顺序

![执行顺序](https://img2020.cnblogs.com/blog/1596073/202009/1596073-20200907110749553-1190437462.png)