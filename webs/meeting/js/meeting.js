// 执行脚本前先判断是否为预期页面，非预期页面需要先重置
var localHerf = window.location.href;
var destHerf = "http://meeting.baidu.com";
if(localHerf.indexOf(destHerf) < 0) {
    window.location.href = destHerf;
}

/**
 * 预订会议室脚本
 */
class Meeting {
    /**
     * 类的实例化方法
     * @param {*} configs 
     *                  {
     *                      setUpTime: "2021-04-12 10:00",       // 脚本启动时间
     *                      bookList: [                          // 需要预订时间的数组,个数控制到4个
     *                          {start_time:xxxx, end_time:xxxx},
     *                      ],
     *                      bufferTime: 1000,                    // 启动脚本前预留数据先行处理时间
     *                      isRelease: 0                         // 会议室释放状态，0: 全部，1: 仅已释放会议室，2: 仅未释放会议室
     *                  }
     */
    constructor(configs) {
        this.setUpTime   = configs.setUpTime;
        this.bookList    = configs.bookList;
        this.msgClass    = configs.msgClass;  // 定义页面直接显示debug信息的 Dom ID 名称
        this.bufferTime  = configs.bufferTime ?? 1000;
        this.isRelease   = configs.isRelease ?? 0; // 筛选会议室的条件，会议室是否释放
        // this.bufferTime  = configs.bufferTime ? configs.bufferTime : 1000;
        // this.isRelease   = configs.isRelease ? configs.isRelease :  0; // 筛选会议室的条件，会议室是否释放
        this.meetingHost = this.getHost();
    }

    /**
     * 程序主入口
     */
    process = () => {
        // 脚本开始时间距离执行时间相差2min以上时执行此处逻辑
        var flagTime = 2 * 60 * 1000;

        // var diffTime  = this.getDiffTime(this.setUpTime);
        var loopTime  = 500; // 单位：毫秒

        var setHandler = setInterval(() => {
            var diffTime  = this.getDiffTime(this.setUpTime);
            console.debug('%cCur time: ' + (new Date()) + '  Remain time: ' + diffTime, 'color:gray;');
            this.showLog('Cur time: ' + (new Date()) + '  Remain time: ' + diffTime);
            if(diffTime <= flagTime) {
                console.warn('Exit loop time for wait.');
                this.showLog('Exit loop time for wait.');
                clearInterval(setHandler);

                return this.delayExcProcess(this.getDiffTime(this.setUpTime));
            }
        }, loopTime);
    }

    /**
     * 预订指定时间的会议室
     * @param {*} startTime 
     * @param {*} endTime 
     * @param {*} roomData 
     */
    bookRoom = async (startTime, endTime, roomData) => {
        let loginUser = await this.getLoginUser();
        let params = {
            "roomKey"       : roomData.id,
            "description"   : loginUser + "于" + startTime + "在" + roomData.roomName + "的会议室",
            "peopleNum"     : roomData.capacity,
            "startTime"     : this.formatTime(startTime),
            "endTime"       : this.formatTime(endTime),
            "t"             : this.formatTime(),
            // "orderman"      : "", // 预订者中文姓名
            // "ordermanEmail" : ""  // 预订者邮箱
        };
        // console.debug("params:", params);
        let settings = {
            method: 'POST',
            headers: {
                'Accept':       'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        };
        
        let resp = await fetch(`${this.meetingHost}/h5/book`, settings)
            .then(response => response.json())
            .then(json => {
                return json;
            })
            .catch(e => {
                return e;
            });
        
        if(resp.code == 200) {
            console.log('%cSucc %cRoom[' + roomData.roomName + '] Time[' + startTime + '] succ!!!', 'color: green;font-size:20px;font-weight:bold;', 'color: #4DC86F;');
            this.showLog('Succ Room[' + roomData.roomName + '] Time[' + startTime + '] succ!!!', 'succ');
        }else{
            console.log('%cError %cRoom[' + roomData.roomName + '] Time[' + startTime + '] Msg[' + resp.data.message + ']', 'color:red;font-size:14px;font-weight:bold;', 'color: #f75d6e;');
            this.showLog('Error Room[' + roomData.roomName + '] Time[' + startTime + '] Msg[' + resp.data.message + ']', 'error');
        }
    }

    runMeeting = async (startTime, endTime) => {
        let params = {
            "buildingId"  : 120,         // 科技园1号楼
            "areaId"      : 91,          // 楼层: 91:2层  92:3层 93:4层 94:5层 95:6层 96:7层
            "roomType"    : "1,2",       // 会议室类型: 1:普通;2:视频;3:培训;
            "isTrainRoom" : null, 
            "capacity"    : "10-20",     // 会议室容量： 0-9:微型; 10-20:小型; 21-30:中型; 31-1000:大型; null:不限大小;
            "onlyFree"    : false,
            "startTime"   : this.formatTime(startTime),
            "endTime"     : this.formatTime(endTime),
            "t"           : this.formatTime()
        };

        let settings = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        };
    
        let data = await fetch(`${this.meetingHost}/h5/room/query`, settings)
            .then(response => response.json())
            .then(json => {
                return json;
            })
            .catch(e => {
                return e
            });
    
        if(data.code != 200) {
            var logStr = 'No query rooms. err:' + data;
            console.error(logStr);
            this.showLog(logStr, 'error');
            return;
        }
    
        // 输出当前查询到的结果
        console.debug(data);
        
        // 等待到了目标时间之后再执行脚本，否则无法执行成功
        var holdTimeHandler = setInterval(() => {
            // ....
            console.debug('%cSleep time: ' + (new Date()), 'color:gray;')
            this.showLog('Sleep time: ' + (new Date()));

            if(this.getDiffTime(this.setUpTime) <= 2) {
                console.warn('Exit sleep time.')
                // 退出循环，执行请求
                clearInterval(holdTimeHandler);

                return ((data) => {
                    console.debug(data)
                    var bookCount = 0
                    var roomList = data.data.entity.roomList;
                    
                    for(var i in roomList) {
                        var item = roomList[i]
                        if(item.highEfficiency === true) {
                            continue;
                        }

                        // 释放会议室选择： 
                        //      this.isRelease 可选值：
                        //          0: 全部
                        //          1: 仅已释放会议室
                        //          2: 仅未释放会议室
                        // item.releaseStatus 1:已释放  0:未释放
                        if(this.isRelease == 1 && item.releaseStatus == 0) {  // 过滤未释放会议室
                            continue;
                        }
                        if(this.isRelease == 2 && item.releaseStatus == 1) {  // 过滤已释放会议室
                            continue;
                        }

                        // 说明当前会议室在一个小时内被拆分成多个时间段使用，或者已经有人预订
                        if(item.mrbsSchedules.length > 1) {
                            continue;
                        }
                        // 会议非空闲状态，不能预约
                        if(item.mrbsSchedules[0].status != 'free') {
                            continue;
                        }
                        bookCount ++;

                        var logStr = "执行预订: " + startTime + " " + item.roomName + " count[" + bookCount + "] start ...";
                        console.log(logStr);
                        this.showLog(logStr);

                        ((item) => {
                            var j = 1;
                            var retryTimes = 2;

                            // this.bookRoom(startTime, endTime, item);
                            var sVal = setInterval(() => {
                                // console.debug(j)
                                if(j >= retryTimes) {
                                    clearInterval(sVal);
                                    return ;
                                }
                                // console.debug(j, startTime, endTime, item)
                                this.bookRoom(startTime, endTime, item);
                                j++;
                            }, Math.floor(Math.random() * 1000));
                        })(item);
                        
                        // 最多执行10个会议室预订，超过退出循环
                        if(bookCount >= 10) {
                            break;
                        }
                    }
                })(data)
            }
        }, 1);
        
        return data;
    }

    /**
     * 延迟执行预订操作
     * @param {}} runTime 
     */
    delayExcProcess = (runTime) => {
        return setTimeout(() => {
            // 开始执行脚本
            console.log("run ....")
            // 遍历时间断进行预订
            let bookCnt = 0;
            for(var i in this.bookList) {
                var item = this.bookList[i]
                if(!item.start_time || !item.end_time) {
                    continue;
                }
                // 预订会议室，每人每日仅限4个小时
                if(bookCnt >= 4) {
                    break;
                }
                this.runMeeting(item.start_time, item.end_time);
                bookCnt ++;
            }
               
        }, runTime);
    }

    /**
     * 格式化输出时间（单位：毫秒）
     * @param {*} timeStr 
     */
    formatTime = (timeStr='') => {
        if(timeStr){
            return new Date(timeStr).getTime();
        }else{
            return new Date().getTime();
        }
    }

    /**
     * 获取距离目标时间差（单位：毫秒）
     * @param {*} timeStr 
     */
    getDiffTime = (timeStr) => {
        var curTime  = new Date().getTime();
        var destTime = new Date(timeStr).getTime();
        
        return destTime - curTime
    }

    /**
     * 获取请求Host
     */
    getHost = () => {
        return 'http://meeting.baidu.com';
        // return 'http://' + window.location.hostname;
    }

    /**
     * 获取登录用户名
     */
    getLoginUser = () => {
        return new Promise((resolve, reject) => {
            let settings = {
                method: 'GET',
                headers: {
                    'Accept':       'application/json',
                    'Content-Type': 'application/json',
                },
            };
            
            fetch(`${this.meetingHost}/h5/user/info?t=${this.formatTime()}`, settings)
                .then(response => response.json())
                .then(json => {
                    let user = '';
                    if(json.code == 200) {
                        user = json.data.entity.userName;
                    }
                    resolve(user);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    /**
     * 将debug信息输出到页面
     * @param {*} msg 
     * @param {*} type 
     */
    showLog = (msg, type='info') => {
        if(!this.msgClass || !document.getElementById(this.msgClass)) {
            console.log(document.getElementById(this.msgClass));
            return;
        }
        var color = '#8d86e8';
        switch(type) {
            case 'error':
                color = 'red';
                break;
            case 'succ':
                color = 'green';
                break;
        }

        var obj = document.getElementById(this.msgClass);
        var l = document.createElement('li');
        l.setAttribute('style', 'color:' + color + ' !important;');
        l.innerHTML = msg;
        obj.appendChild(l);
        obj.parentNode.style.display = 'block';
    }
}
/*
new Meeting({
    // 设定脚本运行时间
    "setUpTime": "2021-04-23 10:00",
    // 需要预订的会议室时间段
    "bookList": [
        {
            "start_time": "2021-04-24 10:00",
            "end_time": "2021-04-24 10:30"
        }
    ],
    // 会议室释放状态 1:仅释放 0:全部
    "isRelease": 0
}).process();
*/