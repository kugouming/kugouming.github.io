# gqlgen简介

## 概述

![](https://user-images.githubusercontent.com/46195831/89802919-0bb8ef00-db2a-11ea-8ba4-88e7a58b2fd2.png ':size=300x300')

`gqlgen`是一个基于schema文件构建的GO语言GraphQL服务器

虽然`gqlgen`的star不是最多的，但是相较于`graphql-go`、`graph-gophers/graphql-go`，个人觉得`gqlgen`是提供功能最全的，还支持文件的上传等功能(虽然感觉这东西还不如用rest方便)。目前从我周边了解到，很多项目都从`graphql-go`转移到使用`gqlgen`

**git仓库：**
- [https://github.com/99designs/gqlgen](https://github.com/99designs/gqlgen)

**文档：**
- [https://pkg.go.dev/github.com/99designs/gqlgen](https://pkg.go.dev/github.com/99designs/gqlgen)
- [https://gqlgen.com/](https://gqlgen.com/)

**入门示例：**
- [https://gqlgen.com/getting-started/](https://gqlgen.com/getting-started/)

**本文相关代码：**
- [https://github.com/ncfl/graphql](https://github.com/ncfl/graphql)

## 简单示例

### 1、下载安装

```bash
go get github.com/99designs/gqlgen
```

### 2、初始化项目

```bash
# 首先项目需要是一个go mod管理的的项目
go mod init graphql

# 初始化为gqlgen项目，下面命令二选一
# init对应的源码为https://github.com/99designs/gqlgen/blob/master/cmd/init.go，感兴趣的同学可以自行去看看
gqlgen init
go run github.com/99designs/gqlgen init
```

### 3、看下目录结构

```bash
├── go.mod
├── go.sum
├── gqlgen.yml               - gql配置文件，用以自动生成代码
├── graph
│   ├── generated            - 自动生成的运行代码
│   │   └── generated.go
│   ├── model                - 自动生成的结构体
│   │   └── models_gen.go
│   ├── resolver.go          - 解析类，里面其实就是一个结构体
│   ├── schema.graphqls      - schema.graphqls
│   └── schema.resolvers.go  - 解析类文件，也是主要的开发地方
└── server.go                - 可执行文件
```

### 4、启动服务

按照提示运行一下`server.go`，访问一下 `http://localhost:8080/` 看一下效果如下，当然暂时还不能运行。

```bash
go run server.go
```

下面的这个界面是用基于 [https://github.com/graphql/graphql-playground](https://github.com/graphql/graphql-playground) 这个生成的。有空可以了解一下。

![](https://image-static.segmentfault.com/847/686/847686879-0f2bbee888107c71 ':size=1000')

### 5、修改文件再启动

修改一下文件，让GraphQL的服务器运行一下。

```go
// 修改`schema.resolvers.go`文件如下

// 本地缓存
var todos []*model.Todo

// CreateTodo 添加数据
func (r *mutationResolver) CreateTodo(ctx context.Context, input model.NewTodo) (*model.Todo, error) {
    val, _ := rand.Int(rand.Reader, big.NewInt(100))
    todo := &model.Todo{
        Text: input.Text,
        ID:   fmt.Sprintf("T%d", val),
        User: &model.User{ID: input.UserID, Name: "user " + input.UserID},
    }
    todos = append(todos, todo)
    return todo, nil
}

// Todos 查询
func (r *queryResolver) Todos(ctx context.Context) ([]*model.Todo, error) {
    return todos, nil
}
```

### 6、运行一下

在界面上输入如下，先运行mutation添加数据

```graphql
# Write your query or mutation here
mutation createTodo {
  createTodo(input:{text:"todo", userId:"1"}) {
    user {
      id
    }
    text
    done
  }
}
```

在运行query查询数据

```graphql
query findTodos {
    todos {
      text
      done
      user {
        name
      }
    }
}
```

## 配置文件
配置文件详解可以看 [https://gqlgen.com/config/](https://gqlgen.com/config/)
配置文件的解析类为 `https://github.com/99designs/gqlgen/blob/master/codegen/config/config.go`，感兴趣的同学可以自行查阅

下面讲解以上文init生成的默认的`qlgen.yml`文件为例

```yaml
# 扫描的schema文件地址和文件格式
schema:
  - graph/*.graphqls

# gqlgen服务器代码自动生成的目录和文件名
exec:
  filename: graph/generated/generated.go
  package: generated

# 可选配置
# 如果需要用到Apollo federation指令则需要配置
# 关于Apollo federation指令可以查阅 https://dgraph.io/docs/master/graphql/federation/
# 打开之后schema文件中会增加如下内容：
# directive @external on FIELD_DEFINITION
# directive @requires(fields: _FieldSet!) on FIELD_DEFINITION
# directive @provides(fields: _FieldSet!) on FIELD_DEFINITION
# directive @key(fields: _FieldSet!) on OBJECT | INTERFACE
# directive @extends on OBJECT
# scalar _Any
#
# federation:
#   filename: graph/generated/federation.go
#   package: generated

# graphql结构体代码自动生成的目录和文件名
model:
  filename: graph/model/models_gen.go
  package: model

# 可选配置
# 解析文件代码自动生成的的目录和文件名
resolver:
  layout: follow-schema
  dir: graph
  package: graph

# 可选配置
# 当扫描autobind时，发现同一个结构体名出现多个的时候，则按照配置的tag名字加载对应的结构体
# 但是这里验证来看，同一个结构体名出现多个的时候，只会加载autobind配置的第一个路径，不会按照tag匹配。不建议使用
# 这里不太确定，如若有误，感谢指正
# struct_tag: json

# 可选配置
# 数组类型，是否适用为指针类型，即是否需要将 []*thing 替换为 []thing
# omit_slice_element_pointers: false

# 可选配置
# 是否跳过验证阶段，代码自动生成之后，会验证自动生成的代码是否有误，默认需要验证
# skip_validation: true

# 可选配置
# 扫面下面路径，如果发现和需要生成的结构体名字相同，则使用扫描到的结构体，否则生成对应结构体
autobind:
  - "graphql/gqlgen/graph/model"

# GraphQL声明的变量与系统的结构体的映射关系
# 可以根据需要配置字段是否需要解析
# 这里每个字段的resolver: true的时候，都会在自动生成的resolve中生成一个方法，如果请求字段中包含该字段，则会进入到对应的方法
models:
  ID:
    model:
      - github.com/99designs/gqlgen/graphql.ID
      - github.com/99designs/gqlgen/graphql.Int
      - github.com/99designs/gqlgen/graphql.Int64
      - github.com/99designs/gqlgen/graphql.Int32
  Int:
    model:
      - github.com/99designs/gqlgen/graphql.Int
      - github.com/99designs/gqlgen/graphql.Int64
      - github.com/99designs/gqlgen/graphql.Int32

```

## starwars星球大战
之前在 [https://graphql.bootcss.com/learn/](https://graphql.bootcss.com/learn/) 学习的时候都是根据starwars作为示例，这里也基于gqlgen生成starwars服务

gqlgen自身也生成了starwars的示例：[https://github.com/99designs/gqlgen/tree/master/example/starwars](https://github.com/99designs/gqlgen/tree/master/example/starwars)
但是个人感觉不适合入门，内部自定义一些结构体，导致理解上有点难度，我这边自己也是实现了一套个人觉得更好理解的，只变更数据层和逻辑层，不涉及model和generate的改动。

代码如下：[https://github.com/ncfl/graphql/tree/main/gqlgen-starwar](https://github.com/ncfl/graphql/tree/main/gqlgen-starwar)

### 1、自动生成代码
在对应目录下添加`gqlgen.yml`和`schema.graphql`文件，同目录下运行如下命令之一即可生成代码

```bash
gqlgen
go run github.com/99designs/gqlgen
```

`gqlgen.yml`如下，也可见 [https://github.com/ncfl/graphql/blob/main/gqlgen-starwar/gqlgen.yml](https://github.com/ncfl/graphql/blob/main/gqlgen-starwar/gqlgen.yml)


```yaml
schema:
  - ./*.graphql

exec:
  filename: generated/generated.go
  package: generated

model:
  filename: model/model.go
  package: model

resolver:
  layout: follow-schema
  dir: resolve
  package: resolve

autobind:
  - "graphql/gqlgen-starwar/model"

models:
  ID:
    model:
      - github.com/99designs/gqlgen/graphql.ID
      - github.com/99designs/gqlgen/graphql.Int
      - github.com/99designs/gqlgen/graphql.Int64
      - github.com/99designs/gqlgen/graphql.Int32
  Int:
    model:
      - github.com/99designs/gqlgen/graphql.Int
      - github.com/99designs/gqlgen/graphql.Int64
      - github.com/99designs/gqlgen/graphql.Int32
  Droid:
    fields:
      friendsConnection:
        resolver: true
      friends:
        resolver: true
  Human:
    fields:
      friendsConnection:
        resolver: true
      friends:
        resolver: true
      height:
        resolver: true
  FriendsConnection:
    fields:
      friends:
        resolver: true
      edges:
        resolver: true
  Starship:
    fields:
      length:
        resolver: true
```

`schema.graphql`如下，也可见：[https://github.com/ncfl/graphql/blob/main/gqlgen-starwar/schema.graphql](https://github.com/ncfl/graphql/blob/main/gqlgen-starwar/schema.graphql)


```graphql
# The query type, represents all of the entry points into our object graph
type Query {
    hero(episode: Episode = NEWHOPE): Character
    reviews(episode: Episode!, since: Time): [Review!]!
    search(text: String!): [SearchResult!]!
    character(id: ID!): Character
    droid(id: ID!): Droid
    human(id: ID!): Human
    starship(id: ID!): Starship
}
# The mutation type, represents all updates we can make to our data
type Mutation {
    createReview(episode: Episode!, review: ReviewInput!): Review
}

# A humanoid creature from the Star Wars universe
type Human implements Character {
    # The ID of the human
    id: ID!
    # What this human calls themselves
    name: String!
    # Height in the preferred unit, default is meters
    height(unit: LengthUnit = METER): Float!
    # Mass in kilograms, or null if unknown
    mass: Float
    # This human's friends, or an empty list if they have none
    friends: [Character!]
    # The friends of the human exposed as a connection with edges
    friendsConnection(first: Int, after: ID): FriendsConnection!
    # The movies this human appears in
    appearsIn: [Episode!]!
    # A list of starships this person has piloted, or an empty list if none
    starships: [Starship!]
}
# An autonomous mechanical character in the Star Wars universe
type Droid implements Character {
    # The ID of the droid
    id: ID!
    # What others call this droid
    name: String!
    # This droid's friends, or an empty list if they have none
    friends: [Character!]
    # The friends of the droid exposed as a connection with edges
    friendsConnection(first: Int, after: ID): FriendsConnection!
    # The movies this droid appears in
    appearsIn: [Episode!]!
    # This droid's primary function
    primaryFunction: String
}
# A connection object for a character's friends
type FriendsConnection {
    # The total number of friends
    totalCount: Int!
    # The edges for each of the character's friends.
    edges: [FriendsEdge!]
    # A list of the friends, as a convenience when edges are not needed.
    friends: [Character!]
    # Information for paginating this connection
    pageInfo: PageInfo!
}
# An edge object for a character's friends
type FriendsEdge {
    # A cursor used for pagination
    cursor: ID!
    # The character represented by this friendship edge
    node: Character
}
# Information for paginating this connection
type PageInfo {
    startCursor: ID!
    endCursor: ID!
    hasNextPage: Boolean!
}
# Represents a review for a movie
type Review {
    # The number of stars this review gave, 1-5
    stars: Int!
    # Comment about the movie
    commentary: String
    # when the review was posted
    time: Time
}
# The input object sent when someone is creating a new review
input ReviewInput {
    # 0-5 stars
    stars: Int!
    # Comment about the movie, optional
    commentary: String
    # when the review was posted
    time: Time
}
type Starship {
    # The ID of the starship
    id: ID!
    # The name of the starship
    name: String!
    # Length of the starship, along the longest axis
    length(unit: LengthUnit = METER): Float!
    # coordinates tracking this ship
    history: [[Int!]!]!
}

# The episodes in the Star Wars trilogy
enum Episode {
    # Star Wars Episode IV: A New Hope, released in 1977.
    NEWHOPE
    # Star Wars Episode V: The Empire Strikes Back, released in 1980.
    EMPIRE
    # Star Wars Episode VI: Return of the Jedi, released in 1983.
    JEDI
}
# A character from the Star Wars universe
interface Character {
    # The ID of the character
    id: ID!
    # The name of the character
    name: String!
    # The friends of the character, or an empty list if they have none
    friends: [Character!]
    # The friends of the character exposed as a connection with edges
    friendsConnection(first: Int, after: ID): FriendsConnection!
    # The movies this character appears in
    appearsIn: [Episode!]!
}
# Units of height
enum LengthUnit {
    # The standard unit around the world
    METER
    # Primarily used in the United States
    FOOT
}
union SearchResult = Human | Droid | Starship
scalar Time
```

### 2、添加可执行方法

首先添加基础数据，如果是正经服务，这些数据应该源自数据库或者其他接口，如果请求量较大，建议拉取的时候本地缓存。
在`resolver.go`中添加内容，详情可见:[https://github.com/ncfl/graphql/blob/main/gqlgen-starwar/resolve/resolver.go](https://github.com/ncfl/graphql/blob/main/gqlgen-starwar/resolve/resolver.go)


```go
package resolve

import (
    "graphql/gqlgen-starwar/generated"
    "graphql/gqlgen-starwar/model"

    "github.com/golang/protobuf/proto"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
    humans    map[string]model.Human
    droid     map[string]model.Droid
    starships map[string]model.Starship
    reviews   map[model.Episode][]*model.Review
}

func NewResolver() generated.Config {
    r := Resolver{}
    r.humans = map[string]model.Human{
        "1000": {
            ID:        "1000",
            Name:      "Luke Skywalker",
            Friends:   []model.Character{model.Human{ID: "1002"}, model.Human{ID: "1003"}, model.Droid{ID: "2000"}, model.Droid{ID: "2001"}},
            AppearsIn: []model.Episode{model.EpisodeNewhope, model.EpisodeEmpire, model.EpisodeJedi},
            Height:    1.72,
            Mass:      proto.Float64(77),
            Starships: []*model.Starship{{ID: "3001"}, {ID: "3003"}},
        },
        "1001": {
            ID:        "1001",
            Name:      "Darth Vader",
            Friends:   []model.Character{model.Human{ID: "1004"}},
            AppearsIn: []model.Episode{model.EpisodeNewhope, model.EpisodeEmpire, model.EpisodeJedi},
            Height:    2.02,
            Mass:      proto.Float64(136),
            Starships: []*model.Starship{{ID: "3002"}},
        },
        "1002": {
            ID:        "1002",
            Name:      "Han Solo",
            Friends:   []model.Character{model.Human{ID: "1000"}, model.Human{ID: "1003"}, model.Droid{ID: "2001"}},
            AppearsIn: []model.Episode{model.EpisodeNewhope, model.EpisodeEmpire, model.EpisodeJedi},
            Height:    1.8,
            Mass:      proto.Float64(80),
            Starships: []*model.Starship{{ID: "3000"}, {ID: "3003"}},
        },
        "1003": {
            ID:        "1003",
            Name:      "Leia Organa",
            Friends:   []model.Character{model.Human{ID: "1000"}, model.Human{ID: "1002"}, model.Droid{ID: "2000"}, model.Droid{ID: "2001"}},
            AppearsIn: []model.Episode{model.EpisodeNewhope, model.EpisodeEmpire, model.EpisodeJedi},
            Height:    1.5,
            Mass:      proto.Float64(49),
        },
        "1004": {
            ID:        "1004",
            Name:      "Wilhuff Tarkin",
            Friends:   []model.Character{model.Human{ID: "1001"}},
            AppearsIn: []model.Episode{model.EpisodeNewhope},
            Height:    1.8,
            Mass:      proto.Float64(0),
        },
    }

    r.droid = map[string]model.Droid{
        "2000": {
            ID:              "2000",
            Name:            "C-3PO",
            Friends:         []model.Character{model.Human{ID: "1000"}, model.Human{ID: "1002"}, model.Human{ID: "1003"}, model.Droid{ID: "2001"}},
            AppearsIn:       []model.Episode{model.EpisodeNewhope, model.EpisodeEmpire, model.EpisodeJedi},
            PrimaryFunction: proto.String("Protocol"),
        },
        "2001": {
            ID:              "2001",
            Name:            "R2-D2",
            Friends:         []model.Character{model.Human{ID: "1000"}, model.Human{ID: "1002"}, model.Human{ID: "1003"}},
            AppearsIn:       []model.Episode{model.EpisodeNewhope, model.EpisodeEmpire, model.EpisodeJedi},
            PrimaryFunction: proto.String("Astromech"),
        },
    }

    r.starships = map[string]model.Starship{
        "3000": {
            ID:   "3000",
            Name: "Millennium Falcon",
            History: [][]int{
                {1, 2},
                {4, 5},
                {1, 2},
                {3, 2},
            },
            Length: 34.37,
        },
        "3001": {
            ID:   "3001",
            Name: "X-Wing",
            History: [][]int{
                {6, 4},
                {3, 2},
                {2, 3},
                {5, 1},
            },
            Length: 12.5,
        },
        "3002": {
            ID:   "3002",
            Name: "TIE Advanced x1",
            History: [][]int{
                {3, 2},
                {7, 2},
                {6, 4},
                {3, 2},
            },
            Length: 9.2,
        },
        "3003": {
            ID:   "3003",
            Name: "Imperial shuttle",
            History: [][]int{
                {1, 7},
                {3, 5},
                {5, 3},
                {7, 1},
            },
            Length: 20,
        },
    }

    r.reviews = map[model.Episode][]*model.Review{}

    return generated.Config{
        Resolvers: &r,
    }
}
```

构建gqlgen服务器，添加可执行`main`方法，如下：

```go
package main

import (
    "graphql/gqlgen-starwar/generated"
    "graphql/gqlgen-starwar/resolve"
    "log"
    "net/http"

    "github.com/99designs/gqlgen/graphql/handler"
    "github.com/99designs/gqlgen/graphql/playground"
)

const defaultPort = "8080"

func main() {

    srv := handler.NewDefaultServer(generated.NewExecutableSchema(resolve.NewResolver()))

    http.Handle("/", playground.Handler("GraphQL playground", "/query"))
    http.Handle("/query", srv)

    log.Printf("connect to http://localhost:%s/ for GraphQL playground", defaultPort)
    log.Fatal(http.ListenAndServe(":"+defaultPort, nil))
}
```

至此运行上面的`main`方法，就可以访问`localhost:8080`，此时界面上对应的docs和schema即是完整的用例，只不过内部逻辑暂未实现而已。

### 3、完成schema.resolvers.go逻辑

这里以最简单的`Human`，`Character`，`Search`为例，如下，逻辑也很简单，就是上文的数据中根据参数返回对应的数据而已

完整的代码可见: [https://github.com/ncfl/graphql/blob/main/gqlgen-starwar/resolve/schema.resolvers.go](https://github.com/ncfl/graphql/blob/main/gqlgen-starwar/resolve/schema.resolvers.go)

```go
func (r *queryResolver) Search(ctx context.Context, text string) ([]model.SearchResult, error) {
    var l []model.SearchResult
    for _, h := range r.humans {
        if strings.Contains(h.Name, text) {
            l = append(l, h)
        }
    }
    for _, d := range r.droid {
        if strings.Contains(d.Name, text) {
            l = append(l, d)
        }
    }
    for _, s := range r.starships {
        if strings.Contains(s.Name, text) {
            l = append(l, s)
        }
    }
    return l, nil
}

func (r *queryResolver) Character(ctx context.Context, id string) (model.Character, error) {
    if h, ok := r.humans[id]; ok {
        return &h, nil
    }
    if d, ok := r.droid[id]; ok {
        return &d, nil
    }
    return nil, nil
}

func (r *queryResolver) Droid(ctx context.Context, id string) (*model.Droid, error) {
    if d, ok := r.droid[id]; ok {
        return &d, nil
    }
    return nil, nil
}

func (r *queryResolver) Human(ctx context.Context, id string) (*model.Human, error) {
    if h, ok := r.humans[id]; ok {
        return &h, nil
    }
    return nil, nil
}
```

### 4、验证

待所有逻辑全部实现完成之后，即可将 [https://graphql.bootcss.com/learn/](https://graphql.bootcss.com/learn/) 中的示例在自己的搭建的服务器上进行验证，如下：

![](https://image-static.segmentfault.com/284/161/2841610997-e3e8c2b4ea15b262 ':size=1000')

## 总结

- gqlgen是基于schema文件自动生成的代码，类似于模板模式开发
- 因为上面导致代码开发量减少跟多，专注于配置文件和reslove文件即可，加快开发
- 也同样因为上面，自动生成代码导致内部逻辑被隐藏，进而导致内部细节不够透明
- 不管从支持的功能，还是迭代开发，个人觉得gqlgen都是首选
- 但是由于支持的功能较多，所以想要深入使用，门槛较高