# Nginx虚拟IP实战

## 一、实战背景

在Nginx反向代理架构图
![](_assets/Pasted%20image%2020240311144513.png)

在该架构中，Nginx作为反向代理，起到了负载均衡的作用，还可以在该架构的基础上实现动静分离。但是，该架构存在一个很明显的缺陷，即当Nginx发生故障后，整个架构就会宕掉，无法正常工作。
为了弥补这一缺陷，我们可以引入两台Nginx服务器，这两台Nginx服务器一主一备，当主Nginx服务器宕机后，备用Nginx服务器立即工作，起到了故障转移的作用。为了实现这一目的，我们不希望在Nginx主备切换时更改DNS消息或者其他设置，因此，我们可以借鉴计算机网络中VRRP的思路，使这两台Nginx服务器共享一个虚拟的IP地址，当主Nginx服务正常运行时，备Nginx时刻监听主Nginx服务器的状态；当主Nginx服务宕机后，备Nginx会新创建一个虚拟网卡，监听该虚拟IP地址。这样，就实现了两台Nginx服务器的故障转移了。

## 二、虚拟IP配置
接下来，我们进行Nginx的虚拟IP配置实战，实战架构如下：
- 设备1IP:`192.168.136.101`
- 设备2IP:`192.168.136.102`
- 虚拟IP：`192.168.136.200`

为了实现Nginx虚拟IP的设置，我们需要在每个Nginx设备上运行脚本，脚本思路如下：首先，检测自身是否开启Nginx服务，当自身没有开启Nginx服务时，就必须关闭虚拟IP所对应的网卡。当自身开启Nginx服务时，就要检测虚拟IP地址是否存在，如果存在，则说明另一台设备上已经运行了虚拟IP地址，那么我们就不能启动该虚拟IP对应的网卡，以防网卡冲突，如果虚拟IP地址不存在，就说明另一台设备上没有运行虚拟IP地址对应的网卡，那么我们自身就可以创建并启动虚拟IP网卡，监听虚拟IP地址，提供Nginx服务。

Nginx虚拟网卡对应的脚本（包含详细解释）如下所示：

```bash
#!/bin/bash
# 2022-02-17
# writed by pzz
# Used to realize the failover of nginx

NGINX_NUM=`ps -ef | grep nginx | wc -l`
# ps -ef | grep nginx表示抓取当前系统中的所有进程，并选取包含Nginx字符的进程，wc -l 表示统计行数
# NGINX_NUM变量保存了上述执行的结果，用于下面的if判断语句，采用这种方式来判断自身的Nginx服务是否开启
if [$NGINX_NUM -eq 3];then
# 判断自身Nginx服务是否开启，if表达式表示Nginx服务没有开启，之所以该值不等于1，是因为grep自身的进程和本进行会也会被抓取，这会影响抓取结果
        ifdown ens32-virtual > /dev/null 2>&1
# 当Ngixn服务没有开启，自身需要关闭虚拟IP对应的网卡，后面的标识无论是否执行正确，结果都不会显示在桌面上。
        rm -rf /etc/sysconfig/network-scripts/ifcfg-ens32-virtual
# 表示删除虚拟网卡文件
else
# 表示当自身的Nginx服务开启后
        ping -c 1 192.168.136.200 > /dev/null 2>&1
# 表示检测虚拟IP地址是否存在
        if [$? -ne 0];then
# 如果虚拟IP地址不存在，那么上一条命令会执行失败，那么结果也就不会为0，就会进入这个if语句
                cat >/etc/sysconfig/network-scripts/ifcfg-ens32-virtual <<EOF
TYPE=Ethernet
PROXY_METHOD=none
BROWSER_ONLY=no
BOOTPROTO=static
DEFROUTE=yes
IPV4_FAILURE_FATAL=no
IPV6INIT=yes
IPV6_AUTOCONF=yes
IPV6_DEFROUTE=yes
IPV6_FAILURE_FATAL=no
IPV6_ADDR_GEN_MODE=stable-privacy
NAME=ens32-virtual
ONBOOT=no
IPADDR=192.168.136.200
NETMASK=255.255.255.0
GATEWAY=192.168.136.254
DNS1=114.114.114.114
EOF
# 以上命令表示把EOF之中的内容写成ifcfg-ens32-virtual文件中，放在/etc/sysconfig/network-scripts/目录下
                ifup ens32-virtual > /dev/null 2>&1
# 以上命令表示开启虚拟IP对应的网卡
        fi
fi

```

上述脚本完成后，我们需要将该脚本写成定时任务，间隔执行，进行检测，如下：

```bash
while sleep 5; do bash /root/nginx_vip.sh ; done &
```

执行该命令后，我们的Nginx虚拟IP实战就配置完成了。

## 三、效果检验

最后，让我们进行结果检验。在两个设备上，都开启Nginx服务，并且都运行上述检测脚本。从另一台设备上不断访问虚拟IP地址，这时关闭其中一台设备的Nginx服务，观察现象如下所示：
![](_assets/Pasted%20image%2020240311144809.png)

可以看出，该虚拟IP地址在短暂的终端后，恢复正常响应，这就说明了我们在断开Nginx服务的时候，该设备上的后台脚本启动，关闭了自身的网卡，同时，另一台设备开启了自身的虚拟IP网卡，这就解释了为什么会失去响应后立即恢复的现象。

当我们访问该虚拟IP地址网页时，发现一切正常，如下所示：
![](_assets/Pasted%20image%2020240311144830.png)
综上，我们的Nginx虚拟IP实战配置成功！
