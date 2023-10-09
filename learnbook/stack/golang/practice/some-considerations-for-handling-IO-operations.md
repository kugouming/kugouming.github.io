# 处理 IO 操作的一些注意事项

I/O 操作也叫输入输出操作，有些语言中也叫流操作，指的是数据通信的通道。在 Go 中，输入和输出操作是使用原语实现的，这些原语将数据模拟成可读的或可写的字节流。Go 的 IO 包提供了 `io.Reader` 和 `io.Writer` 接口，分别用于数据的输入和输出，如图：

![](./../../statics/images/stack/practice/io/1.png)

```go
// io.Reader 接口的定义

type Reader interface {
    Read(p []byte) (n int, err error)
}
```

Read 将 len(p) 个字节读取到 p 中。返回读取的字节数 n（0 <= n <= len(p)）和错误。即使 Read 返回的 n < len(p)，它也会在调用过程中使用 p 的全部作为暂存空间。若数据字节数小于 len(p) ，Read 会`非阻塞`返回可读的所有字节。当 Read 在成功读取 n > 0 个字节后遇到一个错误或 EOF 情况，它就会返回读取的字节数，下一个 Read 就会返回 0、EOF。调用者应当总在考虑到错误 err 前处理 n > 0 的字节。这样做可以在读取一些字节，以及允许的 EOF 行为后正确地处理 I/O 错误。Read 的实现会阻止返回零字节的计数和一个 nil 错误，这种情况视作空操作。

```go
// io.Writer 接口的定义

type Writer interface {
    Write(p []byte) (n int, err error)
}
```

Write 将 len(p) 个字节从 p 中写入到数据流中。它返回从 p 中被写入的字节数 n（0 <= n <= len(p)）以及任何遇到的引起写入提前停止的错误。若 Write 返回的 n < len(p)，它就必须返回一个非 nil 的错误。Write 不能修改此切片的数据，即便它是临时的。

下面是 io.Reader/Writer 的几个常用的实现：

`net.Conn`, `os.Stdin`, `os.File` 网络、标准输入输出、文件的流读取`strings.Reader` 把字符串抽象成 Reader`bytes.Reader` 把 []byte 抽象成 Reader`bytes.Buffer` 把 []byte 抽象成 Reader 和 Writer`bufio.Reader/Writer` 抽象成带缓冲的流读取


**处理 IO 操作的一些注意事项**

1. 使用流式 IO 接口

尽量*避免将数据读入 [] byte 并传递*。不然可能将很大的数据（几兆字节或更多）读取到内存中。 这给 *GC 带来了巨大压力*，这将增加应用程序的平均延迟。相反，可以使用 *io.Reader 和 io.Writer 接口来构建流式处理以限制每个请求使用的内存量*。

2. 设置超时

不要开启一个未设置超时的 IO 操作，因为一次 IO 操作消耗的时间是未知的，一次 RPC 请求中出现未设置超时的 IO 操作，将会导致服务器处理这次请求的耗时不可控，在开发中需要注意尽量使用 `如：SetDeadline`, `SetReadDeadline`, `SetWriteDeadline` 函数给每一个 IO 操作设置超时机制。

3. 避免开启大量 gouroutine

官方虽然号称 goroutine 是廉价的，但是由于 *goroutine 的调度并没有实现优先级控制*，使得一些关键性的 goroutine（如网络/磁盘IO，控制全局资源的 goroutine）没有及时得到调度而拖慢了整体服务的响应时间。Go 运行时使用有效的操作系统轮询机制（kqueue，epoll，windows IOCP 等）来处理网络 IO。 一个单一的操作系统线程将为许多等待的 goroutine 提供服务。但是，对于本地文件 IO，Go 不会实现任何 IO 轮询。 ** os.File 上的每个操作在进行中都会消耗一个操作系统线程*。并且*磁盘 IO 是串行的*，大量使用本地文件 IO 可能导致程序产生大量线程，超出操作系统所允许的范围。

4. 读大文件时选择合适的方法

如果读文件时字符串过大, 需要考虑*避免将内存复制到临时缓冲区中*，比如： bufio 的 `ReadString(f)` 方法会将文件 f 全部读取为一个字符串，对内存开销很大，使用 `io.Copy(dest, src)`，可以将 src 的内容流式 copy 到 dest 中。它就是在文件指针之间直接复制的，不用全读入内存。

再举个例子：对比 `ioutil.ReadFile` 与 `ioutil.ReadAll` 方法，在读大文件时 *ReadFile 要快于 ReadAll* ，原因就是 ReadFile 先计算出文件的大小，再初始化对应大小的buff，传入Read(p []byte) 来读取字节流。跟踪 ioutil.ReadFile 的源码，会发现其实也是通过 ReadFrom 方法实现（用的是 bytes.Buffer，它实现了 ReaderFrom 接口）。

对比 `ioutil.ReadFile` 与 `ioutil.ReadAll` 读 *600k* 大小的文件 benchmark 结果

![](./../../statics/images/stack/practice/io/2.png)

对比 `ioutil.ReadFile` 与 `ioutil.ReadAll` 读 *2M* 大小的文件 benchmark 结果

![](./../../statics/images/stack/practice/io/3.png)

如果使用大量的 io.Copy，可以考虑使用 `io.ReaderFrom/io.WriterTo` 的实现，这些接口效率更高。下面介绍下这两个接口。

```go
// ReaderFrom 的定义

type ReaderFrom interface {
    ReadFrom(r Reader) (n int64, err error)
}
```

ReadFrom 从 r 中读取数据，直到 EOF 或发生错误。其返回值 n 为读取的字节数。除 io.EOF 之外，在读取过程中遇到的任何错误也将被返回。

```go
// 简单的实现将文件中的数据全部读取并显示在标准输出

file, err := os.Open("test.txt")
if err != nil {
    panic(err)
}
defer file.Close()
writer := bufio.NewWriter(os.Stdout)
writer.ReadFrom(file)
writer.Flush()
```

```go
// WriterTo的定义

type WriterTo interface {
    WriteTo(w Writer) (n int64, err error)
}
```

WriteTo 将数据写入 w 中，直到没有数据可写或发生错误。其返回值 n 为写入的字节数。 在写入过程中遇到的任何错误也将被返回。

```go
// 一个示例代码，将一段文本输出到标准输出

reader := bytes.NewReader([]byte("test"))
reader.WriteTo(os.Stdout)
```