# Golang 规则引擎原理及实战

本文主要介绍规则引擎在 golang 中的使用，将首先介绍 golang 中主要的规则引擎框架，然后利用 golang 原生的 parser 搭建一个简单的规则引擎实现基本的 bool 表达式解析工作。

## 背景
随着业务代码的不断迭代，诞生出了越来越多的 if-else，并且 if-else 中的逻辑越来越复杂，导致代码逻辑复杂、维护性差、可读性差、修改风险高等缺陷。

复杂的 if-else 逻辑其实对应的是一条条的规则，满足对应的规则在执行对应的操作，即 if-else 中的条件就是一个对应的 bool 表达式：

```bash
|--bool 表达式--|
if a == 1 && b == 2 {
   // do some business
}
```

一个复杂的逻辑表示一条对应的规则，将这些规则用 bool 表达式表示之后，便可以按照对应的规则执行操作，大大减少 if-else 的应用：

```bash
if 规则 {
   // do some business
}
```
而如何解析这些 bool 表达式便是规则引擎所需要完成的任务了。

## 规则引擎介绍
规则引擎由是一种嵌入在应用程序中的组件，实现了将业务决策从应用程序代码中分离出来，并使用预定义的语义模块编写业务决策。

Golang语言实现的主要规则引擎框架：

| 名称 | 地址 | 规则描述语言 | 使用场景 | 使用复杂性  |
| :-- | :-- | :-- | :-- | :-- |
| YQL(Yet another-Query-Language) | https://github.com/caibirdme/yql | 类SQL | 表达式解析 | 低 |
| govaluate | https://github.com/Knetic/govaluate | 类Golang | 表达式解析 | 低 |
| Gval | https://github.com/PaesslerAG/gval | 类Golang | 表达式解析 | 低 |
| Grule-Rule-Engine | https://github.com/hyperjumptech/grule-rule-engine | 自定义DSL（Domain-Specific Language） | 规则执行 | 中 |
| Gengine | https://github.com/bilibili/gengine | 自定义DSL（Domain-Specific Language） | 规则执行 | 中 |
| Common Expression Language | https://github.com/google/cel-go#evaluate | 类C | 通用表达式语言 | 中 |
| goja | https://github.com/dop251/goja | JavaScript | 规则解析 | 中 |
| GopherLua: VM and compiler for Lua in Go. | https://github.com/yuin/gopher-lua | lua | 规则解析 | 高 |

可以看到无数的人在前仆后继地造规则引擎，但是这些规则引擎由于功能强大，因此对于一些比较简单的逻辑表达式的解析任务来说就显得有点重了。

比如想使用规则引擎实现如下的规则，例如如上的这些框架来实现解析的话会大量消耗 CPU 的资源，在请求量较大的系统当中就有可能成为系统的性能屏障。

```bash
if type == 1 && product_id = 3{
    //...
}
```

因此需要一个简单轻便性能较好的规则引擎。

## 基于Go parser库打造规则引擎

### parser 库介绍

Go 内置的 parser 库提供了 golang 底层语法分析的相关操作，并且其相关的 api 向用户开放，那么便可以直接使用 Go 的内置 parser 库 完成上面一个基本规则引擎的框架。

针对如下的规则表达式使用go原生的parser进行解析（规则中不能使用 type 关键字）：

```go
// 使用go语法表示的bool表达式，in_array为函数调用
expr := `product_id == "3" && order_type == "0" && in_array(capacity_level, []string{"900","1100"}) && carpool_type == "0"`
 
// 使用go parser解析上述表达式，返回结果为一颗ast
parseResult, err := parser.ParseExpr(expr)
if err != nil {
   fmt.Println(err)
   return
}
 
// 打印该ast
ast.Print(nil, parseResult)
```

可以得到如下的结果（一颗二叉树）：

```go
0  *ast.BinaryExpr {
1  .  X: *ast.BinaryExpr {
2  .  .  X: *ast.BinaryExpr {
3  .  .  .  X: *ast.BinaryExpr {
4  .  .  .  .  X: *ast.Ident {
5  .  .  .  .  .  NamePos: 1
6  .  .  .  .  .  Name: "product_id"
7  .  .  .  .  }
8  .  .  .  .  OpPos: 12
9  .  .  .  .  Op: ==
10  .  .  .  .  Y: *ast.BasicLit {
11  .  .  .  .  .  ValuePos: 15
12  .  .  .  .  .  Kind: STRING
13  .  .  .  .  .  Value: "\"3\""
14  .  .  .  .  }
15  .  .  .  }
16  .  .  .  OpPos: 19
17  .  .  .  Op: &&
18  .  .  .  Y: *ast.BinaryExpr {
19  .  .  .  .  X: *ast.Ident {
20  .  .  .  .  .  NamePos: 22
21  .  .  .  .  .  Name: "order_type"
22  .  .  .  .  }
23  .  .  .  .  OpPos: 33
24  .  .  .  .  Op: ==
25  .  .  .  .  Y: *ast.BasicLit {
26  .  .  .  .  .  ValuePos: 36
27  .  .  .  .  .  Kind: STRING
28  .  .  .  .  .  Value: "\"0\""
29  .  .  .  .  }
30  .  .  .  }
31  .  .  }
32  .  .  OpPos: 40
33  .  .  Op: &&
34  .  .  Y: *ast.CallExpr {
35  .  .  .  Fun: *ast.Ident {
36  .  .  .  .  NamePos: 43
37  .  .  .  .  Name: "in_array"
38  .  .  .  }
39  .  .  .  Lparen: 51
40  .  .  .  Args: []ast.Expr (len = 2) {
41  .  .  .  .  0: *ast.Ident {
42  .  .  .  .  .  NamePos: 52
43  .  .  .  .  .  Name: "capacity_level"
44  .  .  .  .  }
45  .  .  .  .  1: *ast.CompositeLit {
46  .  .  .  .  .  Type: *ast.ArrayType {
47  .  .  .  .  .  .  Lbrack: 68
48  .  .  .  .  .  .  Elt: *ast.Ident {
49  .  .  .  .  .  .  .  NamePos: 70
50  .  .  .  .  .  .  .  Name: "string"
51  .  .  .  .  .  .  }
52  .  .  .  .  .  }
53  .  .  .  .  .  Lbrace: 76
54  .  .  .  .  .  Elts: []ast.Expr (len = 2) {
55  .  .  .  .  .  .  0: *ast.BasicLit {
56  .  .  .  .  .  .  .  ValuePos: 77
57  .  .  .  .  .  .  .  Kind: STRING
58  .  .  .  .  .  .  .  Value: "\"900\""
59  .  .  .  .  .  .  }
60  .  .  .  .  .  .  1: *ast.BasicLit {
61  .  .  .  .  .  .  .  ValuePos: 83
62  .  .  .  .  .  .  .  Kind: STRING
63  .  .  .  .  .  .  .  Value: "\"1100\""
64  .  .  .  .  .  .  }
65  .  .  .  .  .  }
66  .  .  .  .  .  Rbrace: 89
67  .  .  .  .  .  Incomplete: false
68  .  .  .  .  }
69  .  .  .  }
70  .  .  .  Ellipsis: 0
71  .  .  .  Rparen: 90
72  .  .  }
73  .  }
74  .  OpPos: 92
75  .  Op: &&
76  .  Y: *ast.BinaryExpr {
77  .  .  X: *ast.Ident {
78  .  .  .  NamePos: 95
79  .  .  .  Name: "carpool_type"
80  .  .  }
81  .  .  OpPos: 108
82  .  .  Op: ==
83  .  .  Y: *ast.BasicLit {
84  .  .  .  ValuePos: 111
85  .  .  .  Kind: STRING
86  .  .  .  Value: "\"0\""
87  .  .  }
88  .  }
89  }
```

### 打造基于parser库的规则引擎

将 parser 解析出来的这颗二叉树画出来：

![](../../../statics/images/stack/golang/features/02.png)

可以看到，有了 Golang 原生的语法解析器，我们只需要后序遍历这棵二叉树，然后实现一套 AST 与对应数据map的映射关系即可实现一个简单的规则引擎。

其中，AST 与对应数据map的映射关系的实现代码的主要结构如下：

```go
func eval(expr ast.Expr, data map[string]interface{}) interface{} {
   switch expr := expr.(type) {
   case *ast.BasicLit: // 匹配到数据
      return getlitValue(expr)
   case *ast.BinaryExpr: // 匹配到子树
      // 后序遍历
      x := eval(expr.X, data) // 左子树结果
      y := eval(expr.Y, data) // 右子树结果
      if x == nil || y == nil {
         return errors.New(fmt.Sprintf("%+v, %+v is nil", x, y))
      }
      op := expr.Op // 运算符
 
      // 按照不同类型执行运算
      switch x.(type) {
      case int64:
         return calculateForInt(x, y, op)
      case bool:
         return calculateForBool(x, y, op)
      case string:
         return calculateForString(x, y, op)
      case error:
         return errors.New(fmt.Sprintf("%+v %+v %+v eval failed", x, op, y))
      default:
         return errors.New(fmt.Sprintf("%+v op is not support", op))
      }
   case *ast.CallExpr: // 匹配到函数
      return calculateForFunc(expr.Fun.(*ast.Ident).Name, expr.Args, data)
   case *ast.ParenExpr: // 匹配到括号
      return eval(expr.X, data)
   case *ast.Ident: // 匹配到变量
      return data[expr.Name]
   default:
      return errors.New(fmt.Sprintf("%x type is not support", expr))
   }
}
```

完整的实现代码在这里：[gparser](https://github.com/kugoucode/gparser)

### 性能对比

使用基于 go parser 实现的规则引擎对比其他常见的规则引擎（YQL、govaluate、gval）的性能：

```bash
BenchmarkGoParser_Match-8        127189   8912     ns/op // 基于 go parser 实现的规则引擎
BenchmarkGval_Match-8            63584    18358    ns/op // gval
BenchmarkGovaluateParser_Match-8 13628    86955    ns/op // govaluate
BenchmarkYqlParser_Match-8       10364    112481   ns/op // yql
```

### 总结
可以看到在使用原生的 parser 实现的规则引擎在性能上具有较大的优势，但缺点在于需要自己实现一套 AST 与对应数据map的映射关系，并且受限于 go 原生 parser 库的限制导致规则的定义语言比较繁琐，这些也都是为什么会有其他规则引擎框架诞生的原因，但不可否认基于原生 parser 库打造的规则引擎的性能还是足够优秀的，因此在一些比较简单的规则匹配场景中还是优先考虑使用原生 parser，可以最大效率的实现降本增效的效果。