# 如何写出优雅的单测


## 引言   
单元测试是针对程序的最小单元进行正确性的测试工作。一个单元可能是单个程序、类、对象、方法等。测试某个具体的函数，是否符合编写者的预期。对于 Gopher 来说，写出好的测试代码要熟练使用相关测试框架，好的测试代码同时会给 Gopher 带来方便，包括：

- 验证功能，减少bug，减少调试时间。
- 提高程序员自信心，提高团队自信心。 
- 单元测试结合 “code coverage” 会让你软件的质量提升
- 不再需要手工测试，而且代码变动后只关注单元测试并且查看红/绿栏即可

## 基础用法
- 文件格式:  以`_test.go`为后缀，源文件在执行go build时不会被构建成包的一部分。
- 函数格式：每个测试的函数都是以`Test`、 `Benchmark`、`Example`为函数名的前缀
- 函数都必须导入`testing`包


写一个方法，判断两个字符串切片是否相等

```go
// 两个字符串切片是否相等
func StringSliceEqual(a, b []string) bool {
    if len(a) != len(b) {
        return false
    }
    for i, v := range a {
        if v != b[i] {
            return false
        }
    }
    return true
}
```

`StringSliceEqual`的单测可以写成：
```go
// 单测名
func TestStringSliceEqual(t *testing.T) {
    a, b := []string{"hello"}, []string{"hello"}
    if StringSliceEqual(a, b) != true {
        t.Fatalf("a,b not equal, a: %v, b:%v", a, b)
    }
}
```

![](./../../statics/images/stack/test-write/1.png)

注意：特定的运行函数：`-run [funcname]` ，funcname是正则表达式

`StringSliceEqual`的`Example`可以写成：
```go
// 单测名
func ExampleStringSliceEqual() {
    a, b := []string{"hello"}, []string{"hello"}
    fmt.Printf("StringSliceEqual result is %v", StringSliceEqual(a, b))
    // Output:
    // StringSliceEqual result is true
}
```

`StringSliceEqual`的`Benchmark`可以写成:
```go
// 单测名
func BenchmarkStringSliceEqual(b *testing.B) {
    a1, b1 := []string{"hello"}, []string{"hello"}
    for i := 0; i < b.N; i++ {
        StringSliceEqual(a1, b1)
    }
}
```
![](./../../statics/images/stack/test-write/2.png)
- `BenchmarkStringSliceEqual-4` 代表4个逻辑线程

- `211492941` 表示测试次数，即test.B提供的N,

- `5.64 ns/op` 表示每一个操作耗费多少时间(纳秒)。

- `0 B/op` 表示每次调用需要分配0个字节。

- `0 allocs/op` 表示每次调用有多少次分配

注意：`Benchmark单测的调用不一定是1`，会跟逻辑线程数有关系，索引对于初始化资源等操作不能放在Benchmark里。


进行测试之前的初始化操作(例如打开连接)，测试结束后，需要做清理工作(例如关闭连接)，这个时候就可以使用TestMain()。
```go
// test main 执行go test时候begin部分在所有单测里最先执行，end部分最后执行
func TestMain(m *testing.M) {
    // begin
 
    m.Run()
 
    // end
}
```


`go test` 还提供一些有帮助的语法特性：支持跳过测试标识（对应参数：`-short`），使用parallel并行运行，提高运行速度的`t.Parallel()`方法

`go help testflag` 可以查看具体 `test` 参数
```go
// skip
func TestSkip(t *testing.T) {
    // 增加 -short时 testing.Short() 为true
    if testing.Short() {
        fmt.Println("test in short mode.")
        t.Skip("skipping test in short mode.")
    }
}
 
// use parallel t.Parallel() 方法使得子测试并行执行
func TestParallel(t *testing.T) {
    names := []string{"aa", "bb", "cc"}
    for _, name := range names {
        tName := name
        t.Run(tName, func(t *testing.T) {
            t.Parallel()
            fmt.Println(tName) // 返回names的乱序
        })
    }
}
```

## 使用可视化工具查看结果

### 覆盖率着色
`–cover` 参数可以统计单测覆盖率，通过 `-coverprofile` 参数生成html文件，在桌面浏览器上还可以看到覆盖率着色，使用方法：

- `go test -coverprofile=cover.out`
- `go tool cover -func=cover.out`
- `go tool cover -o test.html  -html=cover.out`

![](./../../statics/images/stack/test-write/3.png)

### 结果UI界面
`GoConvey`是一款针对Go的测试框架，可以管理和运行测试用例，同时提供了丰富的断言函数，并支持很多 Web 界面特性。Go虽然自带了单元测试功能，`GoConvey`能让程序员写出简洁优雅的测试代码。

安装 `go get github.com/smartystreets/goconvey && go install`

使用goconvey对`StringSliceEqual`方法写单测例子：
```go
// goconvey嵌套语句

func TestStringSliceEqual(t *testing.T) {
    Convey("a,b相等", t, func() {
        a := []string{"hello", "goconvey"}
        b := []string{"hello", "goconvey"}
        So(StringSliceEqual(a, b), ShouldBeTrue)
    })
    Convey("a,b都为空", t, func() {
        So(StringSliceEqual(nil, nil), ShouldBeTrue)
    })
    Convey("a,b不相等", t, func() {
        a := []string(nil)
        b := []string{}
        So(StringSliceEqual(a, b), ShouldBeFalse)
    })
}
```

在需要执行单测的目录执行`./goconvey` 命令，当有桌面浏览器时可看到测试结果，goconvey嵌套和ui界面：

![](./../../statics/images/stack/test-write/4.png)

## 使用自动化工具生成代码

### 生成表格驱动测试
`table dirven testing`, 是针对自动化测试软件的测试方法，它将创造测试程序的步骤分为规划及实现两个阶段

每个表格就是一个完整的test case, 包含测试的输入、期望的输出，测试名称。

规划一个数组、循环遍历每一个 case，通过`gotests`可以自动生成单测：

- `gotests –all  [filename]`
- `gotests –w –only  [funcname] [filename]`
- `gotests –w –all   origin.go, origin_test.go`

以上面的`StringSliceEqual`函数为例，定义在`sliceequal.go`中

```go
// 执行：gotests -only StringSliceEqual sliceequal.go 生成的单测结果

func TestStringSliceEqual(t *testing.T) {
        type args struct {
                a []string
                b []string
        }
        tests := []struct {
                name string
                args args
                want bool
        }{
                // TODO: Add test cases.
        }
        for _, tt := range tests {
                t.Run(tt.name, func(t *testing.T) {
                        if got := StringSliceEqual(tt.args.a, tt.args.b); got != tt.want {
                                t.Errorf("StringSliceEqual() = %v, want %v", got, tt.want)
                        }
                })
        }
}
```

生成单测表格驱动的好处不仅可以节省时间，也可以规范测试代码，对多种情况的测试做到覆盖，其中struct中args为参数， want 为期望结果，

很多ide都集成了gotests工具，例如： goland快捷键 `command+shirt+T`，vscode安装Go插件后，`右键Go: Generate Unit Test For Function` 即可生成单测代码。

### 生成接口测试代码
`GoMock` 是由Go官方开发维护的测试框架，实现了较为完整的基于interface的Mock功能，能够与Go内置的testing包良好集成，也能用于其它的测试环境中。

GoMock测试框架包含了GoMock包和mockgen工具两部分，其中GoMock包完成对桩对象生命周期的管理，`mockgen`工具用来生成interface对应的Mock类源文件。

安装：
```bash
go get github.com/golang/mock/gomock && go install
go github.com/golang/mock/mockgen && go install 
```

用`mockgen`为要模拟的接口生成模拟。

在测试中创建一个实例gomock.Controller并将其传递给模拟对象构造函数以获取模拟对象。

可以指定生成包下对应的接口，默认实现`放在mocks目录`下，例如：

- `mockgen net Addr`
- `mockgen database/sql/driver Conn,Driver`

生成接口实现例子：

```go
// 一个Doer接口

type Doer interface {
    DoSomething(int, string) error
}
 
// 一个包含Doer接口的结构体
type User struct {
    d Doer
}
 
func (u *User) Use(i int, s string) error {
    return u.d.DoSomething(i, s)
}
```

`mockgen -destination=mocks/mock_doer.go -package=mocks gomock Doer`

- `-destination=mocks/mock_doer.go` ： 将生成的模拟接口放入指定文件中

- `-package=mocks` ： 将生成的模拟接口放入包mocks中

- `gomock` 接口定义在gomock目录下

- `Doer` 接口名

生成代码如下：`mocks/mock_doer.go`

![](./../../statics/images/stack/test-write/5.png)

单测示例：
```go
// 使用expect单测例子

func TestUseError(t *testing.T) {
    mockCtr := gomock.NewController(t)
    dummyError := errors.New("dummy error")
    mockDoer := mocks.NewMockDoer(mockCtr)
    testUser := &User{d: mockDoer}
 
    mockDoer.EXPECT().
        DoSomething(gomock.Any(), gomock.Any()).
        Return(dummyError).
        Times(1).
        Do(func(x int, y string) {
            fmt.Println("Called with x =", x, "and y =", y)
        })
 
    err := testUser.Use(123, "Hello Gomock")
    if err != dummyError {
        t.Fail()
    }
}
```

`调用EXPECT()`为你的模拟设置他们的参数期望值和返回值(`Return`)，可以设置期望执行次数和参数(`DoSomething`)，指定返回结果和执行操作(`Do`)

![](./../../statics/images/stack/test-write/6.png)

可以使用`gomock.InOrder`指定函数执行顺序的期望
```go
// 指定执行顺序

func TestUseOrder(t *testing.T) {
    mockCtr := gomock.NewController(t)
    mockDoer := mocks.NewMockDoer(mockCtr)
    testUser := &User{d: mockDoer}
    gomock.InOrder(
        mockDoer.EXPECT().DoSomething(1, "first this"),
        mockDoer.EXPECT().DoSomething(2, "then this"),
        mockDoer.EXPECT().DoSomething(3, "then this"),
    )
 
    // 顺序需要一致才行
    testUser.Use(1, "first this")
    testUser.Use(2, "then this")
    testUser.Use(3, "then this")
}
```

## 使用打桩框架

### GoStub

`GoStub`是一款轻量级的测试框架，接口友好，可以对全局变量、函数或过程打桩。

可以为一个变量打桩
```go
// 为一个变量打桩

func TestStubVar(t *testing.T) {
    commNum := 10
    stubs := Stub(&commNum, 100)
    defer func() {
        fmt.Println("打桩的值: ", commNum) // 打桩的值: 100
        stubs.Reset()
        fmt.Println("原来的值: ", commNum) // 原来的值: 10
    }()
}
```

可以为一个函数打桩，注意函数需要使用变量的形式，
```go
// 为一个函数打桩
var (
    commFunc = func(cmd string) string {
        return cmd
    }
)
 
// 为一个函数打桩
func TestStubFunc(t *testing.T) {
    // stubs = StubFunc(&commFunc, "bbb")
    stubs := Stub(&commFunc, func(cmd string) string {
        return "bbb"
    })
 
    defer func() {
        fmt.Println(commFunc("aaa")) // echo "bbb"
        stubs.Reset()
        fmt.Println(commFunc("aaa")) // echo "aaa"
    }()
}
```

为第三方方法打桩时，需要自定义方法函数变量

注意：如果直接执行 ```stubs := StubFunc(&json.Marshal, []byte(`{"name":"aaa"}`), nil)``` ，rs的结果不生效

```go
// 为第三个函数打桩
var Marshal = json.Marshal
func TestStubDIY(t *testing.T) {
    type student struct {
        Name string `json:"name,omitempty"`
    }
 
    stubs := StubFunc(&Marshal, []byte(`{"name":"aaa"}`), nil)
    data := student{
        "bbb",
    }
    rs, _ := Marshal(data)
    fmt.Println(string(rs)) // {"name":"aaa"}
    defer func() {
        stubs.Reset()
        rs, _ = Marshal(data)
        fmt.Println(string(rs)) // {"name":"bbb"}
    }()
}
```

GoStub使用方便，缺点是方法（成员函数）无法通过GoStub框架打桩，当产品代码的OO设计比较多时，打桩点可能离被测函数比较远，导致UT用例写起来不是特别方便。过程或函数通过GoStub框架打桩时，对产品代码有侵入性。

### Monkey
`Monkey`是Go的一个补丁框架，在运行时通过汇编语句重写可执行文件，将待打桩函数或方法的实现跳转到桩实现，原理和热补丁类似。

使用Monkey对对象的方法打桩
```go
// 对象方法打桩

type Client struct {}
func (c *Client) Test(param string) bool {
    return true
}
 
// 对象方法PatchInstanceMethod
func test4() {
    var client = &Client{}
    monkey.PatchInstanceMethod(reflect.TypeOf(client), "Test", func(c *Client, param string) bool {
        return false
    })
    fmt.Println(client.Test("bbbb")) // output false
}
```

使用Monkey对`fmt.Println`方法打桩

```go
// 对方法打桩
monkey.Patch(fmt.Println, func(a ...interface{}) (n int, err error) {
    s := make([]interface{}, len(a))
    for i, v := range a {
        s[i] = strings.Replace(fmt.Sprint(v), "apple", "banana", -1)
    }
    return fmt.Fprintln(os.Stdout, s...)
})
fmt.Println("this is apple") // this is banana
```

下面代码段执行结果当host为http://icode.baidu.com 时返回错误：`only https requests allowed`

```go
// 为第三个函数打桩
var guard *monkey.PatchGuard
guard = monkey.PatchInstanceMethod(reflect.TypeOf(http.DefaultClient), "Get", func(c *http.Client, url string) (*http.Response, error) {
    guard.Unpatch()
    defer guard.Restore()
    if !strings.HasPrefix(url, "https://") {
        return nil, fmt.Errorf("only https requests allowed")
    }
    return c.Get(url)
})
 
r, er := http.Get("http://icode.baidu.com")
fmt.Println(r, er) // err = only https requests allowed
 
r, er = http.Get("https://icode.baidu.com")
fmt.Println(r, er) // err = nil, response html
```

注意：monkey对内联函数不生效，执行时可以通过命令行参数`-gcflags=-l禁止inline`。

通过Monkey，我们可以解决函数的打桩问题，但Monkey不是线程安全的，不要将Monkey用于并发的测试中。

## 总结

什么样的单测算的上好的单测？

- 易写
- 可读
- 可靠
- 快速
- 可执行

1. 开发者通常会编写单元测试来覆盖程序不同情况和行为。因此所有这些测试例程应该很容易编写，而无需付出巨大努力。一个好的单元测试反映了程序的一些功能和行为，包括如何使用、有哪些典型的使用场景。
2. 有了良好的单元测试，我们可以在调试代码之前就发现并修复错误！只有在被测系统中存在错误时，单元测试才会失败。这似乎很理所当然，但程序员经常遇到一个问题——即使没有引入错误，他们的测试也会失败。
3. 良好的单元测试应该是可复现的，并且不受外部因素的影响，例如环境或运行顺序。 开发者编写单元测试的目的，是重复运行它们并检查是否有引入错误。如果单元测试运行地很慢，开发人员很可能跳过在自己的机器上运行测试。
4. 一个测试很缓慢不会有什么显著影响；然而当单元测试的规模变大，比如增加一千个测试，我们肯定回浪费一段时间去等待测试结束。慢速的单元测试还可能表明被测系统或单元测试本身与用到了外部资源，使测试依赖于环境。
 
另外，单元测试不是集成测试。单元测试和集成测试有不同的用途。单元测试和被测系统都不应访问网络资源，数据库，文件系统等，以消除外部因素的影响。

GDP2的数据库和redis，icode.baidu.com/gdp/redis，icode.baidu.com/gdp/mysql，使用mock库实现连接而不是真正的网络连接：

[github.com/alicebob/miniredis](http://github.com/alicebob/miniredis)

[gopkg.in/DATA-DOG/go-sqlmock](http://gopkg.in/DATA-DOG/go-sqlmock)

具体应用代码这里就不贴了，有兴趣的同学可以看下GDP2的使用

- [使用go-sqlmock](http://icode.baidu.com/repos/baidu/gdp/mysql/blob/master:pool_test.go)
- [使用miniredis](http://icode.baidu.com/repos/baidu/gdp/redis/blob/master:client_test.go)