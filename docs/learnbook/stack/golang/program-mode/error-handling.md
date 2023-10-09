错误处理一直是编程必须要面对的问题。错误处理如果做得好的话，代码的稳定性会很好。不同的语言有不同的错误处理的方式。Go 语言也一样，这节课，我们来讨论一下 Go 语言的错误出处，尤其是那令人抓狂的 if err != nil 。

在正式讨论“Go 代码里满屏的 if err != nil 怎么办”这件事儿之前，我想先说一说编程中的错误处理。

## C 语言的错误检查
首先，我们知道，处理错误最直接的方式是通过错误码，这也是传统的方式，在过程式语言中通常都是用这样的方式处理错误的。比如 C 语言，基本上来说，其通过函数的返回值标识是否有错，然后通过全局的 errno 变量加一个 errstr 的数组来告诉你为什么出错。

为什么是这样的设计呢？道理很简单，除了可以共用一些错误，更重要的是这其实是一种妥协，比如：read()、 write()、 open() 这些函数的返回值其实是返回有业务逻辑的值，也就是说，这些函数的返回值有两种语义：

- 一种是成功的值，比如 open() 返回的文件句柄指针 FILE* ；
- 另一种是错误 NULL。这会导致调用者并不知道是什么原因出错了，需要去检查 errno 以获得出错的原因，从而正确地处理错误。

一般而言，这样的错误处理方式在大多数情况下是没什么问题的，不过也有例外的情况，我们来看一下下面这个 C 语言的函数：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/1.jpg)

这个函数是把一个字符串转成整型。但是问题来了，如果一个要转的字符串是非法的（不是数字的格式），如 “ABC” 或者整型溢出了，那么这个函数应该返回什么呢？出错返回，返回什么数都不合理，因为这会和正常的结果混淆在一起。比如，如果返回 0，就会和正常的对 “0” 字符的返回值完全混淆在一起，这样就无法判断出错的情况了。你可能会说，是不是要检查一下 errno呢？按道理说应该是要去检查的，但是，我们在 C99 的规格说明书中可以看到这样的描述：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/2.jpg)

像atoi()、 atof()、 atol() 或 atoll() 这样的函数，是不会设置 errno的，而且，如果结果无法计算的话，行为是 undefined。所以，后来，libc 又给出了一个新的函数strtol()，这个函数在出错的时候会设置全局变量 errno ：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/3.jpg)

虽然，strtol() 函数解决了 atoi() 函数的问题，但是我们还是能感觉到不是很舒服，也不是很自然。

因为这种用返回值 + errno 的错误检查方式会有一些问题：

- 程序员一不小心就会忘记检查返回值，从而造成代码的 Bug；
- 函数接口非常不纯洁，正常值和错误值混淆在一起，导致语义有问题。

所以，后来有一些类库就开始区分这样的事情。比如，Windows 的系统调用开始使用 HRESULT 的返回来统一错误的返回值，这样可以明确函数调用时的返回值是成功还是错误。但这样一来，函数的 input 和 output 只能通过函数的参数来完成，于是就出现了所谓的“入参”和“出参”这样的区别。

然而，这又使得函数接入中参数的语义变得很复杂，一些参数是入参，一些参数是出参，函数接口变得复杂了一些。而且，依然没有解决函数的成功或失败可以被人为忽略的问题。

## Java 的错误处理

Java 语言使用 try-catch-finally 通过使用异常的方式来处理错误，其实，这比起 C 语言的错误处理进了一大步，使用抛异常和抓异常的方式可以让我们的代码有这样一些好处。

函数接口在 input（参数）和 output（返回值）以及错误处理的语义是比较清楚的。

正常逻辑的代码可以跟错误处理和资源清理的代码分开，提高了代码的可读性。

异常不能被忽略（如果要忽略也需要 catch 住，这是显式忽略）。

在面向对象的语言中（如 Java），异常是个对象，所以，可以实现多态式的 catch。

与状态返回码相比，异常捕捉有一个显著的好处，那就是函数可以嵌套调用，或是链式调用，比如：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/4.jpg)

## Go 语言的错误处理

Go 语言的函数支持多返回值，所以，可以在返回接口把业务语义（业务返回值）和控制语义（出错返回值）区分开。Go 语言的很多函数都会返回 result、err 两个值，于是就有这样几点：

- 参数上基本上就是入参，而返回接口把结果和错误分离，这样使得函数的接口语义清晰；
- 而且，Go 语言中的错误参数如果要忽略，需要显式地忽略，用 _ 这样的变量来忽略；
- 另外，因为返回的 error 是个接口（其中只有一个方法 Error()，返回一个 string ），所以你可以扩展自定义的错误处理。

另外，如果一个函数返回了多个不同类型的 error，你也可以使用下面这样的方式：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/5.jpg)

我们可以看到，**Go 语言的错误处理的方式，本质上是返回值检查，但是它也兼顾了异常的一些好处——对错误的扩展。**

## 资源清理

出错后是需要做资源清理的，不同的编程语言有不同的资源清理的编程模式。

- C 语言：使用的是 goto fail; 的方式到一个集中的地方进行清理。
- C++ 语言：一般来说使用 RAII 模式，通过面向对象的代理模式，把需要清理的资源交给一个代理类，然后再析构函数来解决。
- Java 语言：可以在 finally 语句块里进行清理。
- Go 语言：使用 defer 关键词进行清理。

下面是一个 Go 语言的资源清理的示例：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/6.jpg)

## Error Check Hell

好了，说到 Go 语言的 if err !=nil 的代码了，这样的代码的确是能让人写到吐。那么有没有什么好的方式呢？有的。我们先看一个令人崩溃的代码。

![](../../../statics/images/stack/golang/program-mode/error-handling_files/7.jpg)

要解决这个事，我们可以用函数式编程的方式，如下代码示例：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/8.jpg)

从这段代码中，我们可以看到，我们通过使用 Closure 的方式把相同的代码给抽出来重新定义一个函数，这样大量的 if err!=nil 处理得很干净了，但是会带来一个问题，那就是有一个 err 变量和一个内部的函数，感觉不是很干净。

那么，我们还能不能搞得更干净一点呢？我们从 Go 语言的 bufio.Scanner( )中似乎可以学习到一些东西：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/9.jpg)

可以看到，scanner在操作底层的 I/O 的时候，那个 for-loop 中没有任何的 if err !=nil 的情况，退出循环后有一个 scanner.Err() 的检查，看来使用了结构体的方式。模仿它，就可以对我们的代码进行重构了。

首先，定义一个结构体和一个成员函数：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/10.jpg)

然后，我们的代码就可以变成下面这样：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/11.jpg)

有了刚刚的这个技术，我们的“[流式接口 Fluent Interface](https://martinfowler.com/bliki/FluentInterface.html)”也就很容易处理了。如下所示：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/12.jpg)

相信你应该看懂这个技巧了，不过，需要注意的是，它的使用场景是有局限的，也就只能在对于同一个业务对象的不断操作下可以简化错误处理，如果是多个业务对象，还是得需要各种 if err != nil的方式。

## 包装错误

最后，多说一句，我们需要包装一下错误，而不是干巴巴地把err返回到上层，我们需要把一些执行的上下文加入。

通常来说，我们会使用 fmt.Errorf()来完成这个事，比如：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/13.jpg)

另外，在 Go 语言的开发者中，更为普遍的做法是将错误包装在另一个错误中，同时保留原始内容：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/14.jpg)

当然，更好的方式是通过一种标准的访问方法，这样，我们最好使用一个接口，比如 causer接口中实现 Cause( ) 方法来暴露原始错误，以供进一步检查：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/15.jpg)

这里有个好消息是，这样的代码不必再写了，有一个第三方的[错误库](https://github.com/pkg/errors)，对于这个库，我无论到哪儿都能看到它的存在，所以，这个基本上来说就是事实上的标准了。代码示例如下：

![](../../../statics/images/stack/golang/program-mode/error-handling_files/16.jpg)

