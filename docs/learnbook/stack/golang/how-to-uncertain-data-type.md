# 解析JSON数据，遇到不确定类型的字段该怎么办？

## 背景
很多同学在将使用 PHP 语言编写的业务迁移到 Go 的过程中时，都会遇到一个比较棘手的问题，就是 在解析 JSON 数据的时候，下游 PHP 接口返回的数据，一个字段的类型是不固定的，有时候是 整数型的，有时候是字符串的，甚至是其他object 类型的。比如下面这个例子：

**Case-1 Response**
```json
{
    "errno": 0,
    "data": {
    "total": 1,
        "has_more":false
    }
}
```

**Case-2 Response**
```json
{
    "errno": 0,
    "data": {
        "total": 1,
        "has_more":false
    }
}
```

上面这个情况，唯一的区别就是  total 字段一个是 字符串形式，一个是整数形式。

## 遇到问题
我们可能期望直接解析成这个结构：

```go
type Response struct {
   Errno int `json:"errno"`
   Data  struct {
      Total int `json:"total"`
      HasMore bool `json:"has_more"`
   }
}
```

### 数字类型的解析
我们尝试一下(先忽略 HasMore 字段)

**针对case-1：**

```go
package main

import (
   "encoding/json"
   "fmt"
)

var txt=`{
    "errno": 0,
    "data": {
        "total": 1
    }
}`

type Response struct {
   Errno int `json:"errno"`
   Data  struct {
      Total int `json:"total"` // 数据是整形1，和类型 int 匹配，解析成功
   }
}


func main() {
   resp:=&Response{}
   err := json.Unmarshal([]byte(txt), &resp)
   fmt.Println("err=", err, "total=",resp.Data.Total)
}
```
解析成功了，输出：err= <nil> total= 1

**针对 case-2:**

```go

package main

import (
   "encoding/json"
   "fmt"
)

var txt=`{
    "errno": 0,
    "data": {
        "total": "10"
    }
}`

type Response struct {
   Errno int `json:"errno"`
   Data  struct {
      Total int `json:"total"`  // 数据实际是字符串 "10",将导致解析失败
   }
}


func main() {
   resp:=&Response{}
   err := json.Unmarshal([]byte(txt), &resp)
   fmt.Println("err=", err, "total=",resp.Data.Total)
}
```

解析失败了，输出：err=`json: cannot unmarshal string into Go struct field .Data.total of type int` total= 0

<font color="red">**即由于定义的类型和数据实际的类型不匹配，导致解析失败：**</font>

 定义是  `Total int \`json:"total"\``，可以解析 JSON 数据中整形的 1，不能解析字符串的 "10"。
针对这种问题，标准库为我们准备了 `json.Number` 类型,我们只需要这样做：

```go
type Response struct {
   Errno int `json:"errno"`
   Data  struct {
      Total json.Number `json:"total"` // 定义成 json.Number 类型
   }
}
```
再次解析，上面的 JSON 字符串就正常的解析了。


### 非数字类型的字段

数据可能是   `"has_more":true`  或者  `"has_more":1`，而期望结构是这样：

```go
type Response struct {
   Errno int `json:"errno"`
   Data  struct {
      Total int `json:"total"`
      HasMore bool `json:"has_more"`
   }
}
```

当解析 `"has_more":1` 的数据时，会有报错：err= `json: cannot unmarshal number into Go struct field .Data.has_more of type bool`

遇到这种情况，可以这样：

| 编号 | 可选方案 | 优点 |  缺点 |
| :---: | :---: | :---: | :---: |
| 1 | `HasMore interface{} \`json:"has_more"\`` | 任意的类型都能解析出来 | 没法直接用。使用的时候需要再次断言 |
| 2 | `HasMore json.RawMessage \`json:"has_more"\`` | - | 没法直接用。需要再次解析 |
| 3 | `HasMore exjson.ExBool \`json:"has_more"\`` | 兼容性好，支持多种表示法，如 0,1,true,false,"T","F"等 | - |


## ExJSON库
如上的例子，`baidu/gdp/exjson` 定义了一些特殊的类型可以供我们使用。

| 类型 | 值示例 |
| :--- | :--- |
| ExString | “abcde”, 12345, true, false, null |
| ExInt64 |  12345, “12345”, false(0), null(0), “12345.1”, “12345.0”, 12345.1 |
| ExBool | 真值："1", "t", "T", "true", "TRUE", "True",true  <br /> 假值："0", "f", "F", "false", "FALSE", "False",false |

使用的时候：

```go
package main

import (
   "encoding/json"
   "fmt"

   "icode.baidu.com/baidu/gdp/exjson"
)

var txt=`{
    "errno": 0,
    "data": {
        "total": 1,
      "has_more":true
    }
}`

type Response struct {
   Errno int `json:"errno"`
   Data  struct {
      Total json.Number `json:"total"`
      HasMore exjson.ExBool `json:"has_more"` // 定义成 ExBool 类型
   }
}


func main() {
   resp:=&Response{}
   err := json.Unmarshal([]byte(txt), &resp)
   fmt.Println("err=", err, "total=",resp.Data.Total,"has_more=",resp.Data.HasMore)
}
```

## 自己扩展
若是上面的都不能满足需求，我们也可以自己扩展出新的类型，自定义类型只需要实现 `json.Marshaler` 和 `json.Unmarshaler` 接口即可。

比如 `ExInt64` 的实现是这样的：

```go
package exjson

import (
   "bytes"
   "strconv"
)

// ExInt64 type
type ExInt64 int64

// UnmarshalJSON for ExInt64, support: 12345, "12345", false(0), null(0), "12345.1", "12345.0", 12345.1
func (a *ExInt64) UnmarshalJSON(b []byte) error {
   b = bytes.Trim(b, `"`)
   n, err := strconv.ParseFloat(string(b), 64)
   if err == nil {
      *a = ExInt64(n)
      return nil
   }
   switch string(b) {
   case "false", "null":
      *a = 0
      return nil
   case "true":
      *a = 1
      return nil
   }
   return err
}

// MarshalJSON to 12345
func (a ExInt64) MarshalJSON() ([]byte, error) {
   s := strconv.FormatInt(int64(a), 10)
   return []byte(s), nil
}

// ToInt64 underlaying type
func (a ExInt64) ToInt64() int64 {
   return int64(a)
}
```

## 相关文档

- http://gdp.baidu-int.com/gdp2/docs/examples/foundation/15_exjson/
- https://golang.org/pkg/encoding/json/


