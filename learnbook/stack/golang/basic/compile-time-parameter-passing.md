# 编译时参数传递

## How To

### 编译器传入参数 gcflags
`go build` 可以用 `-gcflags` 给go编译器传入参数，也就是传给 `go tool compile` 的参数，因此可以用 `go tool compile --help` 查看所有可用的参数。

其中 `-m` 可以检查代码的编译优化情况，包括逃逸情况和函数是否内联。

如果只在编译特定包时需要传递参数，格式应遵守“`包名=参数列表`”，如`go build -gcflags -gcflags='log=-N -l' main.go`

### 链接器传入参数 ldflags
`go build` 用 `-ldflags` 给go链接器传入参数，实际是给 `go tool link` 的参数，可以用 `go tool link --help` 查看可用的参数。

常用 `-X` 来指定版本号等编译时才决定的参数值。例如代码中定义 `var buildVer string`，然后在编译时用 `go build -ldflags "-X main.buildVer=1.0" ...` 来赋值。注意 `-X` 只能给string类型变量赋值。

## 示例

演示代码，文件名：`main.go`
```go
package main

import (
    "fmt"
    "os"
)

var (
    gitHash   string
    buildTime string
    goVersion string
)

func main() {
    args := os.Args
    if len(args) == 2 && (args[1] == "--version" || args[1] == "-v") {
        fmt.Printf("Git Comit Hash:%s\n", gitHash)
        fmt.Printf("编译时间: %s \n", buildTime)
        fmt.Printf("编译器 Go 版本: %s \n", goVersion)
    }
}
```

编译时参数
```bash
go build -ldflags "\
    -X 'main.goVersion=$(go version)' \
    -X 'main.gitHash=$(git show -s --format=%H)' \
    -X 'main.buildTime=$(git show -s --format=%cd)'\
    " main.go
```

然后运行 `./main` 时结果如下

```
Git Comit Hash:5e2d8e869ca42b73e5790c7c0fd7184c5e654145
编译时间: Thu Apr 9 15:53:32 2020 +0800 
编译器 Go 版本: go version go1.14.1 darwin/amd64 
```