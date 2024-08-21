# 一行命令快速搭建 HTTP 服务

## 使用 Python 快速搭建 HTTP 服务器
### Python 2.7
在 Python 2.7 中，您可以使用 `SimpleHTTPServer` 模块来启动一个简单的 HTTP 服务器。

1、打开命令行界面。

2、导航到您想要共享文件的目录。

3、运行以下命令：
```bash
python -m SimpleHTTPServer [port]
```

如果不指定端口，默认端口是8000。

### Python 3

在 Python 3 中，可以使用内置模块 `http.server` 启动一个简单的 HTTP 服务器。

1、打开命令行界面。

2、导航到您想要共享文件的目录。

3、运行以下命令：

```bash
python -m http.server [port]
```

如果不指定端口，默认端口是8000。

## 访问服务器

启动服务器后，您可以在浏览器中输入 http://localhost:[port] 访问这个服务器。例如，如果使用默认端口，可以在浏览器中输入 http://localhost:8000。