
  this.resolveLocalPath = function(aRemotePath, aRemoteOriginalPath, aLocalOriginalPath, aRemoteDS, aLocalDS)
  {
	var aRemotePath2 = aRemotePath.replace(aRemoteDS+aRemoteOriginalPath+aRemoteDS, '');
	
	if(aRemotePath2 != aRemotePath){}
	else
	{
	  aRemotePath2 = aRemotePath.replace(aRemoteDS+aRemoteOriginalPath, '');
	  if(aRemotePath2 != aRemotePath){}
	  else
		aRemotePath2 = aRemotePath.replace(aRemoteOriginalPath, '');
	}
	
	var regexp = new RegExp('^'+aRemoteDS);
	aRemotePath2 = aRemotePath2.replace(regexp, '');
	var regexp = new RegExp(aRemoteDS+'$');
	aRemotePath2 = aRemotePath2.replace(regexp, '');

	aRemotePath2 = aRemotePath2.split(aRemoteDS).join(aLocalDS);
	return aLocalOriginalPath+aLocalDS+aRemotePath2;
  }
  this.getRemotePathFromLocalPath = function(aRemotePlacesPath, aLocalPlacesPath, aLocalFile)
  {
	aLocalFile = aLocalFile.replace(aLocalPlacesPath, '');
	aLocalFile = aRemotePlacesPath+'/'+aLocalFile;
	aLocalFile = aLocalFile
					  .split('\\').join('/')
					  .split('//').join('/')
					  .split('//').join('/')
					  .split('//').join('/');
	return aLocalFile;
  }
  
  this.hasCustomIconIcons = ["todo","apng","png","jpg","gif","jpeg" ,"bmp","psd","js","xpi","xml","rdf","dtd","xul","htm","html","md","xhtml","css","sql","sqlite","sqlitedb","ai","cdr","mov","mpeg","avi","mpg","flv","wmv","mp3","wav","aif","aiff","snd","wma","asf","asx","pcm","php","php3","php4","php5","pdf","as","fla","swf","doc","rtf","xls","xlsx","ppt","pptx","zip","tar","rar","gz","exe","ini","conf","dat","txt","readme","sh","bat","py","pl","rb","htaccess","htpasswd","diff","komodotool","kpz","komodoproject","json","rss","bak","tmp","part","properties","fifo","ico","jar","gitignore","gitk","gitconfig","manifest","log",'tpl'];
  
  this.hasCustomIcon = function(aFileExtension)
  {
	if(this.hasCustomIconIcons.indexOf(aFileExtension) != -1)
	  return true;
	else
	  return false;
  }
 