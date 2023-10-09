# Go time.AfterFunc()实例讲解

>! 本文章向大家介绍Golang time.AfterFunc()实例讲解，主要分析其语法、参数、返回值和注意事项，并结合实例形式分析了其使用技巧，希望通过本文能帮助到大家理解应用这部分内容。

在Go语言中，时间包提供了确定和查看时间的函数。 Go语言的AfterFunc()函数用于等待经过的时间，此后，它将在其自己的go-routine中调用已定义的函数“f”。此外，此函数在时间包下定义。在这里，您需要导入“time”包才能使用这些函数。

## 用法:

```go
func AfterFunc(d Duration, f func()) *Timer
```
这里，`*Timer`是指向计时器的指针。

返回值：它返回一个计时器，该计时器然后借助其`Stop()`方法取消调用。


## 范例1：

```go
// Golang program to illustrate the usage of 
// AfterFunc() function 
  
// Including main package 
package main 
  
// Importing fmt and time 
import ( 
    "fmt"
    "time"
) 
  
// Main function 
func main() { 
  
    // Defining duration parameter of 
    // AfterFunc() method 
    DurationOfTime:= time.Duration(3) * time.Second 
  
    // Defining function parameter of 
    // AfterFunc() method 
    f:= func() { 
  
        // Printed when its called by the 
        // AfterFunc() method in the time 
        // stated above 
        fmt.Println("Function called by "+ 
            "AfterFunc() after 3 seconds") 
    } 
  
    // Calling AfterFunc() method with its 
    // parameter 
    Timer1:= time.AfterFunc(DurationOfTime, f) 
  
    // Calling stop method  
    // w.r.to Timer1 
    defer Timer1.Stop() 
  
    // Calling sleep method 
    time.Sleep(10 * time.Second) 
}
```

**输出：**

```bash
Function called by AfterFunc() after 3 seconds
```

此处，在3秒钟后返回输出，然后返回的计时器使用Stop()方法取消对该函数的调用。之后，在睡眠时间结束后退出程序。


## 范例2：

```go
// Golang program to illustrate the usage of 
// AfterFunc() function 
  
// Including main package 
package main 
  
// Importing fmt and time 
import ( 
    "fmt"
    "time"
) 
  
// Main function 
func main() { 
  
    // Creating channel using 
    // make keyword 
    mychan:= make(chan int) 
  
    // Calling AfterFunc() method 
    // with its parameters 
    time.AfterFunc(6*time.Second, func() { 
  
        // Printed after stated duration 
        // by AfterFunc() method is over 
        fmt.Println("6 seconds over....") 
  
        // loop stops at this point 
        mychan <- 30 
    }) 
  
    // Calling for loop 
    for { 
  
        // Select statement 
        select { 
  
        // Case statement 
        case n:= <-mychan:
  
            // Printed after the loop stops 
            fmt.Println(n, "is arriving") 
            fmt.Println("Done!") 
            return
  
        // Returned by default 
        default:
  
            // Printed until the loop stops 
            fmt.Println("time to wait") 
  
            // Sleeps for 3 seconds 
            time.Sleep(3 * time.Second) 
        } 
    } 
}
```

**输出：**

```bash
time to wait
time to wait
6 seconds over....
30 is arriving
Done!
```

在上面的示例中，在指定的持续时间结束之后，通道返回其输出，程序退出。

