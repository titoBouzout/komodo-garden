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
	  aURI += this.encodeURIComponent(aConnection.username);
	if(aConnection.username && aConnection.password)
	  aURI += ':' + this.encodeURIComponent(aConnection.password);
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
