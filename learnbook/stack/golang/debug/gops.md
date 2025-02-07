# 进程诊断工具 gops

在类 Unix 系统中，我们常常会使用 ps 命令来查看系统当前所运行的进程信息，该命令为我们提供了较大的帮助，能够快速的定位到某些进程的运行情况和状态。

而在 Go 语言中，也有类似的命令工具，那就是 [gops](https://github.com/google/gops) （Go Process Status），gops 是由 Google 官方出品的一个命令行工具，与 ps 命令的功能类似，能够查看并诊断当前系统中 Go 程序的运行状态及内部情况，在一些使用场景中具有较大的存在意义，属于常用工具，因此在本章节中我们将对 gops 进行全面的使用和介绍。

## 基本使用

我们先创建一个示例项目，然后在项目根目录执行下述模块安装命令：

```shell
$ go get -u github.com/google/gops
```

写入如下启动代码：

```go
import (
	...
	"github.com/google/gops/agent"
)

func main() {
	// 创建并监听 gops agent，gops 命令会通过连接 agent 来读取进程信息
	// 若需要远程访问，可配置 agent.Options{Addr: "0.0.0.0:6060"}，否则默认仅允许本地访问
	if err := agent.Listen(agent.Options{}); err != nil {
		log.Fatalf("agent.Listen err: %v", err)
	}
	
	http.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`Go 语言编程之旅 `))
	})
	_ := http.ListenAndServe(":6060", http.DefaultServeMux)
}
```

在完成示例启动代码的写入后，我们启动该程序，并在命令行执行 `gops` 命令进行查看：

```shell
3739  3725  main  * go1.14   /private/var/folders/jm/.../b001/exe/main
3725  71093 go      go1.14   /usr/local/Cellar/go/1.14/libexec/bin/go
62357 46131 go      go1.14   /usr/local/Cellar/go/1.14/libexec/bin/go
3872  3742  gops    go1.14   /Users/eddycjy/go/bin/gops
62379 62357 main    go1.14   /private/var/folders/jm/.../b001/exe/main
...
```

在上述输出中，你很快就发现有一点不一样，那就是为什么某一行的输出结果中会包含一个 `*` 符号，如下：

```shell
3739  3725  main  * go1.14   /private/var/folders/jm/.../b001/exe/main
```

这实际上代表着该 Go 进程，包含了 `agent`，因此它可以启用更强大的诊断功能，包括当前堆栈跟踪，Go 版本，内存统计信息等等。

在最后也有一个 main 的 Go 进程，它不包含 `*` 符号，这意味着它是一个普通的 Go 程序，也就是没有植入 `agent`，只能使用最基本的功能。

## 常规命令

gops 工具包含了大量的分析命令，我们可以通过 `gops help` 进行查看：

```shell
$ gops help
gops is a tool to list and diagnose Go processes.

Usage:
  gops <cmd> <pid|addr> ...
  gops <pid> # displays process info
  gops help  # displays this help message

Commands:
  stack      Prints the stack trace.
  gc         Runs the garbage collector and blocks until successful.
  setgc	     Sets the garbage collection target percentage.
  memstats   Prints the allocation and garbage collection stats.
  version    Prints the Go version used to build the program.
  stats      Prints runtime stats.
  trace      Runs the runtime tracer for 5 secs and launches "go tool trace".
  pprof-heap Reads the heap profile and launches "go tool pprof".
  pprof-cpu  Reads the CPU profile and launches "go tool pprof".
```

在接下来的小节中，我们将针对几个常用的分析功能进行概要分析，你会发现里面相当多的功能在第六章就进行了介绍，具有一定的重合性。

### 查看指定进程信息

```shell
$ gops <pid>
parent PID:	3725
threads:	7
memory usage:	0.042%
cpu usage:	0.003%
username:	eddycjy
cmd+args:	/var/folders/jm/pk20jr_s74x49kqmyt87n2800000gn/T/go-build943691423/b001/exe/main
elapsed time:	10:56
local/remote:	127.0.0.1:59369 <-> :0 (LISTEN)
local/remote:	*:6060 <-> :0 (LISTEN)
```

获取 Go 进程的概要信息，包括父级 PID、线程数、内存/CPU 使用率、运行者的账户名、进程的启动命令行参数、启动后所经过的时间以及 gops 的 agent 监听信息（若无植入 agent，则没有这项信息）。

### 查看调用栈信息

```shell
$ gops stack 3739
goroutine 19 [running]:
runtime/pprof.writeGoroutineStacks(0x1385aa0, 0xc000132038, 0x30, 0xd0)
	...
	/Users/eddycjy/go/src/github.com/google/gops/agent/agent.go:185 +0x1af
github.com/google/gops/agent.listen()
	/Users/eddycjy/go/src/github.com/google/gops/agent/agent.go:133 +0x2bf
created by github.com/google/gops/agent.Listen
	/Users/eddycjy/go/src/github.com/google/gops/agent/agent.go:111 +0x36b

goroutine 1 [IO wait]:
internal/poll.runtime_pollWait(0x2f55e38, 0x72, 0x0)
	/usr/local/Cellar/go/1.14/libexec/src/runtime/netpoll.go:203 +0x55
	...
```

获取对应进程的代码调用堆栈信息，可用于分析调用链路。

### 查看内存使用情况

```shell
$ gops memstats 3739
alloc: 1.15MB (1205272 bytes)
total-alloc: 1.15MB (1205272 bytes)
sys: 69.45MB (72827136 bytes)
lookups: 0
mallocs: 644
frees: 12
heap-alloc: 1.15MB (1205272 bytes)
heap-sys: 63.66MB (66748416 bytes)
heap-idle: 62.05MB (65060864 bytes)
heap-in-use: 1.61MB (1687552 bytes)
heap-released: 62.02MB (65028096 bytes)
heap-objects: 632
...
```

获取 Go 在运行时的当前内存使用情况，主要是 [runtime.MemStats](https://golang.org/pkg/runtime/#MemStats) 的相关字段信息。

### 查看运行时信息

```shell
$ gops stats 3739
goroutines: 2
OS threads: 8
GOMAXPROCS: 4
num CPU: 4
```

获取 Go 运行时的基本信息，包括当前的 Goroutine 数量、系统线程、GOMAXPROCS 数值以及当前系统的 CPU 核数。

### 查看 trace 信息

```shell
$ gops trace 3739
Tracing now, will take 5 secs...
Trace dump saved to: /var/folders/jm/pk20jr_s74x49kqmyt87n2800000gn/T/trace092133110
Parsing trace...
Splitting trace...
Opening browser. Trace viewer is listening on http://127.0.0.1:53811
```

与 `go tool trace` 作用基本一致。

### 查看 profile 信息

```shell
$ gops pprof-cpu 3739
Profiling CPU now, will take 30 secs...
Profile dump saved to: /var/folders/jm/pk20jr_s74x49kqmyt87n2800000gn/T/profile563685966
Binary file saved to: /var/folders/jm/pk20jr_s74x49kqmyt87n2800000gn/T/binary265411413
File: binary265411413
Type: cpu
...
(pprof) 

$ gops pprof-heap 3739
Profile dump saved to: /var/folders/jm/pk20jr_s74x49kqmyt87n2800000gn/T/profile967076057
Binary file saved to: /var/folders/jm/pk20jr_s74x49kqmyt87n2800000gn/T/binary904879716
File: binary904879716
Type: inuse_space
...
(pprof) 
```

与 `go tool pprof` 作用基本一致。

## 你怎么知道我是谁

在学习了 gops 的使用后，我们突然发现一个问题，那就是 gops 是怎么知道哪些进程是与 Go 相关的进程，如果是植入了 `agent` 的应用程序还好说，可以理解为埋入了识别点。但实际情况是，没有植入 `agent` 的 Go 程序也被识别到了，说明 gops 本身并不是这么实现的，考虑植入 `agent` 应当只是用于诊断信息的拓展使用，并不是一个识别点，那么 gops 到底是怎么发现哪些进程是 Go 相关的呢？

我们回归问题的前置需求，假设我们想知道哪些进程与 Go 相关，那么第一步我们要先知道我们当前系统中都运行了哪些进程，这些记录在哪里有？

认真思考一下，答案也就呼之欲出了，假设是 Linux 相关的系统下，其会将进程所有的相关信息都按照约定的数据结构写入 `/proc` 目录下，因此我们有充分的怀疑认为 gops 就是从 `/proc` 目录下读取到相关信息的，源代码如下：

```go
func PidsWithContext(ctx context.Context) ([]int32, error) {
	var ret []int32

	d, err := os.Open(common.HostProc())
	if err != nil {
		return nil, err
	}
	defer d.Close()

	fnames, err := d.Readdirnames(-1)
	if err != nil {
		return nil, err
	}
	for _, fname := range fnames {
		pid, err := strconv.ParseInt(fname, 10, 32)
		if err != nil {
			continue
		}
		ret = append(ret, int32(pid))
	}

	return ret, nil
}

// common.HostProc
func HostProc(combineWith ...string) string {
	return GetEnv("HOST_PROC", "/proc", combineWith...)
}
```

在上述代码中，该方法通过调用 `os.Open` 方法打开了 `proc` 目录，并利用 `Readdirnames` 方法对该目录进行了扫描，最终获取到了所有需要 pid，最终完成其使命，返回了所有 pid。

在确定了 gops 是通过扫描 `/proc` 目录得到的进程信息后，我们又遇到了一个新的疑问点，那就是 gops 是怎么确定这个进程是 Go 进程，又怎么知道它的具体版本信息的呢，源代码如下：

```go
func isGo(pr ps.Process) (path, version string, agent, ok bool, err error) {
	...
	path, _ = pr.Path()
	if err != nil {
		return
	}
	var versionInfo goversion.Version
	versionInfo, err = goversion.ReadExe(path)
	if err != nil {
		return
	}
	ok = true
	version = versionInfo.Release
	pidfile, err := internal.PIDFile(pr.Pid())
	if err == nil {
		_, err := os.Stat(pidfile)
		agent = err == nil
	}
	return path, version, agent, ok, nil
}
```

我们可以看到该方法的主要作用是根据扫描 `/proc` 目录所得到的二进制文件地址中查找相关的标识，用于判断其是否 Go 程序，如果是 Go 程序，那么它将会返回该进程的 pid、二进制文件的名称以及二进制文件的完整存储路径，判断的标识如下：

```go
    if name == "runtime.main" || name == "main.main" {
        isGo = true
    }
    if name == "runtime.buildVersion" {
        isGo = true
    }
```

而关于所编译的 Go 语言的版本，Go 编译器会在二进制文件中打入 `runtime.buildVersion` 标识，这个标识能够我们快速识别它的编译信息，而 gops 也正正是利用了这一点。

我们可以利用 gdb 来进行查看 Go 所编译的二进制文件的版本信息，如下：

```shell
$ export GOFLAGS="-ldflags=-compressdwarf=false" && go build .

$ gdb awesomeProject 
...
(gdb) p 'runtime.buildVersion'
$1 = 0x131bbb0 "go1.14"
```

在上述输出中，我们先对示例项目进行了编译，然后利用 gdb 中查看了 `runtime.buildVersion` 变量，最终可得知编译这个 Go 程序的版本是 Go1.14。

但在编译时，有一点需要注意，就是我们在编译时指定了 `export GOFLAGS="-ldflags=-compressdwarf=false"` 参数，如果不进行指定的话，就会出现 `Reading symbols from awesomeProject...(no debugging symbols found)...done.` 的相关报错，将会影响部分功能使用。这是因为在 Go1.11 中，进行了调试信息的压缩，目的是为了减小所编译的二进制文件大小，但 Mac 上的 gdb 无法理解压缩的 DWARF，因此会产生问题，所以需要进行指定在调试时不进行 DWARF 的压缩，便于 Mac 上的 gdb 使用。

## 需要注意的一点

假设我们在一些特殊场景下希望对 Go 所编译的二进制文件进行压缩，那么在最后我们常常会使用到在第二章所用的 upx 工具来减少其整体大小，命令如下：

```shell
$ upx awesomeProject
```

这时候我们再重新运行所编译的 awesomeProject 文件，这时候需要思考的是，gops 能不能识别到它是一个 Go 程序呢？

答案是不行的，经过 upx 压缩后的二进制文件将无法被识别为 Go 程序，并且在我所使用的 gops v0.3.7 版本中，由于这类加壳进程的存在，执行 `gops` 命令直接出现了空指针调用的恐慌（panic），显然，这是一个 BUG，大家在实际环境中需要多加留意，如果要使用 gops 则尽量不要使用 upx 进行压缩。

## 小结

在本章节中，我们针对 Google 官方出品的 gops 进行了基本使用和原理性的部分剖析，如果你仔细研读了，就会发现其实 gops 几乎包含了第六章大部分工具的功能，是名副其实的进程诊断工具，集成了大量业界中常用的分析链，在排查问题上也会非常的方便，不需要一个个单独找特定工具在哪里，只需要使用 gops 即可，而更深层次的使用可以根据实际情况进行更一步的了解。