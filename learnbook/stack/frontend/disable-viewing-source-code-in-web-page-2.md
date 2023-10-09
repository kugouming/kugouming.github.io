# 禁止查看网页源代码方法

> 出处: https://zmingcx.com/prohibit-viewing-source-code.html

总是有新手问，如何禁止别人查看自己的网页源代码？答案是没有，对于有经验者所有方法都是徒劳的。
一般常用的方法是在网页中加上类似的JS代码，屏蔽屏蔽键盘和鼠标右键。

```javascript
document.onkeydown = function() {
    var e = window.event || arguments[0];
    if (e.keyCode == 123) {
        alert('禁止F12');
        return false;
    } else if ((e.ctrlKey) && (e.shiftKey) && (e.keyCode == 73)) {
        alert('禁止Ctrl+Shift+I');
        return false;
    } else if ((e.ctrlKey) && (e.keyCode == 85)) {
        alert('禁止Ctrl+u');
        return false;
    } else if ((e.ctrlKey) && (e.keyCode == 83)) {
        alert('禁止Ctrl+s');
        return false;
    }
}
// 屏蔽鼠标右键
document.oncontextmenu = function() {
    alert('禁止右键');
    return false;
}
```

上述代码用下面的包裹起来之后，不显示提示信息：
```javascript
window.onload = function() {
// 代码
}
```

另一段JS代码，可以阻止浏览器开发工具正常使用
```html
<script type="text/javascript">
((function() {
    var callbacks = [],
    timeLimit = 50,
    open = false;
    setInterval(loop, 1);
    return {
        addListener: function(fn) {
            callbacks.push(fn);
        },
        cancleListenr: function(fn) {
            callbacks = callbacks.filter(function(v) {
                return v !== fn;
            });
        }
    }
    function loop() {
        var startTime = new Date();
        debugger;
        if (new Date() - startTime > timeLimit) {
            if (!open) {
                callbacks.forEach(function(fn) {
                    fn.call(null);
                });
            }
            open = true;
            window.stop();
            alert('禁止查看');
            window.location.reload();
        } else {
            open = false;
        }
    }
})())

.addListener(function() {
    window.location.reload();
});
</script>
```

上述方法只要浏览器禁止JS脚本后都将无效，虽然还有人在想方设法地研究这个，但火狐和chrome众多一键禁止JS扩展让这些努力毫无意义。

貌似还有一个比较隐蔽的方法，当打开浏览器开发工具窗口页面大小发生变化，通过JS判断浏览器窗口变化，在开发工具中看不到源代码，不过知道原理后，也是掩耳盗铃...