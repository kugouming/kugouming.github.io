# 使用Gopher-lua遇到的疑难杂症与优化

## 为何在Go项目中引入Lua

我目前在进行一个养成战斗类游戏的服务端开发工作，服务端采用Go开发，而客户端是Unity3d（c#）。在开发过程中经常会遇到和与客户端同学产生重复性工作。

就比如需要计算一个角色的战斗力数值时，由于玩家角色的等级、职业、皮肤、宠物、装备、技能、Buff、阵型等数据都会影响角色战斗力数值，所以其中就会涉及到大量的数据和计算。我们很难保证客户端和服务端分别实现的算法最后计算出来的战力数值是一致的。

况且，策划的需求也是变幻莫测，经常会改需求或着改个公式。这时候就需要两端同时进行战力算法进行修改，结果往往是一顿修改后，两端的计算结果又不一致了，问题排查起来着实头大。

## 解决代码复用问题

为了解决代码复用问题，我们决定复用一套算法代码，这样不仅能保证计算绝对一致，还能降低算法维护成本，于是LUA就开始派上用场啦~

经过了解发现， 在Golang生态中，如果你想与Lua进行通信调用，那么通常会推荐这两个库，[gopher-lua](https://github.com/yuin/gopher-lua)和[go-lua](https://github.com/Shopify/go-lua)，而根据社区和`issues`的反馈情况来看，[gopher-lua](https://github.com/yuin/gopher-lua)无疑是最佳的选择，所以本文只讨论[gopher-lua](https://github.com/yuin/gopher-lua)的使用过程中遇到的一些问题。

## Gopher-lua的性能

其实gopher-lua官方已经给出了一份压测报告[https://github.com/yuin/gopher-lua/wiki/Benchmarks](https://github.com/yuin/gopher-lua/wiki/Benchmarks)

我这儿直接贴一下官方给的压测结果：

![](../../statics/images/stack/golang/difficulties-and-optimization-encountered-in-using-gopher-lua_files/1.jpg)

从压测结果来看，通过go实现的lua虚拟机性能的确没有c实现的高，但也不算很慢。而且在后面的工作中，我也没有发现`gopher-lua`存在很严重的性能瓶颈。

## 如何使用Gopher-lua

鉴于篇幅有限，而且[gopher-lua文档](https://github.com/yuin/gopher-lua)写的已经很详细啦，本文就不在这儿复述它的具体使用方法啦。下面我着重讲一下我在整个接入lua的过程中遇到的问题和一些优化方案。

## 使用Gopher-lua必须注意哪些问题

### 禁止在Lua的table中使用大数字索引

起初，我在使用`GopherLua`时，只启动了一个Lua虚拟机就占用了大量内存，而且程序执行时间极其的慢。最后查阅了Lua脚本发现是由于大数字索引导致的。 对于`GopherLua`来说，当索引为数字时，表的行为类似于数组；当索引为字符串时，表的行为类似于Map。 所以如果我们在lua里面定义了`test[10000000] = {}`，在Golang里就会被解释为`test := make([]int, 10000000)`

issues也有相关问题的具体讨论：[https://github.com/yuin/gopher-lua/issues/117](https://github.com/yuin/gopher-lua/issues/117)

**在使用`GopherLua`的时候，绝对禁止在Lua的table中使用大数字索引，我们可以用字符串索引替换**

### 虚拟机池（优化建议）

`Gopher-lua`不是并发安全的，在官方文档里也有相关介绍。 但由于`Gopher-lua`启动的虚拟机是足够轻量的，我们可以在一个协程中启动一个lua虚拟机，以我自己的使用情况来看，一台4核8G的服务器至少也能启动3k个lua虚拟机，这是绝对够用的。

官方也给出了虚拟机池的示例，实现比较简单，一看就懂

```go
type lStatePool struct {
    m     sync.Mutex
    saved []*lua.LState
}

func (pl *lStatePool) Get() *lua.LState {
    pl.m.Lock()
    defer pl.m.Unlock()
    n := len(pl.saved)
    if n == 0 {
        return pl.New()
    }
    x := pl.saved[n-1]
    pl.saved = pl.saved[0 : n-1]
    return x
}

func (pl *lStatePool) New() *lua.LState {
    L := lua.NewState()
    // setting the L up here.
    // load scripts, set global variables, share channels, etc...
    return L
}

func (pl *lStatePool) Put(L *lua.LState) {
    pl.m.Lock()
    defer pl.m.Unlock()
    pl.saved = append(pl.saved, L)
}

func (pl *lStatePool) Shutdown() {
    for _, L := range pl.saved {
        L.Close()
    }
}

// Global LState pool
var luaPool = &lStatePool{
    saved: make([]*lua.LState, 0, 4),
}
```

从虚拟机池中获取一个虚拟机，使用完后通过`luaPool.Put(L)`放回池子

```go
func MyWorker() {
   L := luaPool.Get()
   defer luaPool.Put(L)
   /* your code here */
}

func main() {
    defer luaPool.Shutdown()
    go MyWorker()
    go MyWorker()
    /* etc... */
}
```

### 复用Lua环境中的配置数据（优化建议）

由于一个Go服务会启动大量的lua虚拟机，每个Lua虚拟机就相当于一个独立Lua执行环境；在Lua虚拟机第一启动时，我们通常会加载大量的游戏配置文件（json）并解析存储在Lua全局变量中。

这个时候，如果我们每个虚拟机都去加载一遍配置文件，那是极其低效的，而且内存也会扛不住。

为了解决这个问题，我们可以将**lua里面的配置做单例处理**。

具体流程就是，当我启动第一个lua虚拟机并加载完配置的时候，我们在lua脚本中调用golang的自定义方法，将lua的配置存储到Go中；那么当启动第二个虚拟时，lua会先调用golang里面的自定义方法查看之前配置有没有再Go中存过，如果存过了，直接把go里面存的配置取出来直接用，而不需要再走一遍配置的加载和解析了。

### 提前编译（优化建议）

`Gopher-lua`支持将lua脚本预编译加载的。在同份 Lua 代码将被执行多次（如在 http server 中，每次请求将执行相同 Lua 代码）的场景下，如果我们能够对代码进行提前编译，那么应该能够减少 parse 和 compile 的开销。根据 Benchmark 结果，提前编译确实能够减少不必要的开销

```go
// CompileLua reads the passed lua file from disk and compiles it.
func CompileLua(filePath string) (*lua.FunctionProto, error) {
    file, err := os.Open(filePath)
    defer file.Close()
    if err != nil {
        return nil, err
    }
    reader := bufio.NewReader(file)
    chunk, err := parse.Parse(reader, filePath)
    if err != nil {
        return nil, err
    }
    proto, err := lua.Compile(chunk, filePath)
    if err != nil {
        return nil, err
    }
    return proto, nil
}

// DoCompiledFile takes a FunctionProto, as returned by CompileLua, and runs it in the LState. It is equivalent
// to calling DoFile on the LState with the original source file.
func DoCompiledFile(L *lua.LState, proto *lua.FunctionProto) error {
    lfunc := L.NewFunctionFromProto(proto)
    L.Push(lfunc)
    return L.PCall(0, lua.MultRet, nil)
}

// Example shows how to share the compiled byte code from a lua script between multiple VMs.
func Example() {
    codeToShare := CompileLua("mylua.lua")
    a := lua.NewState()
    b := lua.NewState()
    c := lua.NewState()
    DoCompiledFile(a, codeToShare)
    DoCompiledFile(b, codeToShare)
    DoCompiledFile(c, codeToShare)
}
```

## Lua脚本路径问题

通过会存在`require`的包找不到的问题，这就需要我们在lua脚本中设置`package.path`

在golang中定义`GetLuaPath()`方法，并设置到lua虚拟机中

```go
func GetLuaPath(L *lua.LState) int {
    // 绝对路径
	L.Push(lua.LString(tconfig.ProjectDir + "/scripts/lua"))
	return 1
}

// 给虚拟机添加GetLuaPath方法
L.SetGlobal("GetLuaPath", L.NewFunction(GetLuaPath))
```

在lua脚本中添加`package.path`

```lua
package.path = package.path .. [[;]] .. GetLuaPath() .. [[/?.lua;]]
```

### 应该使用userdata还是table通信

`userdata`类型的数据对于lua来说是一种未知结构的，所以在lua中想解析go传递过来的`userdata`数据相当费劲，必须在go中提前定义一堆对`userdata`解析方法，然后在lua通过调用go方法来读取`userdata`。可谓是相当费劲，所以我强烈建议传递自定义的`table`给lua，而不是传递一个`userdata`。

在go里面自定义`table`数据的话，主要用到下面几个方法

```go
t := L.NewTable()
t2 := L.NewTable()
t.RawSetString("key", lua.LNumber(111)) 
t.RawSetInt(2, lua.LNumber(222))
t.RawSetInt(4, t2) // 模拟map
t.Append()  // 模拟数组
```

下面是我项目中的一个简单的示例：

```go
func getOtherFormation(L *lua.LState, otherFormation []*tfprotos.OtherFormation) lua.LValue {
	// 构建LUA table
	res := L.NewTable()
	for _, v := range otherFormation {

		petInfoT := L.NewTable()
		petInfoT.RawSetString("uuid", lua.LNumber(v.PetInfo.Uuid))
		petInfoT.RawSetString("configId", lua.LNumber(v.PetInfo.ConfigId))
		petInfoT.RawSetString("star", lua.LNumber(v.PetInfo.Star))
		petInfoT.RawSetString("rank", lua.LNumber(v.PetInfo.Rank))
		petInfoT.RawSetString("level", lua.LNumber(v.PetInfo.Level))
		skillsT := L.NewTable()
		for _, v2 := range v.PetInfo.Skills {
			skillsItemT := L.NewTable()
			skillsItemT.RawSetString("type", lua.LNumber(v2.Type))
			skillsItemT.RawSetString("SkillPosition", lua.LNumber(v2.SkillPosition))
			skillsItemT.RawSetString("level", lua.LNumber(v2.Level))

			skillsT.Append(skillsItemT)
		}
		petInfoT.RawSetString("skills", skillsT)

		itemT := L.NewTable()
		itemT.RawSetString("Index", lua.LNumber(v.Index))
		itemT.RawSetString("petInfo", petInfoT)

		res.Append(itemT)
	}
	return res
}
```

### 推荐两个很棒的Gopher-lua插件
- [layeh/gopher-luar](https://github.com/layeh/gopher-luar)：简化往返gopher-lua的数据传递（貌似只能传递userdata数据，所以我没有在项目中使用）
- [yuin/gluamapper](https://github.com/yuin/gluamapper)：将Lua表映射到Go结构（推荐使用）
- [大数字索引优化](https://github.com/edolphin-ydf/gopher-lua/commit/61d66d8c518205ce429a34319d592974ccff5afe)