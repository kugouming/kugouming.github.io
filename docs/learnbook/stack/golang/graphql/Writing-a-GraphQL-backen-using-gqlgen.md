# 使用 gqlgen 编写 GraphQL 后端

> Changelog:
>
> - 2019/4/25: 添加了一段描述
> - 2019/5/21: 增加了登录鉴权
> - 2019/6/4: 将 iris 改为 gin
> - 2019/7/9: 自定义序列化／反序列化
> - 2019/12/12: 增加 Golang 客户端
> - 2020/5/1: 修改 JWT, gqlgen v0.11


此文假设你已经掌握了基础的 GraphQL 知识。 GraphQL 基础知识请看另一篇。


## 一、Introduction

Golang 的高性能 graphql 后端，和 gin 配合使用时可以实现极高的性能。

References:
- [https://gqlgen.com/](https://gqlgen.com/)
- [https://github.com/99designs/gqlgen](https://github.com/99designs/gqlgen)

我用 gqlgen 重写了我博客的全部后端接口，代码在：[https://github.com/Laisky/laisky-blog-graphql](https://github.com/Laisky/laisky-blog-graphql)， 可以通过 [https://app.laisky.com/graphql/ui/](https://app.laisky.com/graphql/ui/) 访问，来实际的用用看。

## 二、Concept

以 Schema 定义为核心，Schema 中主要需要定义：
- 数据类型
- Query 接口
- Mutation 接口

定义好 schema 后，gqlgen 会自动生成相关的接口代码。

然后根据接口定义，再手动编写相关的数据逻辑，实现接口定义。

## 三、Use

建议先看了一下本节，有一个大致的了解，然后再去跟着官方文档自己实际操作一番，会理解的更为深入。

官方文档：[https://gqlgen.com/getting-started/](https://gqlgen.com/getting-started/)

安装：
```bash
go get -u github.com/99designs/gqlgen
```

### 1、定义 schema
首先在项目根目录创建 schema 文件 `schema.graphql`，内容形如：

```go
# 定义数据类型 Todo
type Todo {
  id: ID!
  text: String!
  done: Boolean!
  user: User!
}

# 定义数据类型 User
type User {
  id: ID!
  name: String!
}

# 定义查询操作，支持两个接口
type Query {
  todos: [Todo!]!          # todos 接口，返回 Todo 列表
  todo(id: String!): Todo   # todo 接口，通过 id 查询返回 Todo
}


# 定义输入参数
input NewTodo {
  text: String!
  userId: String!
}

# 定义修改操作，支持一个接口
type Mutation {
  createTodo(input: NewTodo!): Todo!   # createTodo 接口，通过 NewTodo 创建并返回 Todo
}
```

然后运行命令进行初始化：

```bash
go run github.com/99designs/gqlgen init
```

该命令会生成如下文件：

- `server/server.go`: HTTP 服务端代码；
- `generated.go`: 生成的代码，需要关注其中的诸多 interface 定义，不需要手动更改；
- `gqlgen.yml`: 配置文件；
- `models_gen.go`: 生成的 models 定义，不需要手动更改；
- `resolver.go`: 逻辑代码，需要手动完善具体的数据增删改查逻辑。

### 2、修改数据的模型
上述 schema 中，我们在 Todo 中包含了一个指向 User 的外键。 但是在实际的 model 中却希望不要存外键，而是存一个 UserId，也就是希望自定义 model，而不是使用默认的。

这需要首先创建自己的 struct，比如可以新建一个 `models.go`，内写：

```go
// 这里写你自己的 package 名字
package laisky_blog_graphql

type Todo struct {
    ID     string
    Text   string
    Done   bool
    UserID string
}
```
然后修改配置文件 `gqlgen.yml`，在其中增加一个 `models` 项：

```yaml
models:
  Todo:
    model: github.com/Laisky/laisky-blog-graphql.Todo
```

这就是告诉 gqlgen，使用指定的 struct 作为 Todo 的 model， 然后需要运行一下 gqlgen 重新更新代码：

```bash
go run github.com/99designs/gqlgen
```

### 3、修改数据类型序列化方法

前例中介绍了修改 `type` 所指向的 `struct` 的方法，这里要介绍修改最基础的数据类型的方法。

graphql 中仅提供了很少的几个基础类型，用户可以通过 `scalar` 声明自定义数据类型， 但是这个方法声明的数据类型默认都会被当成 string 来处理。 这里介绍如何实现自定的的序列化／反序列化方法。

做法很简单：
1. 通过 scalar 声明一个类型；
2. 用 Golang 声明一个 type，实现两个序列化/反序列化的接口；
3. 配置 gqlgen.yml，建立联系；
4. 运行 go run github.com/99designs/gqlgen。

下文中，以自定义的 `scalar Date` 举例。

在 Golang 代码中实现匹配的数据类型。

任何类型都可以，只要求实现下列两个方法：
- 序列化（绑定在 value 上）：`MarshalGQL(w io.Writer)`
- 反序列化（绑定在 pointer 上）：`UnmarshalGQL(vi interface{}) (err error)`

```go
// Datetime 匹配 `Date` 的类型
type Datetime struct {
    t time.Time
}

const TimeLayout = "2006-01-02T15:04:05.000Z"

func NewDatetimeFromTime(t time.Time) *Datetime {
    return &Datetime{
        t: t,
    }
}

// GetTime 返回 time.Time
func (d *Datetime) GetTime() time.Time {
    return d.t
}

// UnmarshalGQL 反序列化方法，当 gqlgen 接受到请求后，会调用该方法，将该类型的数据进行反序列化
func (d *Datetime) UnmarshalGQL(vi interface{}) (err error) {
    v, ok := vi.(string)
    if !ok {
        return fmt.Errorf("unknown type of Datetime: `%+v`", vi)
    }
    if d.t, err = time.Parse(TimeLayout, v); err != nil {
        return err
    }

    return nil
}

// MarshalGQL 序列化
func (d Datetime) MarshalGQL(w io.Writer) {
    w.Write(appendQuote([]byte(d.t.Format(TimeLayout))))
}
```

然后在 `gelgen.yml` 内配置联系：

```yaml
models:
  Date:
    model: github.com/Laisky/laisky-blog-graphql/types.Datetime
```

搞定，这样我直接发起字符串请求 `2019-01-01T10:00:00.123Z`， 然后在 `resolver.go` 里就能直接获取到类型为 `Datetime` 的参数。 而不需要每次都去手动解析字符串了。

### 4、完善 resolver

`resolver.go` 中是需要手动完成的，实际的数据增删存取逻辑。

可以先看一看 `generated.go` 中包含哪些 interface， 然后再根据这些 interface 在 `resolver.go` 中进行完善。

比如可以看到这些 interface：

```go
// 说明需要定义三个根 resolver
// 且这三个 resolver 都必须返回符合下列接口定义的 struct
type ResolverRoot interface {
    Mutation() MutationResolver
    Query() QueryResolver
    Todo() TodoResolver
}

type MutationResolver interface {
    CreateTodo(ctx context.Context, input NewTodo) (*Todo, error)
}
type QueryResolver interface {
    Todos(ctx context.Context) ([]Todo, error)
    Todo(ctx context.Context, id string) (*Todo, error)
}
type TodoResolver interface {
    User(ctx context.Context, obj *Todo) (*User, error)
}
```

在 `resolver.go` 里，先定义基础接口：

```go
type Resolver struct{}

type queryResolver struct{ *Resolver }
type mutationResolver struct{ *Resolver }
type todoResolver struct{ *Resolver }

func (r *Resolver) Mutation() MutationResolver {
    return &mutationResolver{r}
}
func (r *Resolver) Query() QueryResolver {
    return &queryResolver{r}
}
func (r *Resolver) Todo() TodoResolver {
    return &todoResolver{r}
}
```

然后继续依次编写实际的方法逻辑：

```go
// 实现 MutationResolver 的 CreateTodo 方法
func (r *mutationResolver) CreateTodo(ctx context.Context, input NewTodo) (*Todo, error) {
    fmt.Println("create todo")
    return &Todo{
        ID:     strconv.FormatInt(counter.Count(), 10),
        Text:   input.Text,
        UserID: input.UserID,
        Done:   false,
    }, nil
}

// 实现 QueryResolver 的 Todos 方法
func (r *queryResolver) Todos(ctx context.Context) ([]Todo, error) {
    return []Todo{
        Todo{
            ID:     strconv.FormatInt(counter.Count(), 10),
            UserID: "123",
            Text:   "todo text",
        },
    }, nil
}

// 实现 QueryResolver 的 Todo 方法
func (r *queryResolver) Todo(ctx context.Context, id string) (*Todo, error) {
    utils.Logger.Info("load todo", zap.String("id", id))
    return &Todo{
        ID:     id,
        Text:   "loaded todo",
        Done:   true,
        UserID: "123",
    }, nil
}

// 实现 TodoResolver 的 User 方法
func (t *todoResolver) User(ctx context.Context, obj *Todo) (*User, error) {
    return &User{
        ID:   obj.UserID,
        Name: "user name",
    }, nil
}
```

### 5、运行
实现完所有的 interface 后，就可以运行了，后端服务器的运行逻辑在 `server/server.go` 内。 其中的代码行数很少，你可以通过修改这个文件，来实现各种自定制的功能，比如：

- 替换服务器为性能更高的 gin；
- 通过增加中间件来实现鉴权；
- 修改绑定的地址和端口等等。

启动服务：

```bash
go run server/server.go
```

默认监听的地址是 [http://127.0.0.1:8080/query](http://127.0.0.1:8080/query)，浏览器打开该抵制后，就可以看到可以在线调试的 playground。

### 6、请求

再看一遍我们之前在 schema 中定义的接口：

对于 query：

```go
# 定义 schema
type Query {
  todos: [Todo!]!          # todos 接口，返回 Todo 列表
  todo(id: String!): Todo   # todo 接口，通过 id 查询返回 Todo
}

# 查询
query todos {
  todos {          # 查询 todos 接口
    id
    text
    done
  }
  todo(id: "2") {   # 查询 todo 接口
    id
    text
    done
  }
}


# 返回
{
  "data": {
    "todos": [
      {
        "id": "3",
        "text": "todo text",
        "done": false
      }
    ],
    "todo": {
      "id": "2",
      "text": "loaded todo",
      "done": true
    }
  }
}
```

对于 mutation：

```go
# 定义 input
input NewTodo {
  text: String!
  userId: String!
}

# 定义 mutation schema
type Mutation {
  createTodo(input: NewTodo!): Todo!   # createTodo 接口，通过 NewTodo 创建并返回 Todo
}


# 发起请求
mutation xxx {
  createTodo(input: {userId: "123", text: "yo"}) {
    id
    text
    done
  }
}

# 返回
{
  "data": {
    "createTodo": {
      "id": "4",
      "text": "yo",
      "done": false
    }
  }
}
```

## 四、替换为 gin
（吐槽一下，iris 的作者真是一言难尽，建议不要使用此人的任何东西。）

golang 原生的 httpserver 性能较弱，可以替换为 gin，项目地址：[https://github.com/gin-gonic/gin](https://github.com/gin-gonic/gin)

gin 有自己的 `gin.HandleFunc(*gin.Context)`，而 gqlgen 使用的是原生的 `http.HandleFunc`。 可以写一个简单的函数转换一下。

不过有一个问题是，gqlgen 的 resolver 只有一个 context 参数，缺乏直接操作 HTTP 响应的能力， 我的解决办法是将 gin.context 封装进原生 context。

可以采用我的 [go-utils](https://github.com/Laisky/gin-middlewares/blob/master/base.go) 来实现：

```go
import (
    ginMiddlewares "github.com/Laisky/gin-middlewares"
    "github.com/gin-contrib/pprof"
    "github.com/gin-gonic/gin"
    "github.com/99designs/gqlgen/handler"
    utils "github.com/Laisky/go-utils"
    "github.com/Laisky/zap"
)

func RunServer(addr string) {
	server.Use(gin.Recovery())
	if !utils.Settings.GetBool("debug") {
		gin.SetMode(gin.ReleaseMode)
	}

	if err := setupAuth(); err != nil {
		log.GetLog().Panic("try to setup auth got error", zap.Error(err))
	}

	server.Use(LoggerMiddleware)
	if err := ginMiddlewares.EnableMetric(server); err != nil {
		log.GetLog().Panic("enable metric server", zap.Error(err))
	}

	server.Any("/health", func(ctx *gin.Context) {
		ctx.String(http.StatusOK, "hello, world")
	})

	h := handler.New(NewExecutableSchema(Config{Resolvers: &Resolver{}}))
	h.AddTransport(transport.Websocket{
		KeepAlivePingInterval: 10 * time.Second,
	})
	h.AddTransport(transport.GET{})
	h.AddTransport(transport.POST{})
	h.AddTransport(transport.Options{})
	h.AddTransport(transport.MultipartForm{})
	server.Any("/ui/", ginMiddlewares.FromStd(playground.Handler("GraphQL playground", "/graphql/query/")))
	server.Any("/query/", ginMiddlewares.FromStd(h.ServeHTTP))

	log.GetLog().Info("listening on http", zap.String("addr", addr))
	log.GetLog().Panic("httpServer exit", zap.Error(server.Run(addr)))
}

func LoggerMiddleware(ctx *gin.Context) {
	start := utils.Clock.GetUTCNow()

	ctx.Next()

	log.GetLog().Debug("request",
		zap.Duration("ts", utils.Clock.GetUTCNow().Sub(start)),
		zap.String("path", ctx.Request.RequestURI),
		zap.String("method", ctx.Request.Method),
	)
}
```

然后就可以在 gqlgen resolver 中直接取出 gin context：

```go
func (r *mutationResolver) SomeReolver(ctx context.Context) {
  ginCtx := ginMiddlewares.GetGinCtxFromStdCtx(ctx)
  // do something with ginCtx
}
```

### 1、增加中间件

gin 可以通过 `server.Use` 的方式添加中间件，下面是一个简单的例子，更多的用法可以参考文档。

```go
server.Use(LoggerMiddleware)

func LoggerMiddleware(ctx *gin.Context) {
	start := utils.Clock.GetUTCNow()

	ctx.Next()

	log.GetLog().Debug("request",
		zap.Duration("ts", utils.Clock.GetUTCNow().Sub(start)),
		zap.String("path", ctx.Request.RequestURI),
		zap.String("method", ctx.Request.Method),
	)
}
```

### 2、登录

可以采用 JWT token 来验证登录，用户登录时，生成一个 jwt token，内容形如：

```json
{
  "un": "ppcelery@gmail.com",
  "display_name": "Laisky",
  "exp": "1588295129",
  "uid": "25b3edc00000000000008888"
}
```

然后直接对该 JWT token 进行签名校验，以及提取 uid 就可以知道确定用户的身份了。

还是用 [go-utils](https://github.com/Laisky/gin-middlewares/blob/master/auth.go) 举例，首先需要用 secret 初始化 auth：

```go
import (
    ginMiddlewares "github.com/Laisky/gin-middlewares"
)

var (
    server = gin.New()
    auth   *ginMiddlewares.Auth
)

func SetupJWT(secret []byte) (err error) {
	if jwtLib, err = utils.NewJWT(
		utils.WithJWTSecretByte(secret),
		utils.WithJWTSignMethod(utils.SignMethodHS256),
	); err != nil {
		return errors.Wrap(err, "new jwt")
  }

	return nil
}
```

然后在实现 login 的 resolver 中，生成 JWT token：

```go
func (r *mutationResolver) BlogLogin(ctx context.Context, account string, password string) (user *blog.User, err error) {
	if user, err = blogDB.ValidateLogin(account, password); err != nil {
		log.GetLog().Debug("user invalidate", zap.Error(err))
		return nil, err
	}

	uc := &blog.UserClaims{
		StandardClaims: jwt.StandardClaims{
			Subject:   user.ID.Hex(),
			IssuedAt:  utils.Clock2.GetUTCNow().Unix(),
			ExpiresAt: utils.Clock.GetUTCNow().Add(7 * 24 * time.Hour).Unix(),
		},
		Username:    user.Account,
		DisplayName: user.Username,
	}

	if err = auth.SetLoginCookie(ctx, uc); err != nil {
		log.GetLog().Error("try to set cookie got error", zap.Error(err))
		return nil, errors.Wrap(err, "try to set cookies got error")
	}

	return user, nil
}
```

最后，在需要鉴权的接口处，调用 auth.ValidateAndGetUID(cxt) 即可：

```go
user, err := validateAndGetUser(ctx)
if err != nil {
  log.GetLog().Debug("user invalidate", zap.Error(err))
  return nil, err
}
```

## 五、坑

### 1、Int

目前遇到一个坑，gqlgen 在序列化 `int64` 的时候精度有问题， 所以在处理较长的整数的时候建议转为字符串来传递。

### 2、参数化
因为 query 是一个字符串，所以参数也要用拼接字符串的形式来传入， 如果值里面也有引号，处理起来就比较麻烦，而且还有注入的风险。

（下例中都以 js 发起调用为例，采用 [graphql-request](https://github.com/prisma-labs/graphql-request) 工具）

```js
let query = `mutation {
    amendBlogPost(post: {
        title: "abc",
        content: "\"123\"",
    })
}`
```

这时候最好就使用参数化的方式：

```js
  variables = {
      post: {
          title: "abc",
          content: "yoyoyo",
      },
  };
  request(this.state.action, `mutation($post: NewBlogPost!) {
        createBlogPost(
            post: $post,
        ) {
            name
        }
    }`, variables)
        .then(resp => {
            // ...
        })
        .catch(err => {
            // ...
        });

```

## 六、Relates

- [Golang 学习笔记](https://blog.laisky.com/p/golang/)
- [Golang 性能分析笔记](https://blog.laisky.com/p/go-perf/)
- [Golang 高性能结构化日志库 zap](https://blog.laisky.com/p/zap/)
- [[Golang] 使用 gqlgen 编写 GraphQL 后端](https://blog.laisky.com/p/gqlgen/)
- [使用 Golang 写一个取代 fluentd 的日志处理器](https://blog.laisky.com/p/go-fluentd/)
- [Go Memory Model](https://blog.laisky.com/p/gmm/)
- [Golang race 和一些常见错误写法](https://blog.laisky.com/p/golang-race/)