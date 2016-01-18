/**
 * jQuery扩展之H5上传文件，支持本地预览和生成缩略图
 * @author jianrun 385884606@qq.com
 * @create 2015年12月27日23:18:08
 */
$.fn.upload = function(targetUrl,option, callback) {
	var self = this;
	this.filelist = [];
	this.status='free';
	this.currentUploadList=[];
	function init() {
		if ($(self)[0].type != 'file' && $(self)[0].nodeName != "INPUT") {
			console.warn("你绑定的元素不是文件域", $(self)[0]);
			return;
		}
		initOption();
		initSelect();
		initBuootnEvent();
	}
	//初始化选项
	function initOption() {
		//option是全局的
		option = (typeof(option) == "object") ? option : {};
		option.url = targetUrl?targetUrl:option.url ? option.url : ""; //上传文件地址
		option.requestHeader = (typeof(option.requestHeader) == "object") ? option.requestHeader : {}; //请求头
		option.extraSendData = (typeof(option.extraSendData) == "object") ? option.extraSendData : {}; //额外发送的数据
		option.uploadNumber = (typeof(option.uploadNumber) == "number") ? option.uploadNumber : 1; //允许同时上传的文件个数
		option.thumWidth = (typeof(option.thumWidth) == "number") ? option.thumWidth : 160; //缩略图的最大宽度
		option.thumHeight = (typeof(option.thumHeight) == "number") ? option.thumHeight : 120; //缩略图的最大高度
		option.limitWidth = (typeof(option.limitWidth) == "number") ? option.limitWidth : 6000; //限制原图的最大宽度
		option.limitHeight = (typeof(option.limitHeight) == "number") ? option.limitHeight : 6000; //限制原图的最大高度
		option.limitSize = (typeof(option.limitSize) == "number") ? option.limitSize : 10485760; //限制上传size(单位：b)
		option.fileMaxNumber = (typeof(option.fileMaxNumber) == "number") ? option.fileMaxNumber : 1; //最大文件数量上限
		option.fileAccept = (typeof(option.fileAccept) == "string") ? option.fileAccept : "image/gif,image/png,image/jpeg"; //允许选择哪些格式的文件
		option.immediately = (typeof(option.immediately) == "boolean") ? option.immediately : false; //是否选完立即上传
		option.createThumbnail = (typeof(option.createThumbnail) == "boolean") ? option.createThumbnail : true; //如果文件是图片是否创建缩略图
		option.startButton = (typeof(option.startButton) == "object") ? option.startButton : false; //开始上传按扭
		option.stopButton = (typeof(option.stopButton) == "object") ? option.stopButton : false; //停止上传按扭
		option.fileInputName=option.fileInputName?option.fileInputName:"html5upfile";//表单中的文件域名称(在php中或以通过$_FILES["html5upfile"]["tmp_name"]得到上传的文件)
		self.option=option;
		console.log(option.url);
	}
	//初始化选择文件事件
	function initSelect() {
		if (option.fileMaxNumber > 1) {
			self.attr("multiple", "multiple");
		}
		self.attr("accept", option.fileAccept);
		self.change(function(e) {
			var tempFiles = this.files;
			this.isrefile = function(newfile) {
				for (k in self.filelist) {
					var oldfile = self.filelist[k].data;
					if (newfile.lastModified == oldfile.lastModified && newfile.name == oldfile.name && newfile.size == oldfile.size && newfile.type == oldfile.type) {
						return true;
					}
				}
				return false;
			}
			var batchid = new Date().getTime().toString(36);
			var batch = [];
			for (var i = 0; i < tempFiles.length; i++) {
				var file=tempFiles[i];
				//将文件放入一个批次中
				var newfile = {};
				newfile.batch = batchid;
				newfile.data = file;
				newfile.targetId = batchid + "_" + i;
				newfile.status = 'new';
				//判断文件类型，放行允许的文件类型和未知的文件类型（因为浏览器不能识别某些文件类型） 
				var re=new RegExp(file.type,"i");
				if((file.type!="")&&(!re.test(option.fileAccept))){
					self.handleEvent(self.createEvent("limitType", newfile.data));
					continue;
				}
				//判断文件大小
				if(file.size>option.limitSize){
					self.handleEvent(self.createEvent("limitSize", newfile.data));
					continue;
				}
				//判断文件是否重复
				if (this.isrefile(newfile.data)) {
					self.handleEvent(self.createEvent("repeated", newfile.data));
					continue;
				}
				newfile.element=$("<div></div>");
				batch.push(newfile);
				self.handleEvent(self.createEvent("addOne", newfile));
			}
			self.filelist=self.filelist.concat(batch);
			self.handleEvent(self.createEvent("addBatch", batch));
			if (option.createThumbnail) {
				var hasImage = false;
				for (k in batch) {
					//标识等待创建缩略图的文件
					switch (batch[k].data.type) {
						case "image/jpeg":
						case "image/png":
						case "image/gif":
						case "image/bmp":
							batch[k].status = "WCT"; //WCT:Waiting create thumbnail
							self.handleEvent(self.createEvent("WCT", batch[k]));
							hasImage = true;
							break;
					}
				}
				if (hasImage) {
					self.createThumbnail(batch);
				} else if (option.immediately) {
					self.uploadBatch(batch);
				}else{
					option.startButton.removeAttr("disabled");
				}
			}
		});
	}
	//初始化按钮事件
	function initBuootnEvent(){
		if(!option.startButton||!option.startButton[0]){
			option.startButton=$("<input type='button' value='开始上传' />");
		}
		option.startButton.click(function(){
			self.startUpload();
		}).attr("disabled","disabled");
		if(!option.stopButton||!option.stopButton[0]){
			option.stopButton=$("<input type='button' value='暂停上传' />");
		}
		option.stopButton.click(function(){
			self.stopUpload();
		}).attr("disabled","disabled");
	}
	//创建事件
	this.createEvent = function(type, target) {
		var eventid = self.currentEventId ? self.currentEventId : 0;
		self.currentEventId = (eventid + 1);
		var obj = {};
		obj.time = new Date().getTime();
		obj.type = type;
		obj.target = target;
		obj.eventid = eventid;
		return obj;
	}
	//处理事件
	this.handleEvent = function(evt) {
		callback(evt);
		switch(evt.type){
			case "upComplate":
			case "upError":
				delete self.currentUploadList[evt.target.targetId];
				evt.target.targetFile.upResultCallback();
			case "upAbort":
			
			break;
		}
	}
	//创建缩略图
	this.createThumbnail = function(batch) {
		this.create = function(src, callback) {
			var img = document.createElement("img")
			img.onload = function() {
				var w = option.thumWidth;
				var h = option.thumHeight;
				if ((img.width / img.height) > (w / h)) {
					h = option.thumWidth / (img.width / img.height);
				} else {
					w = option.thumHeight / (img.height / img.width);
				}
				var c = document.createElement("canvas");
				c.width = w;
				c.height = h;
				var cxt = c.getContext("2d");
				cxt.drawImage(img, 0, 0, w, h);
				delete img;
				delete cxt;
				callback(c);
			};
			img.src = src;
		}
		for (k in batch) {
			var obj = batch[k];
			if (obj.status == "WCT") { //WCT:Waiting create thumbnail
				obj.status = "CT"; //CT:Creating thumbnail
				self.handleEvent(self.createEvent("CT", obj));
				var URL = window.URL && window.URL.createObjectURL ? window.URL : window.webkitURL && window.webkitURL.createObjectURL ? window.webkitURL : null;
				this.create(URL.createObjectURL(obj.data), function(res) {
					delete URL;
					obj.canvas = res;
					obj.status = "CTC"; //CTC:Create thumbnail complete
					self.handleEvent(self.createEvent("CTC", obj));
					self.createThumbnail(batch);
				});
				return;
			}
		}
		self.handleEvent(self.createEvent("BCTC", batch)); //BWCT:Batch create thumbnail complete
		if (option.immediately) {
			self.uploadBatch(batch);
		}else{
			option.startButton.removeAttr("disabled");
		}
	}
	//批量上传
	this.uploadBatch = function(batch) {
		if(self.status=='upProgress'){
			//上一批正在上传中
			return;
		}
		var n=0;
		var currentBatch=[];
		function up(){
			n++;
			var obj=currentBatch.shift();
			if(!obj){
				n--;
				if(n<1){
					self.status='free';
					option.startButton.attr("disabled","disabled");
					option.stopButton.attr("disabled","disabled");
					self.handleEvent(self.createEvent("batchUpComplate", batch));
				}
				return;
			}
			obj.upResultCallback=function(){
				n--;
				up();
			}
			if(obj.status=="load"){
				//此文件已经上传完成，不再上传，跳过
				return;
			}
			self.uploadFile(obj);
		}
		for(k in batch){
			currentBatch[k]=batch[k];
		}
		for(var i=0;i<option.uploadNumber;i++){
			up();
		}
	}
	//单个上传
	this.uploadFile = function(obj) {
		this.status="upProgress";
		option.startButton.attr("disabled","disabled");
		option.stopButton.removeAttr("disabled");
		obj.fd = new FormData();
		obj.fd.enctype = "multipart/form-data";
		for (k in option.extraSendData) {
			obj.fd.append(k, option.extraSendData[k]);
		}
		obj.xhr = new XMLHttpRequest();
		obj.xhr.open("POST", option.url, true);
		for (k in option.requestHeader) {
			obj.xhr.setRequestHeader(k, option.requestHeader[k]);
		}
		obj.fd.append(option.fileInputName, obj.data);
		obj.xhr.upload.addEventListener("progress", function(evt) {
			evt.targetId=obj.targetId;
			evt.targetFile=obj;
			obj.status=evt.type;
			evt.upPercentage=evt.loaded/evt.total*100;
			self.handleEvent(self.createEvent("upProgress", evt));
		}, true);
		obj.xhr.addEventListener("load", function(evt) {
			evt.targetId=obj.targetId;
			evt.targetFile=obj;
			obj.status=evt.type;
			try{
				evt.result=JSON.parse(evt.target.response);
			}catch(e){
				
			}
			self.handleEvent(self.createEvent("upComplate", evt));
		}, true);
		obj.xhr.addEventListener("error", function(evt) {
			evt.targetId=obj.targetId;
			evt.targetFile=obj;
			obj.status=evt.type;
			self.handleEvent(self.createEvent("upError", evt));
		}, true);
		obj.xhr.addEventListener("abort", function(evt) {
			evt.targetId=obj.targetId;
			evt.targetFile=obj;
			obj.status=evt.type;
			self.handleEvent(self.createEvent("upAbort", evt));
		}, true);
		obj.progressBar=$("<div></div>");
		obj.progressBar.progress=$("<div style='width:0%'></div>");
		obj.progressBar.progressSpan=$("<span></span>");
		obj.progressBar.progress.append(obj.progressBar.progressSpan);
		obj.progressBar.append(obj.progressBar.progress);
		self.handleEvent(self.createEvent("upStart", obj));
		self.currentUploadList[obj.targetId]=obj;
		obj.xhr.send(obj.fd);
	}
	//开始上传
	this.startUpload=function(){
		var batch=[];
		for(k in self.filelist){
			switch(self.filelist[k].status){
				case "new":
				case "CTC":
				case "WCT":
				case "CTC":
				case "error":
				case "abort":
					batch.push(self.filelist[k]);
				break;
			}
		}
		self.uploadBatch(batch);
	}
	//停止上传
	this.stopUpload=function(){
		for(k in self.currentUploadList){
			self.currentUploadList[k].xhr.abort();
		}
		self.status='free';
		option.stopButton.attr("disabled","disabled");
		option.startButton.removeAttr("disabled");
	}
	init();
}