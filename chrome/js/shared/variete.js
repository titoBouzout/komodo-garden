  this.serializerParser = function(aData)
  {
	for(var id in aData.server)
	{
	  aData.server[id].isBusy = false;
	  aData.server[id].isLoading = false;
	}
	for(var id in aData.tree)
	{
	  aData.tree[id].isBusy = false;
	  aData.tree[id].isLoading = false;
	}
	return aData;
  }
  this.getServerURIForPath = function(aPath, aConnection)
  {
	var aURI = '';
	  aURI += aConnection.protocol.toLowerCase() + '://';
	if(aConnection.username)
	  aURI += this.encodeUTF8(aConnection.username);
	if(aConnection.username && aConnection.password)
	  aURI += ':' + this.encodeUTF8(aConnection.password);
	if(aConnection.username)
	  aURI += '@';
	aURI += aConnection.server;
	
	if(aConnection.port > 0)
	  aURI += ':' + aConnection.port;
	if(aPath)
	  aURI += this.encodePath(aPath);
	return aURI;
  }
  this.getLocalPathFromRemotePath = function(aRemotePlacesPath, aLocalPlacesPath, aRemoteFile)
  {
	aRemoteFile = aRemoteFile.replace(aRemotePlacesPath, '');
	aRemoteFile = aLocalPlacesPath+'/'+aRemoteFile;
	aRemoteFile = aRemoteFile
					  .split(this.__DS).join('/')
					  .split('\\').join('/')
					  .split('//').join('/')
					  .split('//').join('/')
					  .split('//').join('/')
					  .split('/').join(this.__DS);
	return aRemoteFile;
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
 