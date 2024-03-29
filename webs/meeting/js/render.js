(function(dom) {
    const js_host = 'http://wm.bcc-szwg.baidu.com:8089',
    meetingJs = js_host + '/scripts/meeting/js/meeting.js',
    meetingCss = `
    #meeting-close {
        display: block;
        height: 24px;
        width: 31px;
        border-radius: 12px 0px 0px 14px;
        text-align: center;
        border: 1px solid #bdbcbc;
        text-indent: inherit;
        position: absolute;
        top: 0px;
        line-height: 20px;
        font-size: 20px;
        left: -32px;
        background: #efefef;
        cursor: pointer;
        border-right: none;
        border-top: none;
        color: #8a8a8a;
        box-shadow: -5px 2px 5px 1px #666;
    }
    #meeting-container {
        width: 640px !important;
        height: 150px !important;
        display: block;
        position: fixed;
        top: 0;
        background: #fff;
        z-index: 10000000000;
        right: 0;
        padding: 16px 10px;
        margin: 0;
        padding: 0;
        border-radius: 0 0 0 8px;
        box-shadow: -3px 5px 13px 2px #666;
    }

    #meeting-container li {
        list-style: none;
    }

    #meeting-container .book-list {
        display: inline-block;
        float: left;
        margin-left: 5px;
        margin: 0;
        padding: 0;
    }

    #meeting-container .book-list li {
        clear: both;
        margin: 2px 2px;
        width: 100%;
        float: left;
        display: inline-flex;
        line-height: 30px;
        flex-wrap: nowrap;
        color: #ccc;
    }


    #meeting-container .book-list li input {
        width: 142px;
        display: inline-block;
        margin: 2px 4px;
        border: 1px solid #ccc;
        line-height: 100%;
        padding: 2px 4px;
        background: #efefef;
        font-size: 15px;
    }

    #meeting-container .setup-time {
        display: inline-block;
        float: left;
        width: 122px;
        margin: 3px 4px 0 12px;
        /* margin: 0; */
        padding: 0;
    }

    #meeting-container .setup-time li {
        width: 100% !important;
        overflow: hidden;
        height: 44px;
        line-height: 39px !important;
        font-size: 17px;
        text-align: center;
        color: #666;
        display: inline-flex;
    }

    #meeting-container .setup-time li input {
        width: 50% !important;
        text-align: center;
        border: 0 !important;
        background: #efefef;
        color: #9e9c9c;
        font-size: 34px;
        display: inline-block;
        margin: 2px 2px;
        line-height: 100%;
    }

    #meeting-container .setup-time li input[class='year'] {
        width: 100% !important;
        text-align: center;
        font-weight: bold;
        font-size: 44px;
        color: #828181;
    }

    #meeting-container .submit-area {
        display: inline-block;
        float: right;
        margin: 0;
        padding: 0;
        /* margin-right: 8px; */
    }

    #meeting-container .submit-area li {
        clear: both;
        width: 150px;
        float: left;
        display: inline-flex;
        flex-wrap: nowrap;
        color: #ccc;
    }


    #meeting-container .submit-area li input,
    #meeting-container .submit-area li select {
        display: inline-block;
        float: left;
        height: 24px;
        line-height: 25px;
        border-radius: 5px;
        width: 40%;
        clear: both;
        margin: 4px 8px 4px 0px;
        border: 0 !important;
        background: #efefef;
        text-align: center;
    }

    #submit-meeting {
        display: block;
        float: right;
        background: #fff;
        width: 159px;
        height: 94px;
        border: 1px solid #e0e0e0;
        box-shadow: 3px 5px 20px 1px #909090;
        font-size: 31px;
        font-weight: bold;
        color: #666;
        cursor: pointer;
        margin: 4px 17px 0px 1px;
    }
    
    #meeting-msg-show {
        overflow: hidden;
        height: 22px;
        line-height: 22px;
        width: 100%;
        position: relative;
        background: #eaeaea;
        box-shadow: 0px 20px 30px 7px #888787;
        top: 8px;
        margin: 0 auto;
        margin-left: 0;
        border-radius: 0 0 0px 6px;
        display: none;
    }
    
    #meeting-msg {
        height: auto;
        text-align: left;
        font-size: 12px;
        margin: 0;
        padding: 0;
    }
    
    #meeting-msg li {
        list-style: none;
        height: 22px;
        text-align: left;
        margin: 0;
        padding: 0;
        text-indent: 15px;
        border-top: 1px dashed #e3e3e3;
        box-sizing:border-box;
    }
    `,
    meetingDom = `
    <ul class="setup-time">
        <li><input class="year" type="text" value="2021"></li>
        <li><input class="month" type="text" value="05">-<input class="day" type="text" value="20"></li>
        <li><input class="hour" type="text" value="08">:<input class="minute" type="text" value="00"></li>
    </ul>

    <ul class="book-list">
        <li><input class="start_time" type="text" value="" placeholder="yyyy-mm-dd HH:MM"> ~<input
                class="end_time" type="text" value="" placeholder="yyyy-mm-dd HH:MM"></li>
        <li><input class="start_time" type="text" value="" placeholder="yyyy-mm-dd HH:MM"> ~<input
                class="end_time" type="text" value="" placeholder="yyyy-mm-dd HH:MM"></li>
        <li><input class="start_time" type="text" value="" placeholder="yyyy-mm-dd HH:MM"> ~<input
                class="end_time" type="text" value="" placeholder="yyyy-mm-dd HH:MM"></li>
        <li><input class="start_time" type="text" value="" placeholder="yyyy-mm-dd HH:MM"> ~<input
                class="end_time" type="text" value="" placeholder="yyyy-mm-dd HH:MM"></li>
    </ul>

    <ul class="submit-area">
        <li>
            <input type="number" class="bufferTime" value="1000" />
            <select class="isRelease">
                <option value="0">全部</option>
                <option value="1">已释</option>
                <option value="2">未释</option>
            </select>
        </li>
        <li></li>
        <li><button id="submit-meeting" onclick="bookMeeting()">提交</button></li>
    </ul>
    <div id="meeting-msg-show">
        <ul id="meeting-msg"></ul>
    </div>
    <div id="meeting-close" onclick="closeTips()">x</div>
    `,
    meetingScr = `
    (function(){
        var updoc = document.getElementsByClassName('setup-time')[0];
        var dobj = new Date();
        var tmonth = dobj.getMonth() + 1;
        tmonth = tmonth < 10 ? '0' + tmonth : tmonth;
        var tminute = dobj.getMinutes();
        tminute = tminute < 10 ? '0' + tminute : tminute;
        
        setValueByCls(updoc, 'year', dobj.getFullYear());
        setValueByCls(updoc, 'month', tmonth);
        setValueByCls(updoc, 'day', dobj.getDate());
        setValueByCls(updoc, 'hour', dobj.getHours());
        setValueByCls(updoc, 'minute', tminute);
        
        
        var sTime = dobj.getFullYear() + '-' + tmonth + '-' + (dobj.getDate() + 1) + ' 10:30';
        var eTime = dobj.getFullYear() + '-' + tmonth + '-' + (dobj.getDate() + 1) + ' 11:00';
        
        var mdoc = document.getElementById("meeting-container");
        mdoc.getElementsByClassName('start_time')[0].value = sTime;
        mdoc.getElementsByClassName('end_time')[0].value = eTime;
    })()
    
    function bookMeeting() {
        var mdoc = document.getElementById("meeting-container");
        var resp = {
            "start_time": [],
            "end_time": [],
        };
        for (var cls in resp) {
            var clsVal = mdoc.getElementsByClassName(cls);
            for (var j in clsVal) {
                resp[cls].push(clsVal[j].value)
            }
        }
        var bookList = [];
        for (var i in resp["start_time"]) {
            if (resp["start_time"][i] && resp["end_time"][i]) {
                bookList.push({
                    "start_time": resp["start_time"][i],
                    "end_time": resp["end_time"][i]
                })
            }
        }

        var updoc = document.getElementsByClassName('setup-time')[0];
        var setupTime = getValueByCls(updoc, 'year')
            + '-' + getValueByCls(updoc, 'month')
            + '-' + getValueByCls(updoc, 'day')
            + ' ' + getValueByCls(updoc, 'hour')
            + ':' + getValueByCls(updoc, 'minute');

        var sdoc = document.getElementsByClassName('submit-area')[0];
        var bufferTime = getValueByCls(sdoc, 'bufferTime');
        var isRelease = getValueByCls(sdoc, 'isRelease');

        console.log(setupTime,bufferTime,isRelease,bookList);
        if(bookList.length <= 0) {
            return;
        }

        // 页面中显示程序信息
        showMsg();
        
        // 预订会议室
        var m = new Meeting({
            // 设定脚本运行时间
            "setUpTime": setupTime,
            // 需要预订的会议室时间段
            "bookList": bookList,
            // 会议室释放状态 1:仅释放 0:全部
            "isRelease": isRelease,
            "bufferTime": bufferTime,
            "msgClass": "meeting-msg"
        });

        // 执行时间距离当前时间超过 5Hour 需要先退出再登录，否则存在执行脚本时 Cookie 信息过期
        if(m.getDiffTime(setupTime) >= 5 * 3600 * 1000) {
            if(confirm("执行时间距离当前时间过久，可能存在登录信息过期不能执行脚本？是－退出再登录，否-不退出")) {
                window.location.href = '/h5/logout?t=' + (new Date()).getTime();
            }
        }
        
        m.process();
        
    };

    function getValueByCls(doc, cls) {
        return doc.getElementsByClassName(cls)[0].value;
    }
    
    function setValueByCls(doc, cls, val) {
        return doc.getElementsByClassName(cls)[0].value = val;
    }

    function closeTips() {
        var idList = ['meeting-script-header','meeting-script','meeting-container','meeting-css'];
        for(var i in idList) {
            var t = document.getElementById(idList[i]);
            document.body.removeChild(t);
        }
        window.location.reload();
    }
    
    function showMsg() {
        var speed = 1000;
        var lineHeight = 22;
        var showLines  = 20;
        // 向上滚动
        var showDom = document.getElementById("meeting-msg-show");
        var msgDom = document.getElementById("meeting-msg");
        
        marquee = () => {
            if(showDom.scrollHeight < 10) {
                showDom.style.display = 'none';
                return;
            }else{
                showDom.style.display = 'block';
            }
            if(msgDom.scrollTop <= 0){
                showDom.scrollTop = showDom.scrollTop + lineHeight;
            }else{
                showDom.scrollTop = showDom.scrollHeight;
            }
        }
        
        var myMar = setInterval(marquee, speed)
        showDom.onmouseover = function() {
            clearInterval(myMar);
            var showHeight = msgDom.scrollHeight;
            if(msgDom.scrollHeight > lineHeight * showLines) {
                showHeight = lineHeight * showLines;
            }
            showDom.style.height = showHeight + 'px';
            showDom.style.overflow = 'auto';
        }
        showDom.onmouseout = function() {
            showDom.style.height = lineHeight + 'px';
            showDom.scrollTop = msgDom.scrollHeight;
            showDom.style.overflow = 'hidden';
            myMar = setInterval(marquee, speed);
        }
    }
    `;

    var h = dom.createElement('script');
    h.id = 'meeting-script-header';
    h.setAttribute('charset', 'utf-8');
    h.src = meetingJs;
    dom.body.appendChild(h);


    var c = dom.createElement('style');
    c.id = 'meeting-css';
    c.innerHTML = meetingCss;
    dom.body.appendChild(c);

    var d = dom.createElement('div');
    d.id = 'meeting-container';
    d.innerHTML = meetingDom;
    dom.body.appendChild(d);

    var f = dom.createElement('script');
    f.id = 'meeting-script';
    f.innerHTML = meetingScr;
    dom.body.appendChild(f);

})(document);