# 查看coredump:delve调试工具

coredump是一个包含程序意外终止时的内存快照的文件。它可以用于事后调试，以了解崩溃发生的原因以及其中涉及的变量。通过GOTRACEBACK，Go提供了一个环境变量来控制程序崩溃时产生的输出。这个变量可以强制生成coredump，便于调试。

让golang程序生成core文件:

1. `ulimit -c unlimited` 修改 core 文件的大小

2. 环境变量`export GOTRACEBACK=crash` 说明golang程序产生coredump

可以使用gdb对coredump进行查看，delve对golang的兼容更好

## 工具使用

### 1. 编译delve

```bash
git clone https://github.com/derekparker/delve.git
cd delve/cmd/dlv/
go build
```

### 2. 将 dlv 拷贝到线上有coredump的服务器。
分析coredump

```bash
./dlv core ./engine core.1871450_engine --check-go-version=false
```

### 3. 输入help可以查看Delve支持的命令

```bash
Type 'help' for list of commands.
(dlv) help
The following commands are available:

Running the program:
    call ------------------------ Resumes process, injecting a function call (EXPERIMENTAL!!!)
    continue (alias: c) --------- Run until breakpoint or program termination.
    next (alias: n) ------------- Step over to next source line.
    rebuild --------------------- Rebuild the target executable and restarts it. It does not work if the executable was not built by delve.
    restart (alias: r) ---------- Restart process.
    rev ------------------------- Reverses the execution of the target program for the command specified.
    rewind (alias: rw) ---------- Run backwards until breakpoint or program termination.
    step (alias: s) ------------- Single step through program.
    step-instruction (alias: si)  Single step a single cpu instruction.
    stepout (alias: so) --------- Step out of the current function.

Manipulating breakpoints:
    break (alias: b) ------- Sets a breakpoint.
    breakpoints (alias: bp)  Print out info for active breakpoints.
    clear ------------------ Deletes breakpoint.
    clearall --------------- Deletes multiple breakpoints.
    condition (alias: cond)  Set breakpoint condition.
    on --------------------- Executes a command when a breakpoint is hit.
    toggle ----------------- Toggles on or off a breakpoint.
    trace (alias: t) ------- Set tracepoint.
    watch ------------------ Set watchpoint.

Viewing program variables and memory:
    args ----------------- Print function arguments.
    display -------------- Print value of an expression every time the program stops.
    examinemem (alias: x)  Examine memory:
    locals --------------- Print local variables.
    print (alias: p) ----- Evaluate an expression.
    regs ----------------- Print contents of CPU registers.
    set ------------------ Changes the value of a variable.
    vars ----------------- Print package variables.
    whatis --------------- Prints type of an expression.

Listing and switching between threads and goroutines:
    goroutine (alias: gr) -- Shows or changes current goroutine
    goroutines (alias: grs)  List program goroutines.
    thread (alias: tr) ----- Switch to the specified thread.
    threads ---------------- Print out info for every traced thread.

Viewing the call stack and selecting frames:
    deferred --------- Executes command in the context of a deferred call.
    down ------------- Move the current frame down.
    frame ------------ Set the current frame, or execute command on a different frame.
    stack (alias: bt)  Print stack trace.
    up --------------- Move the current frame up.

Other commands:
    check (alias: checkpoint) ----------- Creates a checkpoint at the current position.
    checkpoints ------------------------- Print out info for existing checkpoints.
    clear-checkpoint (alias: clearcheck)  Deletes checkpoint.
    config ------------------------------ Changes configuration parameters.
    disassemble (alias: disass) --------- Disassembler.
    dump -------------------------------- Creates a core dump from the current process state
    edit (alias: ed) -------------------- Open where you are in $DELVE_EDITOR or $EDITOR
    exit (alias: quit | q) -------------- Exit the debugger.
    funcs ------------------------------- Print list of functions.
    help (alias: h) --------------------- Prints the help message.
    libraries --------------------------- List loaded dynamic libraries
    list (alias: ls | l) ---------------- Show source code.
    source ------------------------------ Executes a file containing a list of delve commands
    sources ----------------------------- Print list of source files.
    types ------------------------------- Print list of types
```

### 4. goroutine 显示或修改当前goroutine

```bash
(dlv) goroutine
Thread 1871459 at /usr/local/go/src/runtime/sys_linux_amd64.s:165
Goroutine 2072788:
        Runtime: /usr/local/go/src/runtime/sys_linux_amd64.s:165 runtime.raise (0x474461)
        User: /data/home/XXX/XXX/XXX.go:104 XXXXXX/XXX/XXX/XXX (0x14f454d)
        Go:/data/home/XXX/XXX/XXXXXXX/XXX/XXX/XXX@v0.0.0-xxx/xxx.go:281 XXXXXX/XXX/XXX/XXX (0xc9c9e7)
        Start: /data/home/XXX/XXX/XXXXXXX/XXX/XXX/XXX@v0.0.0-xxx/xxx.go:122 XXXXXX/XXX/XXX/XXX (0xc9be20)
```
可以看到core发生的位置

## 示例演示

让我们以以下程序为例：

```go
// FileName: main.go
package main

import "math/rand"

var sum int

func main() {
    for {
        n := rand.Intn(1e6)
        sum += n
        if sum%42 == 0 {
            panic(":(")
        }
    }
}
```

该程序很快崩溃：
```bash
panic: :(

goroutine 1 [running]:
main.main()
    /tmp/sandbox229541359/prog.go:11 +0x78

Program exited.
```

我们无法从栈trace中分辨出崩溃所涉及的值。增加日志或许是一种解决方案，但是我们并不总是知道在何处添加日志。当问题无法重现时，很难编写测试案例来确保问题被修复。我们可以在添加日志和运行程序之间进行迭代，直到它崩溃并查看到运行后可能的原因。

让我们再次使用`GOTRACEBACK=crash`运行它，即可生成Core文件，具体命令如下：

```bash
ulimit -c unlimited
export GOTRACEBACK=crash
go build -gcflags=all="-N -l" main.go   # 生成 main 文件
./main                                  # 生成 core 文件: core.18783
```

同目录输出 core 文件 `core.18783`。

- core dump 是通过 SIGABRT 信号触发。
- core dump 可以通过delve或者gdb。

由于我们现在已打印出所有`goroutine`，包括运行时，因此输出更加详细。执行如下命令查看Core信息：

```bash
dlv core ./main ./core.18783 --check-go-version=false
```

输出：
```bash
Input: dlv core ./main ./core.18783 --check-go-version=false
Type 'help' for list of commands.
(dlv) bt
 0  0x00000000004569c1 in runtime.raise
    at /home/work/.deck/1.0/go/1.19/src/runtime/sys_linux_amd64.s:159
 1  0x0000000000441905 in runtime.dieFromSignal
    at /home/work/.deck/1.0/go/1.19/src/runtime/signal_unix.go:870
 2  0x0000000000441e9e in runtime.sigfwdgo
    at /home/work/.deck/1.0/go/1.19/src/runtime/signal_unix.go:1086
 3  0x00000000004405e7 in runtime.sigtrampgo
    at /home/work/.deck/1.0/go/1.19/src/runtime/signal_unix.go:432
 4  0x0000000000456ca6 in runtime.sigtramp
    at /home/work/.deck/1.0/go/1.19/src/runtime/sys_linux_amd64.s:359
 5  0x0000000000456da0 in runtime.sigreturn
    at /home/work/.deck/1.0/go/1.19/src/runtime/sys_linux_amd64.s:473
 6  0x000000000042df89 in runtime.crash
    at /home/work/.deck/1.0/go/1.19/src/runtime/signal_unix.go:962
 7  0x000000000042df89 in runtime.fatalpanic
    at /home/work/.deck/1.0/go/1.19/src/runtime/panic.go:1170
 8  0x000000000042d65a in runtime.gopanic
    at /home/work/.deck/1.0/go/1.19/src/runtime/panic.go:987
 9  0x0000000000458f58 in main.main
    at ./main.go:11
10  0x00000000004302f2 in runtime.main
    at /home/work/.deck/1.0/go/1.19/src/runtime/proc.go:250
11  0x00000000004550c1 in runtime.goexit
    at /home/work/.deck/1.0/go/1.19/src/runtime/asm_amd64.s:1594
(dlv) 
```

dlv 命令bt打印栈trace并显示程序生成的panic恐慌。 然后，我们可以使用 `frame 9`命令访问第9帧：
```bash
(dlv) frame 9
> runtime.raise() /home/work/.deck/1.0/go/1.19/src/runtime/sys_linux_amd64.s:159 (PC: 0x45de41)
Warning: debugging optimized function
Frame 9: ./main.go:12 (PC: 460d05)
     7: func main() {
     8:         for {
     9:                 n := rand.Intn(1e6)
    10:                 sum += n
    11:                 if sum%42 == 0 {
=>  12:                         panic(":(")
    13:                 }
    14:         }
    15: }
(dlv)
```
最后，命令`locals`打印局部变量，以帮助了解崩溃所涉及的值：
```bash
(dlv) locals
n = 203300
(dlv) 
```
通道满了, 随机生成的数字为203,300。关于变量 `sum` ，可以使用打印包变量命令vars 打印:
```bash
(dlv) vars main
main.sum = 5705994
runtime.main_init_done = chan bool 0/0
runtime.mainStarted = true
(dlv) 
```

如果看不到局部变量n的值，请确保使用编译器标志 `-N` 和 `-l` 来构建二进制文件,它会禁用编译器优化，编译器优化可能会使调试更加困难。这是完整的命令：`go build -gcflags=all="-N -l"`。 另外，不要忘记运行`ulimit -c unlimited`，该选项 `-c` 定义core dump的最大大小。