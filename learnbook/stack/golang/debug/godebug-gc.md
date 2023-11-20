# 用 GODEBUG 看 GC

## GC 的基础知识

### 什么是 GC

在计算机科学中，垃圾回收（**GC**，全称**Garbage Collection**）是一种自动管理内存的机制，垃圾回收器会去尝试回收程序不再使用的对象及其占用的内存。而最早 John McCarthy 在 1959 年左右发明了垃圾回收，以简化 Lisp 中的手动内存管理的机制。

### 为什么要 GC

手动管理内存挺麻烦，管错或者管漏内存也很糟糕，将会直接导致程序不稳定（持续泄露）甚至直接崩溃。

### GC 带来的问题

硬要说会带来什么问题的话，也就数大家最关注的 Stop The World（**STW**），**STW 代指在执行某个垃圾回收算法的某个阶段时，需要将整个应用程序暂停去处理 GC 相关的工作事项**。例如：

|行为|会不会 STW|为什么|
|---|---|---|
|标记开始|会|在准备开始标记时，需要对根对象进行扫描，此时会打开写屏障（Write Barrier） 和 辅助 GC（mutator assist），为标记做准备工作。|
|并发标记中|不会|标记阶段，主要目的是标记堆内存中仍在使用的值。|
|标记结束|会|在完成标记任务后，将重新扫描部分根对象，这时候会禁用写屏障（Write Barrier）和辅助 GC（mutator assist），而标记阶段和应用程序是并发运行的，所以在标记阶段可能会有新的对象产生，因此在重新扫描时需要进行 STW。|

### Go 目前的 GC 情况

虽然 GC 会带来 STW，但是 Go 语言经过多个版本的优化和调整，目前 STW 时间已经在绝大部分场景下缩减为毫秒级，并且在每个新发布的 Go 版本中也持续不断在进行优化，在常规情况下已经不需要太过多的担忧。

同时在 Go1.5 起 Go Runtime 就已经从 C 和少量汇编，改为由 Go 和少量汇编实现，也就是基本实现 Go 自举，因此你感兴趣的话也可以去看看这块相关的运行时源码，由于本节不是重点介绍 GC，因此并不会具体的铺开来讲。

### 如何调整 Go GC 频率

可以通过设置 GOGC 变量来调整初始垃圾收集器的目标百分比值，其对比的规则为当新分配的数值与上一次收集后剩余的实时数值的比例达到设置的目标百分比时，就会触发 GC。而 GOGC 的默认值为 GOGC=100，如果将其设置为 GOGC=off 可以完全禁用垃圾回收器。

GOGC 值的大小，与 GC 行为之间又有什么关系呢，简单来讲，GOGC 的值设置的越大，GC 的频率越低，但每次 GC 所触发到的堆内存也会更大。

而在程序运行时，我们可以通过调用下述方法来动态调整 GOGC 的值：

```go
// runtime/debug
debug.SetGCPercent
```

### 主动触发 GC

在 Go 语言中，与 GC 相关的 API 极少，如果我们想要主动的触发 GC 行为，我们可以通过调用 `runtime.GC` 方法来达到这个目的。而相配套的内存相关的归还，我们也可以通过手动调用 `debug.FreeOSMemory` 方法来触发将内存归还给操作系统的行为。

## GODEBUG

在 Go 语言中，GODEBUG 变量可以控制运行时内的调试变量，参数以逗号分隔，格式为：`name=val`。

本文着重点在 GODEBUG 的 GC 的观察上，因此主要涉及 gctrace 参数，我们可以通过设置 `gctrace=1` 后使得垃圾收集器向标准错误流发出 GC 运行信息，以此来观察程序的 GC 运行情况。

### 示例代码

创建一个 main.go 文件，写入示例代码，如下：

```go
func main() {
    wg := sync.WaitGroup{}
    wg.Add(10)
    for i := 0; i < 10; i++ {
        go func(wg *sync.WaitGroup) {
            var counter int
            for i := 0; i < 1e10; i++ {
                counter++
            }
            wg.Done()
        }(&wg)
    }

    wg.Wait()
}
```

### gctrace

接下来我们在命令行设置 `GODEBUG=gctrace=1` 来运行 main.go 文件，为了便于展示和说明，我把 gctrace 的输出结果拆为了两个部分，分别是 GC 和 Scavenging 相关的调试信息。

#### 垃圾回收（GC）信息

```shell
$ GODEBUG=gctrace=1 go run main.go    
gc 1 @0.032s 0%: 0.019+0.45+0.003 ms clock, 0.076+0.22/0.40/0.80+0.012 ms cpu, 4->4->0 MB, 5 MB goal, 4 P
gc 2 @0.046s 0%: 0.004+0.40+0.008 ms clock, 0.017+0.32/0.25/0.81+0.034 ms cpu, 4->4->0 MB, 5 MB goal, 4 P
gc 3 @0.063s 0%: 0.004+0.40+0.008 ms clock, 0.018+0.056/0.32/0.64+0.033 ms cpu, 4->4->0 MB, 5 MB goal, 4 P
gc 4 @0.080s 0%: 0.004+0.45+0.016 ms clock, 0.018+0.15/0.34/0.77+0.065 ms cpu, 4->4->1 MB, 5 MB goal, 4 P
...
```

我们看到其输出内容在关键字上都是类似的，其模板内容如下：

```shell
gc # @#s #%: #+#+# ms clock, #+#/#/#+# ms cpu, #->#-># MB, # MB goal, # P
```

- `gc#`：GC 执行次数的编号，每次叠加。
- `@#s`：自程序启动后到当前的具体秒数。
- `#%`：自程序启动以来在 GC 中花费的时间百分比。
- `#+...+#`：GC 的标记工作共使用的 CPU 时间占总 CPU 时间的百分比。
- `#->#-># MB`：分别表示 GC 启动时, GC 结束时, GC 活动时的堆大小.
- `#MB goal`：下一次触发 GC 的内存占用阈值。
- `#P`：当前使用的处理器 P 的数量。

#### 清除（Scavenging）信息

```shell
$ GODEBUG=gctrace=1 go run main.go    
...
scvg: 0 MB released
scvg: inuse: 3, idle: 60, sys: 63, released: 59, consumed: 4 (MB)
scvg: inuse: 1, idle: 61, sys: 63, released: 59, consumed: 4 (MB)
scvg: inuse: 2, idle: 61, sys: 63, released: 59, consumed: 3 (MB)
scvg: inuse: 2, idle: 61, sys: 63, released: 59, consumed: 3 (MB)
```

你可以看到上述输出内容一共分为两个部分，一个是摘要信息，另外一个是清除的调试信息。首先我们看到摘要信息的模板内容如下，如下：

```shell
scvg#: # MB released
```

该输出语句为 GC 将内存回收并释放到系统时所发出摘要信息，因此是在每一次 GC 释放都会输出该类信息。接下来我们看看清除信息的模板内容，如下：

```shell
scvg#: inuse: # idle: # sys: # released: # consumed: # (MB)
```

- `scvg#` ：Scavenging 执行次数的编号，每次在清除时递增。
- `inuse: #`：正在占用的内存大小，单位均为 MB。
- `idle: #` ：等待被清理的内存大小。
- `sys: #`：从系统映射的内存大小。
- `released: #`：已经释放的系统内存大小。
- `consumed: #`：已经从系统所申请分配的内存大小。

## 案例

我们抽取其中一个实际输出的 GC 调试信息来进行分析和说明（与案例的输出数值不一样，是正常的），如下：

```shell
gc 7 @0.140s 1%: 0.031+2.0+0.042 ms clock, 0.12+0.43/1.8/0.049+0.17 ms cpu, 4->4->1 MB, 5 MB goal, 4 P
```

- gc 7：第 7 次 GC。
- @0.140s：当前是程序启动后的 0.140s。
- 1%：程序启动后到现在共花费 1% 的时间在 GC 上。
- 0.031+2.0+0.042 ms clock：
    - 0.031：表示单个 P 在 mark 阶段的 STW 时间。
    - 2.0：表示所有 P 的 mark concurrent（并发标记）所使用的时间。
    - 0.042：表示单个 P 的 markTermination 阶段的 STW 时间。
- 0.12+0.43/1.8/0.049+0.17 ms cpu：
    - 0.12：表示整个进程在 mark 阶段 STW 停顿的时间。
    - 0.43/1.8/0.049：0.43 表示 mutator assist 占用的时间，1.8 表示 dedicated + fractional 占用的时间，0.049 表示 idle 占用的时间。
    - 0.17ms：0.17 表示整个进程在 markTermination 阶段 STW 时间。
- 4->4->1 MB：
    - 4：表示开始 mark 阶段前的 heap_live 大小。
    - 4：表示开始 markTermination 阶段前的 heap_live 大小。
    - 1：表示被标记对象的大小。
- 5 MB goal：表示下一次触发 GC 回收的阈值是 5 MB。
- 4 P：本次 GC 一共涉及多少个 P。

## 涉及术语

- mark：标记阶段。
- markTermination：标记结束阶段。
- mutator assist：辅助 GC，是指在 GC 过程中 mutator 线程会并发运行，而 mutator assist 机制会协助 GC 做一部分的工作。
- heap_live：在 Go 的内存管理中，span 是内存页的基本单元，每页大小为 8kb，同时 Go 会根据对象的大小不同而分配不同页数的 span，而 heap_live 就代表着所有 span 的总大小。
- dedicated / fractional / idle：在标记阶段会分为三种不同的 mark worker 模式，分别是 dedicated、fractional 和 idle，它们代表着不同的专注程度，其中 dedicated 模式最专注，是完整的 GC 回收行为，fractional 只会干部分的 GC 行为，idle 最轻松。这里你只需要了解它是不同专注程度的 mark worker 就好了，详细介绍我们可以等后续的文章。

## 小结

通过本章节我们掌握了使用 GODEBUG 查看应用程序垃圾回收（GC）和清除（Scavenging）信息运行情况的方法，只要用这种方法我们就可以观测不同情况下 GC、Scavenging 的情况了，甚至可以做出非常直观的对比图，在排查 GC 问题的时候会非常有帮助，不需要瞎猜。