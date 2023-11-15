// 页面浏览进度
!function() {
    document.addEventListener('DOMContentLoaded', function () {
        var progressBar = document.createElement('div');
        progressBar.className = 'read_pro';
        progressBar.innerHTML = '<div class="read_pro_inner" id="read_pro_inner"></div>';
        document.body.appendChild(progressBar);

        var styleElement = document.createElement('style');
        styleElement.type = 'text/css';
        document.getElementsByTagName('head')[0].appendChild(styleElement);
        var newStyle = `
            .read_pro {position: fixed;top: 0;left: 0;width: 100%;height: 3px;background-color: rgb(238 238 238 / 54%);}
            .read_pro_inner {content: '';position: absolute;left: 0;height: 100%;background-color: rgb(0 36 254 / 48%);}
        `;
        styleElement.appendChild(document.createTextNode(newStyle));

        document.addEventListener('scroll', function(e) {
            var scrollTop = document.documentElement.scrollTop || document.body.scrollTop; // 已经读过被卷起来的文档部分
            var scrollHeight = document.documentElement.scrollHeight // 文档总高度
            var clientHeight = document.documentElement.clientHeight // 窗口可视高度
            document.getElementById('read_pro_inner').style.width = +(scrollTop/(scrollHeight-clientHeight)).toFixed(2)*100 + '%'
        })
    })
}()

// 右上角增加返回首页按钮
// 该插件实现方式会影响返回顶部的组件，暂时也无需使用该插件，故先注释掉
/*
!function() {
    window.$docsify = window.$docsify || {},
    window.$docsify.plugins = [
        function(hook, vm) {
            hook.doneEach(function() {
                let container = document.querySelector('section.content');
                let childFirst = document.getElementById('main');
                let childInsert = document.createElement('div');
                childInsert.style = "float: right;position: absolute;right: 0;top: 0;background: #f6f7fb;width: 100%;clear: both;padding: 6px 20px;text-align: right;text-underline-position: under;";
                childInsert.innerHTML = "<a href='../#/' style='text-decoration: none;color: #87878a;font-weight:600;'>返回首页</a>";
                container.insertBefore(childInsert, childFirst);
            });
        }
    ]
}()
*/

// 自定义插件
// 文档：https://docsify.js.org/#/zh-cn/write-a-plugin
// 插件模板如下
/*
!function() {
    window.$docsify = window.$docsify || {},
    window.$docsify.plugins = [function(hook, vm) {
        hook.init(function() {
            // 初始化完成后调用，只调用一次，没有参数。
         });
   
         hook.beforeEach(function(content) {
           // 每次开始解析 Markdown 内容时调用
           // ...
           return content;
         });
   
         hook.afterEach(function(html, next) {
           // 解析成 html 后调用。
           // beforeEach 和 afterEach 支持处理异步逻辑
           // ...
           // 异步处理完成后调用 next(html) 返回结果
           next(html);
         });
   
         hook.doneEach(function() {
           // 每次路由切换时数据全部加载完成后调用，没有参数。
           // ...
         });
   
         hook.mounted(function() {
           // 初始化并第一次加载完成数据后调用，只触发一次，没有参数。
         });
   
         hook.ready(function() {
           // 初始化并第一次加载完成数据后调用，没有参数。
         });
    }].concat(window.$docsify.plugins || [])
}()
*/