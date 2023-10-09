# Redis hashtag 源码解析

## 一、用法：

仅仅花括号中间的部分参与hash，hash结果为slot编号。

```bash
key := "a{b}c"
```

## 二、用途：

强制多个key写入同一个slot，也就是同一个节点（假设没有正在进行分片）。
 

## 三、槽与节点：

在redis cluster中有16384个slot。
slot编号：0～16383。
cluster中存储每个节点负责哪些slot。
cluster中存储每个slot对应哪一个节点。
 

## 四、源码：

源码有2处。
**第一处：**
https://github.com/redis/redis/blob/6.2.6/src/redis-cli.c
line：3282
方法：`clusterManagetKeyHashSlot`

**第二处：**
https://github.com/redis/redis/blob/6.2.6/src/cluster.c
line：749
方法：`keyHashSlot`

```C
// 源码位置
// https://github.com/redis/redis/blob/6.2.6/src/cluster.c
unsigned int keyHashSlot(char *key, int keylen) {
    // s代表{在key中的位置，e代表}在key中的位置
    int s, e; 

    // 若无{，则s等于keylen
    for (s = 0; s < keylen; s++)
        // 遇到第一个{跳出
        if (key[s] == '{') break;


    // 若key中无{，则s等于keylen，整个key参与hash
    // 0x3FFF对应10进制为16383
    // 16383对应二进制为14个1
    // 按位与运算时只取crc16结果的低14位
    if (s == keylen) return crc16(key,keylen) & 0x3FFF;
    
    // 若key中有{，查看是否有}
    // 若key中无}，则e等于keylen，整个key参与hash
    for (e = s+1; e < keylen; e++)
        // 遇到第一个}跳出
        if (key[e] == '}') break;
        
    // key中无},整个key参与hash
    // key中有},但{}之间为空，整个key参与hash
    if (e == keylen || e == s+1) return crc16(key,keylen) & 0x3FFF;

    // {}中间部分参与hash
    // key+s+1 指针操作，向右移动s+1
    // e-s-1为{}中间字符串的长度
    return crc16(key+s+1,e-s-1) & 0x3FFF;
}
```

## 五、结论：

仅`{...}`里的部分参与hash。

如果有多个花括号，从左向右，取第一个花括号中的内容进行hash。

若第一个花括号中内容为空如：`a{}c{d}`，则整个key参与hash。

相同的`hashtag`被分配到相同的节点，相同的槽。

hash算法采用`crc16`。`crc16`算法为redis自己封装的，源码位置：https://github.com/redis/redis/blob/6.2.6/src/crc16.c

