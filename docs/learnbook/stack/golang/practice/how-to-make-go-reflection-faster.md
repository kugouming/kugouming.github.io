# 如何让 Go 反射变快


*最近读到一篇关于 Go 反射的文章，作者通过反射给结构体填充字段值的案例，充分利用 Go 的各种内在机理，逐步探讨让代码运行得更快的姿势。*

*文章（原文地址：[https://philpearl.github.io/post/aintnecessarilyslow/](https://philpearl.github.io/post/aintnecessarilyslow/)）非常有学习价值，故翻译整理了下来。*

不要使用反射，除非你真的需要。但是当你不使用反射时，不要认为这是因为反射很慢，它也可以很快。

反射允许你在运行时获得有关 Go 类型的信息。如果你曾经愚蠢地尝试编写 `json.Unmarshal` 之类的新版本，本文将探讨的就是如何使用反射来填充结构体值。

## 切入点案例

我们以一个简单的案例为切入点，定义一个结构体 `SimpleStruct`，它包括两个 int 类型字段 `A` 和 `B`。

```go
type SimpleStruct struct {
    A int
    B int
}
```

假如我们接收到了 JSON 数据 {"B": 42}，想要对其进行解析并且将字段 B 设置为 42。

在下文，我们将编写一些函数来实现这一点，它们都会将 B 设置为 42。

如果我们的代码只适用于 SimpleStruct，这完全是不值一提的。

```go
func populateStruct(in *SimpleStruct) {
    in.B = 42
}
```

## 反射基本版

但是，如果我们是要做一个 JSON 解析器，这意味着我们并不能提前知道结构类型。我们的解析器代码需要接收任何类型的数据。

在 Go 中，这通常意味着需要采用 interface{} （空接口）参数。然后我们可以使用 reflect 包检查通过空接口参数传入的值，检查它是否是指向结构体的指针，找到字段 B 并用我们的值填充它。

代码将如下所示。

```go
func populateStructReflect(in interface{}) error {
    val := reflect.ValueOf(in)
    if val.Type().Kind() != reflect.Ptr {
        return fmt.Errorf("you must pass in a pointer")
    }

    elmv := val.Elem()
    if elmv.Type().Kind() != reflect.Struct {
        return fmt.Errorf("you must pass in a pointer to a struct")
    }

    fval := elmv.FieldByName("B")
    fval.SetInt(42)

    return nil
}
```

让我们通过基准测试看看它有多快。

```go
func BenchmarkPopulateReflect(b *testing.B) {
    b.ReportAllocs()
    var m SimpleStruct
    for i := 0; i < b.N; i++ {
        if err := populateStructReflect(&m); err != nil {
            b.Fatal(err)
        }
        
        if m.B != 42 {
            b.Fatalf("unexpected value %d for B", m.B)
        }
    }
}
```

结果如下。

```bash
BenchmarkPopulateReflect-16   15941916    68.3 ns/op  8 B/op     1 allocs/op
```
这是好还是坏？好吧，内存分配可从来不是好事。你可能想知道为什么需要在堆上分配内存来将结构体字段设置为 42（可以看这个 issue：https://github.com/golang/go/issues/2320）。但总体而言，68ns 的时间并不长。在通过网络发出任何类型的请求时间中，你可以容纳很多 68ns。

## 优化一：加入缓存策略

我们能做得更好吗？好吧，通常我们运行的程序不会只做一件事然后停止。他们通常一遍又一遍地做着非常相似的事情。因此，我们可以设置一些东西以使重复的事情速度变快吗？

如果仔细查看我们正在执行的反射检查，我们会发现它们都取决于传入值的类型。如果我们将类型结果缓存起来，那么对于每种类型而言，我们只会进行一次检查。

我们再来考虑内存分配的问题。之前我们调用 `Value.FieldByName` 方法，实际是 `Value.FieldByName` 调用 `Type.FieldByName`，其调用 `structType.FieldByName`，最后调用 `structType.Field` 来引起内存分配的。我们可以在类型上调用 `FieldByName` 并缓存一些东西来获取 `B` 字段的值吗？实际上，如果我们缓存 `Field.Index`，就可以使用它来获取字段值而无需分配。

新代码版本如下

```go
var cache = make(map[reflect.Type][]int)

func populateStructReflectCache(in interface{}) error {
    typ := reflect.TypeOf(in)

    index, ok := cache[typ]
    if !ok {
        if typ.Kind() != reflect.Ptr {
            return fmt.Errorf("you must pass in a pointer")
        }

        if typ.Elem().Kind() != reflect.Struct {
            return fmt.Errorf("you must pass in a pointer to a struct")
        }

        f, ok := typ.Elem().FieldByName("B")
        if !ok {
            return fmt.Errorf("struct does not have field B")
        }

        index = f.Index
        cache[typ] = index
    }

    val := reflect.ValueOf(in)
    elmv := val.Elem()

    fval := elmv.FieldByIndex(index)
    fval.SetInt(42)

    return nil
}
```

因为没有任何内存分配，新的基准测试变得更快。

```bash
BenchmarkPopulateReflectCache-16  35881779    30.9 ns/op   0 B/op   0 allocs/op
```

## 优化二：利用字段偏移量

我们能做得更好吗？好吧，如果我们知道结构体字段 B 的偏移量并且知道它是 int 类型，就可以将其直接写入内存。我们可以从接口中恢复指向结构体的指针，因为空接口实际上是具有两个指针的结构的语法糖：第一个指向有关类型的信息，第二个指向值。

```go
type eface struct {
    _type *_type
    data  unsafe.Pointer
}
```

我们可以使用结构体中字段偏移量来直接寻址该值的字段 B。

新代码如下。

```go
var unsafeCache = make(map[reflect.Type]uintptr)

type intface struct {
    typ   unsafe.Pointer
    value unsafe.Pointer
}

func populateStructUnsafe(in interface{}) error {
    typ := reflect.TypeOf(in)

    offset, ok := unsafeCache[typ]
    if !ok {
        if typ.Kind() != reflect.Ptr {
            return fmt.Errorf("you must pass in a pointer")
        }

        if typ.Elem().Kind() != reflect.Struct {
            return fmt.Errorf("you must pass in a pointer to a struct")
        }
        
        f, ok := typ.Elem().FieldByName("B")
        if !ok {
            return fmt.Errorf("struct does not have field B")
        }

        if f.Type.Kind() != reflect.Int {
            return fmt.Errorf("field B should be an int")
        }

        offset = f.Offset
        unsafeCache[typ] = offset
    }

    structPtr := (*intface)(unsafe.Pointer(&in)).value
    *(*int)(unsafe.Pointer(uintptr(structPtr) + offset)) = 42

    return nil
}

```
新的基准测试表明这将更快。

```bash
BenchmarkPopulateUnsafe-16  62726018    19.5 ns/op     0 B/op     0 allocs/op
```

## 优化三：更改缓存 key 类型

还能让它走得更快吗？如果我们对 CPU 进行采样，将会看到大部分时间都用于访问 map，它还会显示 map 访问在调用 `runtime.interhash` 和 `runtime.interequal`。这些是用于 hash 接口并检查它们是否相等的函数。也许使用更简单的 key 会加快速度？我们可以使用来自接口的类型信息的地址，而不是 `reflect.Type` 本身。

```go
var unsafeCache2 = make(map[uintptr]uintptr)

func populateStructUnsafe2(in interface{}) error {
    inf := (*intface)(unsafe.Pointer(&in))

    offset, ok := unsafeCache2[uintptr(inf.typ)]
    if !ok {
        typ := reflect.TypeOf(in)
        if typ.Kind() != reflect.Ptr {
            return fmt.Errorf("you must pass in a pointer")
        }

        if typ.Elem().Kind() != reflect.Struct {
            return fmt.Errorf("you must pass in a pointer to a struct")
        }

        f, ok := typ.Elem().FieldByName("B")
        if !ok {
            return fmt.Errorf("struct does not have field B")
        }

        if f.Type.Kind() != reflect.Int {
            return fmt.Errorf("field B should be an int")
        }

        offset = f.Offset
        unsafeCache2[uintptr(inf.typ)] = offset
    }

    *(*int)(unsafe.Pointer(uintptr(inf.value) + offset)) = 42

    return nil
}
```

这是新版本的基准测试结果，它又快了很多。

```bash
BenchmarkPopulateUnsafe2-16  230836136    5.16 ns/op    0 B/op     0 allocs/op
```

## 优化四：引入描述符

还能更快吗？通常如果我们要将数据 unmarshaling 到结构体中，它总是相同的结构。因此，我们可以将功能一分为二，其中一个函数用于检查结构是否符合要求并返回一个描述符，另外一个函数则可以在之后的填充调用中使用该描述符。

以下是我们的新代码版本。调用者应该在初始化时调用`describeType`函数以获得一个`typeDescriptor`，之后调用`populateStructUnsafe3`函数时会用到它。在这个非常简单的例子中，`typeDescriptor`只是结构体中`B`字段的偏移量。

```go
type typeDescriptor uintptr

func describeType(in interface{}) (typeDescriptor, error) {
    typ := reflect.TypeOf(in)
    if typ.Kind() != reflect.Ptr {
        return 0, fmt.Errorf("you must pass in a pointer")
    }

    if typ.Elem().Kind() != reflect.Struct {
        return 0, fmt.Errorf("you must pass in a pointer to a struct")
    }

    f, ok := typ.Elem().FieldByName("B")
    if !ok {
        return 0, fmt.Errorf("struct does not have field B")
    }

    if f.Type.Kind() != reflect.Int {
        return 0, fmt.Errorf("field B should be an int")
    }

    return typeDescriptor(f.Offset), nil
}

func populateStructUnsafe3(in interface{}, ti typeDescriptor) error {
    structPtr := (*intface)(unsafe.Pointer(&in)).value
    *(*int)(unsafe.Pointer(uintptr(structPtr) + uintptr(ti))) = 42
    return nil
}
```

以下是如何使用`describeType`调用的新基准测试。

```go
func BenchmarkPopulateUnsafe3(b *testing.B) {
    b.ReportAllocs()
    var m SimpleStruct

    descriptor, err := describeType((*SimpleStruct)(nil))
    if err != nil {
        b.Fatal(err)
    }

    for i := 0; i < b.N; i++ {
        if err := populateStructUnsafe3(&m, descriptor); err != nil {
            b.Fatal(err)
        }

        if m.B != 42 {
            b.Fatalf("unexpected value %d for B", m.B)
        }
    }
}
```

现在基准测试结果变得相当快。

```bash
BenchmarkPopulateUnsafe3-16  1000000000     0.359 ns/op    0 B/op   0 allocs/op
```

这有多棒？如果我们以文章开头原始的 `populateStruct` 函数编写基准测试，可以看到在不使用反射的情况下，填充这个结构体的速度有多快。

```bash
BenchmarkPopulate-16        1000000000      0.234 ns/op    0 B/op   0 allocs/op
```

不出所料，这甚至比我们最好的基于反射的版本还要快一点，但它也没有快太多。

## 总结

反射并不一定很慢，但是你必须付出相当大的努力，通过运用 Go 内部机理知识，在你的代码中随意撒上不安全的味道 ，以使其真正加速。

最后，如果你对这种方法的实际使用感兴趣，可以参考 jsoniter 库：https://github.com/json-iterator/go，它使用 reflect2 库：https://github.com/modern-go/reflect2 来实现了非常相似的方法。

## 参考

1. [原文](https://philpearl.github.io/post/aintnecessarilyslow/)
2. [jsoniter 库](https://github.com/json-iterator/go)
3. [reflect2 库](https://github.com/modern-go/reflect2)