# Docsify 文档帮助

## 使用说明
- 代码高亮：https://docsify.js.org/#/zh-cn/language-highlight
- 文件嵌入：https://docsify.js.org/#/zh-cn/embed-files
- 插件列表：https://docsify.js.org/#/zh-cn/plugins
- 高级语法：https://docsify.js.org/#/zh-cn/helpers

## 常用语法

### 强调内容

适合显示重要的提示信息，语法为 `!> 内容`。

```markdown
!> 一段重要的内容，可以和其他 **Markdown** 语法混用。
```

!> 一段重要的内容，可以和其他 **Markdown** 语法混用。

### 普通提示

普通的提示信息，比如写 TODO 或者参考内容等。

```markdown
?> _TODO_ 完善示例
```

?> _TODO_ 完善示例

### 忽略编译链接

有时候我们会把其他一些相对路径放到链接上，你必须告诉 docsify 你不需要编译这个链接。 例如：

```md
[link](/demo/)
```

它将被编译为 `<a href="/#/demo/">link</a>` 并将加载 `/demo/README.md`. 可能你想跳转到 `/demo/index.html`。

现在你可以做到这一点

```md
[link](/demo/ ':ignore')
```

即将会得到 `<a href="/demo/">link</a>` html 代码。不要担心，你仍然可以为链接设置标题。

```md
[link](/demo/ ':ignore title')

<a href="/demo/" title="title">link</a>
```

### 设置链接的 target 属性

```md
[link](/demo ':target=_blank')
[link](/demo2 ':target=_self')
```

### 禁用链接

```md
[link](/demo ':disabled')
```

### 跨域链接

只有当你同时设置了 `routerMode: 'history'` 和 `externalLinkTarget: '_self'` 时，你需要为这些跨域链接添加这个配置。

```md
[example.com](https://example.com/ ':crossorgin')
```

### Github 任务列表

```md
- [ ] foo
- bar
- [x] baz
- [ ] bam <~ not working
  - [ ] bim
  - [ ] lim
```

- [ ] foo
- bar
- [x] baz
- [ ] bam <~ not working
  - [ ] bim
  - [ ] lim


### 引入外部内容到当前文档

#### 文件嵌入
> docsify 4.6 开始支持嵌入任何类型的文件到文档里。你可以将文件当成 iframe、video、audio 或者 code block，如果是 Markdown 文件，甚至可以直接插入到当前文档里。

这是一个嵌入 Markdown 文件的例子。
```
[filename](../_media/example.md ':include')
```
`example.md` 文件的内容将会直接显示在这里

#### 嵌入的类型
当前，嵌入的类型是通过文件后缀自动识别的，这是目前支持的类型：
- **iframe** `.html`, `.htm`
- **markdown** `.markdown`, `.md`
- **audio** `.mp3`
- **video** `.mp4`, `.ogg`
- **code** `other file extension`

当然，你也可以强制设置嵌入类型。例如你想将 Markdown 文件当作一个 `code block` 嵌入。
```
[filename](../_media/example.md ':include :type=code')
```
你会看到：
```
> This is from the `example.md`
```
#### 整个文件内容嵌入实例
[整个文件嵌入](./demo.php ':include :type=code')

#### 嵌入代码片段
> 有时候你并不想嵌入整个文件，可能你只想要其中的几行代码，但你还要在 CI 系统中编译和测试该文件。

#### 代码片段嵌入实例
[嵌入文件代码片段](./demo.php ':include :type=code :fragment=demo')

### HTML 标签中的 Markdown
> 你需要在 html 和 Markdown 内容中插入空行。 当你需要在 details 元素中渲染 Markdown 时很有用。
```
<details>
<summary>自我评价（点击展开）</summary>

- Abc
- Abc

</details>
```
<details>
<summary>自我评价（点击展开）</summary>

- Abc
- Abc

</details>

### 图片处理
#### 缩放
```md
![logo](https://docsify.js.org/_media/icon.svg ':size=WIDTHxHEIGHT')
![logo](https://docsify.js.org/_media/icon.svg ':size=50x100')
![logo](https://docsify.js.org/_media/icon.svg ':size=100')

<!-- 支持按百分比缩放 -->
![logo](https://docsify.js.org/_media/icon.svg ':size=10%')
```

#### 设置图片的 Class
```md
![logo](https://docsify.js.org/_media/icon.svg ':class=someCssClass')
```

#### 设置图片的 ID
```md
![logo](https://docsify.js.org/_media/icon.svg ':id=someCssId')
```


### 设置标题的 id 属性
```md
### 你好，世界！ :id=hello-world
```


## 常见高级语法
- PDF 文件阅读器
```html
<embed 
    src="http://search-operate.cdn.bcebos.com/9587335065ebd34673723f9578cf1466.pdf" 
    type="application/pdf" width="100%" height="800" />
```

- 文档中嵌入 iframe 页面
>  该页面基于 Figma 做的流程图 or 页面注解
```html
<iframe style="border: 1px solid rgba(0, 0, 0, 0.1);" 
    width="100%" height="800" 
    src="https://www.figma.com/embed?embed_host=share&url=https%3A%2F%2Fwww.figma.com%2Ffile%2Fj5RVXICPsWvq6NndsqgkIO%2F%25E7%25A7%25AF%25E5%2588%2586%25E6%25A8%25A1%25E5%259D%2597%25E5%25AE%259E%25E7%258E%25B0%25E6%258B%2586%25E8%25A7%25A3%3Fnode-id%3D0%253A1" 
allowfullscreen></iframe>
```