之前，我写过一篇文章《Python 修饰器的函数式编程》，这种模式可以很轻松地把一些函数装配到另外一些函数上，让你的代码更加简单，也可以让一些“小功能型”的代码复用性更高，让代码中的函数可以像乐高玩具那样自由地拼装。

所以，一直以来，我都对修饰器（Decoration）这种编程模式情有独钟，这节课，我们就来聊聊 Go 语言的修饰器编程模式。

如果你看过我刚说的文章，就一定知道，这是一种函数式编程的玩法——用一个高阶函数来包装一下。

多唠叨一句，关于函数式编程，我之前还写过一篇文章《函数式编程》，这篇文章主要是想通过详细介绍从过程式编程的思维方式过渡到函数式编程的思维方式，带动更多的人玩函数式编程。所以，如果你想了解一下函数式编程，那么可以点击链接阅读一下这篇文章。其实，Go 语言的修饰器编程模式，也就是函数式编程的模式。

不过，要提醒你注意的是，Go 语言的“糖”不多，而且又是强类型的静态无虚拟机的语言，所以，没有办法做到像 Java 和 Python 那样写出优雅的修饰器的代码。当然，也许是我才疏学浅，如果你知道更多的写法，请你一定告诉我。先谢过了。

## 简单示例

我们先来看一个示例：

![](../../../statics/images/stack/golang/program-mode/modifier_files/1.jpg)

可以看到，我们动用了一个高阶函数 decorator()，在调用的时候，先把 Hello() 函数传进去，然后会返回一个匿名函数。这个匿名函数中除了运行了自己的代码，也调用了被传入的 Hello() 函数。

这个玩法和 Python 的异曲同工，只不过，有些遗憾的是，Go 并不支持像 Python 那样的 @decorator 语法糖。所以，在调用上有些难看。当然，如果你想让代码更容易读，你可以这样写：

![](../../../statics/images/stack/golang/program-mode/modifier_files/2.jpg)

我们再来看一个计算运行时间的例子：

![](../../../statics/images/stack/golang/program-mode/modifier_files/3.jpg)

关于这段代码，有几点我要说明一下：

- 有两个 Sum 函数，Sum1() 函数就是简单地做个循环，Sum2() 函数动用了数据公式（注意：start 和 end 有可能有负数）；
- 代码中使用了 Go 语言的反射机制来获取函数名；
- 修饰器函数是 timedSumFunc()。

运行后输出：

![](../../../statics/images/stack/golang/program-mode/modifier_files/4.jpg)

## HTTP 相关的一个示例

接下来，我们再看一个处理 HTTP 请求的相关例子。

先看一个简单的 HTTP Server 的代码：

![](../../../statics/images/stack/golang/program-mode/modifier_files/5.jpg)

这段代码中使用到了修饰器模式，WithServerHeader() 函数就是一个 Decorator，它会传入一个 http.HandlerFunc，然后返回一个改写的版本。这个例子还是比较简单的，用 WithServerHeader() 就可以加入一个 Response 的 Header。

所以，这样的函数我们可以写出好多。如下所示，有写 HTTP 响应头的，有写认证 Cookie 的，有检查认证 Cookie 的，有打日志的……

![](../../../statics/images/stack/golang/program-mode/modifier_files/6.jpg)

## 多个修饰器的 Pipeline

在使用上，需要对函数一层层地套起来，看上去好像不是很好看，如果需要修饰器比较多的话，代码就会比较难看了。不过，我们可以重构一下。

重构时，我们需要先写一个工具函数，用来遍历并调用各个修饰器：

![](../../../statics/images/stack/golang/program-mode/modifier_files/7.jpg)

然后，我们就可以像下面这样使用了：

![](../../../statics/images/stack/golang/program-mode/modifier_files/8.jpg)

这样的代码是不是更易读了一些？Pipeline 的功能也就出来了。

## 泛型的修饰器

不过，对于 Go 的修饰器模式，还有一个小问题，那就是好像无法做到泛型。比如上面那个计算时间的函数，其代码耦合了需要被修饰的函数的接口类型，无法做到非常通用。如果这个问题解决不了，那么，这个修饰器模式还是有点不好用的。

因为 Go 语言不像 Python 和 Java，Python 是动态语言，而 Java 有语言虚拟机，所以它们可以实现一些比较“变态”的事。但是，Go 语言是一个静态的语言，这就意味着类型需要在编译时就搞定，否则无法编译。不过，Go 语言支持的最大的泛型是 interface{} ，还有比较简单的 Reflection 机制，在上面做做文章，应该还是可以搞定的。

废话不说，下面是我用 Reflection 机制写的一个比较通用的修饰器（为了便于阅读，我删除了出错判断代码）：

![](../../../statics/images/stack/golang/program-mode/modifier_files/9.jpg)

这段代码动用了 reflect.MakeFunc() 函数，创造了一个新的函数，其中的 targetFunc.Call(in) 调用了被修饰的函数。

这个 Decorator( ) 需要两个参数：

- 第一个是出参 decoPtr ，就是完成修饰后的函数；
- 第二个是入参 fn ，就是需要修饰的函数。

这样写是不是有些“傻”？的确是的。不过，这是我个人在 Go 语言里所能写出来的最好的代码了。如果你知道更多优雅的写法，请你要一定告诉我！

好了，让我们来看一下使用效果。首先，假设我们有两个需要修饰的函数：

![](../../../statics/images/stack/golang/program-mode/modifier_files/10.jpg)

然后，我们可以这样做：

![](../../../statics/images/stack/golang/program-mode/modifier_files/11.jpg)

你会发现，使用 Decorator() 时，还需要先声明一个函数签名，感觉好傻啊，一点都不泛型，不是吗？

如果你不想声明函数签名，就可以这样：

![](../../../statics/images/stack/golang/program-mode/modifier_files/12.jpg)

好吧，看上去不是那么漂亮，但是 it works。看样子 Go 语言目前本身的特性无法做成像 Java 或 Python 那样，对此，我们只能期待 Go 语言多放“糖”了！