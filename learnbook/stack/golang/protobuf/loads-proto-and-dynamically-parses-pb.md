# 加载 Proto 动态解析 PB

> 在业务中经常有这种需求，给某某服务加一个命令字，用来接收的RPC 请求来的protobuffer数据，按照某个pb数据定义反序列化之后，转成JSON 再传输到下游服务。

如果安装我们原来的方案，可能需要每次都修改pb文件，再编译服务再上线

## 新旧方式对比

### 旧方式
- 修改 proto 文件。
- protoc 产出 `*.pb.go`文件，
- 编译服务。

但是实际上我们可以在 golang 代码里面自动解析 proto 文件，整个流程在服务内部自动完成。

### 新方式
- 启动服务（从配置服务器加载 proto 文件）
- 通过 proto 文件产生的一个 `FileDescriptor` ，进而根据对象名称找到 `MessageDescriptor`
- 直接用 `MessageDescriptor`

可以看到新的方式 ,本质就是需要实现动态pb解析和协议转换的工作。

## 示例演示

### Proto 文件定义

> 文件路径：./proto/test.proto

```proto
syntax = "proto2";

package test;

message AddFriendReq {
    repeated string phone = 1;
    optional string keyword =2;
}
```

### 第三方依赖

- [Go Protocol Buffers 的反射](https://github.com/jhump/protoreflect)


## 完整代码

```go
package main

import (
    "bytes"
    "fmt"

    // 这个包是从上面的pb文件生产的，用来做序列化测试
    testpb "github.com/lilien1010/my_gotest/proto"
    
    "github.com/golang/protobuf/proto"
    "github.com/jhump/protoreflect/desc/protoparse"
    "github.com/jhump/protoreflect/desc/protoprint"
    "github.com/jhump/protoreflect/dynamic"
)

func main() {

    Filename := "./proto/test.proto"

    Parser := protoparse.Parser{}
    
    // 加载并解析 proto文件,得到一组 FileDescriptor
    descs, err := Parser.ParseFiles(Filename)
    if err != nil {
        fmt.Printf("ParseFiles err=%v", err)
        return
    }
        
    // 这里的代码是为了测试打印
    Printer := &protoprint.Printer{}
    
    var buf bytes.Buffer
    Printer.PrintProtoFile(descs[0], &buf)
    fmt.Printf("descsStr=%s\n", buf.String())
      
    // descs 是一个数组，这里因为只有一个文件，就取了第一个元素.
    // 通过proto的message名称得到MessageDescriptor 结构体定义描述符
    msg := descs[0].FindMessage("test.AddFriendReq")
    
    // 再用消息描述符，动态的构造一个pb消息体
    dmsg := dynamic.NewMessage(msg)
        
    // pb二进制消息 做反序列化 到 test.AddFriendReq 这个消息体
    err = dmsg.Unmarshal(GetMessageBin())
        
    // 把test.AddFriendReq 消息体序列化成 JSON 数据
    jsStr, _ := dmsg.MarshalJSON()
    
    fmt.Printf("jsStr=%s\n", jsStr) 
}

// 可能从远程服务得到一些二进制数据，这里为了方便测试，用本地序列化的pb
func GetMessageBin() []byte {
    req := &testpb.AddFriendReq{
        Phone:   []string{"13145990022", "131313233"},
        Keyword: proto.String("I am good"),
    } 

    bin, err := proto.Marshal(req) 
    if err != nil {
        fmt.Printf("bin=%v,err=%v", bin, err)
    } 
    return bin
}
```

## 拓展

!> 基于该机制，开发一个小工具，小工具可以支持以下能力：<br /> 1. 基于 Proto 和 原始数据生成PB数据；<br /> 2. 基于 Proto 和 PB 数据解析为Json数据。