# 用 Protobuf 读写数据

## 概述

1. 编写传输消息的数据结构文件
2. 用protoc工具生成相应的类
3. 发送方调用类中SerializeToString()方法，将消息序列化成字符串
4. 接收方调用类中ParseFromString(data)方法，解析传过来的数据

## 下载编译工具

1. 环境：win10，py2.7
2. `https://github.com/google/protobuf/releases/tag/v3.0.0`
3. 下载：`protoc-3.0.0-win32.zip`
4. 解压后，`bin`目录下有个`protoc.exe`工具

## 读写数据

### 编写xxx.proto文件

```
# person_info.proto

message Question {
    string question_id = 1;
    enum Cate {
        ALL   = 0;
        LIFE  = 1;
        HOME  = 2;
    }
    Cate cate = 2;
}

message Person {
    required string name = 1;
    required string tel = 2;
    repeated Question question = 1;
}
```

### 用protoc工具生成py文件

```bash
protoc.exe --python_out=. ./person_info.proto
```

### 导入py文件读写数据

```python
# -*- coding: utf-8 -*-

import person_info_pb2

# 填充数据
person = person_info_pb2.Person()
person.name = "ns2250225"
person.tel = "18826400910"

## 填充数组数据
question = person_info_pb2.Question()
question.question_id = "sdsdsdsdsd"
question.cate = person_info_pb2.Question.HOME

person.question.append(question)
person.question.append(question)

# 将需要发送的数据结构序列化成字符串
send_messages = person.SerializeToString()
print send_messages

# 接收数据
person2 = person_info_pb2.Person()
person2.ParseFromString(send_messages)
print person2.name
print person2.tel
```

