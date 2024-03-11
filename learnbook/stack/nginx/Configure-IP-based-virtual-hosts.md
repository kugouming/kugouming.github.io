# 配置基于ip的虚拟主机

## 一、什么是虚拟主机

虚拟主机是一种特殊的软硬件技术，它可以将网络上的每一台计算机分成多个虚拟主机，每个虚拟主机可以独立对外提供www服务，这样就可以实现一台主机对外提供多个web服务，每个虚拟主机之间是独立的，互不影响的。

如下图：

![](_assets/02fa56f89e4ff46704a1c6ac7afb718d_MD5.jpeg)

通过nginx可以实现虚拟主机的配置，nginx支持三种类型的虚拟主机配置：
1、基于ip的虚拟主机
2、基于域名的虚拟主机
3、基于端口的虚拟主机

实际使用的过程中，我们一般常用的是用域名或是端口来区分web服务。只不过我这里为了讲的全面一点，会把三种配置都讲一讲。

## 二、Nginx配置文件的结构

nginx的配置文件结构如下：

```bash
......

events {

    .......

}

http{

   .......

   server{

         .......

         }

   server{

         .......

         }
}
```

每个server就是一个虚拟主机。

## 三、基于ip的虚拟主机配置

Linux操作系统允许添加IP别名，就是在一块物理网卡上绑定多个lP地址。这样就能够在使用单一网卡的同一个服务器上运行多个基于IP的虚拟主机。

### **应用场景**

一台nginx服务器绑定两个ip：`192.168.78.132`、`192.168.78.133`，访问不同的ip请求不同的html目录，即：

访问`http://192.168.78.132`将访问`html132`目录下的html网页

访问`http://192.168.78.133`将访问`html133`目录下的html网页

### **i. 准备环境**

创建`192.168.78.132` 的虚拟机，保证本地电脑和虚拟网络通畅。

在`192.168.78.132`上安装nginx。这个之前讲过nginx 的源码安装，大家可以去看看这篇文章：[https://www.cnblogs.com/zhangweizhong/p/11378512.html](https://www.cnblogs.com/zhangweizhong/p/11378512.html)

### **ii. 绑定多ip**

1、修改网络配置文件，进入到`/etc/sysconfig/network-scripts`,编辑`ifcfg-ens33`文件如下：
```bash
TYPE=Ethernet
PROXY_METHOD=none
BROWSER_ONLY=no
# BOOTPROTO=dhcp 注意区别！！！
DEFROUTE=yes
IPV4_FAILURE_FATAL=no
IPV6INIT=yes
IPV6_AUTOCONF=yes
IPV6_DEFROUTE=yes
IPV6_FAILURE_FATAL=no
IPV6_ADDR_GEN_MODE=stable-privacy
NAME=ens33
UUID=26c2f3f8-62c5-4571-80e2-ca394cfd43da
DEVICE=ens33
ONBOOT=yes
ZONE=public

# 注意区别
IPADDR0=192.168.78.132
PREFIX0=24

IPADDR1=192.168.78.133
PREFIX1=16
```

2、保存修改,重启网络： `systemctl restart network`
```bash
[root@bogon network-scripts]# systemctl restart network
```

这个是参照网上的资料，不明白的可以去这里看看具体如何操作：[https://blog.csdn.net/u013887008/article/details/79589656](https://blog.csdn.net/u013887008/article/details/79589656)

### **iii. 创建两个web网站**

进入`/usr/local/nginx` 目录，将原来nginx的html目录拷贝两个目录 “html132”和“html133”，为了方便测试需要修改每个目录下的index.html内容使之个性化。

```bash
cd /usr/local/nginx

cp -r html html132
cp -r html html133
```

### **iv. 配置虚拟主机**

修改`/usr/local/nginx/conf/nginx.conf`文件，添加两个虚拟主机，如下：
```bash
#user  nobody;
worker_processes  1;

#error_log  logs/error.log;
#error_log  logs/error.log  notice;
#error_log  logs/error.log  info;

#pid        logs/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
 
    sendfile        on;

    keepalive_timeout  65;

    #配置虚拟主机192.168.78.132
    server {
        #监听的ip和端口，配置192.168.78.132:80
        listen       80;
        #虚拟主机名称这里配置ip地址

        server_name  192.168.78.132;

        #所有的请求都以/开始，所有的请求都可以匹配此location
        location / {
             #使用root指令指定虚拟主机目录即网页存放目录
             #比如访问http://ip/test.html将找到/usr/local/html3/test.html
             #比如访问http://ip/item/test.html将找到/usr/local/html3/item/test.html
             root   /usr/local/nginx/html132;

             #指定欢迎页面，按从左到右顺序查找
             index  index.html index.htm;
        }
    }

    #配置虚拟主机192.168.78.133
    server {
        listen       80;
        server_name  192.168.78.133;
        location / {
            root   /usr/local/nginx/html133;
            index  index.html index.htm;
        }
    }
}
```

### **v. 测试**

重新启动nginx，观察端口监听状态：

访问[http://192.168.78.132/](http://192.168.78.132/)

![](_assets/6abd4bc270915e5c187272d942ec9532_MD5.jpeg)

访问[http://192.168.78.133/](http://192.168.78.133/)

![](_assets/2ec7d2ed992bb82b16250d0fae882905_MD5.jpeg)

## 四、最后

以上，就把nginx 基于ip的配置虚拟主机讲完了。后面会继续讲基于域名和端口的配置。