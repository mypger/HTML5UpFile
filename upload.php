<?php
/*
 * html5upfile.js 每个请求只上传一个文件，就算一次上传多个文件，也会自动折分逐个上传
 * 以下是PHP原生的接收文件写法，请自行用自己框架自带的文件接收模块
 * 任何情况都返回一个JSON给html5upfile.js，必须包含status、msg
 */
function init(){
	header('Content-type:text/json');
	$result=array();
	switch($_FILES["html5upfile"]["type"]){
		case "image/gif":
		case "image/jpeg":
		case "image/png":
		break;
		default:
			$result['status']="error";
			$result['msg']="文件格式限制，不允许上传：".$_FILES["html5upfile"]["type"]."格式的文件";
			exit(json_encode($result));
		break;
	}
	if($_FILES["html5upfile"]["size"]>10485760){
		$result['status']="error";
		$result['msg']="文件大小限制，不允许上传大于1M的文件";
		exit(json_encode($result));
	}
	if($_FILES["html5upfile"]["error"]>0){
		$result['status']="error";
		$result['msg']="错误：".$_FILES["file"]["error"];
		exit(json_encode($result));
	}
	$savePath=dirname(__FILE__)."/upload/".date("Ymd")."/";
	if(mkfolder($savePath)){
		move_uploaded_file($_FILES["html5upfile"]["tmp_name"], $savePath . $_FILES["html5upfile"]["name"]);
		$result['status']="ok";
		$result['msg']="";
		exit(json_encode($result));
	}else{
		$result['status']="error";
		$result['msg']="无法创建目录：".$savePath;
		exit(json_encode($result));
	}
	$result['status']="undefine";
	$result['msg']="服务器未做有效处理";
	echo $savePath;
	exit(json_encode($result));
}
function mkfolder($Folder) {
	if (!is_readable($Folder)) {
		mkfolder(dirname($Folder));
		if (!is_file($Folder))
			mkdir($Folder, 0777);
	}
	return true;
}
init();
?>