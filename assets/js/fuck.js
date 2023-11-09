!function() {
    // 禁止控制台查看

    // 禁止查看控制台
    function fuckyou() {
        window.close(); //关闭当前窗口(防抽)
        window.location = "about:blank"; //将当前窗口跳转置空白页 （打开控制台后，还可以通过回退按钮回退）
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
        if (!IS_RELEASE) {
            return true
        }

        blockConsole()
        window.onresize = function(){
            blockConsole()
        }

        // 禁止右键
        document.oncontextmenu = function () { return false; };
        
        // 禁止选择
        // document.onselectstart = function () { return false; };
        
        // 屏蔽键盘事件
        document.onkeydown = function () {
            var e = window.event || arguments [0];
            // F12
            if(e.keyCode == 123){
                return false;
            // Ctrl+Shift+I
            }else if((e.ctrlKey) && (e.shiftKey) && (e.keyCode == 73)){
                return false;
            // Ctrl+Shift+U
            }else if((e.ctrlKey) && (e.shiftKey) && (e.keyCode == 85)){
                return false;
            // Shift+F10
            }else if((e.shiftKey) && (e.keyCode == 121)){
                return false;
            // Ctrl+U
            }else if((e.ctrlKey) && (e.keyCode == 85)){
                return false;
            // Cmd+Alt+U
            }else if((e.metaKey) && (e.altKey) && (e.keyCode == 85)) {
                return false;
            }
        };
    }
}()