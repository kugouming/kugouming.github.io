# 配置加载框架

> Github: https://github.com/go-spring/go-spring/tree/master/spring/spring-core/conf

还在使用 Viper 么？今天给大家推荐一个更强大的配置加载框架 go-conf。之所以称为“框架”，是因为这个库不仅具备加载配置文件、获取配置属性等基础能力，还因为它实际上是一个分层的配置加载器，不仅可以从文件中读取配置，还可以从环境变量、命令行参数、远程配置文件中读取配置，这些配置源按照优先级逐层加载，最后合并到一起。而且这个库提供了非常强大的属性绑定能力，不仅可以通过传统的 Get 方式获取一个 key 的值，还可以通过 Bind 方式将属性绑定到一个复杂的集合或者对象上，而且还支持设置默认值、转换器等非常好用的能力。

## 分层加载器  

go-conf 是一个分层的配置加载器，它按照优先级由低到高，从本地代码、本地静态文件、环境变量、命令行参数、远程动态文件中逐层加载配置，并最终合并到一起。

- Layer 1: 通过函数 `SetProperty` 设置的属性
- Layer 2: 通过本地静态文件设置的属性
- Layer 3: 通过环境变量设置的属性
- Layer 4: 通过命令行参数设置的属性
- Layer 5: 通过远程动态文件设置的属性

1. **创建配置加载器。**
```go
c := conf.NewConfiguration()
```

2. **通过 `SetProperty` 函数设置属性。** 这种方式设置的属性优先级最低，因为通常来说代码一旦写死了就认为是不可变的了。
```go
c.SetProperty("spring.active.profile", "online")
```

3. **通过本地静态文件设置属性。** 这种方式设置的属性优先级比代码方式高，因为一旦打成安装包之后，安装包内的配置文件也就是不可变的。
```go
c.File().Add("testdata/conf.toml")
c.File().Add("testdata/conf-${spring.active.profile}.yaml")
```
这里有一个 go-conf 的独特之处需要说一说，就是配置文件的文件名支持动态引用，这个特性在开发中非常有用。通常来说，不同的组织、不同的项目要求有不同的配置文件组织方式，有些项目要求使用目录来区分环境，而有些项目则要求使用文件名后缀来区分环境，无论哪种情况 go-conf 都能很好的应对。

4. **通过环境变量设置属性。** 这种方式设置的属性优先级比本地文件方式高，因为环境变量属于安装包之外的数据，在程序启动之前是可以被修改的。
```go
GOOS='darwin'
GOPROXY='https://proxy.golang.org,direct'
GOROOT='/usr/local/go'
GOVERSION='go1.22.6'
```

这里需要说明的是，不是所有的环境变量都是有用的，实际使用中需要对环境变量进行筛选。一种情况是，go-conf 会默认加载所有 GS_ 开头的环境变量，另一种情况是，go-conf 支持通过 INCLUDE_ENV_PATTERNS 和 EXCLUDE_ENV_PATTERNS 两个环境变量来规定哪些环境变量可以被加载（前者），哪些环境变量需要被排除（后者）。

5. **通过命令行设置属性。** 这种方式设置的属性优先级比环境变量方式高，因为环境变量一般不怎么变，而通过命令行参数控制程序行为是一种更加常见的做法。
```go
exe -D args.int=1 -D args.str=abc
```

go-conf 默认加载以 -D key=[value/true] 形式定义的命令行参数。这种定义方式可以独立于 go flag 体系，使用起来更加方便。当 value 不存在时，key 被认为是一个布尔值，并且值是 true，这也符合一般命令行参数的使用规则。

6. **通过远程动态文件设置属性。** 这种方式需要配合配置中心使用，是独立于程序和容器之外的数据，因此优先级最高。
```go
c.Dync().Add("testdata/dync.json")
c.Dync().Add("testdata-${spring.active.profile}/dync.toml")
```

配置中心的数据最好是下载到本地文件之后再使用。同样的，这里的文件名也支持动态引用，可以满足不同组织、不同项目对配置文件的组织形式的要求。

7. **合并所有配置。** 最终，go-conf 把从所有配置源加载的配置项合并起来，返回一个只读的 Properties 接口，用于后续使用。
```go
p, err := c.Refresh()
```

## 属性绑定

go-conf 不仅支持传统的 Get 方式获取属性，而且提供了强大的 Bind 能力。

1. **Get 方式。** 使用 Get 只能返回简单的数据，不能返回 Array 或者 Map。Get 还支持在 key 不存在时返回一个默认值。另外，Get 只能返回 string 类型的值，如果需要转换成 int、float 类型，可以搭配 [spf13/cast](https://github.com/spf13/cast) 使用。
```go
v := p.Get("key.undef")
v := p.Get("key.undef", conf.Def("abc"))
```

2. **Bind 方式。** 使用 Bind 可以处理任意复杂的数据，可以是简单数据，也可以是 Array、Map、Struct 等复杂数据，甚至还可以是嵌套的 Struct。而且 Bind 还支持为结构体的 Field 设置默认值，当然也必须支持属性引用。

```go
type Object struct {
    Int  int               `value:"${int}"`
    Str  string            `value:"${str}"`
    Arr  []string          `value:"${arr}"`
    Map  map[string]string `value:"${map}"`
    Time time.Time         `value:"${time:=2024-10-01}"`
}
var obj Object
err := p.Bind(&obj, conf.Key(key))
```

Bind 支持将一个字符串转换成结构体类型的值，比如 `time.Time` 类型，这是借助于 go-conf 转换器的能力实现的。所谓转换器，就是一个自定义的函数，可以将字符串转换成一个结构体类型。

```go
RegisterConverter(func(s string) (time.Time, error) {
    return cast.ToTimeE(strings.TrimSpace(s))
})
```

## Field 校验

使用 Bind 方式对结构体进行属性绑定的时候，还可以为结构体的字段设置校验条件。校验条件使用的是 [expr-lang/expr](https://github.com/expr-lang/expr) 提供的表达式语法，使用简单且表达力强。`$` 是一个特殊符号，代表当前的属性值。

```go
var obj struct {
    Map map[string]int `value:"${prop.map}" expr:"len($)>3"`
}
err := p.Bind(&obj)
```

被校验的字段可以是简单数据如 int、string，也可以是 array 和 map 等复杂数据。  

## Reader 插件

go-conf 默认支持 properties、toml、yaml、json 四种配置文件格式，然后也可以通过 reader 插件机制支持更多的配置文件格式，只需要按照要求实现 reader 函数并且注册插件即可。
```go
RegisterReader(json.Read, ".json")
RegisterReader(prop.Read, ".properties")
RegisterReader(yaml.Read, ".yaml", ".yml")
RegisterReader(toml.Read, ".toml", ".tml")
```

上面是注册 reader 插件的代码，下面是 reader 插件的实现代码。

```go
func Read(b []byte) (map[string]interface{}, error) {
  var ret map[string]interface{}
  err := json.Unmarshal(b, &ret)
  if err != nil {
    return nil, err
  }
  return ret, nil
}
```

## 结语

应当说 go-conf 提供的每项能力都切中了实际开发中的痛点。比如项目中常常有好多个配置文件，通常的方式是每个文件都加载一遍，而使用 go-conf 则只需要加载一次。比如在获取复杂配置的时候，常常是一个 field 一个 field 的去 get，而使用go-conf 则只需要进行一次结构体绑定就可以了，而且还支持默认值和 validate，这简直是太方便了。