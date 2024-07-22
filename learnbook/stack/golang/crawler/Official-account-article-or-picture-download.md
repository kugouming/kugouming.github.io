# 公众号文章或图片下载

## 代码

```go
package main

// 文档来源：https://www.modb.pro/db/219022

import (
	"context"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/axgle/mahonia"
	"github.com/chromedp/chromedp"
	"github.com/gofrs/uuid"
	"github.com/siddontang/go-log/log"
)

var configFile string

var pathMap map[string]string

var sourceContent string

var projectPath string

func main() {

	//initCmd()

	//var err0 error = nil

	//if err0 = conf.LoadConf(configFile); err0 != nil {

	//  return

	//}

	dir, _ := os.Getwd()

	fmt.Println("Work dir:", dir)

	projectPath = dir

	configFile = "./conf/download.conf"

	content, err0 := os.ReadFile(configFile)

	byteContent, _ := os.ReadFile("./conf/source.conf")

	sourceContent = string(byteContent)

	if err0 != nil {
		log.Panic(err0)
		return
	}

	path := string(content)

	//创建map

	pathMap = make(map[string]string)

	ctxt, cancel := chromedp.NewContext(context.Background())

	defer cancel()

	var res string

	context.WithTimeout(ctxt, 15*time.Second)

	//https://ethfans.org/posts/wtf-is-the-blockchain

	// site := "https://ethfans.org/posts/wtf-is-the-blockchain"

	site := "https://mp.weixin.qq.com/s/qnceG5MVwlFcm1FaHSKgWA"

	path = projectPath + "/images"

	downloadWebChat(ctxt, site, res, path)

	// downloadSimpleHtml(ctxt, site, res, path)

}

func downloadSimpleHtml(ctxt context.Context, site string, res string, path string) {

	err := chromedp.Run(ctxt, visibleSimpleHtml(site, &res))

	if err != nil {

		return

	}

	fmt.Println("===============" + res)

	reader := strings.NewReader(res)

	//解析utf-8格式的串

	dec := mahonia.NewDecoder("utf-8")

	rd := dec.NewReader(reader)

	doc, err := goquery.NewDocumentFromReader(rd)

	if err != nil {
		log.Fatal(err)
	}

	html, err := doc.Html()

	fmt.Println("=========" + html)

	channels := make(chan string)

	doc.Find("img").Each(func(i int, selection *goquery.Selection) {

		img_url, _ := selection.Attr("src")

		fmt.Println("imgUrl:" + img_url)

		if strings.Trim(img_url, " ") == "" {
			return
		}

		go download(img_url, channels, path)

		fmt.Println("src = " + <-channels + "图片爬取完毕")

	})

	//全部结束后，替换文件

	for originalPath, newPath := range pathMap {

		sourceContent = strings.Replace(sourceContent, originalPath, newPath, -1)

	}

	dir, _ := os.Getwd()

	//这里路径会变化，需要注意

	println(dir)

	//将新的sourceContent输出

	fmt.Println(sourceContent)

	er := os.WriteFile(projectPath+"/conf/outputs.conf", []byte(sourceContent), 0644)

	if er != nil {

		//file, _ := exec.LookPath(os.Args[0])

		//path, _ := filepath.Abs(file)

		//println(path)

		//dir2, _ := os.Executable()

		//exPath := filepath.Dir(dir2)

		//println(exPath)

		log.Error(er)

	}

}

func downloadWebChat(ctxt context.Context, site string, res string, path string) {

	err := chromedp.Run(ctxt, visible(site, &res))

	if err != nil {

		log.Fatal(err)

	}

	fmt.Println("===========" + res)

	reader := strings.NewReader(res)

	dec := mahonia.NewDecoder("utf-8")

	rd := dec.NewReader(reader)

	doc, err := goquery.NewDocumentFromReader(rd)

	//获取将要爬取的html文档信息

	if err != nil {
		log.Fatal(err)
	}

	html, err := doc.Html()

	fmt.Println("=====" + html)

	//创建管道

	channels := make(chan string)

	doc.Find("img").Each(func(i int, selection *goquery.Selection) {

		img_url, _ := selection.Attr("data-src")

		fmt.Println("imgUrl:" + img_url)

		if strings.Trim(img_url, " ") == "" {
			return
		}

		if strings.Index(img_url, "https") == -1 {
			return

		}

		index := strings.Index(img_url, "?")
		if index != -1 {
			rs := []rune(img_url)
			newUrl := string(rs[0:index])
			go download(newUrl, channels, path)
		} else {
			go download(img_url, channels, path)
		}

		//从管道消费

		res := <-channels
		fmt.Println("src = " + res + " 图片爬取完毕")
	})

	fmt.Printf("ImagePath: %+v\n", pathMap)

}

func visibleSimpleHtml(host string, res *string) chromedp.Tasks {

	//sel := "body > div.site-content > article > main"

	return chromedp.Tasks{

		chromedp.Navigate(host),

		chromedp.Sleep(3 * time.Second),

		chromedp.InnerHTML("body", res, chromedp.ByQuery),
	}

}

//func LoadConf(filename string) error {
//    content, err := os.ReadFile(filename)
//    if err != nil {
//        return err
//    }
//
//    conf := Conf{}
//    err = json.Unmarshal(content, &conf)
//    if err != nil {
//        return err
//    }
//    GConf = &conf
//    return nil
//}

func initCmd() {
	flag.StringVar(&configFile, "config", "./config/download.conf", "where download.conf is.")

	flag.Parse()
}

// download 下载图片
// @param img_url  要抓取的图片地址
// @param channels 存储转存之后的映射结果
// @param path     图片本地存储路径
func download(img_url string, channels chan string, path string) {

	fmt.Println("准备抓取:" + img_url)

	uid, _ := uuid.NewV4()

	file_name := uid.String() + ".png"

	base_dir := path
	file_dir := base_dir + "/"
	exists, err := PathExists(file_dir)
	if err != nil {
		fmt.Printf("get dir error![%v]\n", err)
		return
	}

	if !exists {
		os.MkdirAll(file_dir, os.ModePerm)
	}

	os.Chdir(file_dir)

	f, err := os.Create(file_name)

	if err != nil {
		log.Panic("文件创建失败")
	}

	defer f.Close()

	resp, err := http.Get(img_url)

	if err != nil {
		fmt.Println("http.get err", err)
	}

	body, err1 := io.ReadAll(resp.Body)
	if err1 != nil {
		fmt.Println("读取数据失败")
	}

	defer resp.Body.Close()

	f.Write(body)

	pathMap[img_url] = "img/" + file_name

	//成功后将文件名传入管道内

	channels <- "![](img/" + file_name + ")" + "\t" + img_url

}

// PathExists 判断目录是否存在
func PathExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}

	if os.IsNotExist(err) {
		return false, nil
	}

	return false, err
}

// visible 设置获取的html区域
func visible(host string, res *string) chromedp.Tasks {
	sel := "#page-content"
	return chromedp.Tasks{
		chromedp.Navigate(host),
		chromedp.Sleep(3 * time.Second),
		chromedp.InnerHTML(sel, res, chromedp.ByID),
	}
}
```

```go
// go.mod
module download

go 1.18

require (
	github.com/PuerkitoBio/goquery v1.9.2
	github.com/axgle/mahonia v0.0.0-20180208002826-3358181d7394
	github.com/chromedp/chromedp v0.9.5
	github.com/gofrs/uuid v4.4.0+incompatible
	github.com/siddontang/go-log v0.0.0-20190221022429-1e957dd83bed
)

require (
	github.com/andybalholm/cascadia v1.3.2 // indirect
	github.com/chromedp/cdproto v0.0.0-20240202021202-6d0b6a386732 // indirect
	github.com/chromedp/sysutil v1.0.0 // indirect
	github.com/gobwas/httphead v0.1.0 // indirect
	github.com/gobwas/pool v0.2.1 // indirect
	github.com/gobwas/ws v1.3.2 // indirect
	github.com/josharian/intern v1.0.0 // indirect
	github.com/mailru/easyjson v0.7.7 // indirect
	golang.org/x/net v0.24.0 // indirect
	golang.org/x/sys v0.19.0 // indirect
)

```

## 代码构建

直接运行`main.go`文件或者通过`go build ./` 在linux下打成downloadPic包直接运行

## 代码分析

代码逻辑主要分为以下几步:

1. 解析配置，主要是配置图片下载的目录，如果需要对文章的路径进行替换，也可在`conf/source.conf`中配置需要替换路径的文章;
    
2. 解析网址并对响应网页流进行解析，主要是对`chromedp`包的使用;
    
3. 对网页中的img src处获取的路径进行解析，每个路径交给一个协程去处理，因为一篇文章不会太长，所以也可以直接当前线程来处理所有图片的下载;
    
4. 在每个协程中负责图片的下载，并将需要替换的图片路径和要替换成的图片路径放入map中。
    
5. 所有协程处理结束后，替换文章中的图片路径。

## 附

chromedp包的使用示例:

```go
// 任务 主要用来设置cookie ，获取登录账号后的页面
func visitWeb(url string) chromedp.Tasks {
	return chromedp.Tasks{
		chromedp.ActionFunc(func(ctxt context.Context,h cdp.Executor) error {
			expr := cdp.TimeSinceEpoch(time.Now().Add(180 * 24 * time.Hour))
			success, err := network.SetCookie("ASP.NET_SessionId", "这里是值"). // 设置cookie
			WithExpires(&expr).
			WithDomain("dl.gaggjz.pw:8086"). // 访问网站主体
			WithHTTPOnly(true).
			Do(ctxt, h)
			
			if err != nil {
				return err
			}
			
			if !success {
				return errors.New("could not set cookie")
			}

			return nil

		}),
		chromedp.Navigate(url), // 页面跳转
	}
}



// DoCrawler 主要执行翻页功能和或者html
func DoCrawler() chromedp.Tasks {

	//sel =fmt.Sprintf(`javascript:__doPostBack('anpDataPager','%s')`,"2")

	return chromedp.Tasks{
		chromedp.Sleep(1*time.Second), // 等待
		chromedp.WaitVisible(`#form1`, chromedp.ByQuery),// 等待id=from1页面可见  ByQuery是使用DOM选择器查找
		chromedp.Sleep(1*time.Second),
		chromedp.Click(`.pagination li:nth-last-child(4) a`, chromedp.ByQuery), //点击翻页
		chromedp.OuterHTML(`tbody`, &res, chromedp.ByQuery), //获取改 tbody标签的html
	}
}
```