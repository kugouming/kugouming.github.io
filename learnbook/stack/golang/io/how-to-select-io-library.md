# 如何选择IO库

在计算机和信息技术领域里I/O这个术语表示输入 / 输出 ( 英语：Input / Output ) ，通常指数据在存储器（内部和外部）或其他周边设备之间的输入和输出，是信息处理系统与外部之间的通信。输入是系统接收的信号或数据，输出则是从其发送的信号或数据。

在Go语言中涉及I/O操作的内置库有很多种，比如：io库，os库，ioutil库，bufio库，bytes库，strings库等等。拥有这么多内置库是好事，但是具体到涉及I/O的场景我们应该选择哪个库呢？

## io.Reader/Writer

Go语言里使用`io.Reader`和`io.Writer`两个 interface 来抽象I/O，他们的定义如下。

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}
```

`io.Reader` 接口代表一个可以从中读取字节流的实体，而`io.Writer`则代表一个可以向其写入字节流的实体。

### io.Reader/Writer 常用的几种实现

- `net.Conn`: 表示网络连接。
- `os.Stdin`, `os.Stdout`, `os.Stderr`: 标准输入、输出和错误。
- `os.File`: 网络,标准输入输出,文件的流读取。
- `strings.Reader`: 字符串抽象成 `io.Reader` 的实现。
- `bytes.Reader`: `[]byte`抽象成 `io.Reader` 的实现。
- `bytes.Buffer`: `[]byte`抽象成 `io.Reader` 和 `io.Writer` 的实现。
- `bufio.Reader/Writer`: 带缓冲的流读取和写入（比如按行读写）。

除了这几种实现外常用的还有`ioutil`工具库包含了很多IO工具函数，编码相关的内置库`encoding/base64`、`encoding/binary`等也是通过 `io.Reader` 和 `io.Writer` 实现各自的编码功能的。

这些常用实现和工具库与`io.Reader`和`io.Writer`间的关系可以用下图表示。

![](../../statics/images/stack/golang/dlv/1.png)

## 每种I/O库的使用场景

### io库
`io`库属于底层接口定义库。它的作用主要是定义个`I/O`的基本接口和个基本常量，并解释这些接口的功能。在实际编写代码做`I/O`操作时，这个库一般只用来调用它的常量和接口定义，比如用`io.EOF`判断是否已经读取完，用`io.Reader`做变量的类型声明。

```go
// 字节流读取完后，会返回io.EOF这个error
for {
    n, err := r.Read(buf)
    fmt.Println(n, err, buf[:n])
    if err == io.EOF {
        break
    }
}
```

### os 库

`os`库主要是处理操作系统操作的，它作为Go程序和操作系统交互的桥梁。创建文件、打开或者关闭文件、Socket等等这些操作和都是和操作系统挂钩的，所以都通过`os`库来执行。这个库经常和`ioutil`，`bufio`等配合使用

### ioutil库

`ioutil`库是一个有工具包，它提供了很多实用的 IO 工具函数，例如 `ReadAll`、`ReadFile`、`WriteFile`、`ReadDir`。唯一需要注意的是它们都是一次性读取和一次性写入，所以使用时，尤其是把数据从文件里一次性读到内存中时需要注意文件的大小。

读出文件中的所有内容

```go
func readByFile() {
    data, err := ioutil.ReadFile("./file/test.txt")
    if err != nil {
        log.Fatal("err:", err)
        return
    }
    fmt.Println("data", string(data)) 
}
```

将数据一次性写入文件

```go
func writeFile() {
    err := ioutil.WriteFile("./file/write_test.txt", []byte("hello world!"), 0644)
    if err != nil {
        panic(err)
        return
    }
}
```

### bufio库

bufio，可以理解为在`io`库的基础上额外封装加了一个缓存层，它提供了很多按行进行读写的函数，从io库的按字节读写变为按行读写对写代码来说还是方便了不少。

```go
func readBigFile(filePath string) error {
    f, err := os.Open(filePath)
    defer f.Close()

    if err != nil {
        log.Fatal(err)
        return err
    }

    buf := bufio.NewReader(f)
    count := 0
    // 循环中打印前100行内容
    for {
        count += 1
        line, err := buf.ReadString('\n')
        line = strings.TrimSpace(line)
        if err != nil {
            return err
        }
        fmt.Println("line", line)

        if count > 100 {
            break
        }
    }
    return nil
}
```

- **ReadLine和ReadString方法：**`buf.ReadLine()`，`buf.ReadString("\n")`都是按行读，只不过ReadLine读出来的是[]byte，后者直接读出了string，最终他们底层调用的都是ReadSlice方法。
- **bufio VS ioutil 库：**`bufio` 和 `ioutil` 库都提供了读写文件的能力。它们之间唯一的区别是 bufio 有一个额外的缓存层。这个优势主要体现在读取大文件的时候。

### bytes 和 strings 库

bytes 和 strings 库里的 `bytes.Reader` 和`string.Reader`，它们都实现了`io.Reader`接口，也都提供了NewReader方法用来从`[]byte`或者`string`类型的变量直接构建出相应的Reader实现。

```go
r := strings.NewReader("abcde")
// 或者是 bytes.NewReader([]byte("abcde"))
buf := make([]byte, 4)
for {
    n, err := r.Read(buf)
    fmt.Println(n, err, buf[:n])
    if err == io.EOF {
        break
    }
}
```

另一个区别是 bytes 库有Buffer的功能，而 strings 库则没有。

```go
var buf bytes.Buffer
fmt.Fprintf(&buf, "Size: %d MB.", 85)
s := buf.String()) // s == "Size: 85 MB."
```