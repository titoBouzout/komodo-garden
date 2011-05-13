
/*
  each instance of a server holds two properties,
  the tree view and the connection, here is the connection object.
  
  a connection instance generates a thread and keep only one connection to-
	a remote server, all blocking operations will be perfmored into that thread.
*/
function AsynchRemoteConnection(server)
{
  this.server = server;//the server alias wich we take as an id
  
  this.thread = asynchRemote.s.newThread();
  this.uploadThread = asynchRemote.s.newThread();
  
  this.connected = false;//if we are connected this is true
  this.connecting = 0;//if there is some iteraction with the server this holds a number
  
  this.numProcesses = 0;//holds num of processes (ids).
  this.processes = [];//holds references to the processes to do.
  
  //cache of directory listings
  this.cache = asynchRemote.s.serializedSessionGet(server, {'tree':[],'server':{}}, asynchRemote.s.serializerParser).server;
  if(!this.cache.dirs)
	this.cache.dirs = {};
  if(!this.cache.currentPath)
	this.cache.currentPath = '';
  
  this.numMaxTrys = 2;//for all the operation this is the num of max trys
  this.numMaxTrysDirectoryListing = 3;//when retreiving directory listing this is the num of max trys
  this.numMaxLostConnectionTrys = 6;//connection maybe lost many times in a row depending of servers.
  
  //holds logs of connections
  this.logs = asynchRemote.s.sharedObjectGet(this.server+'.logs', [])//a shared object for all the windows
  this.log('status', 'Loaded remote pane: "'+server+'"', 0);
  
  //holds the sizes and modified times of files to not upload the same file again
  this.uploads = asynchRemote.s.sharedObjectGet(this.server+'.uploads', [])
  
  //keep alive the connection or close if idle
  this.keepAliveTimer = Components
						  .classes["@mozilla.org/timer;1"]
						  .createInstance(Components.interfaces.nsITimer);
  this.errorCount = 0;
}

AsynchRemoteConnection.prototype = {
  
  //returns the connection to the server ( connects if needed )
  connect: function(aNumTry)
  {
	if(!this.connection)
	{
	  this.connecting++;
	  if(this.connected)
		this.log('status', 'Re-connecting to host…', 0);
	  else
		this.log('status', 'Connecting to host…', 0);
	  try{
		this.connection = asynchRemote.mRCService.getConnectionUsingServerAlias(this.server);
						  
		this.keepAliveOrCloseConnectionInit();
	  }catch(e){
		if(!aNumTry)
		  aNumTry = 1;
		else
		  aNumTry++;
		this.log('warning', 'Attempt '+aNumTry+' of '+this.numMaxLostConnectionTrys+' to connect to host failed.', 0);
		//the mRCService message
		var lastErrorSvc = Components
								.classes["@activestate.com/koLastErrorService;1"]
								.getService(Components.interfaces.koILastErrorService);
		var error = lastErrorSvc.getLastErrorMessage();
		if(e && e != '' && error != e)
		  error += '\n'+e;
		this.connecting--;
		if(aNumTry<this.numMaxLostConnectionTrys)
		{
		  if(error && error != '')
			this.log('warning', 'Error message:'+error, 0);
		  this.log('warning', 'Trying again…', 0);
		  return this.connect(aNumTry);
		}
		else
		{
		  this.connected = false;
		  this.log('error', 'Can\'t connect to host. '+error, 0);
		  return false;
		}
	  }
	  this.connected = true;
	  this.log('status', 'Connected!', 0);
	  this.connecting--;
	}
	else
	{
	  /*this.dump('already connected!');*/
	}
	return this.connection;
  },

  
  keepAliveOrCloseConnectionInit:function()
  {
	this.lastIteration = new Date();
	var AsynchRemoteConnection = this;
	this.keepAliveOrCloseConnectionUninit();
	this.keepAliveTimer.init({
		observe: function(aSubject, aTopic, aData) {
		  asynchRemote.s.runThread(function(){
			 AsynchRemoteConnection.keepAliveOrCloseConnection();
		  }, AsynchRemoteConnection.thread);
		}
	  }, 1000 * 56, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
  },
  keepAliveOrCloseConnectionUninit:function()
  {
	try{this.keepAliveTimer.cancel();}catch(e){}
  },
  keepAliveOrCloseConnection:function()
  {
	var now = new Date();
	//the connection was idle by five minutes
	//and to make expire the connection no operations must be running
	//( example uploading a big file should put this.connecting on atleast 1 in value)

	  if(Math.floor((now-this.lastIteration)/60000) > 4 && this.connecting === 0 && this.connected)
	  {
		try{this.connection.close();}catch(e){}

		this.connected = false;
		this.connection = null;
		this.log('status', 'Disconnected from host, connection was idle.', 0);
		this.keepAliveTimer.cancel();
	  }
	  else if(this.connecting !== 0 && this.connected)//the connection is doing something
	  {
		this.lastIteration = new Date();
		try{this.connect().changeDirectory('/');}catch(e){}
	  }
	  else if(this.connected)//the connection is idle, keep alive for two minutes
	  {
		try{this.connect().changeDirectory('/');}catch(e){}
	  }
	
	this.notifyProgress();
  },
  processController:function(aProcess, aNumTry)
  {
	if(aProcess.paused())
	{
	  //this.log('warning', 'Process '+aProcess.name+' was paused by user', aProcess.id);
	}
	else if(!aProcess.hasPendingTask())
	{
	  //this.log('status', 'Process '+aProcess.id+' : '+aProcess.name+' completed without errors', aProcess.id);
	}
	else if(aProcess.canRun())
	{
	  this.lastIteration = new Date();
	  this.connecting++;
	  var aFunction = aProcess.run();
	  try
	  {
		aFunction();
		this.connecting--;
		aProcess.started(true);
	  }
	  catch(e)
	  {
		aProcess.reQueue(aFunction);
		if(!aNumTry)
		  aNumTry = 1;
		else
		  aNumTry++;
		this.log('warning', 'Attempt '+aNumTry+' of '+this.numMaxTrys+' about '+aProcess.name+' failed', aProcess.id);
		var lastErrorSvc = Components
							  .classes["@activestate.com/koLastErrorService;1"]
							  .getService(Components.interfaces.koILastErrorService);
		var error = lastErrorSvc.getLastErrorMessage();
		if(e && e != '' && error != e)
		  error += '\n'+e;
		if(aNumTry<this.numMaxTrys)
		{
		  this.connecting--;
		  if(error && error != '')
			this.log('warning', 'Error message:'+error, aProcess.id);
		  this.log('warning', 'Trying again…', aProcess.id);
		  this.processController(aProcess, aNumTry);
		}
		else
		{
		  this.connecting--;
		  aProcess.aborted(true);
		  this.log('error', 'Unable to '+aProcess.name+'. Reached max attemps. '+error, aProcess.id);
		}
	  }
	  //run all the queue
	  this.processController(aProcess, aNumTry);
	}
	else
	{
	  //this.log('error', 'Process '+aProcess.name+' reached max attempts of trying errors, is now stopped and should manually set to run/continue', aProcess.id);
	}
  },
  
  /*
	directory listing for tree is outside of process controller
  */
  //non threaded directory listing for tree view
  directoryListing: function(aLevel, aDirectory, aParentRow)
  {
	if(this.cache.dirs[aDirectory] && !this.cache.dirs[aDirectory].loading && this.cache.dirs[aDirectory].data)
	{
	  this.log('progress', 'Getting listing "'+aDirectory+'" from cache', 0);
	  var rowsSorted = this.cache.dirs[aDirectory].data;
	  for(var id in rowsSorted)
		rowsSorted[id].getLevel = aLevel;
	  asynchRemote.trees[this.server].insertRows(aLevel, rowsSorted, aParentRow);
	}
	else
	{
	  //run threaded only if no cached
	  var AsynchRemoteConnection = this;
	  var aCurrentView = asynchRemote.trees[this.server].history.currentView;
	  asynchRemote.s.runThread(function(){
		AsynchRemoteConnection._directoryListing(aLevel, aDirectory, aParentRow, 0, aCurrentView);
	  }, this.thread);
	}
  },
  //threaded directory listing for tree view
  _directoryListing:function(aLevel, aDirectory, aParentRow, aNumTry, aCurrentView)
  {
	if(!this.cache.dirs[aDirectory])
	  this.cache.dirs[aDirectory] = {};
	  
  	if(this.cache.dirs[aDirectory].loading){}
	else
	{
	  this.cache.dirs[aDirectory].loading = true;

	  if(this.cache.dirs[aDirectory].data)
	  {
		var wasConnecting = false;
	  }
	  else
	  {
		this.connecting++;
		var wasConnecting = true;
	  }
	  try
	  {
		if(this.cache.dirs[aDirectory].data)
		{
		  this.log('progress', 'Getting listing "'+aDirectory+'" from cache', 0);
		  //reset the aLevel of the folders
		  var rowsSorted = this.cache.dirs[aDirectory].data;
		  for(var id in rowsSorted)
			rowsSorted[id].getLevel = aLevel;
		}
		else
		{
		  this.lastIteration = new Date();
		  var entries = this.connect().list(('/'+aDirectory).replace(/^\/+/, '/'), 1).getChildren({});
		  this.log('progress', 'Getting "'+aDirectory+'" list from host', 0);
		  var child, rowsDirectories = [], rowsFiles = [], rows = [], rowsSorted = [], name, isDirectory;
		  
		  for(var i=0;i<entries.length;i++)
		  {
			child = entries[i];
			name = child.getFilename();
			isDirectory = child.isDirectory();
			
			rows[name] = 
			{
				'getFilename': name,
				'getFilepath': child.getFilepath(),
				'isFile': !isDirectory,
				'isDirectory': isDirectory,
				'isContainerOpen' : false,
				'isContainerEmpty' : false,
				'isBusy' : false,
				'isLoading' : false,
				'getLevel': aLevel,
				'getModifiedTime': child.mtime,
				'getMode': child.mode,
				'getSize': child.size,
				'aParentRow':aParentRow
			}
			if(rows[name].isDirectory)
			  rowsDirectories[rowsDirectories.length] = name;
			else
			  rowsFiles[rowsFiles.length] = name;
		  }
		  
		  //sorting names
		  rowsDirectories.sort(asynchRemote.s.sortLocale);
		  rowsFiles.sort(asynchRemote.s.sortLocale);
		  for(var id in rowsDirectories)
			rowsSorted[rowsSorted.length] = rows[rowsDirectories[id]]
		  for(var id in rowsFiles)
			rowsSorted[rowsSorted.length] = rows[rowsFiles[id]]
		  
		  delete entries, child, name, rows, rowsDirectories, rowsFiles;
		  
		  this.cache.dirs[aDirectory].data = rowsSorted;
		  
		  this.log('sucess', 'Directory "'+aDirectory+'" list completed', 0);
		}
		var server = this.server;
		//avoid duplicates entries when using the history and back buttons
		if(asynchRemote.trees[server].history.currentView != aCurrentView){}
		else
		  asynchRemote.s.runMain(function(){asynchRemote.trees[server].insertRows(aLevel, rowsSorted, aParentRow);});
		
		this.cache.dirs[aDirectory].loading = false;
	  }
	  catch(e)
	  {
		this.cache.dirs[aDirectory] = {};
		this.cache.dirs[aDirectory].loading = false;
		
		if(!aNumTry)
		  aNumTry = 1;
		else
		  aNumTry++;
		var lastErrorSvc = Components
								.classes["@activestate.com/koLastErrorService;1"]
								.getService(Components.interfaces.koILastErrorService);
		var error = lastErrorSvc.getLastErrorMessage();
		if(e && e != '' && error != e)
		  error += '\n'+e;

		if(aNumTry<this.numMaxTrysDirectoryListing)
		{
		  //Trying again…
		  this._directoryListing(aLevel, aDirectory, aParentRow, aNumTry, aCurrentView);
		}
		else
		{
		  var server = this.server;
		  this.log('error', 'Unable to get directory listing of "'+aDirectory+'". ', 0);
		  asynchRemote.s.runMain(function(){asynchRemote.trees[server].insertRows(aLevel, [], aParentRow);});

		}
	  }
	  if(wasConnecting)
		this.connecting--;
	}
	this.notifyProgress();
  },
  removeFile:function(aFile, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new asynchRemote.s.process('remove file "'+aFile+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}

	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._removeFile(aFile, aProcess, aInternalCall);}, aInternalCall);
	asynchRemote.s.runThread(function(){
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
		//removing the item from cache
		this.cacheDirectoryItemRemove(aFile);
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
	  aProcess = new asynchRemote.s.process('remove directory "'+aDirectory+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}

	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._removeDirectory(aDirectory, aProcess, aInternalCall);}, aInternalCall);
	asynchRemote.s.runThread(function(){
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
		  this.cacheDirectoryItemRemove(aDirectory);
		  this.cache.dirs[aDirectory] = {};
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
	  aProcess = new asynchRemote.s.process('change permissions to file "'+aFile+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._chmodFile(aFile, aPermissions, aProcess, aInternalCall);}, aInternalCall);
	asynchRemote.s.runThread(function(){
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
	  aProcess = new asynchRemote.s.process('change permissions to directory "'+aDirectory+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._chmodDirectory(aDirectory, aPermissions, aRecursive, aProcess, aInternalCall);}, aInternalCall);
	asynchRemote.s.runThread(function(){
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
  rename:function(oldName, newName, aProcess, aInternalCall, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new asynchRemote.s.process('rename "'+oldName+'" to "'+newName+'"', ++this.numProcesses);
  	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._rename(oldName, newName, aProcess, aInternalCall);}, aInternalCall);
	asynchRemote.s.runThread(function(){
										AsynchRemoteConnection.processController(aProcess);
									  }, this.thread);
	return aProcess;
  },
  _rename:function(oldName, newName,  aProcess, aInternalCall)
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
		  this.cacheDirectoryItemRemove(oldName);
		  this.cacheDirectoryItemAdd('/'+newName.replace(/^\/+/, '/'));
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
	  aProcess = new asynchRemote.s.process('create directory "'+aDirectory+'" in "'+aParentDirectory+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._createDirectory(aParentDirectory, aDirectory, aPermissions, aProcess, aInternalCall);}, aInternalCall);
	asynchRemote.s.runThread(function(){
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
		  
		  connection.createDirectory(aParentDirectory+'/'+aDirectory, parseInt('0'+''+'755'));
		  
		  this.cacheDirectoryItemAdd(aParentDirectory+'/'+aDirectory);
		  this.log('sucess', 'created directory "'+aDirectory+'" in "'+aParentDirectory+'"', aProcess.id);
		}
		else
		{
		  this.cacheDirectoryItemAdd(aParentDirectory+'/'+aDirectory);
		  connection.createDirectory(aParentDirectory+'/'+aDirectory, parseInt('0'+''+'755'));
		  this.log('sucess', 'created directory "'+aDirectory+'" in "'+aParentDirectory+'"', aProcess.id);
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
			try{connection.createDirectory(aPaths, parseInt('0'+''+'755'));}catch(e){/*subdirectory maybe exists*/}
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
	  aProcess = new asynchRemote.s.process('open file "'+aFile+'" ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._openFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aInternalCall);}, aInternalCall);
	asynchRemote.s.runThread(function(){
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
		//this.overWriteResolve(aProcess, null, null, aDestination, true);download already ask
		
		this._downloadFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, true);
		//run in a thread and then back to main thread because we need to wait for the file to download
		if(!aProcess.stopped())
		{
		  asynchRemote.s.runThread(function(){
								if(asynchRemote.s.fileExists(aDestination))
								  asynchRemote.s.runMain(function(){asynchRemote.s.launch(aDestination);});
								}, this.thread);
		
		  this.log('sucess', 'opened file "'+aFile+'" ', aProcess.id);
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
	  aProcess = new asynchRemote.s.process('download file "'+aFile+'" to "'+aDestination+'"  ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._downloadFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall);}, aInternalCall);
	asynchRemote.s.runThread(function(){
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
		   var aContent = asynchRemote.s.koFileRemoteRead(asynchRemote.s.getServerURIForPath(aFile, connection));
  
		  //creating file or needed directories
		  asynchRemote.s.fileCreate(aDestination);
		  
		  //writing file
		  asynchRemote.s.koFileLocalWrite(aDestination, aContent);
		  
		  this.cacheDirectoryItemAdd(aFile);
		  
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
	  aProcess = new asynchRemote.s.process('create file "'+aFile+'" ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._createFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aInternalCall);}, aInternalCall);
	asynchRemote.s.runThread(function(){
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
			this._uploadFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aProcess.overWriteRemote, true);
			if(!aProcess.stopped())
			{
			  //opening the file
			  //run in a thread and then back to main thread because we need to wait for the file to download
			  asynchRemote.s.runThread(function(){
									if(asynchRemote.s.fileExists(aDestination))
									  asynchRemote.s.runMain(function(){asynchRemote.s.openURL(window, aDestination, true);});
									}, this.thread);
			  
			  this.cacheDirectoryItemAdd(aFile);
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
	  aProcess = new asynchRemote.s.process('upload file "'+aSource+'" to "'+aFile+'"  ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._uploadFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall);}, aInternalCall);
	asynchRemote.s.runThread(function(){
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
		  if(!this.uploads[aSource] || this.uploads[aSource] != checkModified.lastModifiedTime+'_'+checkModified.fileSize)
		  {
			this.uploads[aSource] = checkModified.lastModifiedTime+'_'+checkModified.fileSize;
			
			//check if the file exists on remote
			this.overWriteResolve(aProcess, aFile, false, null, false, overWrite);
			
			if(aProcess.overWriteRemote)
			{
			  //reading file
			  //var aContent = asynchRemote.s.koFileLocalRead(aSource);
			  
			  var uploadAndRename = asynchRemote.s.pref('upload.and.rename');
			  if(uploadAndRename)
				var extension = '.kup';
			  else
				var extension = '';
			  
			  var aData = asynchRemote.s.fileReadBinaryReturnByteArray(aSource);
			  try//needs to clean the upload timestamp if this process failed
			  {
				//asynchRemote.s.runThreadAndWait(function(){
				
				  try{
					//writing file
					
					connection.writeFile(aFile+extension, aData, aData.length);
						//asynchRemote.s.koFileRemoteWrite(asynchRemote.s.getServerURIForPath(aFile, connection)+extension, aContent);
				  }catch(e){
					//directory may no exists
					this._tryCreatingDirectories('/', aFile, connection);
			  
					  try{
						
						connection.writeFile(aFile+extension, aData, aData.length);
						//asynchRemote.s.koFileRemoteWrite(asynchRemote.s.getServerURIForPath(aFile, connection)+extension, aContent);
					  }catch(e){
						//may the .kup file exists on remote becuase of a kill on an upload or something.
						if(extension == '.kup')
						{
						  try{connection.removeFile(aFile+extension);}catch(e){}
						  
						connection.writeFile(aFile+extension, aData, aData.length);						  //asynchRemote.s.koFileRemoteWrite(asynchRemote.s.getServerURIForPath(aFile, connection)+extension, aContent);
						}
					  }
				  }
				  
				//}, this.uploadThread);
				
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
				this.uploads[aSource] ='';
				throw new Error(e);
			  }
			  this.cacheDirectoryItemAdd(aFile);
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
	  aProcess = new asynchRemote.s.process('upload directory "'+aSource+'" to "'+aDirectory+'"  ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._uploadDirectory(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall);}, aInternalCall);
	asynchRemote.s.runThread(function(){
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
			  this.cacheDirectoryItemAdd(aDirectory);
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
	  aProcess = new asynchRemote.s.process('download directory "'+aDirectory+'" to "'+aDestination+'"  ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var AsynchRemoteConnection = this;
	aProcess.queue(function(){AsynchRemoteConnection._downloadDirectory(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall);}, aInternalCall);
	asynchRemote.s.runThread(function(){
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
			this.cacheDirectoryItemAdd(aDirectory);
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
	asynchRemote.s.runMainAndWait(function(){
	  asynchRemote.element('asynchremote-toolbar-panel').hidePopup();
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
		if((!aProcess.p.l.overWrite || !aProcess.p.l.overWrite.YesToAll) && asynchRemote.s.fileExists(aLocal))
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
		aProcess.overWriteRemote = asynchRemote.s.sharedObjectGet('overWrite.'+this.server+'.'+aRemote);
	  else
	  {
		aProcess.overWriteRemote = false;
		if((!aProcess.p.r.overWrite || !aProcess.p.r.overWrite.YesToAll))
		{
		  var aDirectory = aRemote.split('/');
			  aDirectory.pop();
			  aDirectory = aDirectory.join('/');
		  var fileExistsRemote = false;
		  try{
			var entries = this.connect().list(('/'+aDirectory).replace(/^\/+/, '/'), 0).getChildren({});
			for(var i=0;i<entries.length;i++)
			{
			  var getFilepath = entries[i].getFilepath();
			  if(
				 (getFilepath == aRemote && entries[i].isDirectory()) ||
				 (getFilepath == aRemote && !aIsDirectory && !isDirectory) 
				)
			  {
				fileExistsRemote = true;
				break;
			  }
			}
		  }
		  catch(e) 
		  {
			//remote directory no exist
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
  },
  cleanCacheOverWrite:function()
  {
	var AsynchRemoteConnection = this;
	asynchRemote.s.runThread(function(){
										asynchRemote.s.sharedObjectDestroyWithPrefix('overWrite.'+AsynchRemoteConnection.server+'.');
									  }, this.thread);
  	this.log('status', 'Cleaned overwrite settings', 0);
	
  },
  cleanCacheConnection:function()
  {
	var AsynchRemoteConnection = this;
	asynchRemote.s.runThreadAndWait(function(){
										AsynchRemoteConnection.cache.dirs = {};
									  }, this.thread);
	this.log('status', 'Cleaned connection cache', 0);
  },
  cleanCacheModified:function()
  {
	var AsynchRemoteConnection = this;
	asynchRemote.s.runThread(function(){
										AsynchRemoteConnection.uploads = [];
									  }, this.thread);
	this.log('status', 'Cleaned last modified cache', 0);
  },
  //this invalidates all decendant paths instead of adding the item and changing all the tree...
  cacheDirectoryItemAdd:function(aPath)
  {
	var aDirs = aPath.split('/');
	var aParentPath = '';
	var aPath;
	var isDirectory = false;
	for(var aLevel=0, aNextPath =1;aLevel<aDirs.length;aLevel++, aNextPath++)
	{
	  if(!aDirs[aNextPath])
		break;
	  aParentPath += '/'+aDirs[aLevel];
	  aParentPath = aParentPath.replace(/\/+/g, '/');
	  aPath = (aParentPath+'/'+aDirs[aNextPath]).replace(/\/+/g, '/');
	  
	  //this.dump('buscando en '+aParentPath+' si esta '+aPath);
	  
	  if(this.cache.dirs[aParentPath] && this.cache.dirs[aParentPath].data)
	  {
		var found = false;
		for(var id in this.cache.dirs[aParentPath].data)
		{
		  if(this.cache.dirs[aParentPath].data[id].getFilepath == aPath)
		  {
			//this.dump(aPath+' esta en el cache de '+aParentPath);
			found = true;
			break;
		  }
		}
		if(!found)
		{
		  this.cache.dirs[aParentPath] = {};
		  //remove the item from the tree
		  var server = this.server;
		  var toInvalidate = String(aParentPath);
		  asynchRemote.s.runMain(function(){asynchRemote.trees[server].invalidateRowByPath(toInvalidate);});
		}
	  }
	}
	for(var id in this.cache.dirs)
	{
	  if(id.indexOf(aPath) === 0)
		this.cache.dirs[id] = {}
	}

	if(aPath.split('/').length <= 3)
	{
	  this.cache.dirs['/'] = {}
	  asynchRemote.s.runMain(function(){asynchRemote.actionFromRemote('refresh-all-soft');});
	}
  },
  cacheDirectoryItemRemove:function(aPath)
  {
	var aParentDir = aPath.split('/');
		aParentDir.pop();
		aParentDir = aParentDir.join('/');
	if(this.cache.dirs[aParentDir])
	{
	  var a=0;
	  for(var id in this.cache.dirs[aParentDir].data)
	  {
		if(this.cache.dirs[aParentDir].data[id].getFilepath == aPath)
		{
		  this.cache.dirs[aParentDir].data.splice(a, 1);
		  //updating parent if now is empty;
		  if(this.cache.dirs[aParentDir].data.length === 0)
		  {
			var aParentParentDir = aParentDir.split('/');
			aParentParentDir.pop();
			aParentParentDir = aParentParentDir.join('/');
			if(aParentParentDir == '')
			  aParentParentDir = '/';
			if(this.cache.dirs[aParentParentDir])
			{
			  for(var id in this.cache.dirs[aParentParentDir].data)
			  {
				if(this.cache.dirs[aParentParentDir].data[id].getFilepath == aParentDir)
				{
				  this.cache.dirs[aParentParentDir].data[id].isContainerEmpty = true;
				  break;
				}
			  }
			}
		  }
		  break;
		}
		a++;
	  }
	}
	//remove the item from the tree
	var server = this.server;
	asynchRemote.s.runMain(function(){asynchRemote.trees[server].removeRowByPath(aPath);});
  },
  //holds logs of actions
  log:function(aType, aMsg, aProcessID)
  {
	if(aType == 'error')
	  this.errorCount++;
	this.logs[this.logs.length] = {
									'aDate':(new Date().toLocaleTimeString()),
									'aType':aType,
									'aMsg':asynchRemote.s.htmlSpecialCharsEncode(aMsg),
									'aProcessID':aProcessID
								  };
	//shorting the amount of log entries
	if(this.logs.length > 1000)
	  this.logs.splice(0, this.logs.length-1000);
	this.notifyProgress();
  },
  //close the connection
  close:function()
  {
	this.log('status', 'Connection will close as soon as posible without interrupting any current upload/download or process', 0);
	
	this.closing = true;
	//pause processes 
	for(var id in this.processes)
	   this.processes[id].paused(true);
	   
	//remove the keep alive
	this.keepAliveOrCloseConnectionUninit();
	
	//queue the disconnect operation
	var AsynchRemoteConnection = this;
	asynchRemote.s.runThread(function(){
	  
	  
	  if(AsynchRemoteConnection.connected && AsynchRemoteConnection.connection && AsynchRemoteConnection.connection.close)
		AsynchRemoteConnection.connection.close();
	  
	  AsynchRemoteConnection.connecting = 0;
	  AsynchRemoteConnection.connected = false;
	  
	  delete AsynchRemoteConnection.connection;
	  
	  AsynchRemoteConnection.log('status', 'Connection closed', 0);
	  
	  AsynchRemoteConnection.notifyProgress();
	  
	  AsynchRemoteConnection.closing = false;
	  
	}, this.thread);
  },
  //notifyProgress of connections and processes
  notifyProgress:function()
  {
	var server = this.server;
	asynchRemote.s.runMain(function(){asynchRemote.notifyProgress(server);});
  },
  //dumps a message into the main thread
  dump: function(aName, aMsg, aError)
  {
	if(asynchRemote.debug || aError)
	  asynchRemote.s.runMain(function(){ asynchRemote.dump('AsynchRemoteConnection:'+aName, aMsg, aError)});
  }
};