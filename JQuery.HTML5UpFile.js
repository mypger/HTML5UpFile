/**
 * jQuery扩展之H5上传文件，支持本地预览和生成缩略图
 * @author jianrun 385884606@qq.com
 * @create 2015年12月27日23:18:08
 * @last 2015年12月27日23:18:12
 */
$.fn.upload = function(config, callback) {
	var self = this;
	this.filelist = [];
	this.init = function() {
		if ($(self)[0].type != 'file' && $(self)[0].nodeName != "INPUT") {
			console.warn("你绑定的元素不是文件域", $(self)[0]);
			return;
		}
		self.configure();
		self.initSelect();
	}
	this.configure = function() {
		//config是全局的
		config = (typeof(config) == "object") ? config : {};
		config.url = config.url ? config.url : ''; //目标URl
		config.requestHeader = (typeof(config.requestHeader) == "object") ? config.requestHeader : {}; //请求头
		config.extraSendData = (typeof(config.extraSendData) == "object") ? config.extraSendData : {}; //额外发送的数据
		config.uploadNumber = (typeof(config.uploadNumber) == "number") ? config.uploadNumber : 1; //允许同时上传的文件个数
		config.thumWidth = (typeof(config.thumWidth) == "number") ? config.thumWidth : 160; //缩略图的最大宽度
		config.thumHeight = (typeof(config.thumHeight) == "number") ? config.thumHeight : 120; //缩略图的最大高度
		config.limitWidth = (typeof(config.limitWidth) == "number") ? config.limitWidth : 6000; //限制原图的最大宽度
		config.limitHeight = (typeof(config.limitHeight) == "number") ? config.limitHeight : 6000; //限制原图的最大高度
		config.limitSize = (typeof(config.limitSize) == "number") ? config.limitSize : 10485760; //限制上传size(单位：b)
		config.fileMaxNumber = (typeof(config.fileMaxNumber) == "number") ? config.fileMaxNumber : 1; //最大文件数量上限
		config.fileAccept = (typeof(config.fileAccept) == "string") ? config.fileAccept : "image/gif,image/png,image/jpeg"; //允许选择哪些格式的文件
		config.immediately = (typeof(config.immediately) == "boolean") ? config.immediately : false; //是否选完立即上传
		config.createThumbnail = (typeof(config.createThumbnail) == "boolean") ? config.createThumbnail : true; //如果文件是图片是否创建缩略图
		config.startButton = (typeof(config.startButton) == "object") ? config.startButton : false; //开始上传按扭
		config.stopButton = (typeof(config.stopButton) == "object") ? config.stopButton : false; //停止上传按扭
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
			case "upAbort":
				self.currentUpNumber--;
				self.loopUpload();
			break;
		}
		
	}
		//创建缩略图
	this.createThumbnail = function(batch) {
		this.create = function(src, callback) {
			var img = document.createElement("img")
			img.onload = function() {
				var w = config.thumWidth;
				var h = config.thumHeight;
				if ((img.width / img.height) > (w / h)) {
					h = config.thumWidth / (img.width / img.height);
				} else {
					w = config.thumHeight / (img.height / img.width);
				}
				var c = document.createElement("canvas");
				c.width = w;
				c.height = h;
				var cxt = c.getContext("2d");
				cxt.drawImage(img, 0, 0, w, h);
				delete img;
				delete cxt;
				$("body").append(c);
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
		if (config.immediately) {
			self.loopUpload(batch);
		}
	}
	//初始化文件选择
	this.initSelect = function() {
		if (config.fileMaxNumber > 1) {
			self.attr("multiple", "multiple");
		}
		self.attr("accept", config.fileAccept);
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
				var newfile = {};
				newfile.batch = batchid;
				newfile.data = tempFiles[i];
				newfile.fileid = batchid + "_" + i;
				newfile.status = 'new';
				if (this.isrefile(newfile.data)) {
					self.handleEvent(self.createEvent("repeated", newfile.data));
					continue;
				}
				batch.push(newfile);
				self.handleEvent(self.createEvent("addOne", newfile));
			}
			self.filelist.concat(self.filelist, batch);
			self.handleEvent(self.createEvent("addComplate", batch));
			if (config.createThumbnail) {
				var hasImage = false;
				for (k in batch) {
					//标识等待创建缩略图的文件
					switch (batch[k].data.type) {
						case "image/jpeg":
						case "image/png":
						case "image/gif":
						case "image/bmp":
							batch[k].status = "WCT"; //WCT:Waiting create thumbnail
							hasImage = true;
							break;
					}
				}
				if (hasImage) {
					self.createThumbnail(batch);
				} else if (config.immediately) {
					self.loopUpload(batch);
				}
			}
		});
	}
	//循环上传
	this.loopUpload = function(batch) {
		self.currentBatch=batch?batch:self.currentBatch;
		self.currentUpNumber=self.currentUpNumber?self.currentUpNumber:1;
		for(k in self.currentBatch){
			if((++self.currentUpNumber)>config.fileMaxNumber){
				return;
			}
			self.upload(self.currentBatch[k]);
		}
	}
	//上传文件
	this.upload = function(obj) {
		obj.fd = new FormData();
		obj.fd.enctype = "multipart/form-data";
		for (k in config.extraSendData) {
			obj.fd.append(k, config.extraSendData[k]);
		}
		obj.xhr = new XMLHttpRequest();
		obj.xhr.open("POST", config.url, true);
		for (k in this.requestHeader) {
			obj.xhr.setRequestHeader(k, this.requestHeader[k]);
		}
		obj.fd.append(obj.data.name, obj.data);
		obj.xhr.upload.addEventListener("progress", function(evt) {
			self.handleEvent(self.createEvent("upProgress", evt));
		}, true);
		obj.xhr.addEventListener("load", function(evt) {
			self.handleEvent(self.createEvent("upComplate", evt));
		}, true);
		obj.xhr.addEventListener("error", function(evt) {
			self.handleEvent(self.createEvent("upError", evt));
		}, true);
		obj.xhr.addEventListener("abort", function(evt) {
			self.handleEvent(self.createEvent("upAbort", evt));
		}, true);
		obj.xhr.send(obj.fd);

	}
	this.init();
}