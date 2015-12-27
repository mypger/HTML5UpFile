/**
 * jQuery扩展之H5上传文件，支持本地预览和生成缩略图
 * @author jianrun 385884606@qq.com
 * @create 2015年12月27日23:18:08
 * @last 2015年12月27日23:18:12
 */
$.fn.upload=function(config,callback){
	var self=this;
	this.filelist=[];
	this.init=function(){
		if($(self)[0].type!='file'&&$(self)[0].nodeName!="INPUT"){
			console.warn("你绑定的元素不是文件域",$(self)[0]);
			return;
		}
		self.configure();
		self.initSelect();
	}
	this.configure=function(){
		config=(typeof(config)=="object")?config:{};
		config.url = config.url?config.url:''; //目标URl
		config.requestHeader = (typeof(config.requestHeader)=="object")?config.requestHeader:{}; //请求头
		config.extraSendData = (typeof(config.extraSendData)=="object")?config.extraSendData:{}; //额外发送的数据
		config.uploadNumber = (typeof(config.uploadNumber)=="number")?config.uploadNumber:1; //允许同时上传的文件个数
		config.thumWidth = (typeof(config.thumWidth)=="number")?config.thumWidth:160; //缩略图的最大宽度
		config.thumHeight = (typeof(config.thumHeight)=="number")?config.thumHeight:120; //缩略图的最大高度
		config.limitWidth = (typeof(config.limitWidth)=="number")?config.limitWidth:6000; //限制原图的最大宽度
		config.limitHeight = (typeof(config.limitHeight)=="number")?config.limitHeight:6000; //限制原图的最大高度
		config.limitSize = (typeof(config.limitSize)=="number")?config.limitSize:10485760; //限制上传size(单位：b)
		config.fileMaxNumber = (typeof(config.fileMaxNumber)=="number")?config.fileMaxNumber:1; //最大文件数量上限
		config.fileAccept = (typeof(config.fileAccept)=="string")?config.fileAccept:"image/gif,image/png,image/jpeg"; //允许选择哪些格式的文件
		config.immediately = (typeof(config.immediately)=="boolean")?config.immediately:false; //是否选完立即上传
		config.createThumbnail = (typeof(config.createThumbnail)=="boolean")?config.createThumbnail:true; //如果文件是图片是否创建缩略图
		config.startButton= (typeof(config.startButton)=="object")?config.startButton:false; //开始上传按扭
		config.stopButton= (typeof(config.stopButton)=="object")?config.stopButton:false; //停止上传按扭
	}
	this.Event=function(type,target){
		var eventid=self.currentEventId?self.currentEventId:0;
		self.currentEventId=(eventid+1);
		return 
		{
			time:new Date().getTime(),
			type:type,
			target:target,
			eventid:eventid
		}
	}
	this.initSelect=function(){
		if(config.fileMaxNumber>1){
			self.attr("multiple","multiple");
		}
		self.attr("accept",config.fileAccept);
		self.change(function(e) {
			var tempFiles = self[0].files;
			this.isrefile=function(newfile){
				for(k in self.filelist){
					var oldfile=self.filelist[k];
					if(newfile.lastModified==oldfile.lastModified&&newfile.name==oldfile.name&&newfile.size==oldfile.size&&newfile.type==oldfile.type){
						return true;
					}
				}
				return false;
			}
			for (var i=0;i<tempFiles.length;i++) {
				var file=tempFiles[i];
				if(this.isrefile(file)){
					var evt=self.Event("repeated",file);
					//写到这里 2015年12月28日0:24:29
					continue;
				}
				self.filelist.push(file);
			}
			
		});
	}	
	this.init();
	var e=new window.CustomEvent(this);
	console.log(e);
}
