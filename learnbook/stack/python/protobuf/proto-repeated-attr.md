# Python序列化proto中repeated修饰的数据


### 一、repeated修饰复合数据结构，即message时

1. 使用message的`add`方法初始化新实例
2. 分别对新实例中的每个元素赋值；或使用`CopyFrom(a)`拷贝a中的元素值

```proto
message TechnologyTreeNode{
    optional int32 node_id = 1;
    optional int32 level   = 2;
}

message TechnologyTree {
    repeated TechnologyTreeNode tree_node_list = 1;
}

tt = TechnologyTree()
ttn = tt.tree_node_list.add()

# 分别赋值
ttn.node_id = 2
ttn.level = 3

# CopyFrom
tn = TechnologyTreeNode()
tn.node_id = 2
tn.level = 3
ttn.CopyFrom(tn)
```

### 二、repeated修饰基础数据类型，如：int等

1. 单个元素使用`append()`追加
2. list 使用`expend()`

```python
message A {
    repeated int ids = 1;
}
a = A()
a.ids.append(1)
l = [1, 2, 3]
a.ids.extend(l)
```

### 三、删除repeated修饰的数据中元素

```python
del a.ids[index]
```

or

```python
a.ids.remove(item)
```

### 四、清空

```python
del a.ids[:]
```

or

```python
a.ids.clear()
```