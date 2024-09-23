# 流量回放工具-GoReplay

## 介绍

GoReplay 是一个开源网络监控工具，可以将实时 HTTP 流量捕获并重放到测试环境。

应用成熟的过程中，测试所需的工作量往往会成倍增长。针对这个问题，GoReplay 为使用者提供了重用现有通信量进行测试的简单方法。它可以在不改动产品基础结构、且不影响现有流量的情况下，对这些流量进行分析和记录，从而增强使用者对代码部署、配置和基础结构进行更改的信心。

![](_assets/Pasted%20image%2020240923100055.png)

## 下载及安装

下载地址：[https://github.com/buger/goreplay/releases](https://github.com/buger/goreplay/releases)

下载后将包放到需要录制的服务，同服务器下，并解压

## 参数介绍

```bash
–input-raw                 # 用来捕捉http流量，需要指定ip地址和端口  
–input-file                # 接收流量  
–output-file               # 保存流量的文件  
–input-tcp                 # 将多个Goreplay实例获取的流量聚集到一个Goreplay实例  
–output-stdout             # 终端输出  
–output-tcp                # 将获取的流量转移至另外的Goreplay实例  
–output-http               # 流量释放的对象server，需要指定IP地址和端口  
–output-file               # 录制流量时指定的存储文件  
–http-disallow-url         # 不允许正则匹配的URL  
–http-allow-header         # 允许的Header头  
–http-disallow-header      # 不允许的Header头  
–http-allow-method         # 允许的请求方法，传入值为GET，POST，OPTIONS等  
–input-file-loop           # 无限循环，而不是读完这个文件就停止了  
–output-http-workers.      # 并发请求数  
–stats --out-http-stats.   # 每5秒输出一次TPS数据（查看统计信息）  
–split-outputtrue          # 按照轮训方式分割流量  
–output-http-timeout30s    # http超时30秒时间设置,默认是5秒
```

## 命令行使用

```bash
#捕捉流量，并通过终端输出，将监控8000端口上所有的流量，并通过终端stdout输出  
sudo ./gor --input-raw:8000--output-stdout  
  
#捕捉流量，并实时回放到另一台服务器的相同服务上，将8000端口的流量实时同步访问http://example:8001服务器，你在访问第一台服务器时，将看到流量以相同的顺序请求到第二台。  
sudo ./gor --input-raw:8000--output-http="http://localhost:8001"  
  
#将捕捉的流量存到文件中，并回放到其它服务器  
#首先保存流量，将8000端口的流量，保存到requests.gor文件中(必须是.gor后缀，其它后缀回放时有问题)。  
sudo ./gor --input-raw:8000--output-file= requests.gor  
#然后回放保存的流量 将保存在request.gor中的请求，通过相同的时间顺序回放到服务器http://localhost:8001  
sudo ./gor --input-file requests.gor --output-http= "http://localhost:8001"
```

## GoReplay的限速和请求过滤

### 限速机制

```bash
#限制每秒的请求数  
sudo ./gor --input-tcp :28020 --output-http "http://localhost:8001|10"# (每秒请求数限制10个以内)  
sudo ./gor --input-raw :80 --output-tcp "http://localhost:8001|10%" # (每秒请求数限制10%以内)

#基于Header或URL的参数限制一些请求，为指定的Header或者URL的请求设定限制的百分比  
sudo ./gor --input-raw :80 --output-tcp "http://localhost:8001|10%" --http-header-limiter "X-API-KEY: 10%"  
sudo ./gor --input-raw :80 --output-tcp "http://localhost:8001|10%" --http-param-limiter "api_key: 10%"
```

### 请求过滤

```bash
#当需要捕捉指定路径的请求流量时，可以使用该机制，如只同步/api路径下的请求  
sudo ./gor --input-raw :8080 --output-http staging.com --http-allow-url /api
```

## Demo

```bash
#如果是性能测试，可以不考虑请求的顺序和速率，并且要求无限循环  
# --input-file 从文件中获取请求数据，重放的时候 100x 倍速  
# --input-file-loop 无限循环，而不是读完这个文件就停止  
# --output-http 发送请求到 http://host2.com  
# --output-http-workers 并发 100 发请求  
# --stats --output-http-stats 每 5 秒输出一次 TPS 数据  
./gor--input-file'request.gor|10000%'--input-file-loop--output-http'http://localhost:8001'--output-http-workers100--stats--output-http-stats  
  
#抓取80端口的HTTP请求，只抓取URL是/api/v1的，并输出到终端  
./gor --input-raw:80--http-allow-url'/api/v1'--output-stdout  
  
#抓取80端口的所有请求，并保存到文件，实际会分批保存为request_0.gor,request_1.gor这种文件名  
./gor --input-raw:80--output-file'request.gor'  
  
#流量回放到多个站点（复制引流）  
./gor --input-tcp:28020--output-http"http://localhost:8001"--output-http"http://localhost:8002"  
  
#按照轮询方式分割流量（平分流量）  
  
./gor --input-raw:80--output-http"http://localhost:8001"--output-http"http://localhost:8002"--split-outputtrue  
  
#HTTP超时设置  
./gor --input-tcp replay.local:80--output-http http://staging.com --output-http-timeout30s  
  
#性能测试（表示放大2倍速度来回放）  
./gor --input-file"requests.gor|200%"--output-http"http://localhost:8001"  
  
#回放速率不超过10QPS（绝对值）  
./gor --input-tcp:80--output-http"http://localhost:8001|10"  
  
#回放不超过原流量的10%（百分比，这里是总流量的占比）  
./gor --input-raw:80--output-tcp"http://localhost:8001|10%"  
  
#禁止的URL正则（除/api之外的请求）  
./gor --input-raw:8080--output-http"http://localhost:8001"--http-disallow-url/api  
  
#基于方法（表示只允许GET，OPTIONS的请求）  
./gor --input-raw:80--output-http"http://localhost:8001"--http-allow-method GET --http-allow-method OPTIONS  
  
#基于请求头  
./gor --input-raw:8080--output-http"http://localhost:8001"--http-allow-header api-version:^1\.0\d  
./gor --input-raw:8080--output-http"http://localhost:8001"--http-disallow-header"User-Agent: Replayed by Gor"  
  
#重写请求  
./gor --input-raw:8080--output-http"http://localhost:8001"--http-rewrite-url/v1/user/([^\\/]+)/ping:/v2/user/$1/ping  
  
#设置URL参数  
./gor --input-raw:8080--output-http"http://localhost:8001"--http-set-param api_key=1  
  
#设置HEADER  
./gor --input-raw:80--output-http"http://localhost:8001"--http-header"User-Agent: Replayed by Gor"--http-header"Enable-Feature-X: true"  
  
#导出到ES  
./gor --input-raw:8000--output-http"http://localhost:8001"--output-http-elasticsearch localhost:9200/gor  
  
#基于Header或URL参数值的一致限制  
# Limit based on header value  
./gor --input-raw:80--output-tcp"http://localhost:8001|10%"--http-header-limiter"X-API-KEY: 10%"  
# Limit based on header value  
./gor --input-raw:80--output-tcp"http://localhost:8001|10%"--http-param-limiter "api_key: 10%"
```