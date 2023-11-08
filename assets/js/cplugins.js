
// 自定义插件
// 文档：https://docsify.js.org/#/zh-cn/write-a-plugin
// 插件模板如下
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


// 自定义插件，未验证
!function() {
    window.$docsify = window.$docsify || {},
    window.$docsify.plugins = [
        // 返回按钮
        function(hook, vm) {
            hook.doneEach(function() {
                let container = document.querySelector('section.content');
                let childFirst = document.getElementById('main');
                let childInsert = document.createElement('div');
                childInsert.style = "float: right;position: absolute;right: 0;top: 0;background: #f6f7fb;width: 100%;clear: both;padding: 6px 20px;text-align: right;text-underline-position: under;";
                // bca-disable-next-line
                childInsert.innerHTML = "<a href='../#/' style='text-decoration: none;color: #87878a;font-weight:600;'>返回首页</a>";
                container.insertBefore(childInsert, childFirst);
            });
        },
        // 畅言评论组件注册
        function (hook, vm) {
            hook.doneEach(function() {
                let childAppend = document.createElement('div');
                childAppend.id = 'SOHUCS'
                childAppend.style='font-size: 16px;max-width: 80%;margin: 0 auto;'
                container.appendChild(childAppend);
                showpinglun();
            });
        },
        // 视频播放（ts文件）
        function (hook, vm) {
            hook.doneEach(function() {
                // 播放能力检测
                try{
                    // 视频播放组件全局变量
                    let videoPlayer = {
                        mime: "",
                        segments: [],
                        mediaSource: new MediaSource(),
                        transmuxer: new muxjs.mp4.Transmuxer(),
                    }
                } catch (error) {
                    console.error(error);
                }

                playvideo()
            });
        },
    ].concat(window.$docsify.plugins || [])
}()

var docPlugins = [
    // Github 编辑组件
    EditOnGithubPlugin.create(
        'https://github.com/kugouming/kugouming.github.io/blob/master/',
        'https://github.com/kugouming/kugouming.github.io/blob/master/learnbook/',
        function(file) {
            return '编辑'
        }
    ),
]


/******************************** 视频播放 start ********************************/

// 视频播放（ts文件）
function playvideo() {
    if (document.querySelector('video') == null) {
        return
    }
    
    let vobj   = document.querySelector('video')
    let svalue = vobj.attributes['segments'].value
    videoPlayer.mime   = vobj.attributes['mime'].value
    let plist  = svalue.split(",")
    for (i = 0; i < plist.length; i++) {
        let v = plist[i].trim()
        if (v.length > 0) {
            videoPlayer.segments.push(v)
        }
    }


    video = document.querySelector('video');
    video.src = URL.createObjectURL(videoPlayer.mediaSource);
    videoPlayer.mediaSource.addEventListener("sourceopen", appendFirstSegment);
}

function appendFirstSegment() {
    if (videoPlayer.segments.length == 0) {
        return;
    }

    URL.revokeObjectURL(video.src);
    sourceBuffer = videoPlayer.mediaSource.addSourceBuffer(videoPlayer.mime);
    sourceBuffer.addEventListener('updateend', appendNextSegment);

    videoPlayer.transmuxer.on('data', (segment) => {
        let data = new Uint8Array(segment.initSegment.byteLength + segment.data.byteLength);
        data.set(segment.initSegment, 0);
        data.set(segment.data, segment.initSegment.byteLength);
        console.log(muxjs.mp4.tools.inspect(data));
        sourceBuffer.appendBuffer(data);
    })

    fetch(videoPlayer.segments.shift()).then((response) => {
        return response.arrayBuffer();
    }).then((response) => {
        videoPlayer.transmuxer.push(new Uint8Array(response));
        videoPlayer.transmuxer.flush();
    })
}

function appendNextSegment() {
    // reset the 'data' event listener to just append (moof/mdat) boxes to the Source Buffer
    videoPlayer.transmuxer.off('data');
    videoPlayer.transmuxer.on('data', (segment) => {
        sourceBuffer.appendBuffer(new Uint8Array(segment.data));
    })

    if (videoPlayer.segments.length == 0) {
        // notify MSE that we have no more segments to append.
        videoPlayer.mediaSource.endOfStream();
    }

    videoPlayer.segments.forEach((segment) => {
        // fetch the next segment from the segments array and pass it into the transmuxer.push method
        fetch(videoPlayer.segments.shift()).then((response) => {
            return response.arrayBuffer();
        }).then((response) => {
            videoPlayer.transmuxer.push(new Uint8Array(response));
            videoPlayer.transmuxer.flush();
        })
    })
}

/******************************** 视频播放 end ********************************/


/******************************** 畅言评论 start ********************************/
// 展示畅言评论插件
function showpinglun(){
    var appid = 'cyvJltPMs';
    var conf = 'prod_5a59f7fcd51ba4c3bfad8a9a465671dd';
    var width = window.innerWidth || document.documentElement.clientWidth;
    if (width < 1000) {
        var head = document.getElementsByTagName('head')[0] || document.head || document.documentElement;
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.charset = 'utf-8';
        script.id = 'changyan_mobile_js';
        script.src = 'https://cy-cdn.kuaizhan.com/upload/mobile/wap-js/changyan_mobile.js?client_id=' + appid + '&conf=' + conf;
        head.appendChild(script);
    } else {
        var loadJs = function(d, a) {
            var c = document.getElementsByTagName("head")[0] || document.head || document.documentElement;
            var b = document.createElement("script");
            b.setAttribute("type", "text/javascript");
            b.setAttribute("charset", "UTF-8");
            b.setAttribute("src", d);
            if (typeof a === "function") {
                if (window.attachEvent) {
                    b.onreadystatechange = function() {
                        var e = b.readyState;
                        if (e === "loaded" || e === "complete") {
                            b.onreadystatechange = null;
                            a()
                        }
                    }
                } else {
                    b.onload = a
                }
            }
            c.appendChild(b)
        };
        loadJs("https://cy-cdn.kuaizhan.com/upload/changyan.js",
        function() {
            window.changyan.api.config({
                appid: appid,
                conf: conf
            })
        });
    }
}
/******************************** 畅言评论 end ********************************/