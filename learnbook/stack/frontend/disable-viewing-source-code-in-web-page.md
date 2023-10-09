# 网页中设置禁止查看源代码（保护源代码）

> 出处: https://cloud.tencent.com/developer/article/1852211

开发网站的过程中有时我们不想让客户看到页面的源代码，甚至页面上的文字内容都不想被复制，下面我们来看一下怎么保护页面内容
禁止查看页面源代码和禁止复制页面中的文字

```html
<body style="" oncontextmenu="return false" onselectstart="return false">
```

我们都知道即使设置禁止右键但是 点击`F12`还是可以查看到源代码，下面我们来设置禁止使用`F12`

```html
<script>
    function ck() {
        console.profile();
        console.profileEnd();
        //我们判断一下profiles里面有没有东西，如果有，肯定有人按F12了，没错！！
        if (console.clear) { console.clear() };
        if (typeof console.profiles == "object") {
            return console.profiles.length > 0;
        }
    }
    function hehe() {
        if ((window.console && (console.firebug || console.table && /firebug/i.test(console.table()))) || (typeof opera == 'object' && typeof opera.postError == 'function' && console.profile.length > 0)) {
            fuckyou();
        }
        if (typeof console.profiles == "object" && console.profiles.length > 0) {
            fuckyou();
        }
    }
    hehe();

    // 禁止查看控制台
    function fuckyou() {
        window.close(); //关闭当前窗口(防抽)
        // window.location = "about:blank"; //将当前窗口跳转置空白页 （打开控制台后，还可以通过回退按钮回退）
        window.open("about:blank"); // 重新打开一个新窗口，这样用户通过回退也无法查看原网页
    }
    function blockConsole() {
        // 判断当前窗口内页高度和窗口高度，如果差值大于200，那么呵呵
        if ((window.outerHeight - window.innerHeight) > 200)
            fuckyou();
        // 判断当前窗口内页高度和窗口宽度，如果差值大于200
        if ((window.outerWidth - window.innerWidth) > 200)
            fuckyou();
    }

    window.onload = function() {
        if (IS_RELEASE) {
            blockConsole()
            window.onresize = function(){
                blockConsole()
            }
        }
    }
</script>
```

使用上面的js代码可以禁止使用`F12`，注：上面的js代码不是我自己所写，已经忘记是哪位大神所写~~
最后我们知道图片在浏览器中鼠标只要一拖动就会保存下来，但是背景图片不会被拖动，下面代码可以使页面中的图片禁止鼠标拖动

```html
<body style="" ondragstart="return false">
```