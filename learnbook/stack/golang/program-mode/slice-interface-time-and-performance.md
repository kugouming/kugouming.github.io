# 切片、接口、时间和性能

本节主要讲解 Go 语言编程模式的一些基本技术和要点，了解了这些内容，你就可以更轻松地掌握 Go 语言编程了，其中主要包括数组切片的一些小坑、接口编程，以及时间和程序运行性能相关的内容。


## Slice
首先，介绍下 Slice，中文翻译叫“切片”，这个东西在 Go 语言中不是数组，而是一个结构体，其定义如下：

![](../../../statics/images/stack/golang/program-mode/1.png)

一个空的 Slice 的表现如下图所示：

![](../../../statics/images/stack/golang/program-mode/2.png)

熟悉 C/C++ 的同学一定会知道在结构体里用数组指针的问题——数据会发生共享！下面我们来看看 `Slice` 的一些操作：

![](../../../statics/images/stack/golang/program-mode/3.png)

解释下这段代码：

- 首先，创建一个 foo 的 Slice，其中的长度和容量都是 5；

- 然后，开始对 foo 所指向的数组中的索引为 3 和 4 的元素进行赋值；

- 最后，对 foo 做切片后赋值给 bar，再修改 bar[1]。

为了方便理解，我画了一张图：

![](../../../statics/images/stack/golang/program-mode/4.png)

从这张图片中，我们可以看到，因为 foo 和 bar 的内存是共享的，所以，foo 和 bar 对数组内容的修改都会影响到对方。

接下来，我们再来看一个数据操作 `append()` 的示例：

![](../../../statics/images/stack/golang/program-mode/5.png)

在这段代码中，把 `a[1:16]` 的切片赋给 b ，此时，a 和 b 的内存空间是共享的，然后，对 a 做了一个 `append()`的操作，这个操作会让 a 重新分配内存，这就会导致 a 和 b 不再共享，如下图所示：

![](../../../statics/images/stack/golang/program-mode/6.png)

从图中，我们可以看到，`append()`操作让 a 的容量变成了 64，而长度是 33。

这里你需要重点注意一下，`append()`这个函数在 cap 不够用的时候，就会重新分配内存以扩大容量，如果够用，就不会重新分配内存了！

我们再来看一个例子：

![](../../../statics/images/stack/golang/program-mode/7.png)

在这个例子中，dir1 和 dir2 共享内存，虽然 dir1 有一个 `append()` 操作，但是因为 cap 足够，于是数据扩展到了dir2 的空间。

下面是相关的图示（注意上图中 dir1 和 dir2 结构体中的 cap 和 len 的变化）：

![](../../../statics/images/stack/golang/program-mode/8.png)

如果要解决这个问题，我们只需要修改一行代码。我们要把代码

![](../../../statics/images/stack/golang/program-mode/9.png)

修改为：

![](../../../statics/images/stack/golang/program-mode/10.png)

新的代码使用了 `Full Slice Expression`，最后一个参数叫“`Limited Capacity`”，于是，后续的 `append()` 操作会导致重新分配内存。

## 深度比较
当我们复制一个对象时，这个对象可以是内建数据类型、数组、结构体、Map……在复制结构体的时候，如果我们需要比较两个结构体中的数据是否相同，就要使用深度比较，而不只是简单地做浅度比较。这里需要使用到反射 `reflect.DeepEqual()` ，下面是几个示例：

![](../../../statics/images/stack/golang/program-mode/11.png)

## 接口编程
下面，我们来看段代码，其中是两个方法，它们都是要输出一个结构体，其中一个使用一个函数，另一个使用一个“成员函数”。

![](../../../statics/images/stack/golang/program-mode/12.png)

你更喜欢哪种方式呢？在 Go 语言中，使用“成员函数”的方式叫“`Receiver`”，这种方式是一种封装，因为 `PrintPerson()`本来就是和 Person强耦合的，所以理应放在一起。更重要的是，这种方式可以进行接口编程，对于接口编程来说，也就是一种抽象，主要是用在“多态”。

在这里，我想讲另一个 Go 语言接口的编程模式。

首先，我们来看一段代码：

![](../../../statics/images/stack/golang/program-mode/13.png)

可以看到，这段代码中使用了一个 Printable 的接口，而 Country 和 City 都实现了接口方法 `PrintStr()` 把自己输出。然而，这些代码都是一样的，能不能省掉呢？

其实，我们可以使用“结构体嵌入”的方式来完成这个事，如下所示：

![](../../../statics/images/stack/golang/program-mode/14.png)

引入一个叫 `WithName`的结构体，但是这会带来一个问题：在初始化的时候变得有点乱。那么，有没有更好的方法呢？再来看另外一个解。

![](../../../statics/images/stack/golang/program-mode/15.png)

在这段代码中，我们可以看到，我们使用了一个叫`Stringable` 的接口，我们用这个接口把“业务类型” Country 和 City 和“控制逻辑” `Print()` 给解耦了。于是，只要实现了`Stringable` 接口，都可以传给 `PrintStr()` 来使用。

这种编程模式在 Go 的标准库有很多的示例，最著名的就是 `io.Read` 和 `ioutil.ReadAll` 的玩法，其中 `io.Read` 是一个接口，你需要实现它的一个 `Read(p []byte) (n int, err error)` 接口方法，只要满足这个规则，就可以被 `ioutil.ReadAll`这个方法所使用。

**这就是面向对象编程方法的黄金法则——“Program to an interface not an implementation”。**

## 接口完整性检查
另外，我们可以看到，Go 语言的编译器并没有严格检查一个对象是否实现了某接口所有的接口方法，如下面这个示例：

![](../../../statics/images/stack/golang/program-mode/16.png)

可以看到，Square 并没有实现 Shape 接口的所有方法，程序虽然可以跑通，但是这样的编程方式并不严谨，如果我们需要强制实现接口的所有方法，那该怎么办呢？

在 Go 语言编程圈里，有一个比较标准的做法：

![](../../../statics/images/stack/golang/program-mode/17.png)

声明一个 `_` 变量（没人用）会把一个 `nil` 的空指针从 Square 转成 Shape，这样，如果没有实现完相关的接口方法，编译器就会报错：

![](../../../statics/images/stack/golang/program-mode/18.png)

这样就做到了强验证的方法。

## 时间
对于时间来说，这应该是编程中比较复杂的问题了，相信我，时间是一种非常复杂的事。而且，时间有时区、格式、精度等问题，其复杂度不是一般人能处理的。

所以，一定要重用已有的时间处理，而不是自己干。

在 Go 语言中，你一定要使用 `time.Time` 和 `time.Duration` 这两个类型。

- 在命令行上，flag 通过 `time.ParseDuration` 支持了 `time.Duration`。
- JSON 中的 `encoding/json` 中也可以把`time.Time` 编码成 RFC 3339 的格式。
- 数据库使用的 `database/sql` 也支持把 `DATATIME` 或 `TIMESTAMP` 类型转成 `time.Time`。
- YAML 也可以使用 `gopkg.in/yaml.v2` 支持 `time.Time` 、`time.Duration` 和 RFC 3339 格式。

如果你要和第三方交互，实在没有办法，也请使用 RFC 3339 的格式。

最后，如果你要做全球化跨时区的应用，一定要把所有服务器和时间全部使用 UTC 时间。

## 性能提示
Go 语言是一个高性能的语言，但并不是说这样我们就不用关心性能了，我们还是需要关心的。下面我给你提供一份在编程方面和性能相关的提示。

- 如果需要把数字转换成字符串，使用 `strconv.Itoa()` 比 `fmt.Sprintf()` 要快一倍左右。
- 尽可能避免把`String`转成`[ ]Byte` ，这个转换会导致性能下降。
- 如果在 for-loop 里对某个 `Slice` 使用 `append()`，请先把 `Slice` 的容量扩充到位，这样可以避免内存重新分配以及系统自动按 2 的 N 次方幂进行扩展但又用不到的情况，从而避免浪费内存。
- 使用`StringBuffer` 或是`StringBuild` 来拼接字符串，性能会比使用 `+` 或 `+=`高三到四个数量级。
- 尽可能使用并发的 `goroutine`，然后使用 `sync.WaitGroup` 来同步分片操作。
- 避免在热代码中进行内存分配，这样会导致 gc 很忙。尽可能使用 `sync.Pool` 来重用对象。
- 使用 lock-free 的操作，避免使用 mutex，尽可能使用 `sync/Atomic`包。
- 使用 I/O 缓冲，I/O 是个非常非常慢的操作，使用 `bufio.NewWrite()` 和 `bufio.NewReader()` 可以带来更高的性能。
- 对于在 for-loop 里的固定的正则表达式，一定要使用 `regexp.Compile()` 编译正则表达式。性能会提升两个数量级。
- 如果你需要更高性能的协议，就要考虑使用 protobuf 或 msgp 而不是 JSON，因为 JSON 的序列化和反序列化里使用了反射。
- 你在使用 Map 的时候，使用整型的 key 会比字符串的要快，因为整型比较比字符串比较要快。