
# Defer 语句中的细节

> 关于Go中的defer，是做什么的？执行顺序是怎么样的？相信学过Go语言的同学，已经不在陌生，今天就来讲讲其中需要掌握的几个知识点。

要讲到这几个知识点，还是大致总结一下defer这个内置 `关键字`。

1. defer是一种延迟处理机制，是在函数进行return之前进行执行。
2. defer是采用栈的方式执行，也就是说先定义的defer后执行，后定义的defer最先被执行。

正因为`defer` 具备这种机制，可以用在函数返回之前，关闭一些资源。例如在某些操作中，连接了MySQL、Redis这样的服务，在函数返回之前，就可以使用`defer` 语句对连接进行关闭。就类似oop语言中的 `finally` 操作一样，不管发生任何异常，最终都会被执行。

其语法格式也非常的简单。

```go
package main
import "fmt"

func main() {
    function1()
}

func function1() {
    fmt.Printf("1")
    defer function2()
    fmt.Printf("2")
}

func function2() {
    fmt.Printf("3")
}
```

 上述代码执行的结果是：

```bash
1
2
3
```


!> 下面就来总结这六个小知识点：

1. `defer` 的执行顺序。 采用栈的方式执行，先定义后执行。
2. `defer` 与 `return` 谁先谁后。`return` 之后的语句先执行，`defer` 后的语句后执行。
3. 函数的返回值初始化与 `defer` 间接影响。`defer` 中修改了返回值，实际返回的值是按照 `defer` 修改后的值进行返回。
4. `defer` 遇见 `panic`。按照`defer`的栈顺序，输出`panic`触发之前定义好的`defer`。
5. `defer` 中包含 `panic`。按照defer的栈顺序，输出`panic`触发之前的`defer`。并且`defer`中会接收到panic信息。
6. `defer` 下的函数参数包含子函数。会先进行子函数的结果值，然后在按照栈的顺序进行输出。

## defer的执行顺序是什么样的

关于这个问题，前面的示例代码也提到过了，采用栈的顺序执行。在定义时，压入栈中，执行是从栈中获取。

## defer与return谁先谁后

先来看如下一段代码，最终的执行结果是怎么样的。

```go
func main() {
	fmt.Println(demo2())
}

func demo2() int {
	defer func() {
		fmt.Println("2")
	}()
	return func() int {
		fmt.Println("1")
		return 4
	}()
}
```

运行上述代码，得到的结果是：

```bash
1
2
4
```

**可能你会有一个疑问❓** ，既然都提到了defer是在函数返回之前执行，为什么还是先输出1，然后在输出2呢？关于defer的定义，就是在`函数返回之前执行`。这一点毋庸置疑，肯定是在`return`之前执行。**需要注意的是，`return` 是非原子性的，需要两步，执行前首先要得到返回值 (为返回值赋值)，`return` 将返回值返回调用处。`defer` 和 `return` 的执行顺序是先为返回值赋值，然后执行 `defer`，然后 `return` 到函数调用处。**

  
## 函数的返回值初始化与defer间接影响

同样的方式，我们先看一段代码，猜测一下最终的执行结果是什么。

```go
func main() {
	fmt.Println(demo3())
}

func demo3() (a int) {
	defer func() {
		a = 3
	}()
	return 1
}
```

上诉代码，最终的运行结果如下：

```bash
3
```

跟上**第2个**知识点类似，函数在return之前，会进行返回值赋值，然后在执行defer语句，最终在返回结果值。

1. 在定义函数`demo3()`时，为函数设置了一个int类型的变量a，此时int类型初始化值默认是0。
2. 定义一个`defer`语句，在函数`return`之前执行，匿名函数中对返回变量a进行了一次赋值，设置 `a=3`。
3. 此时执行`return`语句，因为`return`语句是执行两步操作，先为返回变量a执行一次赋值操作，将a设置为3。紧接着执行`defer`语句，此时`defer`又将a设置为3。
4. 最终`return`进行返回，由于第3步的defer对a进行了重新赋值。因此a就变成了3。
5. 最后`main`函数打印结果，打印的其实是defer修改之后的值。

如果将变量a的声明放回到函数内部声明呢，其运行的结果会根据return的值进行返回。

```go
func main() {
	fmt.Println(demo7())
}

func demo7() int {
	var a int
	defer func(a int) {
		a = 10
	}(a)

	return 2
}
```

上述的最终结果返回值如下：

```go
10
2
```

为什么会发生两种不同的结果呢？这是因为，这是因为发生了值拷贝现象。**在执行defer语句时，将参数a传递给匿名函数时进行了一个值拷贝的过程。由于值拷贝是不会影响原值，因此匿名函数对变量a进行了修改，不会影响函数外部的值。当然传递一个指针的话，结果就不一样了。在函数定义时，声明的变量可以理解为一个全局变量，因此defer或者return对变量a进行了修改，都会影响到该变量上。**

## defer遇见panic

`panic`是Go语言中的一种异常现象，它会中断程序的执行，并抛出具体的异常信息。既然会中断程序的执行，如果一段代码中发生了`panic`，最终还会调用`defer`语句吗？

```go
func main() {
	demo4()
}

func demo4() {
	defer func() {
		fmt.Println("1")
	}()
	defer func() {
		fmt.Println("2")
	}()
	panic("panic")
	defer func() {
		fmt.Println("3")
	}()
	defer func() {
		fmt.Println("4")
	}()
}
复制代码
```

运行上述代码，最终得到的结果如下：

```go
╰─ go run defer.go
2
1
panic: panic

goroutine 1 [running]:
main.demo4()
```

从上面的结果不难看出，虽然发生了panic异常信息，还是输出了defer语句中的信息，这说明panic的发生，还是会执行defer操作。**那为什么后面的两个defer没有被执行呢**。这是因为panic的发生，会中断程序的执行，因此后续的代码根本没有拿到执行权。

当函数中发生了panic异常，会马上中止当前函数的执行，`panic之前定义的defer都会被执行`，所有的 defer 语句都会保证执行并把控制权交还给接收到 panic 的函数调用者。这样向上冒泡直到最顶层，并执行（每层的） defer，在栈顶处程序崩溃，并在命令行中用传给 panic 的值报告错误情况：这个终止过程就是 panicking。

## defer中包含panic

上一个知识点提到了，程序中虽然发生了panic，但是在panic之前定义的defer语句，还是会被执行。要想在defer中获取到具体的panic信息，需要使用 `recover()` 进行获取。

```go
func main() {
	demo5()
}

func demo5() {
	defer func() {
		fmt.Println("1")
		if err := recover(); err != nil {
			fmt.Println(err)
		}
	}()
	defer func() { fmt.Println("2") }()
	panic("panic")
	defer func() { fmt.Println("defer: panic 之后, 永远执行不到") }()
}
复制代码
```

上述代码执行的结果如下：

```go
2
1
panic
```

这个（recover）内建函数被用于从 panic 或 错误场景中恢复：让程序可以从 panicking 重新获得控制权，停止终止过程进而恢复正常执行。

## defer下的函数参数包含子函数

对于这种场景，可能大家很少遇见，也不是很清楚实际的调用逻辑。先来看一段代码。

```go
func main() {
	demo6()
}

func function(index int, value int) int {
	fmt.Println(index)
	return index
}

func demo6() {
	defer function(1, function(3, 0))
	defer function(2, function(4, 0))
}
复制代码
```

上诉代码最终执行的结果是：

```go
3
4
2
1
```

其执行的逻辑是：

1. 执行第1个defer时，压入defer栈中，该defer会执行一个function的函数，在函数返回之前执行。
2. 因为该函数中又包含了一个函数(子函数)，Go语言处理的机制是，先执行该子函数。
3. 执行完子函数，接着再执行第2个defer语句。此时，第2个defer中也有一个子函数，按照第2点的逻辑，这个子函数会被直接执行。
4. 定义完defer语句之后，此时结束该函数的调用。所有被定义的defer语句，按照栈顺序进行输出。

因此可以得出的结论是，**当defer中存在子函数时，子函数会按照defer定义的语句顺序，优先执行。defer最外层的逻辑，则按照栈的顺序执行。**。

## 总结

对于defer的使用，是非常简单的。这里需要注意几点。

1. `defer`是在函数返回之前执行，`defer`的执行顺序是优先于`return`。`return`的执行是一个两步操作，先对`return`返回的值进行赋值，然后执行defer语句，最后将结果进行返回给函数的调用者。
2. 即使函数内发生了`panic`异常，`panic`之前定义的`defer`仍然会被执行。
3. `defer`中存在子函数，子函数会按照`defer`的定于顺序执行。
