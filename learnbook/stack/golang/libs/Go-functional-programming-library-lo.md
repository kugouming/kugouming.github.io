# Go语言函数式编程库samber/lo

> samber/lo是一个基于Go1.18+泛型的库，提供了类似Lodash的函数式编程接口，如Uniq、Filter、Map等，方便对数据结构进行操作。此外，还有golang.org/x/exp包提供部分功能，但lo更全面。文章通过示例展示了如何安装和使用lo进行过滤、映射、范围生成等操作。


开发中，我们经常遇到一些操作，比如获取一个map的所有key，所有value，判断一个字符串是否出现在slice中，slice中是否有重复元素等等。Go语言没有这样的操作，标准库也不提供。因此我们自己，或者团队会维护一些这类操作的包。得益于Go泛型的发布，lo 就是这样的包，封装了大量简单操作，可以降低我们的代码量。

`samber/lo` 是一个基于Go 1.18+泛型的Lodash风格的Go库。

- samber/lo 文档地址：[https://pkg.go.dev/github.com/samber/lo](https://pkg.go.dev/github.com/samber/lo)
- samber/lo GitHub地址：[https://github.com/samber/lo](https://github.com/samber/lo)

除了 lo，Go官方也提供了一些实验性的包，比如 `golang.org/x/exp/map` 、`golang.org/x/exp/slices` 。这些包针对特定的数据结构，更小，引入项目时更灵活，并且可能成为标准库的一部分，而 lo 则更全面。

## 1、安装

```bash
go get github.com/samber/lo@v1
```
## 2、简单使用

```go
package main

import (
	"fmt"
	"github.com/samber/lo"
)

func main(){
	names := lo.Uniq[string]([]string{"Samuel", "John", "Samuel"})
	// 2
	fmt.Println(len(names))
	// [Samuel John]
	fmt.Println(names)
}

我们可以导入所有的函数：

package main

import (
	"fmt"
	. "github.com/samber/lo"
)

func main() {
	names := Uniq[string]([]string{"Samuel", "John", "Samuel"})
	// 2
	fmt.Println(len(names))
	// [Samuel John]
	fmt.Println(names)
}
```

## 3、部分功能介绍
### 3.1 Filter

根据条件对集合中的元素进行筛选。

```go
package main

import (
	"fmt"
	"github.com/samber/lo"
)

func main() {
	list := []int64{1, 2, 3, 4}
	// 返回可以被2整除的元素
	result := lo.Filter(list, func(nbr int64, index int) bool {
		return nbr%2 == 0
	})
	// [2 4]
	fmt.Printf("%v", result)
}
```

### 3.2 Map

遍历集合中的每一个元素并对集合中的每一个元素进行相同的操作。

```go
package main

import (
	"fmt"
	"github.com/samber/lo"
)

func main() {
	list := []int64{1, 2, 3, 4}
	// 集合的每个元素都乘以10
	result := lo.Map(list, func(x int64, index int) string {
		return fmt.Sprintf("%d", x*10)
	})
	// [10 20 30 40]
	fmt.Println(result)
}
```

并行处理：

```go
package main

import (
	"fmt"
	lop "github.com/samber/lo/parallel"
)

func main() {
	list := []int64{1, 2, 3, 4}
	// 集合的每个元素都乘以10
	result := lop.Map(list, func(x int64, index int) string {
		return fmt.Sprintf("%d", x*10)
	})
	// [10 20 30 40]
	fmt.Println(result)
}
```


### 3.3 FilterMap

先根据条件对集合中的元素进行筛选。
然后遍历集合中的每一个元素并对集合中的每一个元素进行相同的操作。

```go
package main

import (
	"fmt"
	"github.com/samber/lo"
)

func main() {
	list := []int64{1, 2, 3, 4}
	// 先返回可以被2整除的元素,然后集合的每个元素都乘以10
	result := lo.FilterMap(list, func(nbr int64, index int) (string, bool) {
		return fmt.Sprintf("%d", nbr*10), nbr%2 == 0
	})
	// [20 40]
	fmt.Printf("%v", result)
}
```

### 3.4 Range/RangeFrom/RangeWithSteps

创建一个从开始到结束(不包括结束)的数字数组(正数和/或负数)。

```go
package main

import (
	"fmt"
	"github.com/samber/lo"
)

func main() {
	// [0 1 2 3]
	result1 := lo.Range(4)
	// [0 -1 -2 -3]
	result2 := lo.Range(-4)
	// [1 2 3 4 5]
	result3 := lo.RangeFrom(1, 5)
	// [1 2 3 4 5]
	result4 := lo.RangeFrom(1.0, 5)
	// [0 5 10 15]
	result5 := lo.RangeWithSteps(0, 20, 5)
	// [-1 -2 -3]
	result6 := lo.RangeWithSteps[float32](-1.0, -4.0, -1.0)
	// []
	result7 := lo.RangeWithSteps(1, 4, -1)
	// []
	result8 := lo.Range(0)
	fmt.Printf("%v\n", result1)
	fmt.Printf("%v\n", result2)
	fmt.Printf("%v\n", result3)
	fmt.Printf("%v\n", result4)
	fmt.Printf("%v\n", result5)
	fmt.Printf("%v\n", result6)
	fmt.Printf("%v\n", result7)
	fmt.Printf("%v\n", result8)
}
```

### 3.5 RandomString

返回指定长度的随机字符串，该字符串由指定的字符集组成。

```go
package main

import (
	"fmt"
	"github.com/samber/lo"
)

func main() {
	result := lo.RandomString(5, lo.LettersCharset)
	// XVlBz
	fmt.Printf("%v", result)
}
```

### 3.6 IsNotEmpty

如果参数为零值，则返回true。

```go
package main

import (
	"fmt"
	"github.com/samber/lo"
)

func main(){
	// false
	fmt.Println(lo.IsNotEmpty(0))
	// true
	fmt.Println(lo.IsNotEmpty(42))
	// false
	fmt.Println(lo.IsNotEmpty(""))
	// true
	fmt.Println(lo.IsNotEmpty("foobar"))
	type test struct {
		foobar string
	}
	// false
	fmt.Println(lo.IsNotEmpty(test{foobar: ""}))
	// true
	fmt.Println(lo.IsNotEmpty(test{foobar: "foobar"}))
}
```

这里只是用举几个例子，lo 中支持超多的转化帮助函数供开发使用，如果有需要可以参考开发文档。