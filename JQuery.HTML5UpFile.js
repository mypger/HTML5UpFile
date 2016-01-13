/**
 * jQuery扩展之H5上传文件，支持本地预览和生成缩略图
 * @author jianrun 385884606@qq.com
 * @create 2015年12月27日23:18:08
 * @last 2015年12月27日23:18:12
 */
$.fn.upload = function(targetUrl,option, callback) {
	var self = this;
	this.filelist = [];
	function init() {
		if ($(self)[0].type != 'file' && $(self)[0].nodeName != "INPUT") {
			console.warn("你绑定的元素不是文件域", $(self)[0]);
			return;
		}
		initOption();
		initSelect();
	}
	function initOption() {
		//option是全局的
		option = (typeof(option) == "object") ? option : {};
		option.url = option.url ? option.url : targetUrl; //上传文件地址
		option.splitSize=option.splitSize?option.splitSize:0;//分割大小(单位：b)
		option.queryUrl = option.queryUrl ? option.queryUrl : option.url; //分割上传文件时用来查看文件上传情况的地址
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
		self.option=option;
		console.log(option.url);
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
		console.log(evt.target.targetId,evt);
		callback(evt);
		switch(evt.type){
			case "upComplate":
			case "upError":
			case "upAbort":
				evt.target.targetFile.upResultCallback();
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
				obj.status = "CT"; //CT:Create thumbnail
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
		}
	}
	//初始化文件选择
	function initSelect() {
		console.log(self);
		if (option.fileMaxNumber > 1) {
			self.attr("multiple", "multiple");
		}
		self.attr("accept", option.fileAccept);
		self.change(function(e) {
			var tempFiles = self[0].files;
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
				batch.push(newfile);
				self.handleEvent(self.createEvent("addOne", newfile));
			}
			self.filelist.concat(self.filelist, batch);
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
				}
			}
		});
	}
	//批量上传
	this.uploadBatch = function(batch) {
		var i=0;
		var currentBatch=[];
		function up(){
			var obj=currentBatch.shift();
			if(!obj){
				if((i--)<1){
					self.handleEvent(self.createEvent("batchUpComplate", batch));
				}
				return;
			}
			obj.upResultCallback=function(){
				up();
			}
			if(obj.status=="load"){
				//此文件已经上传完成，不再上传，跳过
				return;
			}
			self.uploadFile(obj);
//			if(option.splitSize>0){
//				self.splitUpload(obj);
//			}else{
//				self.uploadFile(obj);
//			}
			
		}
		for(k in batch){
			currentBatch[k]=batch[k];
		}
		for(;i<option.uploadNumber;i++){
			up();
		}
	}
	//单个上传
	this.uploadFile = function(obj) {
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
		obj.fd.append(obj.data.name, obj.data);
		obj.xhr.upload.addEventListener("progress", function(evt) {
			evt.targetId=obj.targetId;
			evt.targetFile=obj;
			obj.status=evt.type;
			self.handleEvent(self.createEvent("upProgress", evt));
		}, true);
		obj.xhr.addEventListener("load", function(evt) {
			evt.targetId=obj.targetId;
			evt.targetFile=obj;
			obj.status=evt.type;
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
		self.handleEvent(self.createEvent("upStart", obj));
		obj.xhr.send(obj.fd);
	}
	//分割上传
	this.splitUpload=function(obj){
		//未完成部分 2016年1月13日23:39:45
		var sup=this;
		var loaded=0;
		//查询之前是否上传过此文件？上传了多少个字节？
		function queryUpload(obj,callback){
			var send={};
			for (k in option.extraSendData) {
				send[k]=option.extraSendData[k];
			}
			send.fileLastModified=obj.target.lastModified;
			send.fileName=obj.target.name;
			send.fileSize=obj.target.size;
			send.fileType=obj.target.type;
			$.post(option.queryUrl,send,function(){
				
			});
		}
		//响应上传事件
		function uploadEvent(type,evt){
			switch(type){
				case "upProgress":
				case "upComplate":
				case "upError":
				case "upAbort":
				
				break;
			}
		}
		function sendDate(obj){
			var fd = new FormData();
			fd.enctype = "multipart/form-data";
			for (k in option.extraSendData) {
				fd.append(k, option.extraSendData[k]);
			}
			fd.append(obj.data.name, obj.data);
			var xhr = new XMLHttpRequest();
			xhr.open("POST", option.url, true);
			for (k in option.requestHeader) {
				xhr.setRequestHeader(k, option.requestHeader[k]);
			}
			xhr.upload.addEventListener("progress", function(evt) {
				uploadEvent("progress", evt);
			}, true);
			xhr.addEventListener("load", function(evt) {
				uploadEvent("load", evt);
			}, true);
			xhr.addEventListener("error", function(evt) {
				uploadEvent("error", evt);
			}, true);
			xhr.addEventListener("abort", function(evt) {
				uploadEvent("abort", evt);
			}, true);
			xhr.send(fd);
		}
		function splitFile(data,start,end){
			
		}
		queryUpload(obj,function(d){
			var uploaded=d.uploaded;
			
		});
	}
	init();
}