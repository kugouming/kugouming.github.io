# Go语言中间件

## 首先，什么是Handler？
简单来说，go Web通过`http.HandleFunc()`来注册默认路由，将传入URL匹配到相应的Handler。
它的函数原型为：
```go
http.HandleFunc(pattern string, handler func(ResponseWriter, *Request))
```
其中，Handler是我们处理请求和生成返回信息逻辑处理函数。


## 什么是中间件呢？
中间件（MiddleWare）实际上就是一个返回值为Handler的中间处理函数。

## 中间件有啥用呢？
有时候在执行实际Handler里面的逻辑的时候想要预处理或者后处理一些行为（比如写入log、统计执行时间等等）；有时候我们想要在调用一个Handler之前或之后调用另一个Handler。
这时我们就需要用到中间件这个中间处理函数，把我们实际使用的Handler放在中间件里面，以实现额外的功能。
举个例子，就像泡咖啡，但是泡完咖啡还不好喝，我们还要往里面加奶，这时聪明的人们就发明了速溶奶咖，这样把泡咖啡和加奶的流程结合到了一起~泡咖啡就相当于我们原先的Handler，速溶奶咖就相当于中间件。

## 单中间件
下面这个例子是单个的中间件，这个中间件实现了我们的第一个需求：在执行Handler的逻辑之前/之后干点别的事情。

```go
package main

import (
   "fmt"
   "log"
   "net/http"
)

func logging(f http.HandlerFunc) http.HandlerFunc {
   return func(w http.ResponseWriter, r *http.Request) {
      log.Println(r.URL.Path)
      f(w, r)
   }
}
func foo(w http.ResponseWriter, r *http.Request) {
   fmt.Fprintln(w, "foo")
}

func bar(w http.ResponseWriter, r *http.Request) {
   fmt.Fprintln(w, "bar")
}

func main() {
   http.HandleFunc("/foo", logging(foo))
   http.HandleFunc("/bar", logging(bar))
   http.ListenAndServe(":8080", nil)
}
```

可以看到logging是一个返回类型为`HandlerFunc`的中间件，

PS: `HandlerFunc`的定义如下：

```go
type HandlerFunc func(ResponseWriter, *Request)
```

是一个被定义成`func(ResponseWriter, *Request)`类型的自定义函数。

**logging这个中间件实现的功能：**
logging在返回的HandlerFunc类型函数里，首先把请求的URL路径写入log中，然后再调用传入的Handler（foo、bar）来处理真正的逻辑。从这里就可以看到中间件的奥义：在执行Handler的逻辑之前先干了点别的事情。

## 多中间件
接下来是多中间件，下面这个例子实现了在调用一个Handler之前/之后调用另一个Handler，形成多中间件的连接：

```go
package main

import (
   "fmt"
   "log"
   "net/http"
   "time"
)

type Middleware func(http.HandlerFunc) http.HandlerFunc

// Logging logs all requests with its path and the time it took to process
func Logging() Middleware {

   // Create a new Middleware
   return func(f http.HandlerFunc) http.HandlerFunc {

      // Define the http.HandlerFunc
      return func(w http.ResponseWriter, r *http.Request) {

         // Do middleware things
         start := time.Now()
         defer func() { log.Println(r.URL.Path, time.Since(start)) }()

         // Call the next middleware/handler in chain
         f(w, r)
      }
   }
}

// Method ensures that url can only be requested with a specific method, else returns a 400 Bad Request
func Method(m string) Middleware {

   // Create a new Middleware
   return func(f http.HandlerFunc) http.HandlerFunc {

      // Define the http.HandlerFunc
      return func(w http.ResponseWriter, r *http.Request) {

         // Do middleware things
         if r.Method != m {
            http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
            return
         }

         // Call the next middleware/handler in chain
         f(w, r)
      }
   }
}

// Chain applies middlewares to a http.HandlerFunc
func Chain(f http.HandlerFunc, middlewares ...Middleware) http.HandlerFunc {
   for _, m := range middlewares {
      f = m(f)
   }
   return f
}

func Hello(w http.ResponseWriter, r *http.Request) {
   fmt.Fprintln(w, "hello world")
}

func main() {
   http.HandleFunc("/", Chain(Hello, Method("GET"), Logging()))
   http.ListenAndServe(":8080", nil)
}
```

首先，

```go
type Middleware func(http.HandlerFunc) http.HandlerFunc
```

将`Middleware`定义为`func(http.HandlerFunc) http.HandlerFunc`的函数类型，而`Logging`和`Method`函数作为包装`Middleware`的函数，都把`Middleware`函数类型作为返回值，在返回的`Middleware`函数中再进一步地调用`Handler`逻辑。

`Chain`函数则将一个个包装`Middleware`的函数再包装起来，像套娃一样一层层嵌套，实现多个中间件的链接。
