let self = true;
let notNotice = sessionStorage.getItem('notNotice') || '';
let middleground = [
    '点击下方台阶随时反馈文档问题',
    '遇到问题可以随时点击我。帮你寻找客服',
    '我们也支持匿名方式反馈问题哦!<br /> <a href=http://app.baidu-int.com/devcenter-front/anonymous>立即反馈</a>',
    '想了解更多中台技术，立即加入开发者论坛吧。<br /> <a href=http://app.baidu-int.com/forum>点击前往</a>'
];
L2Dwidget.on('*', (name) => {
    if (name === 'create-canvas') {
        timer();
    }
});

let num = 0;
function timer() {
    if (!self || notNotice) {
        return;
    }
    else {
        let firstTime = sessionStorage.getItem('firstTime') || '';
        if (!firstTime) {
            sessionStorage.setItem('firstTime', num);
            setTimeout(() => {
                let oDiv = `
                    <div class='help-center'>
                        <i class='help-close'>
                            <svg 
                                viewBox="64 64 896 896" 
                                focusable="false" 
                                data-icon="close" 
                                width="1em"
                                height="1em" 
                                fill="currentColor" 
                                aria-hidden="true"
                            >
                                <path 
                                    d="M563.8 
                                    512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 
                                    0-9.2 2.1-12.3 5.7L511.6 449.8 
                                    295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 
                                    0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 
                                    7.95 0 00203 838h79.8c4.7 0 9.2-2.1 
                                    12.3-5.7l216.5-258.1 216.5 258.1c3 
                                    3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 
                                    6.1-13.1L563.8 512z">
                                </path>
                            </svg>
                        </i>
                        欢迎使用移动生态开发者中心，我是你的智能助理郑大力,遇到问题记得找我哦!
                    </div>
                `;
                // bca-disable-line
                $('.live2d-widget-dialog').html(oDiv)
                .css('opacity', 1);
                $('.help-close').click(function () {
                    notNotice = 1;
                    sessionStorage.setItem('notNotice', 1);
                    // bca-disable-line
                    $('.live2d-widget-dialog').html('').css('opacity', 0);
                    self = true;
                    setTimeout(() => {
                        timer();
                    }, 20000);
                });
            }, 2000);
            setTimeout(() => {
                if (self) {
                    // bca-disable-line
                    $('.live2d-widget-dialog').html('')
                    .css('opacity', 0);
                }
            }, 30000);
            setTimeout(() => {
                if (self) {
                    timer();
                }
            }, 60000);
        }
        else {
            let showStr = `
            <div class='help-center'>
                <i class='help-close'>
                    <svg 
                        viewBox="64 64 896 896" 
                        focusable="false" 
                        data-icon="close" 
                        width="1em"
                        height="1em" 
                        fill="currentColor" 
                        aria-hidden="true"
                    >
                        <path 
                            d="M563.8 
                            512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 
                            0-9.2 2.1-12.3 5.7L511.6 449.8 
                            295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 
                            0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 
                            7.95 0 00203 838h79.8c4.7 0 9.2-2.1 
                            12.3-5.7l216.5-258.1 216.5 258.1c3 
                            3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 
                            6.1-13.1L563.8 512z">
                        </path>
                    </svg>
                </i>
                ${middleground[num]}
            </div>
        `;
            // bca-disable-line
            $('.live2d-widget-dialog').html(showStr)
                .css('opacity', 1);
            num += 1;
            if (num > middleground.length - 1) {
                num = 0;
            }
            setTimeout(() => {
                if (self) {
                    // bca-disable-line
                    $('.live2d-widget-dialog').html('')
                    .css('opacity', 0);
                }
            }, 5000);
            setTimeout(() => {
                timer();
            }, 20000);
            $('.help-close').click(function () {
                notNotice = 1;
                sessionStorage.setItem('notNotice', 1);
                // bca-disable-line
                $('.live2d-widget-dialog').html('')
                    .css('opacity', 0);
            });
        }
    }
}
L2Dwidget.init({
    'model': {
        'jsonPath': 'https://unpkg.com/live2d-widget-model-koharu@1.0.5/assets/koharu.model.json',
        'scale': 1
    },
    'display': {
        'position': 'right',
        'width': 75,
        'height': 100,
        'hOffset': -10,
        'vOffset': 70
    },
    'mobile': {
        'show': true,
        'scale': 0.5
    },
    'react': {
        'opacityDefault': 0.7,
        'opacityOnHover': 0.2
    },
    'dialog': {
        'enable': true,
        'script': {
            // 'every idle 10s': '$hitokoto$',
            'tap body': '哎呀！别碰我<a>123456</a>！',
        }
    }
});
$(document).on('click', '#live2dcanvas', function () {
    self = false;
    // bca-disable-line
    $('.live2d-widget-dialog').html('').css('opacity', 0);
    let oDiv = `
        <div class='help-center'>
            <i class='help-close'>
                <svg 
                    viewBox="64 64 896 896" 
                    focusable="false" 
                    data-icon="close" 
                    width="1em"
                    height="1em" 
                    fill="currentColor" 
                    aria-hidden="true"
                >
                    <path 
                        d="M563.8 
                        512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 
                        0-9.2 2.1-12.3 5.7L511.6 449.8 
                        295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 
                        0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 
                        7.95 0 00203 838h79.8c4.7 0 9.2-2.1 
                        12.3-5.7l216.5-258.1 216.5 258.1c3 
                        3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 
                        6.1-13.1L563.8 512z">
                    </path>
                </svg>
            </i>
            让我猜猜您要什么帮助。<br />
            <a href='baidu://message?appid=g-HPzsiImW5zR_WMDcHH1Q'>召唤智能客服</a>
            <br />
            <a href='javascript:;' class='conmment-click'>文档问题反馈</a>
            <br />
            <a href='/devcenter-front/anonymous'>匿名问题反馈</a>
            <br />
            <a href='/forum'>访问开发者论坛</a>
        </div>
    `;
    // bca-disable-line
    $('.live2d-widget-dialog').html(oDiv).css('opacity', 1);
    $('.conmment-click').click(function (event) {
        $('.aliyun-widget-overlay-backdrop').css({display: 'flex'});
        event.stopPropagation();
    });
    $('.help-close').click(function () {
        notNotice = 1;
        sessionStorage.setItem('notNotice', 1);
        // bca-disable-line
        $('.live2d-widget-dialog').html('').css('opacity', 0);
        self = true;
        setTimeout(() => {
            timer();
        }, 20000);
    });
});