# 基础查询语法

## 一、基础查询语句的结构：

```bash
GET http://ip:prot/textbook/_search

{          
	"query" : { ...query子句... },
	"aggs" : { ..aggs子句.. },
	"sort" : { ..sort子句.. }
	"from" : 0, // 返回搜索结果的开始位置
	"size" : 10, // 分页大小，一次返回多少数据
	"_source" :[ ...需要返回的字段数组... ],
}
```

- **query子句**：类似于mysql中的where语句，用于定义搜索条件，如等值查询、模糊查询、范围查询等（重点）
- **aggs字句**：用于对搜索结果进行各种统计和分组。类似于mysql中的group by。例如可以计算某一字段不同值各自出现的次数，或者根据某个字段的值进行分组。
- **sort子句**：这个就非常显而易见了，是对查询出来的结果进行根据某一规则进行排序。
- **from和size**：这两个是配合使用的，是用来分页的。from定义的是展示的第一条数据的处于结果集的位置（也就是下标），size表示此次展示多大的结果集。这个两个也就相当于mysql中的limit和offset语句
- **\_source**：通过这个列表控制返回数据中应该包含哪些字段，就相当于mysql中SELECT name ，age FROM People这个语句中的name，age。表示返回结果只包含这两个我们所需字段即可。

## 二、query子句详解：
讲这个query语句要是对分词器的概念还不理解可以看一下下面这个文章，了解一下其es的一些基本概念：初识ES（ES的基本概念、倒排索引、索引和文档的CRUD）

> 在es中我们要知道，我们所查询的内容，是被分词器进行了分词并将其保存下来，我们查询是通过匹配这个词进行查询的。

所将要查询的文档：

假设其中bookName的值被分词为：“My”、“name”、“is”、“CSDN”
```
{
    "_index": "my_index",
    "_id": "12Sad33fdAdfFWW",
    "_source": {
        "bookName": "My name is CSDN",
        "author": "起床",
        "number": 120
    }
}
```
### 1 、match查询：
match是一种会将你搜索的query进行分词的查询方法。而不是直接拿你的查询语句原封不动的去与被分词过后词进行匹配。

根据bookName字段进行查询：
```bash
GET http://ip:prot/my_index/_search
{
  "query": {
    "match": {
      "bookName":"This is CSDN"
    }
  }
}
```

这个查询会先讲查询语句中的“This is CSDN”进行分词，得到“This”、“is”、“CSDN”会分别拿这三个词去匹配，就会发现“is”和“CSDN”都能匹配成功只要一个匹配成功则就可以。所以可以查询到。

### 2、match_phrase查询：
这个查询和普通的match查询相比限制性更强，他依旧会对query内的值进行分词，但他并不是匹配到一处分词就匹配成功，而是对所有的词都能匹配才算成功。而且每个词都相对位置还得正确，默认情况下词与词之间在被搜索原文中是连续的。像前面咱举的那个例子就匹配不成功，This没有匹配到，要是讲“This”换为name就可以，但如果换为My也不成功，虽然My匹配成功但和“is”并不连续。

咱看match_phrase是不是太严格了，所以我们有一个参数“slop”，这个参数可以用于控制词与词之间不一定要连续，可以隔几个词。具体几个看slop的值。

```bash
GET http://ip:prot/my_index/_search
{
  "query": {
    "match_phrase": {
      "bookName":{
        "query":"My is CSDN",
        "slop":1
      }
    }
  }
}
```
这个就可以匹配成功，虽然“My”和“is”之间还隔了一个“name”，但slop参数为1，说明词与词之间可以间隔一个词，不一定连续。

可以看到此时bookName的格式又深了一层，因为我们需要添加slop参数。

### 3、multi_match查询：
这个查询也会进行分词，就是对多个字段进行match操作，只要一个字段匹配上了就行。其中bookName匹配不上，但author字段能匹配上。则能查询到。也就是对bookName和author字段分别进行了一次的match操作。

```bash
GET http://ip:prot/textbook/_search
{
  "query": {
    "multi_match": {
        "query" : "起床",
        "fields" : ["bookName", "author"]
    }
  }
}
```

### 4、Term查询：
与match查询相对应的是Term查询，他不会对query内的值进行分词，直接拿整个短语进行匹配。非常适用于精确匹配的需求，例如查找特定ID、邮箱地址、状态代码等。它不执行任何文本分析或模糊匹配，只关注精确匹配。

```bash
GET http://ip:prot/textbook/_search
{
  "query": {
    "term": {
      "bookName": "My name is CSDN"
    }
  }
}
```

这个”bookName“虽然和es中所存储的一模一样，但是查询不到，因为此时再es中用于查询的是一个个的短语，而term是直接拿整个短语去匹配的，那当然是查询不到的。

### 5、Terms查询：
Terms查询就是获取多个term查询结果的并集。

下面这个就是当bookName中的“My”还有“CSDN”匹配成功但”apple“匹配不成功，但因为是并集，所以只要有一个符合即可。所以能够查询到。
```bash
GET http://ip:prot/my_index/_search
{
  "query": {
    "terms": {
      "bookName": ["My", "CSDN", "apple"]
    }
  }
}
```
### 6、Prefix查询（前缀查询）：

> 在特定字段上查找以指定前缀开头的文档。它不会对查询字符串进行分词，而是直接在字段上进行精确匹配。
> 适用于需要对特定前缀进行精确匹配的场景。例如，在搜索用户输入时，可以快速过滤出以特定字母开头的单词或短语；在数据库中查找以特定前缀开头的文档；在日志文件中查找以特定标识符开头的行等。

```bash
GET http://ip:prot/my_index/_search
{
  "query": {
    "prefix": {
      "bookName": {
        "value" ： "Thi"
      }
    }
  }
}
```
这个能匹配到This，所以能查询到 。

### 7、fuzzy和wildcard查询（模糊查询）：

> 这两个查询方式都不会对查询条件的值进行分词。两者进行的都是模糊查询。

fuzzy查询例子：其中我误将name打成nane，但由于我参数fuzziness值为1，说明我可以改动一个字符（添加、删除、修改都可）。将nane可以变成name。所以匹配成功。fuzziness默认值为2.
```bash
GET http://ip:prot/textbook/_search
{
  "query": {
    "fuzzy": {
      "bookName":{
        "value":"nane",
        "fuzziness":1
      }
    }
  }
}
```
 wildcard查询例子：这个查询语句我们就可以查询到name，其中将？替换成任何字符，只要能匹配上的都可。如果为*号则是只要以na为首以e为结尾的都可。
```bash
GET http://ip:prot/textbook/_search
{
  "query": {
    "wildcard": {
      "bookName":{
        "value":"na?e"
      }
    }
  }
}
```
使用场景差异：Fuzzy查询适用于需要精确匹配但可能存在拼写错误的场景。它通过计算编辑距离来确定查询词与文档之间的相似度，从而找到可能的匹配。而Wildcard查询则适用于需要更灵活的模糊匹配的场景，如根据部分字符串或模式进行匹配。
匹配方式差异：Fuzzy查询基于编辑距离（Levenshtein距离）计算查询词与文档之间的相似度。它通过计算一个词项与文档之间的最小编辑操作次数来找到与查询词相似的文档。而Wildcard查询则使用通配符模式进行匹配，通过指定星号(*)和问号(?)，可以匹配任意字符或单个字符。
性能差异：Fuzzy查询在处理大规模数据时可能会变得低效，因为它需要对每个文档进行逐一比较。而Wildcard查询则更加适用于大规模数据的模糊匹配，因为它使用通配符模式进行匹配，可以减少需要检查的文档数量。

### 8、range查询（范围查询）：
range查询就是对某一字段的数值进行范围查询。

- gte：大于等于
- gt：大于
- lte：小于等于
- lt：小于
下面这个查询条件刚好能查询到，因为120处于 （100，120]范围之内。
```bash
GET http://ip:prot/my_index/_search
{ 
  "query": {
    "range": { 
      "number": { 
          "gt":100, 
          "lte":120 
      } 
    }
  } 
}
```

### 9、bool查询
这个查询顾名思义就是将多个查询条件结合起来，根据逻辑词来判断是否成立：

- must：相当于且
- should：相当于或
- must_not：相当于非
注意这里面有must和should两个查询集合，这两个查询集合要取并集，才能被查询到。也就是说must里面条件要全满足且should里面条件至少满足一项才可以。按照下面这个条件来查询是类查询到的。

```bash
GET http://ip:prot/my_index/_search
{
    "query":{
        "bool":{
            "must":{
                "match":{
                    "bookName":"My name is apple"
                }
            },
            "should":{
                "term":{
                    "author":"apple"
                },
                "range":{
                    "num":{
                        "lte":120
                    }
                },
            }
        }
    }
}

```
## 三、sort子句和分页详解

> 这是排序条件部分，用于指定检索结果的排序方式。你可以根据一个或多个字段进行排序，并指定排序的方向（升序或降序）。

途中根据query查询出来的文档根据number降序排序。且进行分页，取1-10条数据。

```bash
GET http://ip:prot/my_index/_search
{ 
  "query": {
    "range": { 
      "number": { 
          "gt":100, 
          "lte":120 
      } 
    }
  }, 
 
  "sort": {
           "number": {
           "order": "desc"
    }
  },
  "from":0,
  "size":10,
}
```