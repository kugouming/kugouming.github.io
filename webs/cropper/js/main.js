$(function () {

  'use strict';
  var size_options = [
                      [],
                      [[],[1140, 641],[1242, 648],[800, 320],[247, 165]],
                      [[],[200, 200],[375, 375],[120, 120]],
                      [[],[1242, 492],[320, 160],[121, 91],[300, 200]],
                      [[],[1140, 640],[560, 210],[800, 320],[800, 450],[500,500],[300,200]],
                      [[],[798, 488],[254, 170],[798, 447]],
                      [[],[832, 560],[544, 560],[128, 85]],
                    ];
  var size_scale = [
                      [],
                      [[],[''+1.0*1141/641], [''+1.0*1242/648],[''+1.0*800/320],[''+1.0*247/165]],
                      [[],[''+1.0*200/200],[''+1.0*375/375],[''+1.0*120/120]],
                      [[],[''+1.0*1242/492],[''+1.0*320/160],[''+1.0*121/91],[''+1.0*300/200]],
                      [[],[''+1.0*1140/640],[''+1.0*560/210],[''+1.0*800/320],[''+1.0*800/450],[''+1.0*500/500],[''+1.0*300/200]],
                      [[],[''+1.0*798/488],[''+1.0*254/170],[''+1.0*798/447]],
                      [[],[''+1.0*832/560],[''+1.0*544/560],[''+1.0*128/85]],
                    ];

  var size_select = 1;
  var console = window.console || { log: function () {} };
  var URL = window.URL || window.webkitURL;
  var $image = $('#image'); 
  var screenWidth = $(window).width();
  var screenHeight = $(window).height();
  var x, y, width, height;
  var crop_width = size_options[4][1][0];
  var crop_height = size_options[4][1][1];
  var options = {
        aspectRatio: size_scale[4][1][0],
        preview: '.img-preview',
        crop: function (e) {
          x = Math.round(e.x);
          y = Math.round(e.y);
          width = Math.round(e.width);
          height = Math.round(e.height);
        }
      };
  var originalImageURL = $image.attr('src');
  var uploadedImageName = 'cropped.jpg';
  var uploadedImageType = 'image/jpeg';
  var uploadedImageURL;


  // Tooltip
  $('[data-toggle="tooltip"]').tooltip();


  // Cropper
  $image.on({
    ready: function (e) {
      console.log(e.type);
    },
    cropstart: function (e) {
      console.log(e.type, e.action);
    },
    cropmove: function (e) {
      console.log(e.type, e.action);
    },
    cropend: function (e) {
      console.log(e.type, e.action);
    },
    crop: function (e) {
      console.log(e.type, e.x, e.y, e.width, e.height);
    },
    zoom: function (e) {
      console.log(e.type, e.ratio);
    }
  }).cropper(options);

  if (!$.isFunction(document.createElement('canvas').getContext)) {
    $('button[data-method="getCroppedCanvas"]').prop('disabled', true);
  }

  if (typeof document.createElement('cropper').style.transition === 'undefined') {
    $('button[data-method="rotate"]').prop('disabled', true);
    $('button[data-method="scale"]').prop('disabled', true);
  } 

  $('#crop_options').on('change', options, function(){
    var $this = $(this);
    console.log(this.value);
    var type = $this.prop('type');
    var name = $this.attr('name');
    var cropBoxData;
    var canvasData;
    var tmp;
    var name_option;
    var flag, push_times;

    if (!$image.data('cropper')) {
      return;
    }

    flag = 1;
    push_times = 0;
    tmp = $this.val();
    if(tmp != '0'){
      var data = tmp.split('.');
      var i = parseInt(data[0]);
      var j = parseInt(data[1]);
      crop_width = size_options[i][j][0];
      crop_height = size_options[i][j][1];
      console.log('scale: '+size_scale[i][j][0]);
      console.log('scale: '+parseFloat(size_scale[i][j][0]).toFixed(1).toString());
      options['aspectRatio'] = parseFloat(size_scale[i][j][0]).toFixed(1).toString();
      $image.cropper('destroy').cropper(options);
    }
    else{
      size_select = -1;
      $('#setSizeModal').modal();
      $(function () { $('#setSizeModal').on('hidden.bs.modal', function () {
        push_times += 1;
        var tmp_str = 1.0*$("#dataX").val()/$("#dataY").val();
        flag = -1;
        options['aspectRatio'] = ''+tmp_str;
        // name_option = ''+tmp;
        if(push_times == 1){
          $image.cropper('destroy').cropper(options);
        }
      })});
    }
  });

  $('.docs-buttons').on('click', '[data-method]', function () {
    var $this = $(this);
    var data = $this.data();
    var cropper = $image.data('cropper');
    var cropped;
    var $target;
    var result;
    var name_option;

    if ($this.prop('disabled') || $this.hasClass('disabled')) {
      return;
    }

    if (cropper && data.method) {
      data = $.extend({}, data);

      if (typeof data.target !== 'undefined') {
        $target = $(data.target);

        if (typeof data.option === 'undefined') {
          try {
            data.option = JSON.parse($target.val());
          } catch (e) {
            console.log(e.message);
          }
        }
      }

      cropped = cropper.cropped;

      switch (data.method) {
        case 'rotate':
          if (cropped && options.viewMode > 0) {
            $image.cropper('clear');
          }

          break;

        case 'getCroppedCanvas':
          if (uploadedImageType === 'image/jpeg') {
            if (!data.option) {
              data.option = {};
            }

            data.option.fillColor = '#fff';
          }

          break;

        case 'downloadtmp':
          var src = 'https://wx2.sinaimg.cn/large/bf955988ly1fww7d47jc0j23402c0b2c.jpg';
          //下载保存文件名
          var imgpath = 'C://Users//xue//Desktop//img';
          var imgname = 'testimg.jpg';
          /*$('#downImg').attr('src', src);
          var img = $('#downImg').attr("src");
          var alink = document.createElement("a");
          alink.href = img;
          alink.download = imgname;
          alink.click();*/
          
          // 创建隐藏的可下载链接
          var eleLink = document.createElement('a');
          eleLink.download = imgname;
          eleLink.style.display = 'none';
          // 字符内容转变成blob地址
          var blob = new Blob([src]);
          eleLink.href = URL.createObjectURL(blob);
          // 触发点击
          document.body.appendChild(eleLink);
          eleLink.click();
          // 然后移除
          document.body.removeChild(eleLink);
          console.log('downloadtmp');
          break;
      }

      result = $image.cropper(data.method, data.option, data.secondOption);

      switch (data.method) {
        case 'rotate':
          if (cropped && options.viewMode > 0) {
            $image.cropper('crop');
          }

          break;

        case 'scaleX':
        case 'scaleY':
          $(this).data('option', -data.option);
          break;

        case 'getCroppedCanvas':
        case 'downloadCanvas':
          if (result) {
            var old_image = document.getElementById("image");
            /*var canvas = document.getElementById("myCanvas");
            var ctx = canvas.getContext("2d");*/

            var canvas_new = document.createElement("canvas");
            var ctx_new = canvas_new.getContext("2d");
            if(size_select != -1){
              /*canvas.width = size_options[size_select][0];
              canvas.height = size_options[size_select][1];*/
              canvas_new.width = crop_width;
              canvas_new.height = crop_height;
            }
            else{
              /*canvas.width = $("#dataX").val();
              canvas.height = $("#dataY").val();*/
              canvas_new.width = $("#dataX").val();
              canvas_new.height = $("#dataY").val();
            }

            var w = canvas_new.width;
            var quality = 0.9;
            var h = canvas_new.height;
            // ctx.drawImage(old_image, x, y, width, height, 0, 0, w, h);
            ctx_new.drawImage(old_image, x, y, width, height, 0, 0, w, h);
            console.log("data.method: "+data.method);
            if(data.method == 'getCroppedCanvas'){
	      console.log("getCroppedCanvas");
              // var axios_url = "http://commentimg.pae.baidu.com/api/imageupload";
              // var tmp_url = "http://yq01-psdy-diaoyan1063.yq01.baidu.com:8845/api/imageupload";
              var nginx_url = "/sepro/imageupload";
              var data = canvas_new.toDataURL('image/jpeg', quality);
              data = data.split(',');
              data = data[1];
              var fd = new FormData();
              fd.append('content', data);
              fd.append('operator', 'ori');
              fd.append('source', '1');
              //jQuery的ajax方法
              jQuery.ajax({
                processData: false,
                contentType: false,
                url: nginx_url,
                type: "post",
                data: fd,
                dataType: 'json',
                error: function(){
                  console.log("error");
                  $("#ret_url").val("error");
                },
                success: function(ret){
                  console.log("success");
                  var ori_url = ret["result"]["url"]["ori"];
                  $("#ret_url").val(ori_url);
                  alert("success");
                }
              });
            }
            else if(data.method == 'downloadCanvas'){
              console.log("download canvas");
              var MIME_TYPE = "image/jpeg";
              var imgURL = ctx_new;
              var dlLink = document.createElement('a');
              var myDate = new Date();
              var fileName = '' + myDate.getTime() + '_crop.jpg';
              dlLink.download = fileName;
              dlLink.href = canvas_new.toDataURL('image/jpeg', 0.9);
              console.log("download Img");
              dlLink.dataset.downloadurl = [MIME_TYPE, dlLink.download, dlLink.href].join(':');   
              document.body.appendChild(dlLink);
              dlLink.click();
              document.body.removeChild(dlLink);
            }
            
          }

          break;

        case 'url_upload':
          var img_url = document.getElementById('image_url').value;
          
          if (uploadedImageURL) {
            URL.revokeObjectURL(uploadedImageURL);
          }

          uploadedImageURL = "http://yq01-ps-m12-06-pc724.yq01.baidu.com:8888/download?url="+encodeURIComponent(img_url);
          $image.attr('crossOrigin', 'anonymous');
          $image.attr('src', uploadedImageURL);
          // $image.cropper('destroy').attr('src', uploadedImageURL);
          $image.cropper('destroy').cropper(options);
          break;

        case 'url_copy':
          document.getElementById("ret_url").select();
          console.log("current value:"+$("#ret_url").val() );
          document.execCommand("Copy"); // 执行浏览器复制命令
          break;
      }

      if ($.isPlainObject(result) && $target) {
        try {
          $target.val(JSON.stringify(result));
        } catch (e) {
          console.log(e.message);
        }
      }

    }
  });


  // 通过键盘方向键调整图片位置
  $(document.body).on('keydown', function (e) {

    if (!$image.data('cropper') || this.scrollTop > 300) {
      return;
    }

    switch (e.which) {
      case 37:
        e.preventDefault();
        $image.cropper('move', -2, 0);
        break;

      case 38:
        e.preventDefault();
        $image.cropper('move', 0, -2);
        break;

      case 39:
        e.preventDefault();
        $image.cropper('move', 2, 0);
        break;

      case 40:
        e.preventDefault();
        $image.cropper('move', 0, 2);
        break;
    }

  });



  // 上传图片
  var $inputImage = $('#inputImage');

  if (URL) {
    $inputImage.change(function () {
      var files = this.files;
      var file;

      if (!$image.data('cropper')) {
        return;
      }

      if (files && files.length) {
        file = files[0];

        if (/^image\/\w+$/.test(file.type)) {
          uploadedImageName = file.name;
          uploadedImageType = file.type;

          //如果url存在，则释放掉
          if (uploadedImageURL) {
            URL.revokeObjectURL(uploadedImageURL);
          }

          uploadedImageURL = URL.createObjectURL(file);
          $image.cropper('destroy').attr('src', uploadedImageURL).cropper(options);
          $inputImage.val('');
        } else {
          window.alert('请选择一张图片.');
        }
      }
    });
  } else {
    $inputImage.prop('disabled', true).parent().addClass('disabled');
  }

});

//trick的一键复制
function copyToclip(){
  var textArea = document.createElement("textarea");
  textArea.style.position = 'fixed'; 
  textArea.style.top = 0; 
  textArea.style.left = 0; 
  textArea.style.width = '1em'; 
  textArea.style.height = '1em'; 
  textArea.style.padding = 0; 
  textArea.style.border = 'none'; 
  textArea.style.outline = 'none'; 
  textArea.style.boxShadow = 'none'; 
  textArea.style.background = 'transparent';
  textArea.value = $("#visible").val();

  document.body.appendChild(textArea);
  textArea.select();
  // $('#url')[0].value = select.value;

  /*var item=document.getElementById("url");
  item.select(); // 选择对象*/

  // var item = document.getElementById("upload"); // item.select(); console.log("current value:"+$("#visible").val() ); document.execCommand("Copy"); // 执行浏览器复制命令
}