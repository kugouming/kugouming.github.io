# SSH远程端口转发（打洞）

![](_assets/Pasted%20image%2020240830160258.png)
## 1、 简介
`SSH(全称为Secure Shell)端口转发`也被称作`SSH隧道(SSH Tunnel)`或者“`打洞`”，因为它们是通过SSH登录之后，在SSH客户端与服务端之间建立一个隧道进行通信。SSH是通过加密传输数据的，所以非常安全。

远程端口转发(Remote Port Forwarding)，如上图。应用场景：`通过访问远程网络中的某端口从而访问本地网络的指定端口`。比如本地主机L1中在端口18702运行了一个服务，这时我们可以通过SSH从本地登录远程主机中建立SSH隧道，这时就可以通过访问远程主机的指定端口访问本地的服务。

> 比如调试开发版小程序（小程序调用本机api接口），可将本地api接口服务映射到远端主机，从而实现在手机端的开发版小程序可访问到本机的api

## 2、 前期准备
- 位于不同网络的本地主机L1和远程主机S1以及可访问互联网的其他主机O1、O2、O3……
- 本地主机L1中指定端口(以18702为例)运行一个服务，这里以nodeServer服务为例，原始代码如下
- L1、O1、O2、O3……可通过网络访问远程主机S1

建立`greeting.js`内容如下：

```js
const http = require('http');

const server = http.createServer(function (request, response) {
  response.writeHead(200, {
    "Content-Type": "text/plain"
  });
  response.end("Hello H\n");
});

try {
  server.listen(18702);
} catch (e) {
  console.log('start server error', e);
}

```

在本机启动服务，启动方式如下：

```bash
node ./greeting.js
```

![](_assets/Pasted%20image%2020240830160537.png)
## 3、 远程访问
在L1本地主机执行如下命令

```bash
# 将本地的18702端口连接到远端主机lxh.space的8888端口
ssh -fNR localhost:8888:localhost:18702 root@lxh.space
# 本地访问远程主机的8888端口相当于访问本机的18702端口
curl f.lxh.space
```

![](_assets/Pasted%20image%2020240830160608.png)
如上图，本地主机即首图中的L1，lxh.space主机即首图中的S1，通过SSH指令登录S1并连接到8888端口后，访问远程主机的8888端口相当于访问本机的18702端口。在实际应用中可根据需要替换本地及远程端口。

**注意！！！**
_要保持SSH到远端主机为连接的状态才能通过本地端口访问远端端口，如果SSH连接断开，则访问本地端口就失败了。_

如下图，杀掉本地到远端的SSH连接再访问如下：
![](_assets/Pasted%20image%2020240830160638.png)

## 4、 命令简介

```bash
ssh -R 远端网卡地址:远端端口:本地地址:本地端口 用户@远端主机地址
ssh -R 远端端口:本地地址:本地端口 用户@远端主机地址
```
`-R` 选项中的远端网卡地址是可以省略的，这时表示端口绑定了远端地址，远端主机中可通过 `localhost` 和 `127.0.0.1` 访问，也可指定具体的远端ip地址访问。

另外，命令中加了`-fN`选项：
`-f`: 后台执行ssh指令
`-N`: 不执行远程指令

## 5、 其他网络访问

如首图中显示，在其他可连接互联网的网络中的主机O1、O2、O3……中，可以通过访问远端主机来访问本机L1的服务。

> 本文案例中，远端主机的8888端口通过nginx绑定了`f.lxh.space`域名，所以访问`f.lxh.space`相当于访问远端主机的8888端口。nginx配置如下：

```conf
    server {
        server_name f.lxh.space;
        location / {
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_pass http://127.0.0.1:8888 $request_uri;
        }
    }

```