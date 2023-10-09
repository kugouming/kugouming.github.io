# Go sync.Map 实现

Go基于CSP模型，提倡”Share memory by communicating; don’t communicate by sharing memory.”，亦即通过channel来实现goroutine之间的数据共享，但很多时候用锁仍然是不可避免的，它可以让流程更直观明了，并且减少内存占用等。通常我们的实践是用channel传递数据的所有权，分配工作和同步异步结果等，而用锁来共享状态和配置等信息。

本文从偏实现的角度学习下Go的atomic.Load/Store，atomic.Value，以及sync.Map。

## 1. atomic.Load/Store

在Go中，对于一个字以内的简单类型(如整数，指针)，可以直接通过`atomic.Load/Store/Add/Swap/CompareAndSwap`系列API来进行原子读写，以Int32为例:

```go
// AddInt32 atomically adds delta to *addr and returns the new value.
func AddInt32(addr *int32, delta int32) (new int32)
// LoadInt32 atomically loads *addr.
func LoadInt32(addr *int32) (val int32)
// StoreInt32 atomically stores val into *addr.
func StoreInt32(addr *int32, val int32)
// SwapInt32 atomically stores new into *addr and returns the previous *addr value.
func SwapInt32(addr *int32, new int32) (old int32)
// CompareAndSwapInt32 executes the compare-and-swap operation for an int32 value.
func CompareAndSwapInt32(addr *int32, old, new int32) (swapped bool)
```

一个有意思的问题，在64位平台下，对Int32，Int64的直接读写是原子的吗？以下是一些有意思的讨论:

- http://preshing.com/20130618/atomic-vs-non-atomic-operations/
- https://stackoverflow.com/questions/46556857/is-golang-atomic-loaduint32-necessary
- https://stackoverflow.com/questions/5258627/atomic-64-bit-writes-with-gcc

总结就是，现代硬件架构基本都保证了内存对齐的word-sized load和store是原子的，这隐含两个条件: 单条MOV, MOVQ等指令是原子的，字段内存对齐(CPU对内存的读取是基于word-size的)。但安全起见，最好还是使用atomic提供的接口，具备更好的跨平台性，并且atomic还提供了一些复合操作(Add/Swap/CAS)。golang也在实现上会对具体平台进行优化：

```go
var i int64
atomic.StoreInt64(&i, 123)
x := atomic.LoadInt64(&i)
y := atomic.AddInt64(&i, 1)
```

在MacOS10.12(X86_64)下，对应汇编代码:

```go
// var i int64
tmp.go:9        0x1093bff       488d051af50000                  LEAQ 0xf51a(IP), AX  // 加载int64 type
tmp.go:9        0x1093c06       48890424                        MOVQ AX, 0(SP)
tmp.go:9        0x1093c0a       e8c1a1f7ff                      CALL runtime.newobject(SB) // i分配在堆上(逃逸分析,escape analytic))
tmp.go:9        0x1093c0f       488b442408                      MOVQ 0x8(SP), AX
tmp.go:9        0x1093c14       4889442450                      MOVQ AX, 0x50(SP) // 0x50(SP) = &i
tmp.go:9        0x1093c19       48c70000000000                  MOVQ $0x0, 0(AX)  // 初始化 i = 0
// atomic.StoreInt64(&i, 123)
tmp.go:10       0x1093c20       488b442450                      MOVQ 0x50(SP), AX  // 加载&i
tmp.go:10       0x1093c25       48c7c17b000000                  MOVQ $0x7b, CX  // 加载立即数 123
tmp.go:10       0x1093c2c       488708                          XCHGQ CX, 0(AX)  // *(&i) = 123  Key Step XCHGQ通过LOCK信号锁住内存总线来确保原子性
// x := atomic.LoadInt64(&i)
tmp.go:11       0x1093c2f       488b442450                      MOVQ 0x50(SP), AX
tmp.go:11       0x1093c34       488b00                          MOVQ 0(AX), AX // AX = *(&i)  Key Step 原子操作
tmp.go:11       0x1093c37       4889442430                      MOVQ AX, 0x30(SP)
// y := atomic.AddInt64(&i, 1)
tmp.go:12       0x1093c3c       488b442450                      MOVQ 0x50(SP), AX
tmp.go:12       0x1093c41       48c7c101000000                  MOVQ $0x1, CX
tmp.go:12       0x1093c48       f0480fc108                      LOCK XADDQ CX, 0(AX) // LOCK会锁住内存总线，直到XADDQ指令完成，完成后CX为i的旧值 0(AX)=*(&i)=i+1
tmp.go:12       0x1093c4d       488d4101                        LEAQ 0x1(CX), AX // AX = CX+1 再执行一次加法 用于返回值
tmp.go:12       0x1093c51       4889442428                      MOVQ AX, 0x28(SP)
```

对XCHG和XADD这类X开头的指令，都会通过LOCK信号锁住内存总线，因此加不加LOCK前缀都是一样的。可以看到，由于硬件架构的支持，atomic.Load/Store和普通读写基本没有什么区别，这种CPU指令级别的锁非常快。因此通常我们将这类CPU指令级别的支持的Lock操作称为原子操作或无锁操作。

## 2. atomic.Value

atomic.Value于go1.4引入，用于无锁存取任意值(interface{})，它的数据结构很简单:

```go
// sync/atomic/value.go
type Value struct {
  // 没有实际意义 用于保证结构体在第一次被使用之后，不能被拷贝
  // 参考: https://github.com/golang/go/issues/8005#issuecomment-190753527
   noCopy noCopy
  // 实际保存的值
   v interface{}
}

// Load returns the value set by the most recent Store.
// It returns nil if there has been no call to Store for this Value.
func (v *Value) Load() (x interface{}) {
	// ...
}

// Store sets the value of the Value to x.
// All calls to Store for a given Value must use values of the same concrete type.
// Store of an inconsistent type panics, as does Store(nil).
func (v *Value) Store(x interface{}) {
	// ...
}
```

atomic负责v的原子存取操作，我们知道interface{}对应的数据结构为eface，有两个字段: type和data，因此它不能直接通过atomic.Load/Store来存取，atomic.Value实现无锁存取的原理很简单: type字段不变，只允许更改data字段，这样就能通过`atomic.LoadPointer`来实现对data的存取。从实现来讲，atomic.Value要处理好两点:

1. atomic.Value的初始化，因为在初始化时，需要同时初始化type和data字段，atomic.Value通过CAS自旋锁来实现初始化的原子性。
2. atomic.Value的拷贝，一是拷贝过程的原子性，二是拷贝方式，浅拷贝会带来更多的并发问题，深拷贝得到两个独立的atomic.Value是没有意义的，因此atomic.Value在初始化完成之后是不能拷贝的。

除此之外，atomic.Value的实现比较简单，结合eface和`atomic.LoadPointer()`即可理解，不再详述。

## 3. sync.Map

sync.Map于go1.9引入，为并发map提供一个高效的解决方案。在此之前，通常是通过`sync.RWMutex`来实现线程安全的Map，后面会有mutexMap和sync.Map的性能对比。先来看看sync.Map的特性:

1. 以空间换效率，通过read和dirty两个map来提高读取效率
2. 优先从read map中读取(无锁)，否则再从dirty map中读取(加锁)
3. 动态调整，当misses次数过多时，将dirty map提升为read map
4. 延迟删除，删除只是为value打一个标记，在dirty map提升时才执行真正的删除

sync.Map的使用很简单:

```go
var m sync.Map
m.Store("key", 123)
v, ok := m.Load("key")
```

下面看一下sync.Map的定义以及Load, Store, Delete三个方法的实现。

### 3.1 定义

```go
// sync/map.go
type Map struct {
   // 当写read map 或读写dirty map时 需要上锁
   mu Mutex

   // read map的 k v(entry) 是不变的，删除只是打标记，插入新key会加锁写到dirty中
   // 因此对read map的读取无需加锁
   read atomic.Value // 保存readOnly结构体

   // dirty map 对dirty map的操作需要持有mu锁
   dirty map[interface{}]*entry

   // 当Load操作在read map中未找到，尝试从dirty中进行加载时(不管是否存在)，misses+1
   // 当misses达到diry map len时，dirty被提升为read 并且重新分配dirty
   misses int
}

// read map数据结构
type readOnly struct {
   m       map[interface{}]*entry
   // 为true时代表dirty map中含有m中没有的元素
   amended bool
}

type entry struct {
   // 指向实际的interface{}
   // p有三种状态:
   // p == nil: 键值已经被删除，此时，m.dirty==nil 或 m.dirty[k]指向该entry
   // p == expunged: 键值已经被删除， 此时, m.dirty!=nil 且 m.dirty不存在该键值
   // 其它情况代表实际interface{}地址 如果m.dirty!=nil 则 m.read[key] 和 m.dirty[key] 指向同一个entry
   // 当删除key时，并不实际删除，先CAS entry.p为nil 等到每次dirty map创建时(dirty提升后的第一次新建Key)，会将entry.p由nil CAS为expunged
   p unsafe.Pointer // *interface{}
}
```

定义很简单，补充以下几点:

1. read和dirty通过entry包装value，这样使得value的变化和map的变化隔离，前者可以用atomic无锁完成
2. Map的read字段结构体定义为readOnly，这只是针对map[interface{}]*entry而言的，entry内的内容以及amended字段都是可以变的
3. 大部分情况下，对已有key的删除(entry.p置为nil)和更新可以直接通过修改entry.p来完成

### 3.2 Load

```go
// 查找对应的Key值 如果不存在 返回nil，false
func (m *Map) Load(key interface{}) (value interface{}, ok bool) {
  // 1. 优先从read map中读取(无锁)
  read, _ := m.read.Load().(readOnly)
  e, ok := read.m[key]
  // 2. 如果不存在，并且ammended字段指明dirty map中有read map中不存在的字段，则加锁尝试从dirty map中加载
  if !ok && read.amended {
    m.mu.Lock()
    // double check，避免在加锁的时候dirty map提升为read map
    read, _ = m.read.Load().(readOnly)
    e, ok = read.m[key]
    if !ok && read.amended {
      e, ok = m.dirty[key]
      // 3. 不管dirty中有没有找到 都增加misses计数 该函数可能将dirty map提升为readmap
      m.missLocked()
    }
    m.mu.Unlock()
  }
  if !ok {
    return nil, false
  }

  return e.load()
}

// 从entry中atomic load实际interface{}
func (e *entry) load() (value interface{}, ok bool) {
  p := atomic.LoadPointer(&e.p)
  if p == nil || p == expunged {
    return nil, false
  }
  return *(*interface{})(p), true
}

// 增加misses计数，并在必要的时候提升dirty map
func (m *Map) missLocked() {
  m.misses++
  if m.misses < len(m.dirty) {
    return
  }
  // 提升过程很简单，直接将m.dirty赋给m.read.m
  // 提升完成之后 amended == false m.dirty == nil
  // m.dirty并不立即创建被拷贝元素，而是延迟创建
  m.read.Store(readOnly{m: m.dirty})
  m.dirty = nil
  m.misses = 0
}
```

### 3.3 Store

```go
// Store sets the value for a key.
func (m *Map) Store(key, value interface{}) {
  // 1. 如果read map中存在该key  则尝试直接更改(由于修改的是entry内部的pointer，因此dirty map也可见)
  read, _ := m.read.Load().(readOnly)
  if e, ok := read.m[key]; ok && e.tryStore(&value) {
    return
  }

  m.mu.Lock()
  read, _ = m.read.Load().(readOnly)
  if e, ok := read.m[key]; ok {
    if e.unexpungeLocked() {
      // 2. 如果read map中存在该key，但p == expunged，则说明m.dirty!=nil并且m.dirty中不存在该key值 此时:
      //    a. 将 p的状态由expunged先更改为nil 
      //    b. dirty map新建key
      //    c. 更新entry.p = value (read map和dirty map指向同一个entry)
      m.dirty[key] = e
    }
    // 3. 如果read map中存在该key，且 p != expunged，直接更新该entry (此时m.dirty==nil或m.dirty[key]==e)
    e.storeLocked(&value)
  } else if e, ok := m.dirty[key]; ok {
    // 4. 如果read map中不存在该Key，但dirty map中存在该key，直接写入更新entry(read map中仍然没有)
    e.storeLocked(&value)
  } else {
    // 5. 如果read map和dirty map中都不存在该key，则:
    //    a. 如果dirty map为空，则需要创建dirty map，并从read map中拷贝未删除的元素
    //    b. 更新amended字段，标识dirty map中存在read map中没有的key
    //    c. 将k v写入dirty map中，read.m不变
    if !read.amended {
      m.dirtyLocked()
      m.read.Store(readOnly{m: read.m, amended: true})
    }
    m.dirty[key] = newEntry(value)
  }
  m.mu.Unlock()
}

// 尝试直接更新entry 如果p == expunged 返回false
func (e *entry) tryStore(i *interface{}) bool {
  p := atomic.LoadPointer(&e.p)
  if p == expunged {
    return false
  }
  for {
    if atomic.CompareAndSwapPointer(&e.p, p, unsafe.Pointer(i)) {
      return true
    }
    p = atomic.LoadPointer(&e.p)
    if p == expunged {
      return false
    }
  }
}

func (e *entry) unexpungeLocked() (wasExpunged bool) {
  return atomic.CompareAndSwapPointer(&e.p, expunged, nil)
}

// 如果 dirty map为nil，则从read map中拷贝元素到dirty map
func (m *Map) dirtyLocked() {
  if m.dirty != nil {
    return
  }

  read, _ := m.read.Load().(readOnly)
  m.dirty = make(map[interface{}]*entry, len(read.m))
  for k, e := range read.m {
    // a. 将所有为 nil的 p 置为 expunged
    // b. 只拷贝不为expunged 的 p
    if !e.tryExpungeLocked() {
      m.dirty[k] = e
    }
  }
}

func (e *entry) tryExpungeLocked() (isExpunged bool) {
  p := atomic.LoadPointer(&e.p)
  for p == nil {
    if atomic.CompareAndSwapPointer(&e.p, nil, expunged) {
      return true
    }
    p = atomic.LoadPointer(&e.p)
  }
  return p == expunged
}
```

### 3.4 Delete

```go
// Delete deletes the value for a key.
func (m *Map) Delete(key interface{}) {
  // 1. 从read map中查找，如果存在，则置为nil
  read, _ := m.read.Load().(readOnly)
  e, ok := read.m[key]
  if !ok && read.amended {
    // double check
    m.mu.Lock()
    read, _ = m.read.Load().(readOnly)
    e, ok = read.m[key]
    // 2. 如果read map中不存在，但dirty map中存在，则直接从dirty map删除
    if !ok && read.amended {
      delete(m.dirty, key)
    }
    m.mu.Unlock()
  }
  if ok {
    // 将entry.p 置为 nil
    e.delete()
  }
}

func (e *entry) delete() (hadValue bool) {
  for {
    p := atomic.LoadPointer(&e.p)
    if p == nil || p == expunged {
      return false
    }
    if atomic.CompareAndSwapPointer(&e.p, p, nil) {
      return true
    }
  }
}
```

### 3.5 总结

除了Load/Store/Delete之外，sync.Map还提供了LoadOrStore/Range操作，但没有提供Len()方法，这是因为要统计有效的键值对只能先提升dirty map(dirty map中可能有read map中没有的键值对)，再遍历m.read(由于延迟删除，不是所有的键值对都有效)，这其实就是Range做的事情，因此在不添加新数据结构支持的情况下，sync.Map的长度获取和Range操作是同一复杂度的。这部分只能看官方后续支持。

sync.Map实现上并不是特别复杂，但仍有很多值得借鉴的地方:

1. 通过entry隔离map变更和value变更，并且read map和dirty map指向同一个entry, 这样更新read map已有值无需加锁
2. double checking
3. 延迟删除key，通过标记避免修改read map，同时极大提升了删除key的效率(删除read map中存在的key是无锁操作)
4. 延迟创建dirty map，并且通过p的nil和expunged，amended字段来加强对dirty map状态的把控，减少对dirty map不必要的使用

sync.Map适用于key值相对固定，读多写少(更新m.read已有key仍然是无锁的)的情况，下面是一份使用RWLock的内建map和sync.Map的并发读写性能对比，代码在这里，代码对随机生成的整数key/value值进行并发的Load/Store/Delete操作，benchmark结果如下:

```go
go test -bench=.
goos: darwin
goarch: amd64
BenchmarkMutexMapStoreParalell-4         5000000               260 ns/op
BenchmarkSyncMapStoreParalell-4          3000000               498 ns/op
BenchmarkMutexMapLoadParalell-4         20000000                78.0 ns/op
BenchmarkSyncMapLoadParalell-4          30000000                41.1 ns/op
BenchmarkMutexMapDeleteParalell-4       10000000               235 ns/op
BenchmarkSyncMapDeleteParalell-4        30000000                49.2 ns/op
PASS
```
可以看到，除了并发写稍慢之外(并发写随机1亿以内的整数key/value，因此新建key操作远大于更新key，会导致sync.Map频繁的dirty map提升操作)，Load和Delete操作均快于mutexMap，特别是删除，得益于延迟删除，sync.Map的Delete几乎和Load一样快。

最后附上一份转载的sync.Map操作图解([图片出处](http://russellluo.com/2017/06/go-sync-map-diagram.html)):

![](../../../statics/images/stack/golang/code/go-sync-map-implement_files/1.jpg)