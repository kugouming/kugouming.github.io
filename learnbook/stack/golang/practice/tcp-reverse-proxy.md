# Golang实现Tcp反向代理服务器

## 什么是代理和反向代理

我们经常会听到“**代理**”、“**反向代理**”等这样的术语。如果你对它们的概念不是很清楚，那么可能会在具体场景下比较困惑。

本期内容，主要跟大家介绍一下，代理和反向代理是什么？有什么区别？以及它们都有什么作用和使用案例。

### 没有代理的请求过程

在没有代理服务器时，客户端和服务器之间的请求和响应过程。

![](_assets/08d990a92f22fb122047af8f261f0ea0_MD5.webp)

### 代理服务器

代理服务器是位于客户端和服务器之间的软件或硬件服务器。客户端连接到代理以请求真实服务器的连接。

从本质上讲，代理服务器（又名转发代理）是一种软件或硬件，可以代表客户端促进从其他服务器请求资源，从而使客户端与服务器匿名。

通常，转发代理用于缓存数据、过滤请求、记录请求或转换请求（通过添加/删除标头、加密/解密或压缩资源）。

转发代理可以通过代表客户端发送请求，在服务器隐藏客户端的身份。

![](_assets/c24f78a5ac5b1c6ed5d26efcfd35cb12_MD5.webp)

在上图的代理服务器示例中，客户端想要访问`juejin.com`访问某些内容，它向代理服务器发送请求，代理服务器再将请求发送到`juejin.com`的服务器，然后将`juejin.com`的响应数据再返回给客户端。

#### 代理服务器的作用

##### 缓存

使用代理服务器，可以带来缓存的好处。代理服务器可以缓存一些预计不会发生改变的数据，比如一些静态数据等。

当客户端再次发送相同的请求时，代理服务器可以将缓存数据直接返回，而不用再次请求服务器，来降低请求延迟，减少网络流量的优点。

![](_assets/4ab6c217f0c42bf753f86f7f22664e34_MD5.webp)

##### 匿名

代理服务器还有另一个作用，就是可以在服务器端隐藏客户端的身份。服务端只能看到请求方是代理服务器，而不知道具体发出请求的客户端。

![](_assets/536515f866e715fb61c791e907a0b6cc_MD5.webp)

##### 访问控制

代理服务器还可以用来做一些访问控制。比如在公司的网络出口建立代理服务器，因为所有员工的客户端请求都会通过代理服务器访问外部网络服务，可以在代理服务器中阻止某些恶意网站的访问，保护客户端免受恶意网站的侵害。

![](_assets/2097811a2fcb80cc65458f814c5fad99_MD5.webp)

##### 访问记录

同样，由于所有流量都通过代理，因此可以在代理服务器记录请求日志，这些日志可用于识别任何请求记录或对某些站点的缓存需求做出评估。

（所以说，如果你是使用公司的网络上网，那么只要公司想看，是能看到你所有的网络记录的。）

![](_assets/f022c1f6feecb92adba6adbc5e8d4cc1_MD5.gif)

### 反向代理服务器

反向代理代表的是服务器，在客户端看来反向代理就是一个普通的服务器。

反向代理将请求转发到一个或多个处理请求的普通服务器上。返回来自普通服务器的响应，就好像它直接来自原始服务器一样，让客户端不知道原始服务器的身份。

![](_assets/7c0fec3ac66f14e99de33d6079325da8_MD5.gif)

在上图反向代理的示例中，反向代理服务器隐藏了最终给客户端提供服务的服务器身份。对于客户端来说，只能看到反向代理服务器。

那么反向代理服务器有有哪些作用呢？
#### 反向代理服务器的作用

##### 缓存

反向代理服务器也可以在本地缓存那些不变的数据。因此，当另一个客户端发送对相同内容的请求时，它可以从其本地缓存中获取数据返回，而不用请求真实服务器。这样可以降低请求延迟、减少服务器负载。

![](_assets/cf69b9c821c819edcde31f982fa1d122_MD5.webp)

##### 匿名

代理最明显的作用就是匿名能力，反向代理也有匿名的作用。但是反向代理和代理的匿名有所区别，反向代理的匿名是为了让客户端不知道最终的目标服务器的身份。这种匿名能力可以保护服务端免受客户端的DDoS攻击等。

![](_assets/e69f06d0c42044360ecea75b857b10dd_MD5.gif)

##### 负载均衡

反向代理还有一个很大的作用便是做服务器之间的负载均衡。反向代理可以使用一些负载均衡算法，帮助在服务器之间均匀分配流量，从而提高可靠性和可用性。

![](_assets/d9c8e4e97112c086fb7573239e25d034_MD5.webp)

##### 灰度发布

很多时候我们的项目在发布新功能时，并不会将新功能全量发布。比如掘金社区新增了某界面功能，但是不确定用户对新功能使用的反应，需要在一部分用户中进行测试，而通过反向代理服务器可以进行设置，按照特定的模式请求到不同的服务器上。比如10%的请求到新服务。

##### 路由功能

反向代理还可以作为微服务架构中的网关或路由。它可以将映射到正在运行的实际服务上，例如，如果客户端要查询juejin.com的推荐文章，它会将请求路由到服务1，该服务器提供推荐文章查询服务，如果客户端是发布一篇新文章，则路由到服务器2，该服务提供文章发布功能。

### 总结

代理和反向代理从字面上很相似，但是在使用上却大有不同，两者都有匿名的能力，代理服务隐藏客户端的身份，而反向代理隐藏服务端的身份。

如果你想保护内网中的客户端，可以使用代理服务转发客户端的请求；如果你想保护服务端，则客户在服务器前面架设反向代理服务。

## 基于Go实现TCP反向代理

### 配置文件 (`config.js`)

```json
// 支持配置多组方向代理
[
	{
		"listen": 9000,       // 代理服务端口
		"forward": [          // 代理服务地址
			"127.0.0.1:9090",
			"127.0.0.1:9091"
		]
	}
]
```

### 主要实现 (`main.go`)

```go
package main

import (
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"

	jsoniter "github.com/json-iterator/go"
)

// Jsoniter 别名
var json = jsoniter.ConfigCompatibleWithStandardLibrary

// Config 配置
type Config struct {
	Listen  uint16   // 监听端口
	Forward []string // 转发的目标服务器配置
}

func main() {
	// 参数解析
	conf := flag.String("f", "config.json", "Config file")
	flag.Parse()

	// 创建信息通道 Channel
	psignal := make(chan os.Signal, 1)
	// 枚举可接受的信号，通过signal库写入到信号通道
	// ctrl+c -> SIGINT, kill -9 -> SIGKILL
	signal.Notify(psignal, syscall.SIGINT, syscall.SIGKILL)

	// 配置文件读取
	confBytes, err := ioutil.ReadFile(*conf)
	if err != nil {
		panic(fmt.Sprintf("Config file read fail, err:%+v", err))
	}

	// 配置文件解析
	var config []Config
	err = json.Unmarshal(confBytes, &config)
	if err != nil {
		panic(fmt.Sprintf("Conf Unmarshal fail, err:%+v", err))
	}

	// 执行代理
	go DoServer(config)

	// 通过监听信息通道的方式阻塞程序推出
	<-psignal

	log.Println("Byte~")
}

// DoServer 执行多代理服务处理
func DoServer(configs []Config) {
	for _, config := range configs {
		go handle(config)
	}
}

// handle 单代理服务处理
func handle(config Config) {
	// 负载均衡计数器
	var fid = -1

	// 获取转发地址
	var getForward = func() string {
		// 仅一个转发配置时
		if len(config.Forward) == 1 {
			return config.Forward[0]
		}

		// 存在多个转发配置时进行负载均衡
		fid++
		if fid >= len(config.Forward) {
			fid = 0
		}
		return config.Forward[fid]
	}

	// 链接切换处理
	var doConn = func(conn net.Conn) {
		defer conn.Close()

		forward := getForward()
		log.Println("Dest addr:", forward)

		fconn, err := net.Dial("tcp", forward)
		if err != nil {
			log.Printf("Dial fail, addr[%v] err[%v]\n", forward, err)
			return
		}
		defer fconn.Close()

		// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
		// 问：为什么这里会使用协程的方式执行`io.Copy`?
		// 答：因为协程可以并发执行，能够提高程序的并发性能。
		//
		// 详解：
		// 		`io.Copy` 函数用于复制数据从一个连接（conn）到另一个连接（fconn）。
		// 如果直接在主程序中执行这个操作，那么在数据传输期间，主程序会阻塞等待数据
		// 传输完成。而使用协程可以将这个操作放在一个单独的goroutine中执行，这样主
		// 程序可以继续处理其他任务，而不需要等待数据传输完成。
		// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
		go io.Copy(conn, fconn)
		io.Copy(fconn, conn)
	}

	// 启动服务链接
	lis, err := net.Listen("tcp", fmt.Sprintf("0.0.0.0:%v", config.Listen))
	if err != nil {
		panic(fmt.Sprintf("Start server[%v] fail, err:%v", config.Listen, err))
	}
	defer lis.Close()
	log.Println("Listen on", config.Listen)

	// 持续建立请求，并做请求切换
	for {
		conn, err := lis.Accept()
		if err != nil {
			continue
		}
		go doConn(conn)
	}
}

```

### 代码解释

?> 这段代码是一个基于Go语言的网络服务器程序，它实现了一个负载均衡器。

- **代码详细解释**

1. 函数定义：这是一个无参数的函数，接收一个`Config`类型的cfg参数，并且没有返回值。
2. 变量定义：
    - `getforward`: 是一个函数类型的变量，该函数返回一个字符串。它用于获取下一个要处理的连接。
    - `fid`: 是一个整数类型的变量，用于记录当前已经处理过的`Forward`列表的索引。
3. 判断条件：如果`cfg.Forward`列表的长度大于1，则定义`getforward`函数为返回列表中的下一个元素；否则，定义`getforward`函数为始终返回列表的第一个元素。
4. 函数`doconn`: 这是一个处理新连接的函数，它接收一个`net.Conn`类型的连接作为参数。该函数首先关闭传入的连接，然后根据`getforward`函数获取下一个要处理的连接地址，并尝试建立新的连接。如果连接失败，则打印错误信息并返回；否则，使用`io.Copy`函数将两个连接的数据互相转发。
5. 主程序部分：首先尝试在指定的地址上监听连接，如果失败则抛出异常并终止程序；如果成功，则打印出监听地址，并进入一个无限循环，等待新的连接。对于每个新连接，都会创建一个新的goroutine来处理该连接。

总体来说，这是一个基于TCP协议的负载均衡服务器程序。它将接收到的所有连接都转发到配置的多个目标地址中的一个进行处理。负载均衡策略是简单的轮询，如果目标地址列表长度大于1，则每次选择下一个地址；如果目标地址列表长度等于1，则始终选择该地址。

- **第一个io.Copy为什么用协程**

代码中的第一个`io.Copy`使用了协程（goroutine），这是因为协程可以并发执行，能够提高程序的并发性能。

在这个例子中，`io.Copy`函数用于复制数据从一个连接（`conn`）到另一个连接（`fconn`）。如果直接在主程序中执行这个操作，那么在数据传输期间，主程序会阻塞等待数据传输完成。而使用协程可以将这个操作放在一个单独的goroutine中执行，这样主程序可以继续处理其他任务，而不需要等待数据传输完成。

通过使用协程，可以实现并发执行多个操作，从而提高程序的并发性能和响应速度。