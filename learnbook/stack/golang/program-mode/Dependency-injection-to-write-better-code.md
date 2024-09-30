# 依赖注入编写更好代码

## 提示 1：接口，接口，接口

第一个提示至关重要。结合提示 2 和 3，它将显著提高代码库的可维护性。

始终为每个具有函数的结构体创建一个接口。这很重要，原因有以下几点：

- 定义接口封装了与结构体相关的行为。
- 它使测试变得更加轻松，并且可以使用像 GoMock 这样的库。
- 事实上，如果代码中没有接口，你将无法充分利用 Go 的功能，也无法使用 mock，这对于有效的测试至关重要。我会写一篇单独的教程，介绍如何使用 GoMock 创建一个稳固的测试策略，但现在我们先专注于接口。

### 示例

让我们创建一个具有两个函数的 SQL 仓库：CreateUser 和 GetUserLastname。

```go
package main  
  
import "database/sql"  
  
type IUserRepository interface {  
    CreateUser(  
        firstname string,  
        lastname string,  
    ) error  
    GetUserLastname(firstname string) (*string, error)  
}  
  
type userRepository struct {  
    db *sql.DB  
}  
  
func (r *userRepository) CreateUser(  
    firstname string,  
    lastname string,  
) error {  
    // TODO: interact with the db and create the user  
    return nil  
}  
  
func (r *userRepository) GetUserLastname(firstname string) (*string, error) {  
    // TODO: interact with the db and retrieve the information  
    return nil, nil  
}  
  
func InitUserRepository(db *sql.DB) IUserRepository {  
    return &userRepository{db: db}  
}
```

看起来很简单，但这是至关重要的。

从上到下：

- 我定义了包含所有函数签名的接口，并且它是公开的（首字母大写）。
- 我定义了我的结构体并将一些函数链接到它。结构体定义是私有的（小写），DB 实例也是。这两个选择的影响如下：仓库只能在当前包内定义，DB 变量只能设置一次。
- 最后，我创建了一个初始化我的结构体的函数。这个函数是公开的，并且返回接口类型。

遵循这种模式，你强制开发人员调用 `InitUserRepository` 来初始化 `userRepository`，确保接口得到遵守。

你可以将这种模式应用于任何具有函数的结构体。

## 提示 2：合并你的结构体和接口以提高可维护性

在我之前的示例中有两个函数，但想象一下你的应用程序在增长，你的用户仓库实现了 20 或 30 个函数。你的文件以及测试文件将会有数百行。这变得难以管理，代码审查也变得痛苦和混乱。

我有一个解决这个问题的方法。

在 Go 中，你可以合并你的结构体和接口。通过这样做，你可以为每个函数创建一个单独的文件。缺点是文件数量会急剧增加，但好处是显著的：

- 它减少了认知负荷：你只需处理小文件，专注于你正在处理的函数。
- 当在团队中工作时，代码审查变得更加容易。开发人员可以快速理解代码的每个部分，变更更加集中，减少了错误的风险。
- 你的测试文件只包含特定函数的测试，使它们更容易编写和维护。

### 实践

```go
package main  
  
import "database/sql"  
  
// file: createUser.go  
  
type ICreateUser interface {  
	CreateUser(  
	 firstname string,  
	 lastname string,  
	) error
}  
  
type createUser struct {  
 db *sql.DB  
}  
  
func (r *createUser) CreateUser(  
 firstname string,  
 lastname string,  
) error {  
 //TODO interact with the db and create user  
 return nil  
}  
  
func InitCreateUser(db *sql.DB) ICreateUser {  
 return &createUser{db: db}  
}  
  
// file: getUser.go  
  
type IGetUser interface {  
 GetUserLastname(firstname string) (*string, error)  
}  
type getUserLastname struct {  
 db *sql.DB  
}  
  
func (r *getUserLastname) GetUserLastname(firstname string) (*string, error) {  
 //TODO interact with the db and get the information  
 return nil, nil  
}  
  
func InitGetUserLastname(db *sql.DB) IGetUser {  
 return &getUserLastname{db: db}  
}  
  
// file: UserRepository.go  
  
type IUserRepository interface {  
 ICreateUser  
 IGetUser  
}  
  
type UserRepository struct {  
 ICreateUser  
 IGetUser  
}  
  
func InitUserRepository(db *sql.DB) IUserRepository  {  
 createUser := InitCreateUser(db)  
 getUserLastname := InitGetUserLastname(db)  
 return &UserRepository{  
  ICreateUser: createUser,  
  IGetUser:    getUserLastname,  
 }  
  
}  
  
// file: main.go  
  
func main() {  
 db := FAKE_init_db()  
  
 userRepository := InitUserRepository(db)  
 userRepository.GetUserLastname()  
 userRepository.CreateUser()  
}
```

我将重点解释 `UserRepository.go`，因为其他两个文件与我们在第 1 部分中讨论的内容相似。

首先，当我们查看 `IUserRepository` 接口时，我嵌入了我的两个接口，有效地将它们合并到 `IUserRepository` 中。对于 `UserRepository` 结构体也使用了相同的方法。

在 `InitUserRepository` 函数中，我需要初始化我的两个结构体函数（createUser 和 getUser），然后创建一个 `UserRepository` 的实例。

正如你在主程序中看到的，你可以直接从 `UserRepository` 实例访问这些函数。这种模式非常类似于我之前写过的组合模式——如果你感兴趣，可以进一步探索我的文章。

使用这种策略，你可以获得可维护性和灵活性，使你的代码更加模块化。你最终会得到小而集中的代码，每个代码只包含必要的依赖项。

## 提示 3：在依赖注入中只注入接口

依赖注入的概念可以被认为是一个“套娃”类或结构体，每一层都依赖于下一层。让我通过一个示例来解释，我们有一个 API，代码组织如下：

- handler → service → repository

handler 包含所有的 HTTP 逻辑并调用 service。service 包含业务逻辑并调用 repository。repository 管理与数据库的所有交互。在这种设置中，repository 是 service 的依赖项，service 是 handler 的依赖项。每个组件都依赖于直接在其下方的组件。

我们在主函数中初始化所有依赖项，逐层构建我们的逻辑。

### 仓库示例

```go
// userRepository.go  
  
package main  
  
import "database/sql"  
  
type IUserRepository interface {  
 GetUserLastname(firstname string) (*string, error)  
}  
  
type UserRepository struct {  
 db *sql.DB  
}  
  
func (r *UserRepository) GetUserLastname(firstname string) (*string, error) {  
 // Implement the logic here  
 return nil, nil  
}  
  
func InitUserRepository(db *sql.DB) IUserRepository {  
 return &UserRepository{db: db}  
}
```

在这里，`UserRepository` 依赖于 `sql.DB`。

### 服务示例

```go
// userService.go  
  
package main  
  
type IUserService interface {  
 GetUserLastname(firstname string) (*string, error)  
}  
  
type userService struct {  
 repo IUserRepository  
}  
  
func (s *userService) GetUserLastname(firstname string) (*string, error) {  
 return s.repo.GetUserLastname(firstname)  
}  
  
func InitUserService(repo IUserRepository) IUserService {  
 return &userService{repo: repo}  
}
```

这里至关重要的是注入 `IUserRepository` 接口，而不是具体的 `UserRepository` 结构体。这为控制反转（IoC）打开了大门，使测试变得更加容易，因为你可以在测试期间模拟仓库。

### 处理程序示例

```go
// userHandler.go  
  
package main  
  
type IUserHandler interface {  
 GetUserLastnameHandler(firstname string) string  
}  
  
type UserHandler struct {  
 service IUserService  
}  
  
func (h *UserHandler) GetUserLastnameHandler(firstname string) string {  
 // Handler logic  
 return ""  
}  
  
func InitUserHandler(service IUserService) IUserHandler {  
 return &UserHandler{service: service}  
}
```

`UserHandler` 依赖于 `IUserService`。

### 主程序示例

```go
// main.go  
  
func main() {  
 config := GetConfig()  
  
 db, err := InitDb(config.DbConfig)  
 if (err != nil) {  
  log.Fatal(err)  
 }  
  
 // Initialize dependencies  
 userRepository := InitUserRepository(db)  
 userService := InitUserService(userRepository)  
 userHandler := InitUserHandler(userService)  
  
 // Start the application  
 app := InitApp(userHandler)  
 app.Run()  
}
```

在主函数中：

- 我们初始化仓库。
- 我们初始化服务并注入仓库。
- 我们初始化处理程序并注入服务。

### 为什么注入接口而不是结构体？

注入接口而不是具体的结构体提供了一个关键优势：可测试性。当你注入一个接口时，你可以使用像 GoMock 这样的工具生成接口的模拟实现。这使你能够在测试服务或处理程序逻辑时轻松创建仓库的模拟行为，而无需依赖实际的数据库交互。

我使用 GoMock 来实现这一目的。你可以在这里探索它，注意 Uber 现在维护这个项目，之前有一些争议。

使用 GoMock，你可以生成模拟接口行为的文件。这使你能够隔离你的测试。例如，在测试处理程序时，你可以模拟仓库并避免实际的数据库调用。这确保了你的仓库逻辑是单独测试的，而你的服务和处理程序逻辑是使用模拟数据独立测试的。

## 结论

这些提示将显著改善你的 Go 开发工作流程，使你的代码更具可维护性、可测试性和灵活性。依赖注入是一种强大的工具，当有效使用时，可以提升你的项目质量。