const mRCService = Components
					  .classes["@activestate.com/koRemoteConnectionService;1"]
					  .getService(
								  Components
									.interfaces
									.koIRemoteConnectionService
								  );
					  
function AsynchRemoteConnection(){}

AsynchRemoteConnection.prototype = {

  driverRegister: function()
  {
	gardenDrivers.register('komodo', 'Komodo (ftp, ftps, sftp, scp)', AsynchRemoteConnection);
  },
  driverInit:function()
  {
	this.__DS = '/';
  },
  driverEdit:function()
  {
	ko.windowManager.getMainWindow().prefs_doGlobalPrefs('serversItem');
  },
  driverGetEntries:function()
  {
	var servers = mRCService.getServerInfoList({});
	var entries = [];
	var i = 0;
	var prefix = '';
	for(var id in servers)
	{
	  if(servers[id].alias != servers[id].hostname)
		prefix = servers[id].alias+' - '+servers[id].hostname;
	  else
		prefix = servers[id].hostname;

	  entries[i] = {};
	  entries[i].labelWithPath = prefix+''+(servers[id].port > 0 ? ':'+servers[id].port : '')+servers[id].path;
	  entries[i].labelWithoutPath  = prefix+''+(servers[id].port > 0 ? ':'+servers[id].port : '');
	  entries[i].aData = servers[id];
	  entries[i].path = servers[id].path;
	  i++;
	}
	return entries;
  },
  //returns the connection to the server ( connects if needed )
  connect: function(aNumTry, aKeepAliveRequest)
  {
	if(!this.connection)
	  this.connection = mRCService.getConnectionUsingServerAlias(this.aData.alias);
	return this.connection;
  },

  directoryList:function(aDirectory)
  {
	var entries = this.connect().list(('/'+aDirectory).replace(/^\/+/, '/'), 1).getChildren({});
	var child, rows = [], path = '', isDirectory;

	for(var i=0;i<entries.length;i++)
	{
	  child = entries[i];
	  
	  path = child.getFilepath();
	  isDirectory = child.isDirectory();

	  rows[rows.length] = 
	  {
		'name': child.getFilename(),
		'path': path,
		'pathMapped': path,
		'isFile': !isDirectory,
		'isDirectory': isDirectory,
		'isSymlink': child.isSymlink(),
		'isHidden': child.isHidden(),
		'isWritable': child.isWriteable(),
		'isReadable': child.isReadable(),
		'modifiedTime': child.mtime,
		'permissions': child.uid+'_'+child.gid,
		'size': child.size
	  }
	}
	
	delete  child, isDirectory, path;

	return rows;
  },
  removeFile:function(aFile, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('remove file "'+aFile+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}

	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._removeFile(aFile, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _removeFile:function(aFile, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to remove file "'+aFile+'" …', aProcess.id);
	  if(connection)
	  {
		try{
		  connection.removeFile(aFile);
		}
		catch(e)
		{
		  if(
			String(e).indexOf('550 File not found') != -1 ||
			String(e).indexOf('No such file or directory') != -1 
		  )
		  {
			this.log('warning', 'the file to remove "'+aFile+'" was not found', aProcess.id);
		  }
		  else
			throw new Error(e);
		}
		//removing the item from cache and tree
		this.cacheDirectoryItemRemove(aFile, false);
		this.log('sucess', 'removed file "'+aFile+'"', aProcess.id);
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  removeDirectory:function(aDirectory, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('remove directory "'+aDirectory+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}

	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._removeDirectory(aDirectory, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  
  },
  _removeDirectory:function(aDirectory, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to remove directory "'+aDirectory+'" …', aProcess.id);
	  if(connection)
	  {
		try  {
		  //ok directory no empty maybe
		  var entries = this.connect().list(('/'+aDirectory).replace(/^\/+/, '/'), 1).getChildren({});
		}
		catch(e)
		{
		  //trying again to list the content
		  try{
			var entries = this.connect().list(('/'+aDirectory).replace(/^\/+/, '/'), 1).getChildren({});
		  } catch(e) {
			this.log('error', 'Can\'t list directory "'+aDirectory+'" maybe no exists', aProcess.id);
			//throw new Error('Can\'t list content of folder "'+aDirectory+'"');
			//return;
		  }
		}
		if(entries)
		{
		  for(var i=0;i<entries.length;i++)
		  {
			if(entries[i].isDirectory())
			  this._removeDirectory(entries[i].getFilepath(), aProcess, true);
			else
			  this._removeFile(entries[i].getFilepath(), aProcess, true);
		  }
		}
		if(!aProcess.stopped())
		{
		  try{
			connection.removeDirectory(aDirectory);
		  } catch(e){
			if(
			   String(e).indexOf('550 Directory not found') != -1 || 
			   String(e).indexOf('No such file or directory') != -1 
			   )
			  {
				this.log('warning', 'The directory to remove "'+aDirectory+'" was not found', aProcess.id);
			  }
			else{ throw new Error(e);}
		  }
		  this.cacheDirectoryItemRemove(aDirectory, true);
		  this.log('sucess', 'removed directory "'+aDirectory+'"', aProcess.id);
		}
		else if(!aInternalCall)
		{
		  aProcess.reQueue(aProcess.lastRunnuable);
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  chmodFile:function(aFile, aPermissions, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('change permissions to file "'+aFile+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._chmodFile(aFile, aPermissions, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _chmodFile:function(aFile, aPermissions, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to set permissions on file "'+aFile+'" to '+aPermissions+' …', aProcess.id);
	  if(connection)
	  {
		connection.chmod(aFile, parseInt('0'+''+aPermissions));
		this.log('sucess', 'changed permissions to file "'+aFile+'" to '+aPermissions, aProcess.id);
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  chmodDirectory:function(aDirectory, aPermissions, aRecursive, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('change permissions to directory "'+aDirectory+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._chmodDirectory(aDirectory, aPermissions, aRecursive, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _chmodDirectory:function(aDirectory, aPermissions, aRecursive, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to set permissions on directory "'+aDirectory+'" to '+aPermissions+' …', aProcess.id);
  
	  if(connection)
	  {
		if(aRecursive)
		{
		  try
		  {
			connection.chmod(aDirectory, parseInt('0'+''+aPermissions));
			
			//ok directory no empty maybe
			var entries = this.connect().list(('/'+aDirectory).replace(/^\/+/, '/'), 1).getChildren({});
			for(var i=0;i<entries.length;i++)
			{
			  if(entries[i].isDirectory())
				this.chmodDirectory(entries[i].getFilepath(),  aPermissions, aRecursive, aProcess, true);
			  else
				this.chmodFile(entries[i].getFilepath(), aPermissions, aProcess, true);
			}
			if(!aProcess.stopped())
			{	
			  this.log('sucess', 'changed permissions to directory "'+aDirectory+'" to '+aPermissions, aProcess.id);
			}
			else if(!aInternalCall)
			{
			  aProcess.reQueue(aProcess.lastRunnuable);
			}
		  }
		  catch(e)// ok directory dont have content, or maybe no exists and when trying to list the content throw a error
		  {
			if(connection)
			{
			  connection.chmod(aDirectory, parseInt('0'+''+aPermissions));
			  this.log('sucess', 'changed permissions to directory "'+aDirectory+'" to '+aPermissions, aProcess.id);
			}
		  }
		}
		else
		{
		  if(connection)
		  {
			connection.chmod(aDirectory, parseInt('0'+''+aPermissions));
			this.log('sucess', 'changed permissions to directory "'+aDirectory+'" to '+aPermissions, aProcess.id);
		  }
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  rename:function(oldName, newName, isDirectory, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('rename "'+oldName+'" to "'+newName+'"', ++this.numProcesses);
  	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._rename(oldName, newName, isDirectory, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _rename:function(oldName, newName, isDirectory,  aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to rename from "'+oldName+'" to "'+newName+'" …', aProcess.id);
  
	  if(connection)
	  {
		if(newName.indexOf(oldName+'/') === 0)
		{
		  this.log('error', 'can\'t move "'+oldName+'" into self "'+newName+'"', aProcess.id);
		}
		else
		{
		  try
		  {
			connection.rename('/'+oldName.replace(/^\/+/, '/'), '/'+newName.replace(/^\/+/, '/'));
		  }
		  catch(e)
		  {
			//may directories no exists.
			try{
			  this._tryCreatingDirectories('/'+oldName.replace(/^\/+/, '/'), '/'+newName.replace(/^\/+/, '/'), connection);
			  connection.rename(oldName, newName);
			}
			catch(e)//ok leave the extension manage de error
			{
			  connection.rename(oldName, newName);
			}
		  }
		  this.cacheDirectoryItemRemove(oldName, isDirectory);
		  this.cacheDirectoryItemAdd('/'+newName.replace(/^\/+/, '/'), isDirectory);
		  this.log('sucess', 'renamed "'+oldName+'" to "'+newName+'"', aProcess.id);
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  createDirectory:function(aParentDirectory, aDirectory, aPermissions, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('create directory "'+aDirectory+'" in "'+aParentDirectory+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._createDirectory(aParentDirectory, aDirectory, aPermissions, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _createDirectory:function(aParentDirectory, aDirectory, aPermissions, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to create directory "'+aDirectory+'" in "'+aParentDirectory+'" …', aProcess.id);
	  if(connection)
	  {
		aDirectory = aDirectory.replace(/\/+$/, '').replace(/^\/+/, '');
		if(aDirectory.indexOf('/') != -1)//if the user wants to create many directories..
		{
		  aDirectory = aDirectory.split('/');
		  var ourDirectory = aDirectory.pop();//keep the last to try outside of a try and catch
		  
		  var path = '/';
		  for(var id in aDirectory)
		  {
			path += aDirectory[id];
			try{connection.createDirectory(aParentDirectory+path, parseInt('0'+''+'755'));}catch(e){/*subdirectory maybe exists*/}
			path += '/';
		  }
		  aDirectory[aDirectory.length] = ourDirectory;
		  aDirectory = aDirectory.join('/');
		  try{
			connection.createDirectory(aParentDirectory+'/'+aDirectory, parseInt('0'+''+'755'));
			this.cacheDirectoryItemAdd(aParentDirectory+'/'+aDirectory, true);
			this.log('sucess', 'created directory "'+aDirectory+'" in "'+aParentDirectory+'"', aProcess.id);
		  }
		  catch(e)
		  {
			if(String(e).indexOf('550 Directory already exists') != -1)
			{
			  this.log('warning', 'The directory to create "'+aDirectory+'" already exists', aProcess.id);
			}
			else{ throw new Error(e);}
		  }
		}
		else
		{
		  try{
			connection.createDirectory(aParentDirectory+'/'+aDirectory, parseInt('0'+''+'755'));
			this.cacheDirectoryItemAdd(aParentDirectory+'/'+aDirectory, true);
			this.log('sucess', 'created directory "'+aDirectory+'" in "'+aParentDirectory+'"', aProcess.id);
		  } catch(e) {
			if(String(e).indexOf('550 Directory already exists') != -1)
			{
			  this.log('warning', 'The directory to create "'+aDirectory+'" already exists', aProcess.id);
			}
			else{ throw new Error(e);}
		  }
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  //used when trying to work with a deep directory that was not created first
  _tryCreatingDirectories:function(oldPath, newPath, connection)
  {
	newPath = newPath.replace(/\/+$/, '').split('/');
	newPath.pop();//remove file or directory name from list.
	if(newPath.length > 0)
	{
	  newPath = newPath.join('/');
	  if(newPath == '/' || newPath == ''){}
	  else
	  {
		newPath = newPath.replace(/\/+$/, '').replace(/^\/+/, '').split('/');
		var aPaths = '/';
		for(var id in newPath)
		{
		  aPaths += newPath[id];
		  if(oldPath.indexOf(aPaths+'/') === 0){}//skiping already know directories
		  else
		  {
			try{
			  connection.createDirectory(aPaths, parseInt('0'+''+'755'));
			  this.cacheDirectoryItemAdd(aPaths, true);
			}catch(e){/*subdirectory maybe exists*/}
		  }
		  aPaths += '/';
		}
	  }
	}
  },
  openFile:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aInternalCall)
  {
	var aDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	if(!aProcess)
	{
	  aProcess = new garden.s.process('open file "'+aFile+'" ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._openFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _openFile:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var aDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	  var connection = this.connect();
	  this.log('progress', 'going to open file "'+aFile+'" …', aProcess.id);
	  if(connection)
	  {
		//download already ask for overWrite
		//this.overWriteResolve(aProcess, null, null, aDestination, true);
		
		this._downloadFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, true);
		//run in a thread and then back to main thread because we need to wait for the file to download
		if(!aProcess.stopped())
		{
		  if(aProcess.overWriteLocal)
		  {
			garden.s.runThread(function(){
								  if(asynchRemote.s.fileExists(aDestination))
									garden.s.runMain(function(){asynchRemote.s.launch(aDestination);});
								  }, this.thread);
		  
			this.log('sucess', 'opened file "'+aFile+'" ', aProcess.id);
		  }
		}
		else if(!aInternalCall)
		{
		  aProcess.reQueue(aProcess.lastRunnuable);
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  compareWithLocal:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aTemporalLocalPath, aProcess, aInternalCall)
  {
	var aDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	if(!aProcess)
	{
	  aProcess = new garden.s.process('compare file "'+aFile+'" with local version', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._compareWithLocal(aFile, aRemotePlacesPath, aLocalPlacesPath, aTemporalLocalPath, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _compareWithLocal:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aTemporalLocalPath, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var aTemporalDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aTemporalLocalPath, aFile);
	  var aLocalFileToCompare = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	  if(!asynchRemote.s.fileExists(aLocalFileToCompare))
	  {
		this.log('error', 'Can\'t compare the remote file "'+aFile+'" with the local version because the local version no exists.', aProcess.id);
	  }
	  else
	  {
		var connection = this.connect();
		this.log('progress', 'going to download the remote file "'+aFile+'" to a temporal folder to compare with the local version …', aProcess.id);
		if(connection)
		{
		  this._downloadFile(aFile, aRemotePlacesPath, aTemporalLocalPath, aProcess, true);
		  //run in a thread and then back to main thread because we need to wait for the file to download
		  if(!aProcess.stopped())
		  {
			var AsynchRemoteConnection = this;
			garden.s.runThread(function(){
								  if(asynchRemote.s.fileExists(aTemporalDestination))
									garden.s.runMain(function(){
									  if(
										 asynchRemote.s.fileRead(aLocalFileToCompare) ==
										 asynchRemote.s.fileRead(aTemporalDestination)
										)
										 AsynchRemoteConnection.log('sucess', 'The local and remote file "'+aFile+'" are identical', aProcess.id);
										 else
										  ko.fileutils.showDiffs(aLocalFileToCompare, aTemporalDestination);
									  });
								  }, this.thread);
		  
			this.log('sucess', 'checked differences of remote file "'+aFile+'" with the local version', aProcess.id);
		  }
		  else if(!aInternalCall)
		  {
			aProcess.reQueue(aProcess.lastRunnuable);
		  }
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  editFile:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aInternalCall)
  {
	var aDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	if(!aProcess)
	{
	  aProcess = new garden.s.process('edit "'+aFile+'" ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._editFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _editFile:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var aDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	  var connection = this.connect();
	  this.log('progress', 'going to edit "'+aFile+'" …', aProcess.id);
	  if(connection)
	  {
		//download already ask for overWrite
		//this.overWriteResolve(aProcess, null, null, aDestination, true);
		
		this._downloadFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, true);
		//run in a thread and then back to main thread because we need to wait for the file to download
		if(!aProcess.stopped())
		{
		  if(aProcess.overWriteLocal)
		  {
			garden.s.runThread(function(){
								  if(asynchRemote.s.fileExists(aDestination))
									garden.s.runMain(function(){asynchRemote.s.openURL(window, aDestination, true);});
								  }, this.thread);
		  
			this.log('sucess', 'opened file "'+aFile+'" ', aProcess.id);
		  }
		}
		else if(!aInternalCall)
		{
		  aProcess.reQueue(aProcess.lastRunnuable);
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  downloadFile:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	var aDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	if(!aProcess)
	{
	  aProcess = new garden.s.process('download file "'+aFile+'" to "'+aDestination+'"  ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._downloadFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _downloadFile:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var aDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	  var connection = this.connect();
	  this.log('progress', 'going to download file "'+aFile+'" to "'+aDestination+'" …', aProcess.id);
	  
	  if(connection)
	  {
		this.overWriteResolve(aProcess, null, null, aDestination, true, overWrite);
		
		if(aProcess.overWriteLocal)
		{
		  //reading file
		  var aContent = connection.readFile(aFile, {});
  
		  //creating file or needed directories
		  asynchRemote.s.fileCreate(aDestination);
		  
		  //writing file
		  asynchRemote.s.fileWriteBinaryContentIsByteArray(aDestination, aContent);
		  
		  this.log('sucess', 'downloaded file "'+aFile+'" to "'+aDestination+'" ', aProcess.id);
		}
		else
		{
		  this.log('canceled', 'download of file "'+aFile+'" to "'+aDestination+'" canceled by user', aProcess.id);
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  createFile:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aInternalCall)
  {
	var aDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	if(!aProcess)
	{
	  aProcess = new garden.s.process('create file "'+aFile+'" ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._createFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _createFile:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var aDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	  var connection = this.connect();
	  this.log('progress', 'going to create file "'+aFile+'" …', aProcess.id);
	  if(connection)
	  {

		//check if the file exists on local
		this.overWriteResolve(aProcess, null, null, aDestination, true);

		if(aProcess.overWriteLocal)
		{
		  //check if the file exists on remote
		  this.overWriteResolve(aProcess, aFile, false, null, false);

		  if(aProcess.overWriteRemote)
		  {
			//creating file or needed directories
			asynchRemote.s.fileCreate(aDestination);
			//writing local file
			asynchRemote.s.koFileLocalWrite(aDestination, '');
			
			//writing remote file
			//this._uploadFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aProcess.overWriteRemote, true);
			if(!aProcess.stopped())
			{
			  //opening the file
			  //run in a thread and then back to main thread because we need to wait for the file to download
			  garden.s.runThread(function(){
									if(asynchRemote.s.fileExists(aDestination))
									  garden.s.runMain(function(){asynchRemote.s.openURL(window, aDestination, true);});
									}, this.thread);
			  
			  this.log('sucess', 'created file "'+aFile+'" ', aProcess.id);
			}
			else if(!aInternalCall)
			{
			  aProcess.reQueue(aProcess.lastRunnuable);
			}
		  }
		  else
		  {
			this.log('canceled', 'creation of file "'+aFile+'" canceled by user', aProcess.id);
		  }
		}
		else
		{
		  this.log('canceled', 'creation of file "'+aFile+'" canceled by user', aProcess.id);
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
 
  uploadFile:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	var aSource = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	if(!aProcess)
	{
	  aProcess = new garden.s.process('upload file "'+aSource+'" to "'+aFile+'"  ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._uploadFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _uploadFile:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var aSource = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	  var connection = this.connect();
	  this.log('progress', 'going to upload file "'+aSource+'" to "'+aFile+'" …', aProcess.id);
	  
	  if(connection)
	  {
		//if local file no exists
		if(!asynchRemote.s.fileExists(aSource))
		{
		  this.log('error', 'The local file to upload "'+aSource+'" no exists.', aProcess.id);
		}
		else
		{
		  //skiping file if it was not changed
		  var checkModified = asynchRemote.s.file(aSource);
		  if(checkModified.fileSize == 0)
		  {
			this.log('sucess', 'skiping upload of file "'+aSource+'" to "'+aFile+'" because file size is 0', aProcess.id);
		  }
		  else if(asynchRemote.s.pref('dont.cache.last.modified') || !this.lastModified[aSource] || this.lastModified[aSource] != checkModified.lastModifiedTime+'_'+checkModified.fileSize)
		  {
			this.lastModified[aSource] = checkModified.lastModifiedTime+'_'+checkModified.fileSize;
			//check if the file exists on remote
			this.overWriteResolve(aProcess, aFile, false, null, false, overWrite);
			
			if(aProcess.overWriteRemote)
			{
			  var uploadAndRename = asynchRemote.s.pref('upload.and.rename');
			  if(uploadAndRename)
				var extension = '.kup';
			  else
				var extension = '';
			  
			  var aData = asynchRemote.s.fileReadBinaryReturnByteArray(aSource);
			  try//needs to clean the upload timestamp if this process failed
			  {
				  try{
					//writing file
					
					connection.writeFile(aFile+extension, aData, aData.length);
				  }catch(e){
					//directory may no exists
					this._tryCreatingDirectories('/', aFile, connection);
			  
					  try{
						connection.writeFile(aFile+extension, aData, aData.length);
					  }catch(e){
						//may the .kup file exists on remote becuase of a kill on an upload or something.
						if(extension == '.kup')
						{
						  try{connection.removeFile(aFile+extension);}catch(e){}
						  
						connection.writeFile(aFile+extension, aData, aData.length);
						}
					  }
				  }
				
				  if(uploadAndRename)
				  {
					try{
					  connection.rename(aFile+extension, aFile);
					}catch(e){//file exists
					  try{
						connection.removeFile(aFile);
						connection.rename(aFile+extension, aFile);
					  }catch(e){/*shh*/}
					}
				  }
			  }
			  catch(e)//needs to clean the upload timestamp if this process failed
			  {
				this.lastModified[aSource] ='';
				throw new Error(e);
			  }
			  
			  this.cacheDirectoryItemRemove(aFile, false);
			  this.cacheDirectoryItemAdd(aFile, false);
			  
			  this.log('sucess', 'uploaded file "'+aSource+'" to "'+aFile+'" ', aProcess.id);
			}
			else
			{
			  this.log('canceled', 'upload of file "'+aSource+'" to "'+aFile+'" canceled by user', aProcess.id);
			}
		  }
		  else
		  {
			this.log('sucess', 'skiping upload of file "'+aSource+'" to "'+aFile+'" ', aProcess.id);
		  }
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  uploadDirectory:function(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	var aSource = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aDirectory);
	if(!aProcess)
	{
	  aProcess = new garden.s.process('upload directory "'+aSource+'" to "'+aDirectory+'"  ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._uploadDirectory(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _uploadDirectory:function(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var aSource = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aDirectory);
	  var connection = this.connect();
	  this.log('progress', 'going to upload directory "'+aSource+'" to "'+aDirectory+'" …', aProcess.id);
	  
	  if(connection)
	  {
		//if local file no exists
		if(!asynchRemote.s.fileExists(aSource))
		{
		  this.log('error', 'The local path "'+aSource+'" to upload no exists.', aProcess.id);
		}
		else
		{
		  //check if the file exists on remote
		  this.overWriteResolve(aProcess, aDirectory, true, null, false, overWrite);
		  
		  if(aProcess.overWriteRemote)
		  {
			var aDirectoryListing = Components.classes["@mozilla.org/file/local;1"].  
								createInstance(Components.interfaces.nsILocalFile); 
				aDirectoryListing.initWithPath(aSource);
	
			var entries = aDirectoryListing.directoryEntries, entry;
			
			while(entries.hasMoreElements())
			{
			  entry = entries.getNext();
				entry.QueryInterface(Components.interfaces.nsIFile);
			  if(entry.isDirectory())
				this._uploadDirectory(asynchRemote.s.getRemotePathFromLocalPath(aRemotePlacesPath, aLocalPlacesPath, entry.path), aRemotePlacesPath, aLocalPlacesPath, aProcess, aProcess.overWriteRemote, true)
			  else
				this._uploadFile(asynchRemote.s.getRemotePathFromLocalPath(aRemotePlacesPath, aLocalPlacesPath, entry.path), aRemotePlacesPath, aLocalPlacesPath, aProcess, aProcess.overWriteRemote, true)
			}
			if(!aProcess.stopped())
			{
			  this.cacheDirectoryItemRemove(aDirectory, true);
			  this.cacheDirectoryItemAdd(aDirectory, true);
			  this.log('sucess', 'uploaded directory "'+aSource+'" to "'+aDirectory+'" ', aProcess.id);
			}
			else if(!aInternalCall)
			{
			  aProcess.reQueue(aProcess.lastRunnuable);
			}
		  }
		  else
		  {
			this.log('canceled', 'upload of directory "'+aSource+'" to "'+aDirectory+'" canceled by user', aProcess.id);
		  }
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  downloadDirectory:function(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	var aDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aDirectory);
	if(!aProcess)
	{
	  aProcess = new garden.s.process('download directory "'+aDirectory+'" to "'+aDestination+'"  ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._downloadDirectory(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _downloadDirectory:function(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var aDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aDirectory);
	  var connection = this.connect();
	  this.log('progress', 'going to download directory "'+aDirectory+'" to "'+aDestination+'" …', aProcess.id);
	  
	  if(connection)
	  {
		//check if the file exist on local
		this.overWriteResolve(aProcess, null, true, aDestination, true, overWrite);
		
		if(aProcess.overWriteLocal)
		{
		  asynchRemote.s.folderCreate(aDestination);
		  
		  var entries = this.connect().list(('/'+aDirectory).replace(/^\/+/, '/'), 1).getChildren({});
		  for(var i=0;i<entries.length;i++)
		  {
			if(entries[i].isDirectory())
			  this._downloadDirectory(entries[i].getFilepath(), aRemotePlacesPath, aLocalPlacesPath, aProcess, aProcess.overWriteLocal, true);
			else
			  this._downloadFile(entries[i].getFilepath(), aRemotePlacesPath, aLocalPlacesPath, aProcess, aProcess.overWriteLocal, true);
		  }
		  if(!aProcess.stopped())
		  {
			this.log('sucess', 'downloaded directory "'+aDirectory+'" to "'+aDestination+'" ', aProcess.id);
		  }
		  else if(!aInternalCall)
		  {
			aProcess.reQueue(aProcess.lastRunnuable);
		  }
		}
		else
		{
		  this.log('canceled', 'download of directory "'+aDirectory+'" to "'+aDestination+'" canceled by user', aProcess.id);
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  //ask for overwrite or skip
  overWrite:function(aProcess, aMsg, aFile)
  {
	garden.s.runMainAndWait(function(){
	  asynchRemote.element('g-toolbar-panel').hidePopup();
	  var overWrite = asynchRemote.s.overWritePrompt(aMsg, window);
		  aProcess.overWrite = {};
		  aProcess.overWrite.Yes = overWrite.value == 'Yes';
		  aProcess.overWrite.YesToAll = overWrite.value == 'Yes to all';
		  aProcess.overWrite.No = overWrite.value == 'No';
		  aProcess.overWrite.NoToAll = overWrite.value == 'No to all';
		  aProcess.overWrite.Cancel = overWrite.value == 'Cancel';
		  aProcess.overWrite.DontAskAgain = overWrite.dontAskAgain === true;
	  });
  },
  //this resolves if asking is appropiated.
  overWriteResolve:function(aProcess, aRemote, aIsDirectory, aLocal, isLocal, aParentOverWrite)
  {
	if(isLocal)
	{
	  /*if(typeof(aParentOverWrite) != 'undefined')
	  {
		aProcess.overWriteLocal = aParentOverWrite;
	  }
	  else*/
	  if(asynchRemote.s.sharedObjectExists('overWrite.'+this.server+'.'+aLocal))
		aProcess.overWriteLocal = asynchRemote.s.sharedObjectGet('overWrite.'+this.server+'.'+aLocal);
	  else
	  {
		aProcess.overWriteLocal = false;
		if(!asynchRemote.s.pref('overwrite.no.ask') && (!aProcess.p.l.overWrite || !aProcess.p.l.overWrite.YesToAll) && asynchRemote.s.fileExists(aLocal))
		{
		  if(aIsDirectory)
			this.overWrite(aProcess.p.l, 'Directory "'+aLocal+'" exists.\n\nDo you want to overwrite the local directory?\n');
		  else
			this.overWrite(aProcess.p.l, 'File "'+aLocal+'" exists.\n\nDo you want to overwrite the local file?\n');
		  if(aProcess.p.l.overWrite.YesToAll || aProcess.p.l.overWrite.Yes)
		  {
			aProcess.overWriteLocal = true;
		  }
		  if(aProcess.p.l.overWrite.DontAskAgain && !aProcess.p.l.overWrite.Cancel)
		  {
			asynchRemote.s.sharedObjectSet('overWrite.'+this.server+'.'+aLocal, aProcess.overWriteLocal);
		  }
		}
		else
		{
		  aProcess.overWriteLocal = true;
		}
	  }
	}
	else
	{
	  /*if(typeof(aParentOverWrite) != 'undefined')
		aProcess.overWriteRemote = aParentOverWrite;
	  else */
	  if(asynchRemote.s.sharedObjectExists('overWrite.'+this.server+'.'+aRemote))
	  {
		aProcess.overWriteRemote = asynchRemote.s.sharedObjectGet('overWrite.'+this.server+'.'+aRemote);
	  }
	  else
	  {
		aProcess.overWriteRemote = false;
		if(!asynchRemote.s.pref('overwrite.no.ask') && (!aProcess.p.r.overWrite || !aProcess.p.r.overWrite.YesToAll))
		{
		  var aDirectory = aRemote.split('/');
			  aDirectory.pop();
			  aDirectory = aDirectory.join('/');
		  var fileExistsRemote = false;
		  try{
			var entries = this.connect().list(('/'+aDirectory).replace(/^\/+/, '/'), 1).getChildren({});
			for(var i=0;i<entries.length;i++)
			{
			  var getFilepath = entries[i].getFilepath();
			  if(getFilepath == aRemote)
			  {
				var isDirectory = entries[i].isDirectory();
				if((isDirectory && aIsDirectory) || (!isDirectory && !aIsDirectory))
				{
				  fileExistsRemote = true;
				  break;
				}
			  }
			}
		  }
		  catch(e) 
		  {
			//remote directory no existasynchRemote.s.dump(e);
		  }
		  if(fileExistsRemote)
		  {
			if(aIsDirectory)
			  this.overWrite(aProcess.p.r, 'Directory "'+aRemote+'" exists.\n\nDo you want to overwrite the remote directory?\n');
			else
			  this.overWrite(aProcess.p.r, 'File "'+aRemote+'" exists.\n\nDo you want to overwrite the remote file?\n');
			if(aProcess.p.r.overWrite.YesToAll || aProcess.p.r.overWrite.Yes)
			{
			  aProcess.overWriteRemote = true;
			}
			if(aProcess.p.r.overWrite.DontAskAgain && !aProcess.p.r.overWrite.Cancel)
			{
			  asynchRemote.s.sharedObjectSet('overWrite.'+this.server+'.'+aRemote, aProcess.overWriteRemote);
			}
		  }
		  else
		  {
			aProcess.overWriteRemote = true;
		  }
		}
		else
		{
		  aProcess.overWriteRemote = true;
		}
	  }
	}
  }
};

garden.registerDriverClass(AsynchRemoteConnection);